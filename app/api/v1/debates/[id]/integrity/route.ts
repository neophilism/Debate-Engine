import {NextResponse} from "next/server";
import {createHash} from "node:crypto";
import {database} from "../../../../../../lib/server/db";
import {uuid,jsonError,HttpError} from "../../../../../../lib/server/http";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const id=uuid((await params).id,"debate id");
  const found=await database().query("SELECT 1 FROM debates WHERE id=$1 AND status='published'",[id]);
  if(!found.rowCount)throw new HttpError(404,"No published debate exists with that ID.");
  const rows=await database().query<{kind:string;id:string;sha256:string;size_bytes:string|null;published_at:string}>(
   "SELECT kind,id,sha256,size_bytes,published_at FROM ("+
   "SELECT 'original_video'::text AS kind,m.id::text AS id,m.original_sha256::text AS sha256,m.size_bytes::text AS size_bytes,s.published_at FROM media_assets m JOIN submissions s ON s.media_asset_id=m.id WHERE s.debate_id=$1 AND s.published_at IS NOT NULL "+
   "UNION ALL SELECT 'supporting_document'::text,doc.id::text,doc.sha256::text,doc.size_bytes::text,doc.published_at FROM submission_documents doc JOIN submissions s ON s.id=doc.submission_id WHERE s.debate_id=$1 AND s.published_at IS NOT NULL "+
   "UNION ALL SELECT 'released_summary'::text,a.id::text,a.output_sha256::text,NULL::text,a.rendered_at FROM derivative_artifacts a JOIN debate_branches b ON b.id=a.branch_id WHERE b.debate_id=$1 AND a.status='released' AND a.rendered_storage_key IS NOT NULL "+
   ") AS entries ORDER BY kind,id",[id]);
  const entries=rows.rows;
  const payload={schemaVersion:"1.0.0",debateId:id,entries};
  const digest=createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  return NextResponse.json({...payload,manifestSha256:digest,
   notice:"These are SHA-256 digests of declared published files, not a proof that external storage has been independently audited or replicated."},
   {headers:{"Cache-Control":"public,max-age=60","X-Content-Type-Options":"nosniff"}});
 }catch(e){return jsonError(e);}
}
