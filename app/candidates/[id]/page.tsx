import {notFound} from "next/navigation";
import Link from "next/link";
import {candidateProfile} from "../../../lib/server/discovery";
export const dynamic="force-dynamic";
export default async function CandidatePage({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^[0-9a-f-]{36}$/i.test(id))notFound();
 const result=await candidateProfile(id).catch(()=>null);if(!result)notFound();
 const {candidate:c,contributions}=result;
 return <div className="interior-page"><p className="eyebrow dark">VERIFIED CANDIDATE PROFILE</p><h1>{c.public_name}</h1><p className="interior-lead">{c.office_title} · {c.election_label} · {c.affiliation||"Affiliation not supplied"}</p>
 <section className="record-section-list"><h2>Published debate contributions</h2><p>Every published response by this candidate appears here, including contributions excluded from the qualifying sequence.</p>
 {contributions.length?contributions.map(s=><article className="mini-card" key={s.submission_id}><p className="small-label">{s.kind.toUpperCase()} · {new Date(s.published_at).toLocaleDateString("en-US")}</p><h3>{s.title}</h3><Link className="inline-arrow" href={"/debates/"+s.id}>View complete public record ↗</Link></article>):<p>This candidate has not published any debate videos yet.</p>}</section>
 <Link href="/candidates" className="inline-arrow">← Candidate directory</Link></div>;
}
