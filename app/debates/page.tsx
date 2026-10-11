import Link from "next/link";
import type {Metadata} from "next";
import {listPublicDebatesPage,publicDebateFilterOptions} from "../../lib/server/public-debates";
import {parseDebateFilters,debateFilterUrl} from "../../packages/domain/discovery";
export const metadata:Metadata={title:"Public debates"};export const dynamic="force-dynamic";
export default async function DebatesPage({searchParams}:{searchParams:Promise<{[key:string]:string|string[]|undefined}>}){
 const search=await searchParams;
 const urlParams=new URLSearchParams();
 for(const key of ["office","election","q","cursor"]){const value=search[key];if(typeof value==="string")urlParams.set(key,value);}
 let filters:ReturnType<typeof parseDebateFilters>;
 try{filters=parseDebateFilters(urlParams);}catch{return <div className="interior-page"><h1>Invalid search filters.</h1><p>Please correct the search or return to the archive.</p><Link href="/debates">Browse all debates ↗</Link></div>}
 let debates:Awaited<ReturnType<typeof listPublicDebatesPage>>["debates"]=[];
 let nextCursor:string|null=null;let options:Awaited<ReturnType<typeof publicDebateFilterOptions>>=[];let available=true;
 try{const result=await Promise.all([listPublicDebatesPage(filters),publicDebateFilterOptions()]);debates=result[0].debates;nextCursor=result[0].nextCursor;options=result[1];}catch{available=false;}
 const offices=[...new Map(options.map(o=>[o.office_slug,o.office_title])).entries()];
 const elections=options.filter(o=>!filters.office||o.office_slug===filters.office);
 return <div className="interior-page"><p className="eyebrow dark">THE PUBLIC RECORD / DEBATES</p><h1>Debates in<br/><em>the open.</em></h1>
 <p className="interior-lead">Browse original proposals, every published response, reciprocal questions, and policy agreements. Search covers published written contributions, not private drafts.</p>
 <form action="/debates" method="get" className="discovery-form" role="search" aria-label="Find public debates">
 <label>Search topic or published text<input type="search" name="q" defaultValue={filters.q||""} maxLength={160} placeholder="Search public debates"/></label>
 <label>Office<select name="office" defaultValue={filters.office||""}><option value="">All offices</option>{offices.map(([slug,title])=><option key={slug} value={slug}>{title}</option>)}</select></label>
 <label>Election<select name="election" defaultValue={filters.election||""}><option value="">All elections</option>{elections.map(o=><option key={o.election_id} value={o.election_id}>{o.office_title} — {o.election_label}</option>)}</select></label>
 <button type="submit" className="button button-dark">Apply filters ↗</button><Link href="/debates" className="inline-arrow">Clear filters</Link>
 </form>
 {!available?<section className="empty-record"><div><h2>Public record is temporarily unavailable.</h2><p>We cannot verify the debate archive at present. Nothing has been replaced with sample data.</p></div></section>:
 debates.length===0?<section className="empty-record" aria-labelledby="empty-title"><span className="empty-figure" aria-hidden="true">↔</span><div><p className="small-label">PUBLICATION STATUS</p><h2 id="empty-title">{filters.office||filters.election||filters.q?"No public debates match your filters.":"No debates have been published yet."}</h2><p>Only published materials from verified debate workflows appear here. Private drafts and fictional examples are never presented as real statements.</p><Link href="/protocol" className="inline-arrow">How the format works ↗</Link></div></section>:
 <><div className="debate-grid">{debates.map(d=><Link href={"/debates/"+d.id} className="debate-card" key={d.id}><p className="small-label">{d.office} / {d.election_label}</p><h2>{d.title}</h2><p>{d.proposition}</p><div className="debate-card-meta"><span>Opened by {d.originator}</span><span>{d.contender_count} contenders · {d.contribution_count} published contributions</span><strong aria-hidden="true">↗</strong></div></Link>)}</div>
 {nextCursor?<nav aria-label="More debates" className="discovery-next"><Link className="button button-dark" href={debateFilterUrl({...filters,cursor:nextCursor})}>Next page ↗</Link></nav>:null}</>}
 </div>;
}
