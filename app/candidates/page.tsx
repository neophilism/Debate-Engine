import Link from "next/link";
import {candidateDirectory} from "../../lib/server/discovery";
export const dynamic="force-dynamic";
export default async function CandidatesPage({searchParams}:{searchParams:Promise<{office?:string;election?:string}>}){
 const {office,election}=await searchParams;
 const safeOffice=typeof office==="string" && /^[a-z0-9-]{1,120}$/.test(office)?office:null;
 const safeElection=typeof election==="string" && /^[0-9a-f-]{36}$/.test(election)?election:null;
 let data:Awaited<ReturnType<typeof candidateDirectory>>=[];let available=true;
 try{data=await candidateDirectory(safeOffice,safeElection);}catch{available=false;}
 return <div className="interior-page"><p className="eyebrow dark">ELECTIONS / CANDIDATES</p><h1>Hear the<br/><em>candidates.</em></h1><p className="interior-lead">Find verified candidates participating in public debates. This directory reflects a specific platform verification procedure; it is not a polling or fundraising ranking.</p>
 {!available?<div className="empty-record"><p>Candidate directory temporarily unavailable.</p></div>:data.length?<div className="debate-grid">{data.map(c=><Link className="debate-card" href={"/candidates/"+c.id} key={c.id}><p className="small-label">{c.office_title} · {c.election_label}</p><h2>{c.public_name}</h2><p>{c.affiliation||"Affiliation not supplied"}</p><div className="debate-card-meta">{c.contributions} public contributions <span aria-hidden="true">↗</span></div></Link>)}</div>:<div className="empty-record"><p>No verified candidate profiles match these filters yet. Candidate verification is independent of debate initiation.</p></div>}
 </div>;
}
