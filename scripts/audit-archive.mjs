#!/usr/bin/env node
/** Read-only evidence audit. --all scans all archived objects with stable keyset paging. */
import {Pool} from "pg";
import {S3Client,GetObjectCommand} from "@aws-sdk/client-s3";
import {writeFile} from "node:fs/promises";
import {archiveManifestDigest,verifyByteStream} from "../packages/domain/archive-integrity.mjs";
import {auditPageQuery} from "../packages/domain/archive-audit-query.mjs";
const connection=process.env.DATABASE_URL,endpoint=process.env.AWS_ENDPOINT_URL_S3,bucket=process.env.MEDIA_BUCKET;
if(!connection||!endpoint?.startsWith("https://")||!bucket||!process.env.AWS_ACCESS_KEY_ID||!process.env.AWS_SECRET_ACCESS_KEY)
 throw Error("Database and branch-scoped archival read credentials are required.");
const args=process.argv.slice(2),all=args.includes("--all");
const maxArg=args.find(x=>x.startsWith("--limit="));
if(all&&maxArg)throw Error("Choose either --all or --limit; a full scan cannot have a hidden cap.");
const max=maxArg?Number(maxArg.split("=")[1]):25;
if(!all&&(!Number.isInteger(max)||max<1||max>5000))throw Error("Bounded audit limit must be 1–5000.");
const output=args.find(x=>x.startsWith("--output="))?.slice(9)||"";
if(output&&(!output.startsWith("/")||output.includes("\0")))throw Error("Use an absolute local report path.");
const started=new Date();
const db=new Pool({connectionString:connection,max:1,connectionTimeoutMillis:10000});
const s3=new S3Client({endpoint,region:process.env.AWS_REGION||"us-east-2",forcePathStyle:true,
 credentials:{accessKeyId:process.env.AWS_ACCESS_KEY_ID,secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY}});
const findings=[];let cursor=null;let complete=false;let pageCount=0;
try{
 while(true){
  const remaining=all?100:Math.min(100,max-findings.length);
  if(remaining<=0)break;
  const {text,values}=auditPageQuery({asOf:started,cursor,limit:remaining+1});
  const result=await db.query(text,values);
  const batch=result.rows.slice(0,remaining);
  pageCount++;
  for(const asset of batch){
   const expectedSize=asset.bytes===null?null:Number(asset.bytes);
   const maxBytes=asset.kind==="document"?20*1024*1024:asset.kind==="media"?60*1024*1024:150*1024*1024;
   try{
    const object=await s3.send(new GetObjectCommand({Bucket:bucket,Key:asset.storage_key}),{abortSignal:AbortSignal.timeout(120000)});
    if(!object.Body)throw Error("Object missing");
    const verified=await verifyByteStream(object.Body,{expectedSha256:asset.sha256,expectedSize,maxBytes});
    findings.push({kind:asset.kind,id:asset.id,sha256:verified.sha256,sizeBytes:verified.bytes,verified:true});
   }catch(error){
    findings.push({kind:asset.kind,id:asset.id,sha256:asset.sha256,sizeBytes:expectedSize,verified:false,
     error:error instanceof Error?error.message.slice(0,200):"unclassified"});
   }
  }
  if(result.rows.length<=remaining){complete=true;break;}
  if(!batch.length)throw Error("Archive pagination did not advance.");
  const last=batch.at(-1);
  cursor={time:new Date(last.audit_sort_time),kind:last.kind,id:last.id};
  if(!all&&findings.length>=max)break;
 }
 const failures=findings.filter(x=>!x.verified);
 const report={schemaVersion:"2.0.0",auditType:"internal_read_only_storage_verification",
  startedAt:started.toISOString(),finishedAt:new Date().toISOString(),
  scanMode:all?"full":"bounded",pagesScanned:pageCount,checked:findings.length,
  failed:failures.length,passed:findings.length-failures.length,complete,
  manifestSha256:archiveManifestDigest(findings),findings};
 if(output)await writeFile(output,JSON.stringify(report,null,2)+"\n",{mode:0o600,flag:"wx"});
 console.log(JSON.stringify({...report,findings:undefined}));
 if(failures.length)process.exitCode=2;
 if(all&&!complete)process.exitCode=3;
}finally{await db.end();s3.destroy();}
