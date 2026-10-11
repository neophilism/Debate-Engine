"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
type Finding={id:string;category:string;excerpt:string;explanation:string;suggestion:string;confidence:string};
type Report={id:string;stage:string;content_sha256:string;generated_at:string;model_name:string;findings:{overview:string;strengths:string[];findings:Finding[];limitations:string}};
type Draft={id:string;status:string;modality:string;kind:string;published_debate_id:string|null;content_sha256:string;provider_consent:boolean};
export default function PrivateDraftAccount({draftId}:{draftId:string}){
 const [draft,setDraft]=useState<Draft|null>(null),[reports,setReports]=useState<Report[]>([]);
 const [notice,setNotice]=useState(""),[busy,setBusy]=useState(false);
 async function load(){
  const r=await fetch("/api/private/drafts/"+draftId,{cache:"no-store"});
  const result=await r.json();if(!r.ok)throw Error(result.error||"Draft is not available to this account.");
  setDraft(result.draft);setReports(result.reports||[]);
 }
 useEffect(()=>{load().catch(e=>setNotice(e instanceof Error?e.message:"Private record unavailable."));},[draftId]);
 async function finalReview(){
  setBusy(true);setNotice("");
  try{
   const r=await fetch("/api/private/drafts/"+draftId+"/assess",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({stage:"final"})});
   const result=await r.json();if(!r.ok)throw Error(result.error||"Final assessment unavailable.");
   await load();setNotice("A new private final assessment was saved. A distinct model run may differ from the preliminary findings.");
  }catch(e){setNotice(e instanceof Error?e.message:"Assessment unavailable.");}finally{setBusy(false);}
 }
 return <div className="interior-page private-record">
  <p className="eyebrow dark">PRIVATE CANDIDATE ACCOUNT / EDITORIAL REVIEW</p>
  <h1>Your private<br/><em>assessment.</em></h1>
  <p className="interior-lead">These assessments are auxiliary and are never published, shared with opponents or used to score the public debate. Your published original remains unchanged.</p>
  {draft&&<section className="workspace-panel"><p className="small-label">{draft.modality.toUpperCase()} · {draft.kind.toUpperCase()} · {draft.status.toUpperCase()}</p>
   <p>Draft fingerprint: <code>{draft.content_sha256}</code></p>
   {draft.published_debate_id&&<p><Link className="inline-arrow" href={"/debates/"+draft.published_debate_id}>View the public debate ↗</Link></p>}
   {draft.status==="published"&&<button className="button button-dark" disabled={busy||!draft.provider_consent} onClick={finalReview}>Run a new private final assessment</button>}
   {!draft.provider_consent&&<p>You did not grant provider consent, so the assistant has not sent this speech to a model provider.</p>}
  </section>}
  <section className="private-reports"><h2>Assessment history</h2>
   {reports.length===0?<p>No private assessments are available for this draft.</p>:reports.map(a=><article className="private-report" key={a.id}>
    <p className="small-label">{a.stage.toUpperCase()} · {new Date(a.generated_at).toLocaleString("en-US")} · {a.model_name}</p>
    <p>{a.findings.overview}</p><h3>Strengths</h3><ul>{a.findings.strengths.map((x,i)=><li key={i}>{x}</li>)}</ul>
    <h3>Possible limitations</h3>{a.findings.findings.length===0?<p>No specific findings in this run.</p>:a.findings.findings.map(f=><div key={f.id}><h4>{f.category} ({f.confidence} confidence)</h4><blockquote>{f.excerpt}</blockquote><p>{f.explanation}</p><p>Suggestion (optional): {f.suggestion}</p></div>)}
    <p>Model limitations: {a.findings.limitations}</p>
   </article>)}
  </section>
  {notice&&<p role="status" className="form-alert">{notice}</p>}
  <Link href="/workspace" className="inline-arrow">← Return to your workspace</Link>
 </div>;
}
