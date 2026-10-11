import {NextRequest,NextResponse} from "next/server";
import {requireIdentity,requireSameOrigin,uuid,jsonError} from "../../../../../../lib/server/http";
import {transcribePrivateSpeech} from "../../../../../../lib/server/private-transcription";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  requireSameOrigin(request);
  const user=await requireIdentity(true);
  return NextResponse.json(await transcribePrivateSpeech(uuid((await params).id,"draft id"),user.id),
   {headers:{"Cache-Control":"private,no-store","X-Content-Type-Options":"nosniff"}});
 }catch(e){return jsonError(e);}
}
