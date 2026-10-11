import {NextResponse} from "next/server";
import {database} from "../../../../../lib/server/db";
import {loadPublicDebate} from "../../../../../lib/server/public-debates";
import {publicDocuments} from "../../../../../lib/server/documents";
import {uuid,HttpError,jsonError} from "../../../../../lib/server/http";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const id=uuid((await params).id,"debate id"),record=await loadPublicDebate(id);
  if(!record)throw new HttpError(404,"Published debate not found.");
  const media=await database().query<{submission_id:string;sha256:string;mime_type:string;size_bytes:string;media_asset_id:string}>(
   "SELECT s.id AS submission_id,m.original_sha256 AS sha256,m.mime_type,m.size_bytes::text,m.id AS media_asset_id FROM submissions s JOIN media_assets m ON m.id=s.media_asset_id WHERE s.debate_id=$1 AND s.published_at IS NOT NULL ORDER BY s.published_at,s.id",[id]);
  const events=await database().query(
   "SELECT id,branch_id,actor_candidacy_id,kind,object_id,payload,published_at FROM publication_events WHERE debate_id=$1 ORDER BY published_at,id LIMIT 2000",[id]);
  return NextResponse.json({schemaVersion:"1.0.0",kind:"full_public_debate_record",
   ...record,
   supportingDocuments:await publicDocuments(id),
   sourceIntegrity:media.rows.map(x=>({...x,publicPath:"/api/media/"+x.media_asset_id+"/play"})),
   publicationHistory:events.rows,
   notice:"Question assessments are attributed participant judgments, not an independent fact-check. All published responses remain available even when not qualified for the reciprocal sequence."
  },{headers:{"Cache-Control":"public,max-age=30","X-Content-Type-Options":"nosniff"}});
 }catch(e){return jsonError(e);}
}
