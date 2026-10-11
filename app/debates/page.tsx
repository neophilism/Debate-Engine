import Link from "next/link";
import type {Metadata} from "next";
import {listPublicDebates} from "../../lib/server/public-debates";
export const metadata:Metadata={title:"Public debates"};export const dynamic="force-dynamic";
export default async function DebatesPage(){
 let debates:Awaited<ReturnType<typeof listPublicDebates>>=[];let available=true;
 try{debates=await listPublicDebates();}catch{available=false;}
 return <div className="interior-page"><p className="eyebrow dark">THE PUBLIC RECORD / DEBATES</p><h1>Debates in<br/><em>the open.</em></h1>
 <p className="interior-lead">Browse the original proposal, every published response, reciprocal questions, and any policy agreement.</p>
 {!available?<section className="empty-record"><div><h2>Public record is temporarily unavailable.</h2><p>We cannot verify the debate archive at present. Nothing has been replaced with sample data.</p></div></section>:
 debates.length===0?<section className="empty-record" aria-labelledby="empty-title"><span className="empty-figure" aria-hidden="true">↔</span><div><p className="small-label">PUBLICATION STATUS</p><h2 id="empty-title">No debates have been published yet.</h2><p>Debate materials will appear when verified candidates publish them. Unverified drafts and examples are not presented as real statements.</p><Link href="/protocol" className="inline-arrow">How the format works ↗</Link></div></section>:
 <div className="debate-grid">{debates.map(d=><Link href={"/debates/"+d.id} className="debate-card" key={d.id}><p className="small-label">{d.office} / {d.election_label}</p><h2>{d.title}</h2><p>{d.proposition}</p><div className="debate-card-meta"><span>Opened by {d.originator}</span><span>{d.contender_count} contenders · {d.contribution_count} published videos</span><strong aria-hidden="true">↗</strong></div></Link>)}</div>}
 </div>;
}
