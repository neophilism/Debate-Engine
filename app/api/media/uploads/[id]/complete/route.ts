import {NextRequest,NextResponse} from "next/server";
import {requireSameOrigin,requireIdentity,uuid,jsonError} from "../../../../../../lib/server/http";
import {completeMediaSession} from "../../../../../../lib/server/resumable-uploads";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  requireSameOrigin(request);
  const user=await requireIdentity(true),id=uuid((await params).id,"session ID");
  const result=await completeMediaSession(id,user.id);
  return NextResponse.json(result,{headers:{"Cache-Control":"private,no-store"}});
 }catch(e){return jsonError(e)}
}
