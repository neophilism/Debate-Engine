#!/usr/bin/env node
/**
 * Zero-cost, no-secret object-storage loss/recovery exercise. Two separate,
 * ephemeral, localhost-only S3-compatible RustFS servers. Never connect to
 * actual Neon storage or import private candidate material.
 */
import assert from "node:assert/strict";
import {execFile} from "node:child_process";
import {promisify} from "node:util";
import {createHash,randomUUID} from "node:crypto";
import {mkdtemp,readFile,rm} from "node:fs/promises";
import {tmpdir} from "node:os";
import {join} from "node:path";
import {
 S3Client,CreateBucketCommand,PutObjectCommand,GetObjectCommand,
 HeadObjectCommand,ListObjectsV2Command
} from "@aws-sdk/client-s3";

if(process.env.GITHUB_ACTIONS!=="true"||process.env.PDE_S3_RECOVERY_FIXTURES!=="true")
 throw Error("Real storage is prohibited. Only the ephemeral GitHub fixture job may run this rehearsal.");
const run=promisify(execFile), image="rustfs/rustfs:1.0.0-rc.6";
const accessKeyId="pdefixtureadmin",secretAccessKey="temporary-only-fake-ci-secret-2026";
const source={name:"pde-primary-"+randomUUID().slice(0,8),port:19100,bucket:"pde-fixture-primary"};
const independent={name:"pde-backup-"+randomUUID().slice(0,8),port:19101,bucket:"pde-fixture-backup"};
const active=new Set();
const sha=bytes=>createHash("sha256").update(bytes).digest("hex");
const docker=async(...args)=>run("docker",args,{timeout:120000,maxBuffer:512*1024});
function s3(server){
 return new S3Client({endpoint:"http://127.0.0.1:"+server.port,region:"us-east-1",
  forcePathStyle:true,credentials:{accessKeyId,secretAccessKey}});
}
async function waitFor(server){
 for(let i=0;i<90;i++){
  try{
   const response=await fetch("http://127.0.0.1:"+server.port+"/health",
    {signal:AbortSignal.timeout(1500)});
   if(response.ok)return;
  }catch{}
  await new Promise(resolve=>setTimeout(resolve,1000));
 }
 const logs=await docker("logs","--tail","45",server.name).catch(()=>({stdout:"unavailable"}));
 throw Error("Fixture storage server did not become healthy: "+logs.stdout.slice(-1000));
}
async function start(server){
 // -p binds only to loopback. --rm removes ephemeral, anonymous data volumes.
 await docker("run","--detach","--rm","--name",server.name,"--publish",
  "127.0.0.1:"+server.port+":9000",
  "--env","RUSTFS_ACCESS_KEY="+accessKeyId,
  "--env","RUSTFS_SECRET_KEY="+secretAccessKey,
  "--env","RUSTFS_ADDRESS=:9000",
  "--env","RUSTFS_CONSOLE_ENABLE=false",
  image,"/data");
 active.add(server.name);
 await waitFor(server);
}
async function stop(server){
 if(!active.has(server.name))return;
 await docker("stop","--time","10",server.name);
 active.delete(server.name);
}
async function bucket(client,name){
 await client.send(new CreateBucketCommand({Bucket:name}));
}
async function bytes(client,bucketName,key){
 const response=await client.send(new GetObjectCommand({Bucket:bucketName,Key:key}));
 if(!response.Body)throw Error("Missing backup object: "+key);
 return Buffer.from(await response.Body.transformToByteArray());
}
async function verify(client,bucketName,manifest){
 for(const m of manifest){
  const metadata=await client.send(new HeadObjectCommand({Bucket:bucketName,Key:m.key}));
  assert.equal(metadata.ContentLength,m.length,"Restored byte count must match for "+m.key);
  assert.equal(metadata.Metadata?.sha256,m.sha256,"Expected checksum metadata must survive for "+m.key);
  const data=await bytes(client,bucketName,m.key);
  assert.equal(sha(data),m.sha256,"Stored bytes must match signed manifest for "+m.key);
 }
 return manifest.length;
}
async function copy(from,fromBucket,to,toBucket,manifest){
 for(const m of manifest){
  const data=await bytes(from,fromBucket,m.key);
  assert.equal(sha(data),m.sha256,"Refuse to copy corrupt original");
  await to.send(new PutObjectCommand({Bucket:toBucket,Key:m.key,Body:data,
   ContentLength:data.length,ContentType:m.contentType,
   CacheControl:"private, no-store",Metadata:{sha256:m.sha256}}));
 }
}
let primary=null,backup=null,dir=null;
try{
 dir=await mkdtemp(join(tmpdir(),"pde-s3-recovery-"));
 const video=join(dir,"synthetic-original.mp4"),audio=join(dir,"synthetic-voice.wav");
 await run("ffmpeg",["-hide_banner","-loglevel","error","-y","-f","lavfi",
  "-i","color=c=black:s=160x90:r=15","-t","1","-c:v","libx264","-pix_fmt","yuv420p",video],
  {timeout:45000});
 await run("ffmpeg",["-hide_banner","-loglevel","error","-y","-f","lavfi",
  "-i","sine=frequency=440:sample_rate=16000","-t","1","-c:a","pcm_s16le",audio],
  {timeout:45000});
 const fixture=[
  {key:"originals/fictional-candidate/video/source",contentType:"video/mp4",data:await readFile(video)},
  {key:"originals/fictional-candidate/audio/source",contentType:"audio/wav",data:await readFile(audio)},
  {key:"documents/fictional-election/policy.txt",contentType:"text/plain",
   data:Buffer.from("Fictional policy evidence: permanently attributed source, not a real candidate.\n")}
 ];
 const manifest=fixture.map(x=>({key:x.key,length:x.data.length,contentType:x.contentType,sha256:sha(x.data)}));
 const manifestSha256=sha(Buffer.from(manifest.map(x=>x.key+" "+x.length+" "+x.sha256).sort().join("\n")));
 await start(source);await start(independent);
 primary=s3(source);backup=s3(independent);
 await bucket(primary,source.bucket);await bucket(backup,independent.bucket);
 for(const item of fixture){
  const m=manifest.find(x=>x.key===item.key);
  await primary.send(new PutObjectCommand({Bucket:source.bucket,Key:item.key,Body:item.data,
   ContentLength:item.data.length,ContentType:item.contentType,
   CacheControl:"private, no-store",Metadata:{sha256:m.sha256}}));
 }
 assert.equal(await verify(primary,source.bucket,manifest),3);
 await copy(primary,source.bucket,backup,independent.bucket,manifest);
 assert.equal(await verify(backup,independent.bucket,manifest),3);
 // A malicious or corrupted backup must NOT pass integrity verification.
 const first=manifest[0];
 await backup.send(new PutObjectCommand({Bucket:independent.bucket,Key:first.key,
  Body:Buffer.from("corrupt backup replacement"),Metadata:{sha256:first.sha256}}));
 await assert.rejects(verify(backup,independent.bucket,manifest),"Corrupt backup must be rejected.");
 await copy(primary,source.bucket,backup,independent.bucket,manifest);
 assert.equal(await verify(backup,independent.bucket,manifest),3);
 // Destroy the original primary container. The recovered server has new empty storage.
 primary.destroy();primary=null;
 await stop(source);
 await start(source);
 primary=s3(source);
 await bucket(primary,source.bucket);
 const empty=await primary.send(new ListObjectsV2Command({Bucket:source.bucket}));
 assert.equal(empty.KeyCount||0,0,"Primary must really be lost before restoration.");
 await copy(backup,independent.bucket,primary,source.bucket,manifest);
 assert.equal(await verify(primary,source.bucket,manifest),3);
 // Anonymous read must not disclose any private candidate-like object.
 const anonymous=await fetch("http://127.0.0.1:"+source.port+"/"+source.bucket+"/"+first.key);
 assert.ok([401,403].includes(anonymous.status),"Restored originals must remain private.");
 console.log(JSON.stringify({result:"pass",mode:"fictional-media-only",objectsRestored:manifest.length,
  manifestSha256,originalPrimaryDestroyed:true,corruptionDetected:true,anonymousAccessDenied:true}));
}finally{
 primary?.destroy();backup?.destroy();
 for(const server of [source,independent])await stop(server).catch(()=>{});
 if(dir)await rm(dir,{recursive:true,force:true}).catch(()=>{});
}
