import {NextResponse} from "next/server";
import {GetObjectCommand} from "@aws-sdk/client-s3";
import {getSignedUrl} from "@aws-sdk/s3-request-presigner";
import {database} from "../../../../../../../lib/server/db";
import {objectStorage} from "../../../../../../../lib/server/storage";
import {uuid,jsonError,HttpError} from "../../../../../../../lib/server/http";
export const dynamic="force-dynamic";export const runtime="nodejs";
export async function GET(_r:Request,{params}:{params:Promise<{id:string;artifactId:string}>}){
 try{
 const p=await params,branchId=uuid(p.id,"branch id"),artifactId=uuid(p.artifactId,"artifact id");
 const a=await database().query<{rendered_storage_key:string}>("SELECT rendered_storage_key FROM derivative_artifacts WHERE id=$1 AND branch_id=$2 AND status='released' AND rendered_storage_key IS NOT NULL",[artifactId,branchId]);
 if(!a.rowCount)throw new HttpError(404,"Summary has not been approved and released.");
 const {client,bucket}=objectStorage();
 const url=await getSignedUrl(client,new GetObjectCommand({Bucket:bucket,Key:a.rows[0].rendered_storage_key,ResponseContentDisposition:"attachment; filename=debate-summary.mp4"}),{expiresIn:300});
 return NextResponse.redirect(url,{status:307,headers:{"Cache-Control":"private,no-store"}});
 }catch(e){return jsonError(e);}
}
