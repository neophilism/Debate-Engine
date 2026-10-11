"use client";
import Link from "next/link";
import {useEffect,useMemo,useState,type FormEvent} from "react";
type Item={id:string;candidate_name:string;kind:string;candidacy_id:string;branch_id:string|null;parent_submission_id:string|null};
type Q={id:string;submission_id:string;question_text:string};
type Cand={id:string;public_name:string;verification_status:string;election_id:string};
type Debate={title:string;election_id:string;originator_candidacy_id:string;max_response_seconds:number;reply_window_hours:number|null};
type Branch={id:string;responder_candidacy_id:string};
export default function RespondPage({params}:{params:Promise<{id:string}>}){
 const[debateId,setDebateId]=useState("");
 const[record,setRecord]=useState<{submissions:Item[];questions:Q[];debate:Debate;branches:Branch[]}|null>(null);
 const[candidates,setCandidates]=useState<Cand[]>([]);
 const[candidateId,setCandidateId]=useState("");
 const[parentSubmissionId,setParentSubmissionId]=useState("");
 const[answers,setAnswers]=useState<Record<string,string>>({});
 const[questionText,setQuestionText]=useState("");
 const[questionTimestamp,setQuestionTimestamp]=useState("");
 const[file,setFile]=useState<File|null>(null);
 const[mediaAssetId,setMediaAssetId]=useState("");
 const[busy,setBusy]=useState(false);
 const[message,setMessage]=useState("");
 const[archiveConsent,setArchiveConsent]=useState(false),[sequenceConsent,setSequenceConsent]=useState(false);
 useEffect(()=>{params.then(x=>setDebateId(x.id))},[params]);
 useEffect(()=>{if(!debateId)return;
  Promise.all([fetch("/api/debates/"+debateId,{cache:"no-store"}).then(r=>r.json()),fetch("/api/account/me",{cache:"no-store"}).then(r=>r.json())])
  .then(([data,account])=>{if(!data.debate)throw Error("Debate unavailable.");setRecord(data);setCandidates((account.candidacies||[]).filter((x:Cand)=>x.verification_status==="verified"&&x.election_id===data.debate.election_id));})
  .catch(()=>setMessage("Could not load the debate or verified same-office candidacies."));
 },[debateId]);
 const parents=useMemo(()=>{
  if(!record||!candidateId)return [];
  return record.submissions.filter(x=>{
   if(x.candidacy_id===candidateId)return false;
   if(x.kind==="opening"){
    if(candidateId===record.debate.originator_candidacy_id)return false;
    return !record.branches.some(b=>b.responder_candidacy_id===candidateId &&
     record.submissions.some(s=>s.branch_id===b.id&&s.kind==="response"));
   }
   const branch=record.branches.find(b=>b.id===x.branch_id);
   if(!branch)return false;
   return [record.debate.originator_candidacy_id,branch.responder_candidacy_id].includes(candidateId);
  }).filter(x=>!record.submissions.some(s=>s.parent_submission_id===x.id&&s.branch_id===x.branch_id&&s.kind!=="correction"));
 },[record,candidateId]);
 const parent=parents.find(s=>s.id===parentSubmissionId);
 const questions=(record?.questions||[]).filter(q=>q.submission_id===parentSubmissionId);
 async function upload(){
  if(!file||!candidateId)throw Error("Choose a verified candidacy and a video.");
  if(file.size>60*1024*1024)throw Error("This preliminary upload path supports files up to 60 MiB.");
  const form=new FormData();form.set("video",file);form.set("candidacyId",candidateId);
  const response=await fetch("/api/media/upload",{method:"POST",body:form});
  const result=await response.json();if(!response.ok)throw Error(result.error||"Upload failed.");
  setMediaAssetId(result.mediaAssetId);
 }
 async function submit(e:FormEvent){
  e.preventDefault();setBusy(true);setMessage("");
  try{
   if(!mediaAssetId)throw Error("Upload and validate your original video before publishing.");
   if(!parent)throw Error("Select your opponent’s most recent relevant video.");
   if(parent.kind==="opening"&&!questionText.trim())throw Error("Your first response must pose at least one reciprocal question.");
   if(questionText.trim()&&questionTimestamp==="")throw Error("Provide the video timestamp for your question.");
   const newQuestions=questionText.trim()?[{text:questionText.trim(),timestamp:Number(questionTimestamp)}]:[];
   const answerRefs=questions.filter(q=>answers[q.id]!==undefined&&answers[q.id]!=="").map(q=>({questionId:q.id,timestamp:Number(answers[q.id])}));
   const response=await fetch("/api/debates/"+debateId+"/contributions",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
    candidacyId:candidateId,mediaAssetId,parentSubmissionId,questions:newQuestions,answers:answerRefs,archiveConsent,sequenceConsent
   })});
   const result=await response.json();if(!response.ok)throw Error(result.error||"Publication failed.");
   window.location.assign("/debates/"+debateId);
  }catch(error){setMessage(error instanceof Error?error.message:"Could not publish.");}
  finally{setBusy(false);}
 }
 return <div className="interior-page"><p className="eyebrow dark">PUBLIC DEBATE / YOUR RESPONSE</p>
  <h1>Answer the<br/><em>question.</em></h1>
  <p className="interior-lead">{record?.debate.title||"Loading debate…"} · Every published response remains accessible to the public, even if its opponent judges it nonresponsive.</p>
  {record&&<p>The same maximum video duration of {record.debate.max_response_seconds} seconds applies to both participants. {record.debate.reply_window_hours===null?"No reply deadline was set.":"The reciprocal response window is "+record.debate.reply_window_hours+" hours."}</p>}
  <form className="action-form" onSubmit={submit}>
   <label>Your verified candidacy<select required value={candidateId} onChange={e=>{setCandidateId(e.target.value);setParentSubmissionId("");setAnswers({});setMediaAssetId("");}}>
    <option value="">Choose candidate seeking this office</option>{candidates.map(x=><option key={x.id} value={x.id}>{x.public_name}</option>)}
   </select></label>
   <label>Opponent's video you are answering<select required value={parentSubmissionId} onChange={e=>{setParentSubmissionId(e.target.value);setAnswers({});}}>
    <option value="">Choose video</option>{parents.map(x=><option value={x.id} key={x.id}>{x.candidate_name} · {x.kind}</option>)}
   </select></label>
   {parent&&<fieldset><legend>Reference the timestamp where your video addresses each question.</legend>
    {questions.length===0&&<p>The preceding contribution contains no specific questions.</p>}
    {questions.map(q=><label key={q.id}>{q.question_text}<input type="number" min="0" step=".1" placeholder="Leave blank if you do not answer" value={answers[q.id]||""} onChange={e=>setAnswers({...answers,[q.id]:e.target.value})}/></label>)}
    </fieldset>}
   <label>Your reciprocal question for your opponent<textarea maxLength={600} required={parent?.kind==="opening"} value={questionText} onChange={e=>setQuestionText(e.target.value)} placeholder="Pose a focused question in the response video."/></label>
   {questionText.trim()&&<label>Video timestamp at which you pose the question (seconds)<input required type="number" min="0" step=".1" value={questionTimestamp} onChange={e=>setQuestionTimestamp(e.target.value)}/></label>}
   <label>Unedited response video (MP4, MOV or WebM)<input type="file" required={!mediaAssetId} accept="video/mp4,video/quicktime,video/webm" onChange={e=>{setFile(e.target.files?.[0]||null);setMediaAssetId("");}}/></label>
   <button type="button" className="button button-dark" disabled={busy||!file||!candidateId||Boolean(mediaAssetId)} onClick={async()=>{
    setBusy(true);setMessage("");try{await upload();setMessage("Original video stored and validated. Review all answers before publication.");}catch(err){setMessage(err instanceof Error?err.message:"Upload failed.");}finally{setBusy(false);}
   }}>{mediaAssetId?"Video stored and validated ✓":"Upload & validate original"}</button>
   <label className="checkline"><input required type="checkbox" checked={archiveConsent} onChange={e=>setArchiveConsent(e.target.checked)}/>I authorize permanent public archival publication of this unedited video.</label>
   <label className="checkline"><input required type="checkbox" checked={sequenceConsent} onChange={e=>setSequenceConsent(e.target.checked)}/>I authorize unedited inclusion in a qualifying sequence after all reciprocal questions are satisfactorily addressed.</label>
   <button className="button button-dark" disabled={busy||!mediaAssetId||!archiveConsent||!sequenceConsent||!parent}>Publish permanent response ↗</button>
  </form>
  {message&&<p role="alert" className="form-alert">{message}</p>}
  <Link href={"/debates/"+debateId} className="inline-arrow">← Return to the complete record</Link>
 </div>;
}
