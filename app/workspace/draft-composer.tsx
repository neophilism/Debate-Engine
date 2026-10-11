"use client";
import {useEffect,useMemo,useState,type FormEvent} from "react";
import Link from "next/link";
import DraftReview,{type PrivateReview} from "./draft-review";
type Mode="video"|"audio"|"writing";
type Candidate={id:string;public_name:string;office_title:string;election_id:string;verification_status:string};
type Contribution={id:string;candidate_name:string;kind:string;candidacy_id:string;branch_id:string|null;parent_submission_id:string|null};
type Question={id:string;submission_id:string;question_text:string};
type PublicDebate={debate:{title:string;election_id:string;originator_candidacy_id:string;allowed_modalities:Mode[];max_response_seconds:number;reply_window_hours:number|null};submissions:Contribution[];questions:Question[];branches:Array<{id:string;responder_candidacy_id:string}>};
type Draft={draftId:string;sha256:string;status:string};
const options:Mode[]=["video","audio","writing"];
export default function DraftComposer({kind,debateId}:{kind:"opening"|"response";debateId?:string}){
 const [candidates,setCandidates]=useState<Candidate[]>([]),[record,setRecord]=useState<PublicDebate|null>(null);
 const [candidateId,setCandidateId]=useState(""),[parentId,setParentId]=useState("");
 const [enabled,setEnabled]=useState<Mode[]>(["video"]),[mode,setMode]=useState<Mode>("video");
 const [title,setTitle]=useState(""),[proposition,setProposition]=useState("");
 const [duration,setDuration]=useState("300"),[windowHours,setWindowHours]=useState("72");
 const [questions,setQuestions]=useState<Array<{text:string;position:string}>>([{text:"",position:"0"}]);
 const [myQuestion,setMyQuestion]=useState(""),[myQuestionPosition,setMyQuestionPosition]=useState("0");
 const [answers,setAnswers]=useState<Record<string,string>>({});
 const [speech,setSpeech]=useState(""),[transcript,setTranscript]=useState("");
 const [file,setFile]=useState<File|null>(null),[mediaId,setMediaId]=useState("");
 const [archiveConsent,setArchiveConsent]=useState(false),[sequenceConsent,setSequenceConsent]=useState(false);
 const [providerConsent,setProviderConsent]=useState(false),[improvementConsent,setImprovementConsent]=useState(false);
 const [draft,setDraft]=useState<Draft|null>(null),[review,setReview]=useState<PrivateReview|null>(null),[phase,setPhase]=useState<"edit"|"review">("edit");
 const [busy,setBusy]=useState(false),[notice,setNotice]=useState("");
 useEffect(()=>{
  Promise.all([fetch("/api/account/me",{cache:"no-store"}).then(r=>r.json()),debateId?fetch("/api/debates/"+debateId,{cache:"no-store"}).then(r=>r.json()):Promise.resolve(null)])
  .then(([account,debate])=>{
   setRecord(debate);
   setCandidates((account.candidacies||[]).filter((c:Candidate)=>c.verification_status==="verified"&&(!debate||c.election_id===debate.debate.election_id)));
   if(debate?.debate?.allowed_modalities?.length){setEnabled(debate.debate.allowed_modalities);setMode(debate.debate.allowed_modalities[0]);}
  }).catch(()=>setNotice("Cannot load eligible candidate details."));
 },[debateId]);
 const parents=useMemo(()=>{
  if(!record||!candidateId)return [];
  return record.submissions.filter(s=>{
   if(s.candidacy_id===candidateId)return false;
   if(s.kind==="opening")return candidateId!==record.debate.originator_candidacy_id&&!record.branches.some(b=>b.responder_candidacy_id===candidateId&&record.submissions.some(x=>x.branch_id===b.id&&x.kind==="response"));
   const b=record.branches.find(x=>x.id===s.branch_id);
   return Boolean(b&&[record.debate.originator_candidacy_id,b.responder_candidacy_id].includes(candidateId)&&!record.submissions.some(x=>x.parent_submission_id===s.id&&x.branch_id===s.branch_id&&x.kind!=="correction"));
  });
 },[record,candidateId]);
 const pendingQuestions=(record?.questions||[]).filter(q=>q.submission_id===parentId);
 const positionLabel=mode==="writing"?"Character offset within your written speech":"Timestamp in your original (seconds)";
 const updatedQuestions=kind==="opening"?questions.map(q=>({...q.text?{text:q.text}: {text:""},[mode==="writing"?"characterOffset":"timestamp"]:Number(q.position)})):
  myQuestion.trim()?[{text:myQuestion.trim(),[mode==="writing"?"characterOffset":"timestamp"]:Number(myQuestionPosition)}]:[];
 function payload(sourceId:string|null){
  return {candidacyId,modality:mode,mediaAssetId:mode==="writing"?null:sourceId,writtenContent:mode==="writing"?speech:null,
   transcriptText:mode==="writing"?null:transcript,questions:updatedQuestions,archiveConsent,sequenceConsent,
   ...(kind==="opening"?{title,proposition,allowedModalities:enabled,maxResponseSeconds:Number(duration),replyWindowHours:Number(windowHours)}:
    {answers:pendingQuestions.filter(q=>answers[q.id]!==undefined&&answers[q.id]!=="").map(q=>({questionId:q.id,[mode==="writing"?"characterOffset":"timestamp"]:Number(answers[q.id])}))})};
 }
 async function upload(){
  if(!file||!candidateId)throw Error("Select a candidate and original file first.");
  if(file.size>60*1024*1024)throw Error("The current upload limit is 60 MiB.");
  const data=new FormData();data.set("candidacyId",candidateId);data.set("modality",mode);data.set("original",file);
  const r=await fetch("/api/media/upload",{method:"POST",body:data}),j=await r.json();
  if(!r.ok)throw Error(j.error||"Original upload failed.");
  setMediaId(j.mediaAssetId as string);
  return j.mediaAssetId as string;
 }
 async function prepare(e:FormEvent){
  e.preventDefault();setBusy(true);setNotice("");
  try{
   if(!candidateId)throw Error("Choose your verified candidacy.");
   if(kind==="response"&&!parentId)throw Error("Select the preceding opponent contribution.");
   if(!archiveConsent||!sequenceConsent)throw Error("Both publication permissions are required.");
   let sourceId=mediaId;
   if(mode!=="writing"&&!sourceId)sourceId=await upload();
   if(mode==="writing"&&!speech.trim())throw Error("Write your complete speech first.");
   const currentPayload=payload(sourceId);
   const endpoint=draft?"/api/private/drafts/"+draft.draftId:"/api/private/drafts";
   const r=await fetch(endpoint,{method:draft?"PATCH":"POST",headers:{"content-type":"application/json"},body:JSON.stringify(draft?{payload:currentPayload,transcriptText:transcript||null}:{
    kind,candidacyId,debateId:kind==="response"?debateId:null,parentSubmissionId:kind==="response"?parentId:null,
    payload:currentPayload,transcriptText:mode==="writing"?null:transcript||null,providerConsent,improvementConsent
   })});
   const j=await r.json();if(!r.ok)throw Error(j.error||"Private draft preparation failed.");
   const next={draftId:j.draftId as string,sha256:j.sha256 as string,status:"draft"};setDraft(next);
   setReview(null);setPhase("review");
   if(providerConsent){
    const reviewResponse=await fetch("/api/private/drafts/"+next.draftId+"/assess",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({stage:"preliminary"})});
    const analysis=await reviewResponse.json();
    if(reviewResponse.ok){setReview(analysis as PrivateReview);setNotice("Private preliminary review completed. Every suggestion is optional.");}
    else setNotice((analysis.error||"The assistant is unavailable.")+" You may explicitly skip its optional review.");
   }else setNotice("No provider access consent was granted. You may skip the optional assistant review.");
  }catch(err){setNotice(err instanceof Error?err.message:"Draft review failed.");}finally{setBusy(false);}
 }
 async function skip(){
  if(!draft)return;setBusy(true);
  try{const r=await fetch("/api/private/drafts/"+draft.draftId+"/skip",{method:"POST"}),j=await r.json();if(!r.ok)throw Error(j.error);setDraft({...draft,status:"reviewed"});setNotice("Optional analysis skipped. You retain full editorial control.");}
  catch(e){setNotice(e instanceof Error?e.message:"Could not skip.");}finally{setBusy(false);}
 }
 async function confirm(){
  if(!draft)return;setBusy(true);setNotice("");
  try{
   const r=await fetch("/api/private/drafts/"+draft.draftId+"/confirm",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({sha256:draft.sha256})});
   const j=await r.json();if(!r.ok)throw Error(j.error||"Publication confirmation failed.");
   window.location.assign("/workspace/drafts/"+draft.draftId);
  }catch(e){setNotice(e instanceof Error?e.message:"Publication failed.");}finally{setBusy(false);}
 }
 const summary=kind==="opening"?"Present a specific policy in an enabled medium, supported by a few precise questions.":"Reply in any permitted medium, while answering the previous candidate's questions and asking your own.";
 return <div className="interior-page">
  <p className="eyebrow dark">PRIVATE CANDIDATE WORKSPACE / {kind==="opening"?"OPEN A DEBATE":"YOUR RESPONSE"}</p><h1>{kind==="opening"?"Put forward":"Make your"}<br/><em>{kind==="opening"?"a policy.":"case."}</em></h1><p className="interior-lead">{summary}</p>
  {phase==="review"&&draft?<DraftReview review={review} busy={busy} notice={notice} onRevise={()=>{setPhase("edit");setNotice("Edit your original, then prepare a fresh private review.");}} onSkip={skip} onConfirm={confirm}/>:
  <form className="action-form wide-composer" onSubmit={prepare}>
   <label>Verified candidate<select required value={candidateId} onChange={e=>{setCandidateId(e.target.value);setDraft(null);setMediaId("");}}>
    <option value="">Select candidate and office</option>{candidates.map(c=><option key={c.id} value={c.id}>{c.public_name} — {c.office_title}</option>)}
   </select></label>
   {kind==="opening"?<><label>Policy title<input required value={title} maxLength={180} onChange={e=>setTitle(e.target.value)}/></label>
   <label>Proposal and supporting explanation<textarea required maxLength={20000} value={proposition} onChange={e=>setProposition(e.target.value)}/></label>
   <fieldset><legend>Allowed contributions (choose any combination)</legend>{options.map(opt=><label className="checkline" key={opt}><input type="checkbox" checked={enabled.includes(opt)} onChange={e=>{const next=e.target.checked?[...enabled,opt]:enabled.filter(x=>x!==opt);if(!next.length)return;setEnabled(next);if(!next.includes(mode)){setMode(next[0]);setDraft(null);setMediaId("");}}}/>{opt[0].toUpperCase()+opt.slice(1)}</label>)}</fieldset>
   <label>Reciprocal audio/video response limit (seconds)<input type="number" min={1} max={7200} value={duration} required onChange={e=>setDuration(e.target.value)}/></label>
   <label>Reply deadline for both candidates (hours)<input type="number" min={1} max={720} required value={windowHours} onChange={e=>setWindowHours(e.target.value)}/></label>
   </>:<><label>Opponent's contribution to answer<select required value={parentId} onChange={e=>{setParentId(e.target.value);setAnswers({});setDraft(null);}}>
    <option value="">Select prior contribution</option>{parents.map(p=><option key={p.id} value={p.id}>{p.candidate_name} — {p.kind}</option>)}
   </select></label>
   <p>Reciprocal audio/video limit: {record?.debate.max_response_seconds||"—"} seconds. Writing uses the stated 150-word-per-minute equivalent. All published replies remain part of the public record even if footnoted.</p></>}
   <label>Your submission medium<select value={mode} onChange={e=>{setMode(e.target.value as Mode);setFile(null);setMediaId("");setDraft(null);}}>
    {enabled.map(opt=><option key={opt} value={opt}>{opt[0].toUpperCase()+opt.slice(1)}</option>)}
   </select></label>
   {mode==="writing"?<label>Complete written speech<textarea className="speech-textarea" required maxLength={100000} value={speech} onChange={e=>setSpeech(e.target.value)}/><small>{speech.trim()?speech.trim().split(/\s+/).length:0} words · {speech.length} characters</small></label>:
    <><label>Unedited original {mode} (60 MiB maximum)<input required={!mediaId} type="file" accept={mode==="audio"?"audio/*,.m4a,.mp3,.wav,.flac,.ogg,.webm":"video/mp4,video/quicktime,video/webm"} onChange={e=>{setFile(e.target.files?.[0]||null);setMediaId("");setDraft(null);}}/></label>
     <label>Private speech transcript for optional AI analysis<textarea value={transcript} maxLength={48000} onChange={e=>setTranscript(e.target.value)} placeholder="Add an accurate transcript of your speech. Without one, the assistant will not pretend to have analyzed the audio/video."/></label></>}
   {kind==="opening"?<fieldset><legend>Opening questions (one to three)</legend>{questions.map((q,i)=><div className="question-editor" key={i}>
    <label>Question {i+1}<textarea required maxLength={600} value={q.text} onChange={e=>setQuestions(questions.map((v,n)=>i===n?{...v,text:e.target.value}:v))}/></label>
    <label>{positionLabel}<input required type="number" min={0} step={mode==="writing"?1:0.1} value={q.position} onChange={e=>setQuestions(questions.map((v,n)=>i===n?{...v,position:e.target.value}:v))}/></label>
   </div>)}<button type="button" className="link-button" disabled={questions.length>=3} onClick={()=>setQuestions([...questions,{text:"",position:"0"}])}>+ Question</button>
   {questions.length>1&&<button type="button" className="link-button" onClick={()=>setQuestions(questions.slice(0,-1))}>Remove last</button>}</fieldset>:
   <fieldset><legend>Responses to the previous candidate's questions</legend>{pendingQuestions.map(q=><label key={q.id}>{q.question_text}<input type="number" min="0" step={mode==="writing"?1:0.1} placeholder="Position in your answer; leave blank if unanswered" value={answers[q.id]||""} onChange={e=>setAnswers({...answers,[q.id]:e.target.value})}/></label>)}
   <label>Reciprocal question<textarea maxLength={600} value={myQuestion} onChange={e=>setMyQuestion(e.target.value)}/></label>
   {myQuestion.trim()&&<label>{positionLabel}<input type="number" required min={0} step={mode==="writing"?1:0.1} value={myQuestionPosition} onChange={e=>setMyQuestionPosition(e.target.value)}/></label>}</fieldset>}
   <label className="checkline"><input type="checkbox" required checked={archiveConsent} onChange={e=>setArchiveConsent(e.target.checked)}/>I authorize permanent public archiving of my approved original contribution.</label>
   <label className="checkline"><input type="checkbox" required checked={sequenceConsent} onChange={e=>setSequenceConsent(e.target.checked)}/>I authorize unedited inclusion when the reciprocal debate requirements are met.</label>
   <label className="checkline"><input type="checkbox" checked={providerConsent} onChange={e=>setProviderConsent(e.target.checked)}/>I consent to sending my speech text or supplied transcript to the configured private AI provider for optional assessment.</label>
   <label className="checkline"><input type="checkbox" checked={improvementConsent} onChange={e=>setImprovementConsent(e.target.checked)}/>I opt in to the use of my assessment feedback to improve the assistant, subject to the privacy policy.</label>
   <button className="button button-dark" disabled={busy||!candidateId}>{busy?"Preparing…":"Prepare private assessment ↗"}</button>
   {notice&&<p role="alert" className="form-alert">{notice}</p>}
  </form>}
  <p><Link href={kind==="opening"?"/workspace":"/debates/"+debateId} className="inline-arrow">← Return without publishing</Link></p>
 </div>;
}
