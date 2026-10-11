import {NextRequest,NextResponse} from "next/server";
import {requireIdentity,requireSameOrigin,uuid,jsonError,HttpError} from "../../../../../lib/server/http";
import {parsePrivateJson} from "../../../../../lib/server/private-json";
import {loadPrivateDraft,updatePrivateDraft} from "../../../../../lib/server/private-drafts";
import {privateReportHistory} from "../../../../../lib/server/private-assessment-service";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 try{const user=await requireIdentity(true),id=uuid((await params).id,"draft id");
  const [draft,reports]=await Promise.all([loadPrivateDraft(id,user.id),privateReportHistory(id,user.id)]);
  return NextResponse.json({draft,reports},{headers:{"Cache-Control":"private,no-store"}});
 }catch(e){return jsonError(e);}
}
export async function PATCH(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  requireSameOrigin(request);const user=await requireIdentity(true),id=uuid((await params).id,"draft id");
  const b=await parsePrivateJson(request);
  if(!b.payload||typeof b.payload!=="object"||Array.isArray(b.payload))throw new HttpError(400,"Updated draft payload required.");
  const transcript=b.transcriptText==null?null:typeof b.transcriptText==="string"?b.transcriptText:null;
  const updated=await updatePrivateDraft(id,user.id,b.payload as Record<string,unknown>,transcript);
  return NextResponse.json(updated,{headers:{"Cache-Control":"private,no-store"}});
 }catch(e){return jsonError(e);}
}
