import {NextResponse} from "next/server";
import {GetObjectCommand} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";
import {requireIdentity,uuid,jsonError,HttpError} from "../../../../../../../lib/server/http";
import {database} from "../../../../../../../lib/server/db";
import {objectStorage} from "../../../../../../../lib/server/storage";
export const dynamic="force-dynamic";export const runtime="nodejs";
export async function GET(_request:Request,{params}:{params:Promise<{id:string;artifactId:string}>}){
 try{
  const user=await requireIdentity(true),p=await params;
  const branchId=uuid(p.id,"branch id"),artifactId=uuid(p.artifactId,"artifact id");
  const file=await database().query<{rendered_storage_key:string}>(
   "SELECT a.rendered_storage_key FROM derivative_artifacts a JOIN debate_branches b ON b.id=a.branch_id JOIN debates d ON d.id=b.debate_id JOIN candidacies c ON c.id IN(d.originator_candidacy_id,b.responder_candidacy_id) JOIN accounts owner ON owner.id=c.account_id WHERE a.id=$1 AND a.branch_id=$2 AND a.status IN('awaiting_approval','approved') AND a.rendered_storage_key IS NOT NULL AND c.verification_status='verified' AND owner.identity_provider='neon-auth' AND owner.external_subject=$3 LIMIT 1",
   [artifactId,branchId,user.id]);
  if(!file.rowCount)throw new HttpError(404,"No candidate-authorized preview of this rendered file is available.");
  const {client,bucket}=objectStorage();
  const url=await getSignedUrl(client,new GetObjectCommand({Bucket:bucket,Key:file.rows[0].rendered_storage_key,ResponseContentDisposition:"inline"}),{expiresIn:180});
  return NextResponse.redirect(url,{status:307,headers:{"Cache-Control":"private, no-store"}});
 }catch(error){return jsonError(error);}
}
