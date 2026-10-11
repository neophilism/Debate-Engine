import {NextRequest,NextResponse} from "next/server";
import {requireIdentity,requireSameOrigin,uuid,jsonError} from "../../../../../../lib/server/http";
import {markAssistantSkipped} from "../../../../../../lib/server/private-drafts";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  requireSameOrigin(request);const user=await requireIdentity(true);
  const result=await markAssistantSkipped(uuid((await params).id,"draft id"),user.id);
  return NextResponse.json(result,{headers:{"Cache-Control":"private,no-store"}});
 }catch(e){return jsonError(e);}
}
