import {randomUUID} from "node:crypto";
import {NextRequest,NextResponse} from "next/server";
import {requireSameOrigin,requireIdentity,uuid,jsonError,HttpError} from "../../../../lib/server/http";
import {database,transaction} from "../../../../lib/server/db";
import {examineVideo} from "../../../../lib/server/video";
import {storeOriginal} from "../../../../lib/server/storage";
export const runtime="nodejs";export const dynamic="force-dynamic";
const MAX_REQUEST=63*1024*1024;
export async function POST(request:NextRequest){
 try{
  requireSameOrigin(request);const user=await requireIdentity(true);
  if(Number(request.headers.get("content-length"))>MAX_REQUEST)throw new HttpError(413,"Maximum upload is 60 MiB.");
  const form=await request.formData();
  const cand=uuid(form.get("candidacyId"),"candidacyId");
  const file=form.get("video");
  if(!(file instanceof File))throw new HttpError(400,"A video file is required.");
  if(file.size>60*1024*1024)throw new HttpError(413,"Maximum upload is 60 MiB.");
  const owned=await database().query("SELECT 1 FROM candidacies c JOIN accounts a ON a.id=c.account_id WHERE c.id=$1 AND c.verification_status='verified' AND a.identity_provider='neon-auth' AND a.external_subject=$2",[cand,user.id]);
  if(!owned.rowCount)throw new HttpError(403,"Only a verified candidate may upload.");
  const data=Buffer.from(await file.arrayBuffer());
  const info=examineVideo(data,file.type);
  const mediaId=randomUUID();
  const key="originals/"+cand+"/"+mediaId+"/source";
  await storeOriginal(key,data,info.mime);
  await transaction(async(db)=>{
    await db.query("INSERT INTO media_assets(id,owner_candidacy_id,storage_key,original_sha256,size_bytes,mime_type,duration_seconds,processing_status) VALUES($1,$2,$3,$4,$5,$6,$7,'ready')",[mediaId,cand,key,info.sha256,data.length,info.mime,info.duration]);
    const owner=await db.query<{id:string}>("SELECT a.id FROM accounts a WHERE a.identity_provider='neon-auth' AND a.external_subject=$1",[user.id]);
    if(owner.rows.length)await db.query("INSERT INTO audit_events(actor_account_id,action,target_kind,target_id,context) VALUES($1,'media_validated','media_asset',$2,$3::jsonb)",[owner.rows[0].id,mediaId,JSON.stringify({sha256:info.sha256,duration:info.duration})]);
  });
  return NextResponse.json({mediaAssetId:mediaId,sha256:info.sha256,durationSeconds:info.duration,status:"ready"},{status:201});
 }catch(error){return jsonError(error);}
}
