import {NextResponse} from "next/server";
import {uuid,jsonError,HttpError} from "../../../../lib/server/http";
import {loadPublicDebate} from "../../../../lib/server/public-debates";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const id=uuid((await params).id,"debate id");const debate=await loadPublicDebate(id);
  if(!debate)throw new HttpError(404,"Debate not found.");
  return NextResponse.json(debate,{headers:{"Cache-Control":"public,max-age=30"}});
 }catch(e){return jsonError(e);}
}
