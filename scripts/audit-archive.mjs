#!/usr/bin/env node
/**
 * Read-only preservation verification. Does not copy, rewrite, delete, or
 * reprocess original media. Use restricted read-only DB and storage credentials.
 */
import {Pool} from "pg";
import {S3Client,GetObjectCommand} from "@aws-sdk/client-s3";
import {writeFile} from "node:fs/promises";
import {archiveManifestDigest,verifyByteStream} from "../packages/domain/archive-integrity.mjs";
const connection=process.env.DATABASE_URL,endpoint=process.env.AWS_ENDPOINT_URL_S3,bucket=process.env.MEDIA_BUCKET;
if(!connection||!endpoint?.startsWith("https://")||!bucket||!process.env.AWS_ACCESS_KEY_ID||!process.env.AWS_SECRET_ACCESS_KEY)
 throw Error("Database and branch-scoped private archival read credentials are required.");
const maxArg=process.argv.find(x=>x.startsWith("--limit="));
const max=maxArg?Number(maxArg.split("=")[1]):25;
if(!Number.isInteger(max)||max<1||max>5000)throw Error("Audit limit must be from 1 to 5000.");
const output=process.argv.find(x=>x.startsWith("--output="))?.slice(9)||"";
if(output&&(!output.startsWith("/")||output.includes("\0")))throw Error("Use an absolute local audit report path.");
const db=new Pool({connectionString:connection,max:1,connectionTimeoutMillis:10000});
const s3=new S3Client({endpoint,region:process.env.AWS_REGION||"us-east-2",forcePathStyle:true,
 credentials:{accessKeyId:process.env.AWS_ACCESS_KEY_ID,secretAccessKey:process.env.AWS_SECRET_ACCESS_KEY}});
async function findItems(){
 const result=await db.query(
  "SELECT kind,id,storage_key,sha256,size_bytes::text AS bytes FROM ("+
  "SELECT 'video'::text AS kind,m.id::text AS id,m.storage_key,m.original_sha256::text AS sha256,m.size_bytes::bigint AS size_bytes,m.created_at AS time FROM media_assets m JOIN submissions s ON s.media_asset_id=m.id JOIN debates d ON d.id=s.debate_id WHERE s.published_at IS NOT NULL AND d.status='published' "+
  "UNION ALL SELECT 'document'::text,doc.id::text,doc.storage_key,doc.sha256::text,doc.size_bytes::bigint,doc.published_at FROM submission_documents doc JOIN submissions s ON s.id=doc.submission_id JOIN debates d ON d.id=s.debate_id WHERE s.published_at IS NOT NULL AND d.status='published' "+
  "UNION ALL SELECT 'released_summary'::text,a.id::text,a.rendered_storage_key,a.output_sha256::text,NULL::bigint,a.rendered_at FROM derivative_artifacts a WHERE a.status='released' AND a.rendered_storage_key IS NOT NULL "+
  ") AS all_sources ORDER BY time DESC,id LIMIT $1",[max]);
 return result.rows;
}
const findings=[],started=new Date().toISOString();
try{
 const assets=await findItems();
 for(const asset of assets){
  const expectedSize=asset.bytes===null?null:Number(asset.bytes);
  const maxBytes=asset.kind==="document"?20*1024*1024:asset.kind==="video"?60*1024*1024:150*1024*1024;
  try{
   const result=await s3.send(new GetObjectCommand({Bucket:bucket,Key:asset.storage_key}));
   if(!result.Body)throw Error("Object absent");
   const verified=await verifyByteStream(result.Body,{expectedSha256:asset.sha256,expectedSize,maxBytes});
   findings.push({kind:asset.kind,id:asset.id,sha256:verified.sha256,sizeBytes:verified.bytes,verified:true});
  }catch(error){
   findings.push({kind:asset.kind,id:asset.id,sha256:asset.sha256,sizeBytes:expectedSize,verified:false,
    error:error instanceof Error?error.message.slice(0,220):"unclassified"});
  }
 }
 const bad=findings.filter(x=>!x.verified);
 const report={schemaVersion:"1.0.0",auditType:"internal_read_only_storage_verification",
  startedAt:started,finishedAt:new Date().toISOString(),checked:findings.length,failed:bad.length,
  passed:findings.length-bad.length,complete:!maxArg && assets.length<max,
  manifestSha256:archiveManifestDigest(findings),findings};
 if(output)await writeFile(output,JSON.stringify(report,null,2)+"\n",{mode:0o600,flag:"wx"});
 console.log(JSON.stringify({...report,findings:undefined}));
 if(bad.length)process.exitCode=2;
}finally{await db.end();}
