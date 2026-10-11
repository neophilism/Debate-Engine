import {NextRequest,NextResponse} from "next/server";
import {requireIdentity,requireSameOrigin,uuid,jsonError,HttpError} from "../../../../../../lib/server/http";
import {parsePrivateJson} from "../../../../../../lib/server/private-json";
import {confirmPrivatePublication} from "../../../../../../lib/server/confirm-private-publication";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  requireSameOrigin(request);const user=await requireIdentity(true),body=await parsePrivateJson(request);
  if(typeof body.sha256!=="string"||!/^[a-f0-9]{64}$/.test(body.sha256))
   throw new HttpError(400,"Explicit confirmation of the current draft fingerprint is required.");
  const result=await confirmPrivatePublication(uuid((await params).id,"draft id"),user.id,body.sha256);
  return NextResponse.json(result,{headers:{"Cache-Control":"private,no-store"}});
 }catch(e){return jsonError(e);}
}
