#!/usr/bin/env node
/**
 * Isolated worker for approved source-video extracts.
 * NOT a web request handler. Requires properly isolated container/worker infrastructure.
 * Run: node scripts/render-summary.mjs --once
 */
import { Pool } from "pg";
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { createHash, randomUUID } from "node:crypto";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { spawn } from "node:child_process";

const MAX_SOURCE_BYTES=60*1024*1024;
const MAX_SOURCE_FILES=10;
const MAX_JOB_CLIPS=80;
const MAX_JOB_SECONDS=1200;
const workerId=randomUUID();
if (!process.env.DATABASE_URL || !process.env.AWS_ENDPOINT_URL_S3 || !process.env.MEDIA_BUCKET) {
  throw Error("Missing authorized branch-specific database / object-store configuration.");
}
const db=new Pool({connectionString:process.env.DATABASE_URL,max:2,connectionTimeoutMillis:10000});
const s3=new S3Client({forcePathStyle:true,endpoint:process.env.AWS_ENDPOINT_URL_S3,region:process.env.AWS_REGION||"us-east-2",
 credentials:{accessKeyId:process.env.AWS_ACCESS_KEY_ID,secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY}});
const bucket=process.env.MEDIA_BUCKET;

async function runFfmpeg(args,timeoutMs=180000){
 await new Promise((resolve,reject)=>{
  const child=spawn("ffmpeg",["-nostdin","-hide_banner","-loglevel","error","-y",...args],{stdio:["ignore","ignore","pipe"]});
  let err="",finished=false;
  const timer=setTimeout(()=>{child.kill("SIGKILL");},timeoutMs);
  child.stderr.on("data",chunk=>{if(err.length<5000)err+=chunk.toString()});
  child.once("error",e=>{clearTimeout(timer);if(!finished){finished=true;reject(e)}});
  child.once("close",code=>{clearTimeout(timer);if(!finished){finished=true;code===0?resolve(undefined):reject(Error("FFmpeg failed: "+err.slice(0,300))) }});
 });
}
async function claim(){
 const connection=await db.connect();
 try{
  await connection.query("BEGIN");
  await connection.query("UPDATE durable_jobs SET state='failed',last_error='Exceeded automatic retry allowance',lease_owner=NULL,lease_token=NULL,leased_until=NULL WHERE job_type='render_debate_summary' AND state='running' AND leased_until<now() AND attempt_count>=5");
  const selected=await connection.query("SELECT id,arguments FROM durable_jobs WHERE job_type='render_debate_summary' AND attempt_count<5 AND (state='queued' OR (state='running' AND leased_until < now())) AND available_at<=now() ORDER BY available_at,id FOR UPDATE SKIP LOCKED LIMIT 1");
  if(!selected.rows.length){await connection.query("ROLLBACK");return null}
  const j=selected.rows[0],leaseToken=randomUUID();
  await connection.query("UPDATE durable_jobs SET state='running',attempt_count=attempt_count+1,leased_until=now()+interval '8 minutes',lease_owner=$2,lease_token=$3 WHERE id=$1",[j.id,workerId,leaseToken]);
  await connection.query("COMMIT");
  return {...j,leaseToken};
 }catch(e){await connection.query("ROLLBACK");throw e}finally{connection.release()}
}
async function validateJob(artifactId){
 const q=await db.query("SELECT a.id,a.branch_id,a.source_manifest,a.status,a.manifest_sha256 FROM derivative_artifacts a WHERE a.id=$1",[artifactId]);
 if(!q.rows.length || q.rows[0].status!=="draft")throw Error("Draft summary not found.");
 const artifact=q.rows[0],m=artifact.source_manifest;
 if(Array.isArray(m?.captions)&&m.captions.length)throw Error("Text overlays are not yet implemented and must not be silently dropped.");
 if(!m || m.branchId!==artifact.branch_id || !Array.isArray(m.clips) || m.clips.length<1 || m.clips.length>MAX_JOB_CLIPS)throw Error("Invalid clip manifest.");
 const estimate=m.clips.reduce((n,x)=>n+Number(x.endSeconds)-Number(x.startSeconds),0);
 if(!Number.isFinite(estimate)||estimate<=0||estimate>MAX_JOB_SECONDS)throw Error("Summary time limit exceeded.");
 const limits={master:1200,five_minutes:300,three_minutes:180,one_minute:60,thirty_seconds:30};
 if(!(m.outputKind in limits)||estimate>limits[m.outputKind])throw Error("Output format limit exceeded.");
 const participants=await db.query("SELECT d.originator_candidacy_id,b.responder_candidacy_id FROM debate_branches b JOIN debates d ON d.id=b.debate_id WHERE b.id=$1",[artifact.branch_id]);
 if(!participants.rows.length)throw Error("Branch not found.");
 const allowed=new Set([participants.rows[0].originator_candidacy_id,participants.rows[0].responder_candidacy_id]);
 const sources=new Map();
 for(const clip of m.clips){
  if(typeof clip.mediaAssetId!=="string"||!Number.isFinite(clip.startSeconds)||!Number.isFinite(clip.endSeconds)||clip.startSeconds<0||clip.endSeconds<=clip.startSeconds)throw Error("Invalid clip bounds");
  const r=await db.query("SELECT a.storage_key,a.original_sha256,a.duration_seconds,a.owner_candidacy_id,a.size_bytes FROM media_assets a JOIN submissions s ON s.media_asset_id=a.id JOIN debate_branches b ON b.debate_id=s.debate_id WHERE a.id=$1 AND b.id=$2 AND a.processing_status='ready' AND s.published_at IS NOT NULL AND (s.branch_id=$2 OR s.kind='opening')",[clip.mediaAssetId,artifact.branch_id]);
  if(!r.rows.length)throw Error("Unpublished or unrelated source");
  const source=r.rows[0];
  if(!allowed.has(source.owner_candidacy_id)||clip.endSeconds>Number(source.duration_seconds))throw Error("Unauthorized source or invalid bounds");
  // Must be explicitly granted by the ORIGINAL OWNER for this exact artifact/range.
  const permission=await db.query("SELECT 1 FROM media_permissions WHERE media_asset_id=$1 AND candidate_id=$2 AND permission='edit' AND (scope->>'artifactId')=$3 AND (scope->>'clipStart')::numeric<=$4 AND (scope->>'clipEnd')::numeric>=$5 LIMIT 1",
   [clip.mediaAssetId,source.owner_candidacy_id,artifactId,clip.startSeconds,clip.endSeconds]);
  if(!permission.rowCount)throw Error("Original owner has not approved this exact clip");
  sources.set(clip.mediaAssetId,source);
 }
 if(sources.size>MAX_SOURCE_FILES)throw Error("Maximum number of distinct original source files exceeded.");
 return {artifact,m,sources};
}
async function heartbeat(job){
 const result=await db.query("UPDATE durable_jobs SET leased_until=now()+interval '8 minutes' WHERE id=$1 AND state='running' AND lease_owner=$2 AND lease_token=$3 RETURNING id",[job.id,workerId,job.leaseToken]);
 if(!result.rowCount)throw Error("The renderer no longer owns this job lease.");
}
async function probeFile(path){
 return await new Promise((resolve,reject)=>{
  const child=spawn("ffprobe",["-v","error","-show_streams","-show_format","-print_format","json",path],{stdio:["ignore","pipe","pipe"]});
  let output="",err="";
  const timer=setTimeout(()=>child.kill("SIGKILL"),30000);
  child.stdout.on("data",chunk=>{if(output.length<300000)output+=String(chunk);});
  child.stderr.on("data",chunk=>{if(err.length<1500)err+=String(chunk);});
  child.once("error",e=>{clearTimeout(timer);reject(e);});
  child.once("close",code=>{clearTimeout(timer);
   if(code!==0){reject(Error("ffprobe failed: "+err.slice(0,160)));return;}
   try{resolve(JSON.parse(output));}catch(e){reject(e);}
  });
 });
}
async function fetchSource(key){
 const response=await s3.send(new GetObjectCommand({Bucket:bucket,Key:key}));
 if(!response.Body)throw Error("Source media unavailable");
 if(Number(response.ContentLength)>MAX_SOURCE_BYTES)throw Error("Source media exceeds allowed size before streaming.");
 const bytes=Buffer.from(await response.Body.transformToByteArray());
 if(bytes.length>MAX_SOURCE_BYTES)throw Error("Excessive source media size");
 return bytes;
}
async function processJob(job){
 const artifactId=job.arguments?.artifactId;
 if(typeof artifactId!=="string")throw Error("Missing artifact ID");
 const {artifact,m,sources}=await validateJob(artifactId);
 const dir=await mkdtemp(join(tmpdir(),"pde-summary-"));
 try{
  const inputs=new Map();
  for(const [id,meta] of sources){
   const bytes=await fetchSource(meta.storage_key);
   if(bytes.length!==Number(meta.size_bytes)||createHash("sha256").update(bytes).digest("hex")!==meta.original_sha256)throw Error("Original checksum mismatch. Rendering refused.");
   const p=join(dir,"source-"+inputs.size+".bin");await writeFile(p,bytes,{mode:0o600});
   const analyzed=await probeFile(p);
   if(!analyzed.streams?.some(stream=>stream.codec_type==="video"))throw Error("Original source lacks a video stream.");
   inputs.set(id,{path:p,hasAudio:analyzed.streams.some(stream=>stream.codec_type==="audio")});
  }
  const segments=[];
  for(let i=0;i<m.clips.length;i++){
   const clip=m.clips[i],target=join(dir,"clip-"+i+".mp4");
   const source=inputs.get(clip.mediaAssetId);
   const args=["-ss",String(clip.startSeconds),"-i",source.path];
   if(!source.hasAudio)args.push("-f","lavfi","-i","anullsrc=channel_layout=stereo:sample_rate=48000");
   args.push("-t",String(clip.endSeconds-clip.startSeconds),"-map","0:v:0","-map",source.hasAudio?"0:a:0":"1:a:0",
    "-c:v","libx264","-preset","veryfast","-crf","24","-pix_fmt","yuv420p",
    "-vf","scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1",
    "-c:a","aac","-ar","48000","-ac","2","-af","apad","-movflags","+faststart",target);
   await runFfmpeg(args,120000);
   segments.push(target);
  }
  const concatList=join(dir,"concat.txt");
  await writeFile(concatList,segments.map(p=>"file '"+p.replaceAll("'","'\\''")+"'").join("\n"),{mode:0o600});
  const output=join(dir,"summary.mp4");
  await runFfmpeg(["-f","concat","-safe","0","-i",concatList,"-c","copy","-movflags","+faststart",output],120000);
  const analyzedOutput=await probeFile(output);
  const measuredDuration=Number(analyzedOutput.format?.duration);
  const maxDuration={master:1200,five_minutes:300,three_minutes:180,one_minute:60,thirty_seconds:30}[m.outputKind];
  const intendedDuration=m.clips.reduce((n,x)=>n+x.endSeconds-x.startSeconds,0);
  if(!Number.isFinite(measuredDuration)||measuredDuration<=0||measuredDuration>maxDuration+1||Math.abs(measuredDuration-intendedDuration)>1.5)
   throw Error("Rendered video duration exceeds the selected output format.");
  const bytes=await readFile(output);if(bytes.length===0||bytes.length>150000000)throw Error("Invalid summary output size.");
  const sha=createHash("sha256").update(bytes).digest("hex");
  const key="summaries/"+artifact.branch_id+"/"+artifact.id+"/"+sha+".mp4";
  await s3.send(new PutObjectCommand({Bucket:bucket,Key:key,Body:bytes,ContentType:"video/mp4",CacheControl:"private,no-store",Metadata:{originals:"preserved",sha256:sha}}));
  const connection=await db.connect();
  try{
   await connection.query("BEGIN");
   const lease=await connection.query("SELECT id FROM durable_jobs WHERE id=$1 AND state='running' AND lease_owner=$2 AND lease_token=$3 AND leased_until>now() FOR UPDATE",[job.id,workerId,job.leaseToken]);
   if(!lease.rowCount)throw Error("Lost job lease before final commit.");
   const current=await connection.query("SELECT status FROM derivative_artifacts WHERE id=$1 FOR UPDATE",[artifactId]);
   if(current.rows[0]?.status!=="draft")throw Error("Render state changed before commit");
   await connection.query("UPDATE derivative_artifacts SET output_sha256=$2,rendered_storage_key=$3,rendered_at=now(),duration_seconds=$4,status='awaiting_approval' WHERE id=$1",[artifactId,sha,key,measuredDuration]);
   await connection.query("UPDATE durable_jobs SET state='completed',finished_at=now(),leased_until=NULL,lease_owner=NULL,lease_token=NULL WHERE id=$1 AND lease_owner=$2 AND lease_token=$3",[job.id,workerId,job.leaseToken]);
   await connection.query("COMMIT");
  }catch(e){await connection.query("ROLLBACK");throw e}finally{connection.release()}
  console.log("Summary rendered, awaiting candidate approvals",artifactId,sha.slice(0,12));
 }finally{await rm(dir,{recursive:true,force:true})}
}
async function main(){
 let stop=false;process.on("SIGTERM",()=>{stop=true});
 while(!stop){
  const j=await claim();
  if(!j){if(process.argv.includes("--once"))break;await new Promise(resolve=>setTimeout(resolve,10000));continue}
  let heartbeatError=null;
  const timer=setInterval(()=>{void heartbeat(j).catch(e=>{heartbeatError=e;});},30000);
  timer.unref();
  try{
   await processJob(j);
   if(heartbeatError)throw heartbeatError;
  }catch(e){
   const message=(e instanceof Error?e.message:"Unspecified renderer failure").slice(0,500);
   await db.query("UPDATE durable_jobs SET state='failed',last_error=$2,leased_until=NULL,lease_owner=NULL,lease_token=NULL,available_at=now()+interval '10 minutes' WHERE id=$1 AND lease_owner=$3 AND lease_token=$4 AND state='running'",[j.id,message,workerId,j.leaseToken]);
   console.error("Summary rendering failed",j.id,message);
  }finally{clearInterval(timer);}
  if(process.argv.includes("--once"))break;
 }
}
try{await main()}finally{await db.end()}
