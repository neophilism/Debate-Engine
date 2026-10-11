#!/usr/bin/env node
/**
 * Bounded, idempotent orphan multipart cleanup. Run from an authorized operator
 * scheduler or isolated maintenance process. Does not require a running web app.
 * Never deletes a validated or published original.
 */
import pg from "pg";
import {S3Client,AbortMultipartUploadCommand} from "@aws-sdk/client-s3";
import {pathToFileURL} from "node:url";
import {resolve} from "node:path";
const {Pool}=pg;
const limit=Math.min(100,Math.max(1,Number(process.env.UPLOAD_GC_BATCH_SIZE||25)));
const dryRun=process.argv.includes("--dry-run");
export async function collectExpiredUploads({pool,client,bucket,dryRun:checkOnly=false,limit:max=limit,now=new Date()}){
 if(!Number.isInteger(max)||max<1||max>100)throw Error("Invalid bounded maintenance batch.");
 const connection=await pool.connect();
 let aborted=0,skipped=0,errors=0;
 try{
  const list=await connection.query(
   "SELECT id,storage_key,storage_upload_id,status,expires_at FROM media_upload_sessions WHERE expires_at<$1 AND status IN('uploading','finalizing') ORDER BY expires_at,id LIMIT $2",
   [now,max]);
  for(const row of list.rows){
   // Finalization may already have completed the storage multipart operation.
   // Human recovery determines the correct terminal state; never erase this object.
   if(row.status==="finalizing"){skipped++;continue;}
   if(checkOnly){aborted++;continue;}
   try{
    const probe=await connection.query("SELECT status FROM media_upload_sessions WHERE id=$1 AND status='uploading' AND expires_at<$2",[row.id,now]);
    if(!probe.rowCount){skipped++;continue;}
    try{
     await client.send(new AbortMultipartUploadCommand({
      Bucket:bucket,Key:row.storage_key,UploadId:row.storage_upload_id
     }),{abortSignal:AbortSignal.timeout(60000)});
    }catch(e){
     if(e?.name!=="NoSuchUpload")throw e;
    }
    const done=await connection.query(
     "UPDATE media_upload_sessions SET status='aborted' WHERE id=$1 AND status='uploading' AND expires_at<$2 RETURNING id",
     [row.id,now]);
    if(done.rowCount)aborted++;else skipped++;
   }catch(e){
    errors++;
    console.error("Multipart cleanup failed for session",row.id,e instanceof Error?e.name:"unknown");
   }
  }
  return {aborted,skipped,errors,scanned:list.rows.length,dryRun:checkOnly};
 }finally{connection.release()}
}
async function run(){
 if(!process.env.DATABASE_URL?.startsWith("postgres")||!process.env.MEDIA_BUCKET||!process.env.AWS_ENDPOINT_URL_S3?.startsWith("https://")
   ||!process.env.AWS_ACCESS_KEY_ID||!process.env.AWS_SECRET_ACCESS_KEY)
  throw Error("Authorized database and private object-store configuration are required.");
 const pool=new Pool({connectionString:process.env.DATABASE_URL,max:1,connectionTimeoutMillis:10000});
 const client=new S3Client({endpoint:process.env.AWS_ENDPOINT_URL_S3,
  region:process.env.AWS_REGION||"us-east-2",forcePathStyle:true,
  credentials:{accessKeyId:process.env.AWS_ACCESS_KEY_ID,secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY}});
 try{
  const result=await collectExpiredUploads({pool,client,bucket:process.env.MEDIA_BUCKET,dryRun});
  console.log(JSON.stringify(result));
  if(result.errors)process.exitCode=1;
 }finally{await pool.end();client.destroy()}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
 run().catch(e=>{console.error(e instanceof Error?e.message:"Unknown maintenance error");process.exitCode=1});
}
