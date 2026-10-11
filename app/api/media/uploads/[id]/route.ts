import {NextRequest,NextResponse} from "next/server";
import {requireIdentity,requireSameOrigin,uuid,jsonError} from "../../../../../lib/server/http";
import {inspectMediaSession,abortMediaSession} from "../../../../../lib/server/resumable-uploads";
export const runtime="nodejs";export const dynamic="force-dynamic";
type Params={params:Promise<{id:string}>};
export async function GET(_request:NextRequest,{params}:Params){
 try{
  const user=await requireIdentity(true),id=uuid((await params).id,"session ID");
  const state=await inspectMediaSession(id,user.id);
  return NextResponse.json(state,{headers:{"Cache-Control":"private,no-store"}});
 }catch(e){return jsonError(e)}
}
export async function DELETE(request:NextRequest,{params}:Params){
 try{
  requireSameOrigin(request);const user=await requireIdentity(true),id=uuid((await params).id,"session ID");
  return NextResponse.json(await abortMediaSession(id,user.id),{headers:{"Cache-Control":"private,no-store"}});
 }catch(e){return jsonError(e)}
}
