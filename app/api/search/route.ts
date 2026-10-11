import {NextRequest,NextResponse} from "next/server";
import {database} from "../../../lib/server/db";
import {jsonError} from "../../../lib/server/http";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(request:NextRequest){
 try{
  const q=(request.nextUrl.searchParams.get("q")||"").trim();
  if(q.length<2)return NextResponse.json({results:[]});
  if(q.length>200)return NextResponse.json({error:"Search query too long."},{status:400});
  const results=await database().query(
   "SELECT d.id AS debate_id,d.title,c.public_name,ts_headline('english',mc.searchable_text,plainto_tsquery('english',$1),'MaxWords=25,MinWords=10') AS excerpt FROM media_captions mc JOIN media_assets m ON m.id=mc.media_asset_id JOIN submissions s ON s.media_asset_id=m.id JOIN debates d ON d.id=s.debate_id JOIN candidacies c ON c.id=s.candidacy_id WHERE d.status='published' AND s.published_at IS NOT NULL AND to_tsvector('english',mc.searchable_text) @@ plainto_tsquery('english',$1) ORDER BY d.published_at DESC LIMIT 50",[q]);
  return NextResponse.json({results:results.rows},{headers:{"Cache-Control":"public,max-age=60"}});
 }catch(e){return jsonError(e);}
}
