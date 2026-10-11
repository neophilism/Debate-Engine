import {NextResponse} from "next/server";
import {database} from "../../../../../lib/server/db";
import {playOriginal} from "../../../../../lib/server/storage";
import {uuid,jsonError,HttpError} from "../../../../../lib/server/http";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const id=uuid((await params).id,"media id");
  const row=await database().query<{storage_key:string}>(
   "SELECT m.storage_key FROM media_assets m JOIN submissions s ON s.media_asset_id=m.id JOIN debates d ON d.id=s.debate_id WHERE m.id=$1 AND m.processing_status='ready' AND s.published_at IS NOT NULL AND d.status='published' LIMIT 1",[id]);
  if(!row.rowCount)throw new HttpError(404,"Media not publicly released.");
  const url=await playOriginal(row.rows[0].storage_key);
  return NextResponse.redirect(url,{status:307,headers:{"Cache-Control":"private,no-store"}});
 }catch(e){return jsonError(e);}
}
