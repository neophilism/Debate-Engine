import {NextRequest,NextResponse} from "next/server";
import {uuid,requireIdentity,requireSameOrigin,parseJson,record,field,jsonError,HttpError} from "../../../../../lib/server/http";
import {transaction,database} from "../../../../../lib/server/db";
import {normalizeCaptions} from "../../../../../packages/domain/captions";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(_r:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const id=uuid((await params).id,"media id");
  const r=await database().query<{caption_text:string}>("SELECT mc.caption_text FROM media_captions mc JOIN media_assets m ON m.id=mc.media_asset_id JOIN submissions s ON s.media_asset_id=m.id JOIN debates d ON d.id=s.debate_id WHERE mc.media_asset_id=$1 AND s.published_at IS NOT NULL AND d.status='published' AND mc.language_code='en' ORDER BY reviewed_by_human DESC, published_at DESC LIMIT 1",[id]);
  if(!r.rowCount)return new NextResponse("Caption file not found.",{status:404});
  return new NextResponse(r.rows[0].caption_text,{headers:{"content-type":"text/vtt; charset=utf-8","cache-control":"public,max-age=120","x-content-type-options":"nosniff"}});
 }catch(e){return jsonError(e);}
}
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{requireSameOrigin(request);const user=await requireIdentity(true);
  const id=uuid((await params).id,"media id");const b=record(await parseJson(request));
  const candidateId=uuid(b.candidacyId,"candidate id");
  const language=field(b.languageCode||"en","language code",12);
  if(!/^[a-z]{2,3}(-[A-Z]{2})?$/.test(language))throw new HttpError(400,"Invalid language code.");
  if(typeof b.webvtt!=="string")throw new HttpError(400,"WebVTT content required.");
  const parsed=normalizeCaptions(b.webvtt);
  const reviewed=b.humanReviewed===true;
  const result=await transaction(async db=>{
   const media=await db.query<{duration_seconds:string}>("SELECT m.duration_seconds FROM media_assets m JOIN submissions s ON s.media_asset_id=m.id JOIN candidacies c ON c.id=m.owner_candidacy_id JOIN accounts a ON a.id=c.account_id WHERE m.id=$1 AND m.owner_candidacy_id=$2 AND s.published_at IS NOT NULL AND c.verification_status='verified' AND a.identity_provider='neon-auth' AND a.external_subject=$3",[id,candidateId,user.id]);
   if(!media.rowCount)throw new HttpError(403,"Only the verified original-video owner may publish its transcript.");
   if(parsed.duration>Number(media.rows[0].duration_seconds)+0.5)throw new HttpError(400,"Caption timeline exceeds source video duration.");
   const q=await db.query<{id:string}>("INSERT INTO media_captions(media_asset_id,published_by_candidacy_id,language_code,caption_text,searchable_text,reviewed_by_human) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",[id,candidateId,language,parsed.webvtt,parsed.searchableText,reviewed]);
   const s=await db.query<{debate_id:string;branch_id:string|null}>("SELECT debate_id,branch_id FROM submissions WHERE media_asset_id=$1",[id]);
   await db.query("INSERT INTO publication_events(debate_id,branch_id,actor_candidacy_id,kind,object_id,payload) VALUES($1,$2,$3,'captions_published',$4,$5::jsonb)",[s.rows[0].debate_id,s.rows[0].branch_id,candidateId,q.rows[0].id,JSON.stringify({language,humanReviewed:reviewed})]);
   return q.rows[0];
  });
  return NextResponse.json({captionId:result.id},{status:201});
 }catch(e){return jsonError(e);}
}
