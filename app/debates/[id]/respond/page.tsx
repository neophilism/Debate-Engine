"use client";
import Link from "next/link";
import {useEffect,useMemo,useState,type FormEvent} from "react";
import type {DebateModality} from "../../../../packages/domain/modalities";
type Item={id:string;candidate_name:string;kind:string;candidacy_id:string;branch_id:string|null;parent_submission_id:string|null;modality:string};
type Question={id:string;submission_id:string;question_text:string};
type Candidate={id:string;public_name:string;verification_status:string;election_id:string};
type Debate={title:string;election_id:string;originator_candidacy_id:string;allowed_modalities:DebateModality[];max_response_seconds:number};
type Branch={id:string;responder_candidacy_id:string};
export default function RespondPage({params}:{params:Promise<{id:string}>}){
 const[debateId,setDebateId]=useState(""),[record,setRecord]=useState<{submissions:Item[];questions:Question[];debate:Debate;branches:Branch[]}|null>(null);
 const[candidates,setCandidates]=useState<Candidate[]>([]),[candidateId,setCandidateId]=useState(""),[parentSubmissionId,setParentSubmissionId]=useState("");
 const[modality,setModality]=useState<DebateModality>("video"),[answers,setAnswers]=useState<Record<string,string>>({});
 const[questionText,setQuestionText]=useState(""),[questionPosition,setQuestionPosition]=useState("0");
 const[writtenContent,setWrittenContent]=useState(""),[file,setFile]=useState<File|null>(null),[mediaAssetId,setMediaAssetId]=useState("");
 const[archiveConsent,setArchiveConsent]=useState(false),[sequenceConsent,setSequenceConsent]=useState(false),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 useEffect(()=>{params.then(x=>setDebateId(x.id))},[params]);
 useEffect(()=>{if(!debateId)return;Promise.all([fetch("/api/debates/"+debateId,{cache:"no-store"}).then(r=>r.json()),fetch("/api/account/me",{cache:"no-store"}).then(r=>r.json())]).then(([d,a])=>{if(!d.debate)throw Error("Debate is not available.");setRecord(d);setModality(d.debate.allowed_modalities?.[0]||"video");setCandidates((a.candidacies||[]).filter((x:Candidate)=>x.verification_status==="verified"&&x.election_id===d.debate.election_id));}).catch(e=>setMessage(e instanceof Error?e.message:"Unable to load debate."));},[debateId]);
 const options=useMemo(()=>{if(!record||!candidateId)return [];return record.submissions.filter(s=>{
  if(s.candidacy_id===candidateId)return false;
  if(s.kind==="opening")return candidateId!==record.debate.originator_candidacy_id&&!record.branches.some(b=>b.responder_candidacy_id===candidateId&&record.submissions.some(z=>z.branch_id===b.id&&z.kind==="response"));
  const branch=record.branches.find(b=>b.id===s.branch_id);
  return branch&&[record.debate.originator_candidacy_id,branch.responder_candidacy_id].includes(candidateId);
 }).filter(s=>!record.submissions.some(z=>z.parent_submission_id===s.id&&z.branch_id===s.branch_id&&z.kind!=="correction"));},[record,candidateId]);
 const preceding=options.find(s=>s.id===parentSubmissionId);
 const priorQuestions=(record?.questions||[]).filter(q=>q.submission_id===parentSubmissionId);
 const writing=modality==="writing";
 function position(x:string){const n=Number(x);if(!Number.isFinite(n)||n<0||writing&&!Number.isSafeInteger(n))throw Error("Use a nonnegative recording time or character position.");return writing?{characterOffset:n}:{timestamp:n};}
 async function upload(){
  if(!file||!candidateId)throw Error("Select a candidate and a recording.");
  if(file.size>60*1024*1024)throw Error("Current media limit is 60 MiB.");
  const form=new FormData();form.set("candidacyId",candidateId);form.set("modality",modality);form.set("original",file);
  const r=await fetch("/api/media/upload",{method:"POST",body:form});const j=await r.json();if(!r.ok)throw Error(j.error||"Upload failed.");
  setMediaAssetId(j.mediaAssetId);setMessage("Recording stored. Check the question references and publish when ready.");
 }
 async function publish(e:FormEvent){
  e.preventDefault();setBusy(true);setMessage("");
  try{
   if(!preceding)throw Error("Select the most recent opponent contribution.");
   if(!writing&&!mediaAssetId)throw Error("Validate the audio/video original first.");
   if(preceding.kind==="opening"&&!questionText.trim())throw Error("Pose a reciprocal question to your interlocutor.");
   const mappedAnswers=priorQuestions.filter(q=>answers[q.id]!==undefined&&answers[q.id]!=="").map(q=>({questionId:q.id,...position(answers[q.id])}));
   const questions=questionText.trim()?[{text:questionText.trim(),...position(questionPosition)}]:[];
   const response=await fetch("/api/debates/"+debateId+"/contributions",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
     candidacyId:candidateId,modality,mediaAssetId:writing?undefined:mediaAssetId,writtenContent:writing?writtenContent:undefined,
     parentSubmissionId,answers:mappedAnswers,questions,archiveConsent,sequenceConsent
   })});
   const result=await response.json();if(!response.ok)throw Error(result.error||"Could not publish your response.");
   window.location.assign("/debates/"+debateId);
  }catch(e){setMessage(e instanceof Error?e.message:"Publication failed.");}finally{setBusy(false);}
 }
 return <div className="interior-page"><p className="eyebrow dark">PUBLIC DEBATE / ASYNCHRONOUS RESPONSE</p><h1>Answer. Ask.<br/><em>Advance.</em></h1>
 <p className="interior-lead">{record?.debate.title||"Loading…"} · Every safe published response remains part of the permanent record, even when its inclusion in the qualifying sequence is disputed.</p>
 <form className="action-form" onSubmit={publish}>
 <label>Verified candidacy<select required value={candidateId} onChange={e=>{setCandidateId(e.target.value);setParentSubmissionId("");setMediaAssetId("");}}><option value="">Choose your same-office candidacy</option>{candidates.map(c=><option key={c.id} value={c.id}>{c.public_name}</option>)}</select></label>
 <label>Opposing contribution<select required value={parentSubmissionId} onChange={e=>{setParentSubmissionId(e.target.value);setAnswers({})}}><option value="">Choose which contribution to answer</option>{options.map(s=><option key={s.id} value={s.id}>{s.candidate_name} · {s.kind} · {s.modality||"video"}</option>)}</select></label>
 <label>Your response format<select required value={modality} onChange={e=>{setModality(e.target.value as DebateModality);setFile(null);setMediaAssetId("");setAnswers({})}}>{(record?.debate.allowed_modalities||["video"]).map(m=><option key={m} value={m}>{m==="writing"?"Writing":m==="audio"?"Audio":"Video"}</option>)}</select></label>
 {priorQuestions.length>0&&<fieldset><legend>Where in your {writing?"written speech":"recording"} do you answer these questions?</legend>{priorQuestions.map(q=><label key={q.id}>{q.question_text}<input type="number" min={0} step={writing?1:.1} placeholder="Leave empty if unanswered" value={answers[q.id]||""} onChange={e=>setAnswers({...answers,[q.id]:e.target.value})}/></label>)}</fieldset>}
 <label>Question to pose in return<textarea maxLength={600} required={preceding?.kind==="opening"} value={questionText} onChange={e=>setQuestionText(e.target.value)}/></label>
 {questionText.trim()&&<label>{writing?"Character offset of your question":"Seconds into your recording where you ask it"}<input type="number" min={0} step={writing?1:.1} value={questionPosition} onChange={e=>setQuestionPosition(e.target.value)}/></label>}
 {writing?<label>Full unedited written response<textarea required minLength={1} maxLength={100000} value={writtenContent} onChange={e=>setWrittenContent(e.target.value)}/></label>:
 <><label>Original unedited {modality} (60 MiB limit)<input type="file" accept={modality==="audio"?"audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/webm":"video/mp4,video/quicktime,video/webm"} required={!mediaAssetId} onChange={e=>{setFile(e.target.files?.[0]||null);setMediaAssetId("");}}/></label>
 <button type="button" className="button button-dark" disabled={busy||!candidateId||!file||Boolean(mediaAssetId)} onClick={async()=>{setBusy(true);try{await upload()}catch(e){setMessage(e instanceof Error?e.message:"Upload failed.")}finally{setBusy(false)}}}>{mediaAssetId?"Recording stored ✓":"Validate and store recording ↗"}</button></>}
 <label className="checkline"><input required type="checkbox" checked={archiveConsent} onChange={e=>setArchiveConsent(e.target.checked)}/>I authorize permanent archival publication of this original {modality} contribution.</label>
 <label className="checkline"><input required type="checkbox" checked={sequenceConsent} onChange={e=>setSequenceConsent(e.target.checked)}/>I authorize unedited inclusion if reciprocal criteria are satisfied.</label>
 <button className="button button-dark" disabled={busy||!candidateId||!parentSubmissionId||(!writing&&!mediaAssetId)||!archiveConsent||!sequenceConsent}>Publish response to permanent public record ↗</button>
 </form>{message&&<p className="form-alert" role="status">{message}</p>}<Link className="inline-arrow" href={"/debates/"+debateId}>← Complete debate record</Link></div>;
}
