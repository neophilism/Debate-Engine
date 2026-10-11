"use client";
import {useCallback,useEffect,useRef,useState} from "react";
type Finding={id:string;category:string;excerpt:string;explanation:string;suggestion:string;confidence:string};
type Assessment={id:string;stage:"preliminary"|"final";findings:{overview:string;limitations:string;strengths:string[];findings:Finding[]};generated_at:string;content_sha256:string};
type Draft={id:string;kind:string;modality:"writing"|"video"|"audio";status:string;payload:Record<string,unknown>;transcript_text:string|null;provider_consent:boolean;content_sha256:string;skipped_preliminary:boolean;published_debate_id:string|null};
export default function PrivateReview({draftId}:{draftId:string}){
 const[draft,setDraft]=useState<Draft|null>(null),[reports,setReports]=useState<Assessment[]>([]),[text,setText]=useState(""),[transcript,setTranscript]=useState("");
 const[message,setMessage]=useState(""),[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[confirmed,setConfirmed]=useState(false);
 const autoAttempted=useRef(false);
 const load=useCallback(async()=>{
  const r=await fetch("/api/private/drafts/"+draftId,{cache:"no-store"});
  const j=await r.json();
  if(!r.ok)throw Error(j.error||"Unable to load your private review.");
  const d=j.draft as Draft;setDraft(d);setReports(j.reports||[]);
  setText(String(d.payload.writtenContent||""));setTranscript(d.transcript_text||"");
  setLoading(false);return d;
 },[draftId]);
 async function act(url:string,body:unknown){
  const r=await fetch(url,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  const j=await r.json();if(!r.ok)throw Error(j.error||"Request failed.");return j;
 }
 const autoAnalyze=useCallback(async(d:Draft)=>{
  if(!d.provider_consent||d.status!=="draft"||autoAttempted.current)return;
  autoAttempted.current=true;setBusy(true);
  try{await act("/api/private/drafts/"+draftId+"/assess",{stage:"preliminary"});await load();setMessage("Preliminary private analysis available. You may accept, reject, or ignore any suggestion.");}
  catch(e){setMessage((e instanceof Error?e.message:"Private analysis unavailable.")+" You can skip it and publish without assessment.");}
  finally{setBusy(false);}
 },[draftId,load]);
 useEffect(()=>{load().then(d=>void autoAnalyze(d)).catch(e=>{setLoading(false);setMessage(e instanceof Error?e.message:"Unable to load.");});},[load,autoAnalyze]);
 async function revise(){
  if(!draft)return;setBusy(true);setMessage("");
  try{
   const payload={...draft.payload,...(draft.modality==="writing"?{writtenContent:text}:{})};
   const r=await fetch("/api/private/drafts/"+draft.id,{method:"PATCH",headers:{"content-type":"application/json"},body:JSON.stringify({payload,transcriptText:draft.modality==="writing"?null:transcript})});
   const j=await r.json();if(!r.ok)throw Error(j.error||"Revision failed.");
   await load();autoAttempted.current=false;setMessage("Your revision is saved privately. Reassess it or skip the assistant before confirming.");
  }catch(e){setMessage(e instanceof Error?e.message:"Could not save.");}finally{setBusy(false);}
 }
 async function preliminary(){
  if(!draft)return;setBusy(true);setMessage("");
  try{await act("/api/private/drafts/"+draftId+"/assess",{stage:"preliminary"});await load();setMessage("Preliminary analysis updated. Your original contribution has not changed.");}
  catch(e){setMessage(e instanceof Error?e.message:"Assistant unavailable. You may skip it.");}finally{setBusy(false);}
 }
 async function skip(){
  if(!draft)return;setBusy(true);setMessage("");
  try{await act("/api/private/drafts/"+draftId+"/skip",{});await load();setMessage("Assistant review skipped. You remain free to publish your original contribution.");}
  catch(e){setMessage(e instanceof Error?e.message:"Unable to skip.");}finally{setBusy(false);}
 }
 async function approve(){
  if(!draft)return;if(!confirmed){setConfirmed(true);return;}
  setBusy(true);setMessage("");
  try{const j=await act("/api/private/drafts/"+draftId+"/confirm",{sha256:draft.content_sha256});await load();setConfirmed(false);
    setMessage(j.finalAssessment==="available_privately"?"Published. Your separate final assessment is available below.":"Published. The original is now in the permanent public debate record.");
  }catch(e){setMessage(e instanceof Error?e.message:"Publication failed.");}finally{setBusy(false);}
 }
 async function feedback(assessmentId:string,findingId:string,choice:"accept"|"reject"|"uncertain"){
  setBusy(true);setMessage("");
  try{await act("/api/private/assessments/"+assessmentId+"/feedback",{findingId,choice});setMessage("Private feedback saved. This does not change the original speech.");}
  catch(e){setMessage(e instanceof Error?e.message:"Unable to save feedback.");}finally{setBusy(false);}
 }
 if(loading)return <p role="status">Loading private draft…</p>;
 if(!draft)return <p role="alert">{message||"Private draft unavailable."}</p>;
 const newest=reports.filter(r=>r.content_sha256===draft.content_sha256);
 const preliminary=newest.find(r=>r.stage==="preliminary");
 const final=newest.find(r=>r.stage==="final");
 const isPublished=draft.status==="published";
 const canRevise=!isPublished&&draft.status!=="confirming";
 return <div className="private-review">
  <section className="workspace-panel"><p className="small-label">DRAFT STATUS: {draft.status.toUpperCase()} · {draft.modality.toUpperCase()}</p>
   <h2>Original source and candidate approval</h2>
   <p>Your edits are never applied automatically. Your original and transcript remain private until you confirm publication. A transcript alone cannot replace the audio or video original.</p>
   {canRevise&&(draft.modality==="writing"?<label className="review-field">Full written speech<textarea rows={12} value={text} maxLength={100000} onChange={e=>setText(e.target.value)}/></label>:<label className="review-field">Author-reviewed transcript of the uploaded {draft.modality}<textarea rows={9} maxLength={48000} value={transcript} onChange={e=>setTranscript(e.target.value)}/></label>)}
   {canRevise&&<button className="button button-dark" type="button" disabled={busy} onClick={revise}>Save my revision ↗</button>}
  </section>
  <section className="workspace-panel"><h2>Preliminary Debate Assistant</h2><p>The assistant is fallible. A possible reasoning flaw is not a verdict, a competition score or a requirement to revise.</p>
   {preliminary?<AssessmentView run={preliminary} busy={busy} onFeedback={feedback}/>:<p>No preliminary report for the current draft version.</p>}
   {!isPublished&&draft.provider_consent&&<button className="link-button" type="button" disabled={busy} onClick={preliminary}>Run private preliminary assessment</button>}
   {!isPublished&&canRevise&&<button className="link-button" type="button" disabled={busy} onClick={skip}>Skip suggestions and keep my original</button>}
  </section>
  {!isPublished&&<section className="workspace-panel"><h2>Confirm my original publication</h2><p>Review your exact contribution before confirming. This operation publishes the original into the permanent record and makes it available to the other candidate; it cannot be silently removed afterward.</p>
   <button type="button" className="button button-dark" disabled={busy||draft.status!=="reviewed"} onClick={approve}>{confirmed?"Confirm this exact original and publish":"Approve my original for publication ↗"}</button>
   {confirmed&&<button className="link-button" onClick={()=>setConfirmed(false)}>Cancel confirmation</button>}
  </section>}
  {isPublished&&<section className="workspace-panel"><h2>Published contribution</h2>
   {draft.published_debate_id&&<p><a href={"/debates/"+draft.published_debate_id}>View the full public debate record ↗</a></p>}
   <h3>Final private assessment</h3>
   {final?<AssessmentView run={final} busy={busy} onFeedback={feedback}/>:<p>A final assessment has not been completed. This does not affect your published contribution.</p>}
   {draft.provider_consent&&!final&&<button className="link-button" disabled={busy} onClick={async()=>{setBusy(true);try{await act("/api/private/drafts/"+draftId+"/assess",{stage:"final"});await load();}catch(e){setMessage(e instanceof Error?e.message:"Final assessment unavailable.");}finally{setBusy(false);}}}>Retry private final assessment</button>}
  </section>}
  {message&&<p role="status" className="form-alert">{message}</p>}
 </div>;
}
function AssessmentView({run,busy,onFeedback}:{run:Assessment;busy:boolean;onFeedback:(id:string,findingId:string,choice:"accept"|"reject"|"uncertain")=>Promise<void>}){
 const data=run.findings;
 return <article className="assessment-review"><p className="small-label">{run.stage.toUpperCase()} · PRIVATE</p>
 <p>{data.overview}</p>{data.strengths.length>0&&<><h4>Reasoning strengths</h4><ul>{data.strengths.map((v,i)=><li key={i}>{v}</li>)}</ul></>}
 {data.findings.map(f=><section className="private-finding" key={f.id}><strong>{f.category.replaceAll("_"," ")} · {f.confidence} confidence</strong><blockquote>{f.excerpt}</blockquote><p>{f.explanation}</p><p><em>Optional suggestion:</em> {f.suggestion}</p>
 <div className="feedback-buttons"><button disabled={busy} onClick={()=>onFeedback(run.id,f.id,"accept")}>Helpful</button><button disabled={busy} onClick={()=>onFeedback(run.id,f.id,"reject")}>Reject</button><button disabled={busy} onClick={()=>onFeedback(run.id,f.id,"uncertain")}>Uncertain</button></div></section>)}
 <p className="assessment-limitations"><strong>Limitations:</strong> {data.limitations}</p></article>;
}
