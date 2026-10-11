"use client";
import {useEffect,useState} from "react";
type Cand={id:string;public_name:string;verification_status:string};
type Question={id:string;submission_id:string;question_text:string;asked_by_candidacy_id:string};
type Submission={id:string;candidacy_id:string;candidate_name:string;parent_submission_id:string|null};
export default function AssessmentTools({submissions,questions}:{submissions:Submission[];questions:Question[]}){
 const [candidates,setCandidates]=useState<Cand[]>([]);
 const [candidateId,setCandidateId]=useState("");const [questionId,setQuestionId]=useState("");
 const [answerId,setAnswerId]=useState("");const [decision,setDecision]=useState("answered");
 const [reasoning,setReasoning]=useState("");const [message,setMessage]=useState("");const[busy,setBusy]=useState(false);
 useEffect(()=>{fetch("/api/account/me",{cache:"no-store"}).then(r=>r.json()).then(j=>setCandidates((j.candidacies||[]).filter((x:Cand)=>x.verification_status==="verified"))).catch(()=>{})},[]);
 const owned=questions.filter(q=>q.asked_by_candidacy_id===candidateId);
 const responses=submissions.filter(s=>s.parent_submission_id===questions.find(q=>q.id===questionId)?.submission_id&&s.candidacy_id!==candidateId);
 if(!owned.length&&!candidates.length)return null;
 async function submit(e:React.FormEvent){e.preventDefault();setBusy(true);setMessage("");
  try{const res=await fetch("/api/assessments",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({candidacyId:candidateId,questionId,answerSubmissionId:answerId,decision,reasoning})});const out=await res.json();if(!res.ok)throw Error(out.error||"Assessment failed.");setMessage("Your assessment is now part of the permanent public record. Refresh to view it.");setReasoning("");}catch(e){setMessage(e instanceof Error?e.message:"Unable to assess.");}finally{setBusy(false);}
 }
 return <section className="assessment-editor"><h2>Assess an answer</h2><p>Only the candidate who asked a question can assess how an opponent answered. The opponent can object, and both statements remain public.</p>
 <form className="action-form" onSubmit={submit}><label>Your candidacy<select required value={candidateId} onChange={e=>{setCandidateId(e.target.value);setQuestionId("");}}><option value="">Choose verified candidacy</option>{candidates.map(x=><option value={x.id} key={x.id}>{x.public_name}</option>)}</select></label>
 <label>Your question<select required value={questionId} onChange={e=>{setQuestionId(e.target.value);setAnswerId("");}}><option value="">Choose question</option>{owned.map(x=><option key={x.id} value={x.id}>{x.question_text}</option>)}</select></label>
 <label>Opponent's response<select required value={answerId} onChange={e=>setAnswerId(e.target.value)}><option value="">Choose the response</option>{responses.map(x=><option key={x.id} value={x.id}>{x.candidate_name}</option>)}</select></label>
 <label>Assessment<select value={decision} onChange={e=>setDecision(e.target.value)}><option value="answered">Answered</option><option value="partly_answered">Partly answered</option><option value="not_answered">Not answered</option><option value="disputed_premise">Disputed the premise</option></select></label>
 <label>Public explanation<textarea required maxLength={4000} value={reasoning} onChange={e=>setReasoning(e.target.value)}/></label><button className="button button-dark" disabled={busy}>Publish attributed assessment ↗</button></form>{message&&<p role="status">{message}</p>}
 </section>;
}
