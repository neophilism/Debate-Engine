import Link from "next/link";
import {database} from "../../lib/server/db";
export const dynamic="force-dynamic";
type Release={branch_id:string;debate_id:string;title:string;originator:string;contender:string;sha256:string;policy_version_id:string;agreed_at:string;};
async function releases(){
 const result=await database().query<Release>(
  "SELECT DISTINCT ON(b.id) b.id AS branch_id,d.id AS debate_id,d.title,c1.public_name AS originator,c2.public_name AS contender,p.content_sha256 AS sha256,p.id AS policy_version_id,GREATEST(a1.signed_at,a2.signed_at) AS agreed_at FROM debate_branches b JOIN debates d ON d.id=b.debate_id AND d.status='published' JOIN candidacies c1 ON c1.id=d.originator_candidacy_id JOIN candidacies c2 ON c2.id=b.responder_candidacy_id JOIN policy_versions p ON p.branch_id=b.id JOIN policy_acceptances a1 ON a1.policy_version_id=p.id AND a1.candidacy_id=d.originator_candidacy_id JOIN policy_acceptances a2 ON a2.policy_version_id=p.id AND a2.candidacy_id=b.responder_candidacy_id ORDER BY b.id,GREATEST(a1.signed_at,a2.signed_at) DESC LIMIT 100");
 return result.rows.sort((a,b)=>new Date(b.agreed_at).getTime()-new Date(a.agreed_at).getTime());
}
export default async function PressPage(){
 let items:Release[]=[];let available=true;try{items=await releases();}catch{available=false;}
 return <div className="interior-page"><p className="eyebrow dark">PUBLIC DEBATE / MEDIA LIBRARY</p><h1>Agreements<br/><em>on the record.</em></h1>
 <p className="interior-lead">When opposing candidates jointly accept a policy, their exact agreement and the complete original public debate remain accessible to everyone. Download a verifiable press package, with approved short videos linked where available.</p>
 {!available?<p role="status">The press archive is currently unavailable.</p>:items.length===0?<section className="empty-record"><div><h2>No joint agreements have been published yet.</h2><p>This section will display agreements only after both participants have approved the same policy.</p></div></section>:
 <div className="debate-grid">{items.map(x=><article className="debate-card" key={x.branch_id}><p className="small-label">MUTUALLY ACCEPTED POLICY</p><h2>{x.title}</h2><p>{x.originator} and {x.contender}</p><div className="press-links"><Link className="inline-arrow" href={"/debates/"+x.debate_id}>Full public record ↗</Link><a className="inline-arrow" href={"/api/branches/"+x.branch_id+"/press-kit?format=zip"}>Download evidence package ↗</a><a className="inline-arrow" href={"/api/branches/"+x.branch_id+"/press-kit?format=json"}>Machine-readable manifest ↗</a></div></article>)}</div>}
 </div>;
}
