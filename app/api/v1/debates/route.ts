import {NextRequest,NextResponse} from "next/server";
import {database} from "../../../../lib/server/db";
import {HttpError,jsonError} from "../../../../lib/server/http";
import {decodeDebateCursor,encodeDebateCursor} from "../../../../packages/domain/pagination";
export const runtime="nodejs";export const dynamic="force-dynamic";
type Row={id:string;title:string;proposition:string;published_at:Date;originator:string;office:string;election_label:string;contribution_count:number;contender_count:number};
export async function GET(request:NextRequest){
 try{
  const params=request.nextUrl.searchParams;
  const rawLimit=params.get("limit");
  if(rawLimit&&!/^[0-9]{1,3}$/.test(rawLimit))throw new HttpError(400,"limit must be a whole number from 1 to 100.");
  const limit=rawLimit?Number(rawLimit):20;
  if(limit<1||limit>100)throw new HttpError(400,"limit must be from 1 to 100.");
  let cursor:{publishedAt:string;id:string}|null=null;
  const value=params.get("cursor");
  if(value){try{cursor=decodeDebateCursor(value);}catch{throw new HttpError(400,"Invalid page cursor.");}}
  const data=await database().query<Row>(
    "SELECT d.id,d.title,d.proposition,d.published_at,origin.public_name AS originator,office.title AS office,cycle.label AS election_label,(SELECT count(*)::int FROM submissions s WHERE s.debate_id=d.id AND s.published_at IS NOT NULL) AS contribution_count,(SELECT count(*)::int FROM debate_branches b WHERE b.debate_id=d.id) AS contender_count FROM debates d JOIN candidacies origin ON origin.id=d.originator_candidacy_id JOIN election_cycles cycle ON cycle.id=d.election_id JOIN offices office ON office.id=cycle.office_id WHERE d.status='published' AND ($1::timestamptz IS NULL OR (d.published_at,d.id) < ($1::timestamptz,$2::uuid)) ORDER BY d.published_at DESC,d.id DESC LIMIT $3",
    [cursor?.publishedAt||null,cursor?.id||null,limit+1]
  );
  const slice=data.rows.slice(0,limit);
  const last=slice.at(-1);
  const nextCursor=data.rows.length>limit&&last?encodeDebateCursor(last.published_at,last.id):null;
  return NextResponse.json({schemaVersion:"1.0.0",items:slice,nextCursor},{headers:{"Cache-Control":"public,max-age=30","X-Content-Type-Options":"nosniff"}});
 }catch(e){return jsonError(e);}
}
