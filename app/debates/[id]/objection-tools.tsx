"use client";
import {useEffect,useState,type FormEvent} from "react";
type Submission={id:string;candidacy_id:string;candidate_name:string;media_asset_id:string};
type Assessment={id:string;answer_submission_id:string;question_id:string;reasoning:string;decision:string};
type Question={id:string;question_text:string};
type Candidacy={id:string;public_name:string;verification_status:string;election_id:string};
export default function ObjectionTools({submissions,assessments,questions,electionId}:{
 submissions:Submission[];assessments:Assessment[];questions:Question[];electionId:string;
}){
 const[candidates,setCandidates]=useState<Candidacy[]>([]);
 const[candidateId,setCandidateId]=useState("");
 const[assessmentId,setAssessmentId]=useState("");
 const[objection,setObjection]=useState("");
 const[timestamp,setTimestamp]=useState("");
 const[busy,setBusy]=useState(false);
 const[message,setMessage]=useState("");
 useEffect(()=>{fetch("/api/account/me",{cache:"no-store"}).then(r=>r.json())
  .then(j=>setCandidates((j.candidacies||[]).filter((x:Candidacy)=>x.verification_status==="verified"&&x.election_id===electionId)))
  .catch(()=>{})},[electionId]);
 const allowed=assessments.filter(a=>submissions.some(s=>s.id===a.answer_submission_id&&s.candidacy_id===candidateId));
 if(!candidates.length)return null;
 async function publish(e:FormEvent){
  e.preventDefault();setMessage("");setBusy(true);
  try{
   const body={candidacyId:candidateId,assessmentId,objection,
    videoTimestampSeconds:timestamp.trim()===""?null:Number(timestamp)};
   const response=await fetch("/api/assessment-objections",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
   const payload=await response.json();
   if(!response.ok)throw Error(payload.error||"Could not publish objection.");
   setObjection("");setTimestamp("");setMessage("Your objection was published permanently. Refresh to see it beside the assessment.");
  }catch(err){setMessage(err instanceof Error?err.message:"Publication failed.");}
  finally{setBusy(false);}
 }
 return <section className="assessment-editor">
  <p className="small-label">RECIPROCAL ACCOUNTABILITY</p>
  <h2>Disagree with an assessment?</h2>
  <p>If your opponent considers an answer inadequate, you may publish your own attributed objection. Neither candidate may erase the other’s assessment or objection, and the original video remains in the public record.</p>
  <form className="action-form" onSubmit={publish}>
   <label>Your verified candidacy<select required value={candidateId} onChange={e=>{setCandidateId(e.target.value);setAssessmentId("");}}>
    <option value="">Choose your candidacy</option>{candidates.map(x=><option key={x.id} value={x.id}>{x.public_name}</option>)}
   </select></label>
   <label>Assessment of your response<select required value={assessmentId} onChange={e=>setAssessmentId(e.target.value)}>
    <option value="">Choose an assessment</option>
    {allowed.map(x=><option key={x.id} value={x.id}>{x.decision.replaceAll("_"," ")} — {questions.find(q=>q.id===x.question_id)?.question_text.slice(0,90)||"Question"}</option>)}
   </select></label>
   <label>Your public objection<textarea required maxLength={4000} value={objection} onChange={e=>setObjection(e.target.value)} placeholder="Explain why you consider the assessment incomplete or mistaken." /></label>
   <label>Relevant timestamp in your video, seconds (optional)<input type="number" min="0" step="0.1" value={timestamp} onChange={e=>setTimestamp(e.target.value)}/></label>
   <button disabled={busy||!assessmentId} className="button button-dark">Publish my objection ↗</button>
  </form>
  {message&&<p role="status" className="form-alert">{message}</p>}
 </section>;
}
