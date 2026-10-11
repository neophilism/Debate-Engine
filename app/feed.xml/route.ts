import {NextRequest} from "next/server";
import {database} from "../../lib/server/db";
import {rssFeed} from "../../packages/domain/xml";
export const runtime="nodejs";export const dynamic="force-dynamic";
type Entry={id:string;title:string;debate_id:string;originator:string;contender:string;accepted_at:string};
export async function GET(request:NextRequest){
 try{
  const result=await database().query<Entry>(
   "SELECT p.id,d.title,d.id AS debate_id,origin.public_name AS originator,responder.public_name AS contender,GREATEST(a1.signed_at,a2.signed_at) AS accepted_at FROM policy_versions p JOIN debate_branches b ON b.id=p.branch_id JOIN debates d ON d.id=b.debate_id AND d.status='published' JOIN candidacies origin ON origin.id=d.originator_candidacy_id JOIN candidacies responder ON responder.id=b.responder_candidacy_id JOIN policy_acceptances a1 ON a1.policy_version_id=p.id AND a1.candidacy_id=d.originator_candidacy_id JOIN policy_acceptances a2 ON a2.policy_version_id=p.id AND a2.candidacy_id=b.responder_candidacy_id ORDER BY GREATEST(a1.signed_at,a2.signed_at) DESC LIMIT 60"
  );
  const base=process.env.PUBLIC_BASE_URL||process.env.RENDER_EXTERNAL_URL||request.nextUrl.origin;
  const entries=result.rows.map(r=>({id:"urn:public-debate-engine:policy:"+r.id,
   title:"Joint policy agreement: "+r.title,
   url:new URL("/debates/"+r.debate_id,base).toString(),
   description:r.originator+" and "+r.contender+" accepted the same policy version. Read their full unedited debate and source materials.",
   publishedAt:r.accepted_at}));
  return new Response(rssFeed(new URL("/press",base).toString(),entries),{headers:{"content-type":"application/rss+xml; charset=utf-8","cache-control":"public,max-age=300","x-content-type-options":"nosniff"}});
 }catch{return new Response("Feed temporarily unavailable.",{status:503,headers:{"cache-control":"no-store"}});}
}
