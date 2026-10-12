import "server-only";
import {randomUUID,createHash} from "node:crypto";
import {
 CreateMultipartUploadCommand,AbortMultipartUploadCommand,UploadPartCommand,
 ListPartsCommand,CompleteMultipartUploadCommand,HeadObjectCommand,GetObjectCommand,DeleteObjectCommand
} from "@aws-sdk/client-s3";
import {objectStorage} from "./storage";
import {database,transaction} from "./db";
import {HttpError} from "./http";
import {examineVideo} from "./video";
import {examineAudio} from "./audio";
import {scanOriginalBeforeValidation} from "./malware";
import {MEDIA_PART_BYTES,partCount,expectedPartSize,completionParts} from "../../packages/domain/upload-parts";

type Modality="video"|"audio";
type Session={
 id:string;owner_candidacy_id:string;media_asset_id:string;storage_key:string;storage_upload_id:string;
 modality:Modality;claimed_mime:string;expected_sha256:string;declared_size_bytes:string|number;part_count:number;
 status:"uploading"|"finalizing"|"completed"|"failed"|"aborted";expires_at:Date|string;
};
const s3Timeout=()=>({abortSignal:AbortSignal.timeout(90000)});
function originalStorageMime(modality:Modality,claimed:string){
 if(claimed==="application/octet-stream"||!claimed)return modality==="audio"?"audio/mpeg":"video/mp4";
 if(!claimed.startsWith(modality+"/")||claimed.length>80||!/^[-\w/.+]+$/.test(claimed))
  throw new HttpError(415,"Upload content type does not match the chosen medium.");
 return claimed;
}
async function ownedSession(id:string,authSubject:string):Promise<Session>{
 const row=await database().query<Session>(
  "SELECT u.* FROM media_upload_sessions u JOIN candidacies c ON c.id=u.owner_candidacy_id JOIN accounts a ON a.id=c.account_id WHERE u.id=$1 AND a.identity_provider='neon-auth' AND a.external_subject=$2 AND c.verification_status='verified'",
  [id,authSubject]);
 if(!row.rowCount)throw new HttpError(404,"Upload session was not found for your verified candidacy.");
 return row.rows[0];
}
function active(s:Session){
 if(s.status!=="uploading")throw new HttpError(409,"This upload is no longer accepting parts.");
 if(new Date(s.expires_at).getTime()<=Date.now())throw new HttpError(410,"Upload session expired. Select the original again to start a new upload.");
}
export async function createMediaSession(input:{
 candidacyId:string;authSubject:string;modality:Modality;sizeBytes:number;claimedMime:string;expectedSha256:string
}){
 let count:number;
 try{count=partCount(input.sizeBytes)}catch(e){throw new HttpError(413,(e as Error).message)}
 if(!/^[0-9a-f]{64}$/.test(input.expectedSha256))throw new HttpError(400,"The original SHA-256 digest is required.");
 const mime=originalStorageMime(input.modality,input.claimedMime);
 const owner=await database().query(
  "SELECT 1 FROM candidacies c JOIN accounts a ON a.id=c.account_id WHERE c.id=$1 AND c.verification_status='verified' AND a.identity_provider='neon-auth' AND a.external_subject=$2",
  [input.candidacyId,input.authSubject]);
 if(!owner.rowCount)throw new HttpError(403,"Only a verified candidate may upload their original.");
 const id=randomUUID(),mediaId=randomUUID();
 const key="originals/"+input.candidacyId+"/"+mediaId+"/source";
 const {client,bucket}=objectStorage();
 const created=await client.send(new CreateMultipartUploadCommand({
  Bucket:bucket,Key:key,ContentType:mime,CacheControl:"private, no-store",
  Metadata:{"archival":"original-unaltered","session":id}
 }),s3Timeout());
 if(!created.UploadId)throw new HttpError(503,"The storage provider did not create a resumable session.");
 try{
  await database().query(
   "INSERT INTO media_upload_sessions(id,owner_candidacy_id,media_asset_id,storage_key,storage_upload_id,modality,claimed_mime,expected_sha256,declared_size_bytes,part_count) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)",
   [id,input.candidacyId,mediaId,key,created.UploadId,input.modality,mime,input.expectedSha256,input.sizeBytes,count]);
 }catch(e){
  await client.send(new AbortMultipartUploadCommand({Bucket:bucket,Key:key,UploadId:created.UploadId}),s3Timeout()).catch(()=>{});
  throw e;
 }
 return {sessionId:id,partSizeBytes:MEDIA_PART_BYTES,partCount:count,expiresInHours:24};
}
export async function inspectMediaSession(id:string,authSubject:string){
 const s=await ownedSession(id,authSubject);
 if(new Date(s.expires_at).getTime()<=Date.now()&&s.status==="uploading")
  throw new HttpError(410,"Upload session expired.");
 const result:{sessionId:string;status:Session["status"];partSizeBytes:number;partCount:number;
  expectedSha256:string;sizeBytes:number;uploadedParts:number[];mediaAssetId:string|null}={
  sessionId:s.id,status:s.status,partSizeBytes:MEDIA_PART_BYTES,partCount:s.part_count,
  expectedSha256:s.expected_sha256,sizeBytes:Number(s.declared_size_bytes),uploadedParts:[],
  mediaAssetId:s.status==="completed"?s.media_asset_id:null
 };
 if(s.status==="uploading"){
  const {client,bucket}=objectStorage();
  const remote=await client.send(new ListPartsCommand({Bucket:bucket,Key:s.storage_key,UploadId:s.storage_upload_id}),s3Timeout());
  result.uploadedParts=(remote.Parts||[]).filter(p=>Number.isInteger(p.PartNumber)&&p.PartNumber!>=1&&p.PartNumber!<=s.part_count&&
    p.Size===expectedPartSize(Number(s.declared_size_bytes),p.PartNumber!)).map(p=>p.PartNumber!);
 }
 return result;
}
export async function putMediaPart(id:string,authSubject:string,partNumber:number,bytes:Buffer){
 const s=await ownedSession(id,authSubject);
 active(s);
 let expected:number;
 try{expected=expectedPartSize(Number(s.declared_size_bytes),partNumber)}
 catch(e){throw new HttpError(400,(e as Error).message)}
 if(bytes.length!==expected)throw new HttpError(400,"This part does not match the expected byte range.");
 const {client,bucket}=objectStorage();
 const result=await client.send(new UploadPartCommand({
  Bucket:bucket,Key:s.storage_key,UploadId:s.storage_upload_id,PartNumber:partNumber,
  Body:bytes,ContentLength:bytes.length
 }),s3Timeout());
 if(!result.ETag)throw new HttpError(503,"The storage provider did not acknowledge the upload part.");
 return {partNumber,etag:result.ETag,sha256:createHash("sha256").update(bytes).digest("hex")};
}
async function persistedOriginal(s:Session){
 const {client,bucket}=objectStorage();
 const head=await client.send(new HeadObjectCommand({Bucket:bucket,Key:s.storage_key}),s3Timeout());
 if(head.ContentLength!==Number(s.declared_size_bytes))
  throw new HttpError(422,"The completed source size does not match the declared original.");
 const item=await client.send(new GetObjectCommand({Bucket:bucket,Key:s.storage_key}),s3Timeout());
 if(!item.Body)throw new HttpError(503,"The storage provider could not return the original.");
 const data=Buffer.from(await item.Body.transformToByteArray());
 if(data.length!==Number(s.declared_size_bytes))
  throw new HttpError(422,"The stored original was incomplete.");
 const actual=createHash("sha256").update(data).digest("hex");
 if(actual!==s.expected_sha256)throw new HttpError(422,"The stored original does not match the selected file. Start a fresh session.");
 const scanner=await scanOriginalBeforeValidation(data);
 const info=s.modality==="audio"?examineAudio(data,s.claimed_mime):examineVideo(data,s.claimed_mime);
 if(!info.mime.startsWith(s.modality+"/"))throw new HttpError(415,"The uploaded container has the wrong medium.");
 await transaction(async db=>{
  const inserted=await db.query(
   "INSERT INTO media_assets(id,owner_candidacy_id,storage_key,original_sha256,size_bytes,mime_type,duration_seconds,processing_status) VALUES($1,$2,$3,$4,$5,$6,$7,'ready') ON CONFLICT(id) DO NOTHING",
   [s.media_asset_id,s.owner_candidacy_id,s.storage_key,actual,data.length,info.mime,info.duration]);
  if(inserted.rowCount)await db.query("INSERT INTO media_scan_attestations(media_asset_id,original_sha256,scanner,verdict) VALUES($1,$2,$3,$4)",[s.media_asset_id,actual,scanner.scanner,scanner.verdict]);
  await db.query("UPDATE media_upload_sessions SET status='completed',completed_at=now() WHERE id=$1 AND status IN ('finalizing','completed')",[s.id]);
  if(inserted.rowCount){
   await db.query(
    "INSERT INTO audit_events(actor_account_id,action,target_kind,target_id,context) SELECT c.account_id,'media_validated','media_asset',$2,$3::jsonb FROM candidacies c WHERE c.id=$1",
    [s.owner_candidacy_id,s.media_asset_id,JSON.stringify({sha256:actual,duration:info.duration,resumable:true})]);
  }
 });
 return {mediaAssetId:s.media_asset_id,sha256:actual,durationSeconds:info.duration,status:"ready",modality:s.modality};
}
export async function completeMediaSession(id:string,authSubject:string){
 const s=await ownedSession(id,authSubject);
 if(s.status==="completed"){
  const existing=await database().query<{original_sha256:string;duration_seconds:string}>("SELECT original_sha256,duration_seconds FROM media_assets WHERE id=$1 AND owner_candidacy_id=$2",
   [s.media_asset_id,s.owner_candidacy_id]);
  if(!existing.rowCount)throw new HttpError(503,"Completed upload metadata is unavailable.");
  return {mediaAssetId:s.media_asset_id,sha256:existing.rows[0].original_sha256,
   durationSeconds:Number(existing.rows[0].duration_seconds),status:"ready",modality:s.modality};
 }
 if(s.status==="aborted"||s.status==="failed")throw new HttpError(409,"This upload cannot be completed; start again.");
 if(new Date(s.expires_at).getTime()<=Date.now())throw new HttpError(410,"Upload expired.");
 const {client,bucket}=objectStorage();
 if(s.status==="uploading"){
  const list=await client.send(new ListPartsCommand({Bucket:bucket,Key:s.storage_key,UploadId:s.storage_upload_id}),s3Timeout());
  let parts:ReturnType<typeof completionParts>;
  try{parts=completionParts(Number(s.declared_size_bytes),list.Parts||[])}
  catch(e){throw new HttpError(409,(e as Error).message)}
  const claimed=await database().query(
   "UPDATE media_upload_sessions SET status='finalizing' WHERE id=$1 AND status='uploading' AND expires_at>now() RETURNING id",[s.id]);
  if(!claimed.rowCount)throw new HttpError(409,"Another request is completing this upload.");
  try{
   await client.send(new CompleteMultipartUploadCommand({
    Bucket:bucket,Key:s.storage_key,UploadId:s.storage_upload_id,MultipartUpload:{Parts:parts}
   }),s3Timeout());
  }catch(e){
   // A timed-out CompleteMultipartUpload might have completed on the server.
   // Do not restart the multipart upload if an assembled object now exists.
   const assembled=await client.send(new HeadObjectCommand({Bucket:bucket,Key:s.storage_key}),s3Timeout()).then(()=>true,()=>false);
   if(!assembled)await database().query("UPDATE media_upload_sessions SET status='uploading' WHERE id=$1 AND status='finalizing'",[s.id]);
   throw e;
  }
 }
 try{return await persistedOriginal(s)}
 catch(e){
  // Reject only a provably wrong source. Database and storage outages remain recoverable.
  if(e instanceof HttpError&&[413,415,422].includes(e.status)){
   await database().query("UPDATE media_upload_sessions SET status='failed' WHERE id=$1 AND status='finalizing'",[s.id]);
   await client.send(new DeleteObjectCommand({Bucket:bucket,Key:s.storage_key}),s3Timeout()).catch(()=>{});
  }
  throw e;
 }
}
export async function abortMediaSession(id:string,authSubject:string){
 const s=await ownedSession(id,authSubject);
 if(s.status==="completed"||s.status==="finalizing")throw new HttpError(409,"A finalized original may not be deleted through upload cancellation.");
 if(s.status==="failed"||s.status==="aborted")return {aborted:true};
 const changed=await database().query("UPDATE media_upload_sessions SET status='aborted' WHERE id=$1 AND status='uploading' RETURNING id",[s.id]);
 if(!changed.rowCount)throw new HttpError(409,"Upload state changed. Retry after refresh.");
 const {client,bucket}=objectStorage();
 await client.send(new AbortMultipartUploadCommand({Bucket:bucket,Key:s.storage_key,UploadId:s.storage_upload_id}),s3Timeout());
 return {aborted:true};
}
