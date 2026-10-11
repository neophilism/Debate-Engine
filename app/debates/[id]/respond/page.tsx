"use client";
import Link from "next/link";
import {useEffect,useState,type FormEvent} from "react";
type Item={id:string;candidate_name:string;kind:string;candidacy_id:string;branch_id:string|null};
type Q={id:string;submission_id:string;question_text:string};
type Cand={id:string;public_name:string;verification_status:string};
export default function RespondPage({params}:{params:Promise<{id:string}>}){
 const [debateId,setDebateId]=useState("");
 const [record,setRecord]=useState<{submissions:Item[];questions:Q[];debate:{title:string}}|null>(null);
 const [candidates,setCandidates]=useState<Cand[]>([]);
 const [candidateId,setCandidateId]=useState("");const[parentSubmissionId,setParentSubmissionId]=useState("");
 const [answers,setAnswers]=useState<Record<string,string>>({});
 const [questionText,setQuestionText]=useState("");
 const [file,setFile]=useState<File|null>(null);
 const [mediaAssetId,setMediaAssetId]=useState("");const[busy,setBusy]=useState(false);const[message,setMessage]=useState("");
 const [archiveConsent,setArchiveConsent]=useState(false);const[sequenceConsent,setSequenceConsent]=useState(false);
 useEffect(()=>{params.then(x=>setDebateId(x.id))},[params]);
 useEffect(()=>{if(!debateId)return;Promise.all([fetch("/api/debates/"+debateId).then(r=>r.json()),fetch("/api/account/me",{cache:"no-store"}).then(r=>r.json())]).then(([d,m])=>{setRecord(d);setCandidates((m.candidacies||[]).filter((x:Cand)=>x.verification_status==="verified"));}).catch(()=>setMessage("Could not load the debate or your verified candidacies."))},[debateId]);
 const questions=(record?.questions||[]).filter(q=>q.submission_id===parentSubmissionId);
 async function upload(){
  if(!file||!candidateId)throw Error("Select a candidate and video first.");
  const form=new FormData();form.set("video",file);form.set("candidacyId",candidateId);
  const response=await fetch("/api/media/upload",{method:"POST",body:form});const result=await response.json();
  if(!response.ok)throw Error(result.error||"Upload failed.");setMediaAssetId(result.mediaAssetId);
 }
 async function submit(e:FormEvent){
  e.preventDefault();setBusy(true);setMessage("");
  try{
   if(!mediaAssetId)throw Error("Validate and store the video first.");
   const submission=record?.submissions.find(s=>s.id===parentSubmissionId);
   if(!submission)throw Error("Select the contribution you are answering.");
   const newQuestions=questionText.trim()?[{text:questionText.trim(),timestamp:0}]:[];
   const answerRefs=questions.filter(q=>answers[q.id]!==undefined&&answers[q.id]!=="").map(q=>({questionId:q.id,timestamp:Number(answers[q.id])}));
   const response=await fetch("/api/debates/"+debateId+"/contributions",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({candidacyId:candidateId,mediaAssetId,parentSubmissionId,questions:newQuestions,answers:answerRefs,archiveConsent,sequenceConsent})});
   const result=await response.json();if(!response.ok)throw Error(result.error||"Publication failed.");
   window.location.assign("/debates/"+debateId);
  }catch(error){setMessage(error instanceof Error?error.message:"Could not publish.");}finally{setBusy(false);}
 }
 return <div className="interior-page"><p className="eyebrow dark">PUBLIC DEBATE / YOUR RESPONSE</p><h1>Answer the<br/><em>question.</em></h1>
  <p className="interior-lead">{record?.debate.title||"Loading debate…"} · Responses are asynchronous and unedited. The original candidate's assessment determines inclusion in the qualifying sequence, never permanent visibility.</p>
  <form className="action-form" onSubmit={submit}>
   <label>Your verified candidacy<select required value={candidateId} onChange={e=>{setCandidateId(e.target.value);setMediaAssetId("");}}><option value="">Choose candidate</option>{candidates.map(x=><option key={x.id} value={x.id}>{x.public_name}</option>)}</select></label>
   <label>Contribution you are responding to<select required value={parentSubmissionId} onChange={e=>setParentSubmissionId(e.target.value)}><option value="">Choose video to answer</option>{record?.submissions.map(x=><option value={x.id} key={x.id}>{x.candidate_name} · {x.kind}</option>)}</select></label>
   <fieldset><legend>Identify the video timestamp where you answer each question.</legend>{questions.length===0&&<p>No questions in this preceding contribution.</p>}{questions.map(q=><label key={q.id}>{q.question_text}<input type="number" min="0" step=".1" placeholder="Seconds (leave blank if unanswered)" value={answers[q.id]||""} onChange={e=>setAnswers({...answers,[q.id]:e.target.value})}/></label>)}</fieldset>
   <label>Your question for the other candidate<textarea maxLength={600} value={questionText} onChange={e=>setQuestionText(e.target.value)} placeholder="One focused question; include it in your video."/></label>
   <label>Unedited response video<input type="file" required={!mediaAssetId} accept="video/mp4,video/quicktime,video/webm" onChange={e=>{setFile(e.target.files?.[0]||null);setMediaAssetId("");}}/></label>
   <button type="button" className="button button-dark" disabled={busy||!file||!candidateId||Boolean(mediaAssetId)} onClick={async()=>{setBusy(true);try{await upload();setMessage("Video validated and archived. Review before publication.");}catch(e){setMessage(e instanceof Error?e.message:"Upload failed.");}finally{setBusy(false);}}}>{mediaAssetId?"Original stored ✓":"Upload and validate original"}</button>
   <label className="checkline"><input required type="checkbox" checked={archiveConsent} onChange={e=>setArchiveConsent(e.target.checked)}/>I authorize permanent public archival publication of this original video.</label>
   <label className="checkline"><input required type="checkbox" checked={sequenceConsent} onChange={e=>setSequenceConsent(e.target.checked)}/>I authorize unedited inclusion if reciprocal requirements are satisfied.</label>
   <button className="button button-dark" disabled={busy||!mediaAssetId||!archiveConsent||!sequenceConsent}>Publish permanent response ↗</button>
  </form>{message&&<p role="alert" className="form-alert">{message}</p>}
  <Link href={"/debates/"+debateId} className="inline-arrow">← Return to full record</Link>
 </div>;
}
