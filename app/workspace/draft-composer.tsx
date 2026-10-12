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
 const [uploadProgress,setUploadProgress]=useState("");
 const [scannerStatus,setScannerStatus]=useState<"checking"|"online"|"offline">("checking");
 useEffect(()=>{
  Promise.all([fetch("/api/account/me",{cache:"no-store"}).then(r=>r.json()),debateId?fetch("/api/debates/"+debateId,{cache:"no-store"}).then(r=>r.json()):Promise.resolve(null)])
  .then(([account,debate])=>{
   setRecord(debate);
   setCandidates((account.candidacies||[]).filter((c:Candidate)=>c.verification_status==="verified"&&(!debate||c.election_id===debate.debate.election_id)));
   if(debate?.debate?.allowed_modalities?.length){setEnabled(debate.debate.allowed_modalities);setMode(debate.debate.allowed_modalities[0]);}
  }).catch(()=>setNotice("Cannot load eligible candidate details."));
 },[debateId]);
 useEffect(()=>{
  let mounted=true;
  fetch("/api/capabilities",{cache:"no-store"}).then(r=>r.json()).then(j=>{
   if(mounted)setScannerStatus(j.newMediaUploadPreflight==="available_for_validation"?"online":"offline");
  }).catch(()=>{if(mounted)setScannerStatus("offline");});
  return ()=>{mounted=false;};
 },[]);
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
 const updatedQuestions=kind==="opening"?questions.map(q=>({text:q.text,[mode==="writing"?"characterOffset":"timestamp"]:Number(q.position)})):
  myQuestion.trim()?[{text:myQuestion.trim(),[mode==="writing"?"characterOffset":"timestamp"]:Number(myQuestionPosition)}]:[];
 function payload(sourceId:string|null){
  return {candidacyId:candidateId,modality:mode,mediaAssetId:mode==="writing"?null:sourceId,writtenContent:mode==="writing"?speech:null,
   transcriptText:mode==="writing"?null:transcript,questions:updatedQuestions,archiveConsent,sequenceConsent,
   ...(kind==="opening"?{title,proposition,allowedModalities:enabled,maxResponseSeconds:Number(duration),replyWindowHours:Number(windowHours)}:
    {answers:pendingQuestions.filter(q=>answers[q.id]!==undefined&&answers[q.id]!=="").map(q=>({questionId:q.id,[mode==="writing"?"characterOffset":"timestamp"]:Number(answers[q.id])}))})};
 }
 async function upload(){
  if(!file||!candidateId)throw Error("Select a verified candidate and original media file.");
  if(file.size<64||file.size>60*1024*1024)throw Error("Choose an original between 64 bytes and 60 MiB.");
  // A digest binds a resumed session to the exact original, not just a filename.
  setUploadProgress("Checking the selected original...");
  const digestBytes=new Uint8Array(await crypto.subtle.digest("SHA-256",await file.arrayBuffer()));
  const sha256=Array.from(digestBytes,x=>x.toString(16).padStart(2,"0")).join("");
  const storageKey="pde-original-v1:"+candidateId+":"+mode+":"+file.name+":"+file.size+":"+file.lastModified+":"+sha256;
  let id="";try{id=window.localStorage.getItem(storageKey)||""}catch{}
  let session:{sessionId:string;partCount:number;partSizeBytes:number;status?:string;expectedSha256?:string;sizeBytes?:number;uploadedParts?:number[];mediaAssetId?:string|null}|null=null;
  if(id){
   const response=await fetch("/api/media/uploads/"+id,{cache:"no-store"});
   if(response.ok){
    const previous=await response.json();
    if(previous.expectedSha256===sha256&&previous.sizeBytes===file.size&&previous.status!=="aborted"&&previous.status!=="failed")session=previous;
   }
   if(!session){try{window.localStorage.removeItem(storageKey)}catch{}}
  }
  if(session?.status==="completed"&&session.mediaAssetId){
   setMediaId(session.mediaAssetId);setUploadProgress("Original already validated.");return session.mediaAssetId;
  }
  if(session?.status==="finalizing")throw Error("Your previous upload is finishing validation. Retry in a moment.");
  if(!session){
   const response=await fetch("/api/media/uploads",{method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({candidacyId:candidateId,modality:mode,sizeBytes:file.size,mimeType:file.type||"application/octet-stream",sha256})});
   const data=await response.json();
   if(!response.ok)throw Error(data.error||"Cannot begin original upload.");
   session=data;
   try{window.localStorage.setItem(storageKey,data.sessionId)}catch{}
  }
  if(!session)throw Error("Storage session unavailable.");
  const completed=new Set(session.uploadedParts||[]);
  for(let n=1;n<=session.partCount;n++){
   if(completed.has(n))continue;
   setUploadProgress("Saving original chunk "+n+" of "+session.partCount+". Interrupted uploads can resume.");
   const from=(n-1)*session.partSizeBytes,to=Math.min(n*session.partSizeBytes,file.size);
   const response=await fetch("/api/media/uploads/"+session.sessionId+"/parts/"+n,{
    method:"PUT",headers:{"content-type":"application/octet-stream"},body:file.slice(from,to)
   });
   const result=await response.json();
   if(!response.ok)throw Error((result.error||"Part upload failed.")+" Reselect the same original and retry to resume.");
   completed.add(n);
  }
  setUploadProgress("Checking the complete unedited original...");
  const response=await fetch("/api/media/uploads/"+session.sessionId+"/complete",{method:"POST"});
  const result=await response.json();
  if(!response.ok)throw Error((result.error||"Could not validate the original.")+" You may retry after checking your connection.");
  try{window.localStorage.removeItem(storageKey)}catch{}
  setUploadProgress("Original stored and verified.");
  setMediaId(result.mediaAssetId as string);
  return result.mediaAssetId as string;
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
    kind,candidacyId:candidateId,debateId:kind==="response"?debateId:null,parentSubmissionId:kind==="response"?parentId:null,
    payload:currentPayload,transcriptText:mode==="writing"?null:transcript||null,providerConsent,improvementConsent
   })});
   const j=await r.json();if(!r.ok)throw Error(j.error||"Private draft preparation failed.");
   if(draft){
    const consentResponse=await fetch("/api/private/drafts/"+draft.draftId+"/consent",{
      method:"POST",headers:{"content-type":"application/json"},
      body:JSON.stringify({providerConsent,improvementConsent})
    });
    const consentResult=await consentResponse.json();
    if(!consentResponse.ok)throw Error(consentResult.error||"Could not update private assistant consent.");
   }
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
 async function transcribe(){
  if(!draft||mode==="writing")return;
  setBusy(true);setNotice("");
  try{
   const response=await fetch("/api/private/drafts/"+draft.draftId+"/transcribe",{method:"POST"});
   const result=await response.json();
   if(!response.ok)throw Error(result.error||"Transcription unavailable.");
   setTranscript(result.transcript);
   setDraft({...draft,sha256:result.sha256,status:"draft"});
   const reviewResult=await fetch("/api/private/drafts/"+draft.draftId+"/assess",{method:"POST",
     headers:{"content-type":"application/json"},body:JSON.stringify({stage:"preliminary"})});
   const analysis=await reviewResult.json();
   if(reviewResult.ok){setReview(analysis as PrivateReview);setNotice("You may accept or reject every editorial suggestion.");}
   else setNotice((analysis.error||"Optional analysis could not run.")+" The transcript remains yours; you can skip assessment.");
  }catch(error){setNotice(error instanceof Error?error.message:"Could not transcribe speech.");}
  finally{setBusy(false);}
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
  {phase==="review"&&draft?<DraftReview review={review} busy={busy} notice={notice} onRevise={()=>{setPhase("edit");setNotice("Edit your original, then prepare a fresh private review.");}} onSkip={skip} onConfirm={confirm} onTranscribe={mode==="writing"||!providerConsent?undefined:transcribe}/>:
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
    <><label>Unedited original {mode} (resumable, 60 MiB maximum)<input required={!mediaId} type="file" accept={mode==="audio"?"audio/*,.m4a,.mp3,.wav,.flac,.ogg,.webm":"video/mp4,video/quicktime,video/webm"} onChange={e=>{setFile(e.target.files?.[0]||null);setMediaId("");setDraft(null);}}/></label>
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
   {mode!=="writing"&&scannerStatus!=="online"&&!mediaId&&
    <p role="status" aria-live="polite">{scannerStatus==="checking"?"Checking required media scanning service…":"Media uploads are unavailable because required scanning is offline. Choose Writing for a text-only contribution; your work will not be uploaded unscanned."}</p>}
   <button className="button button-dark" disabled={busy||!candidateId||(mode!=="writing"&&!mediaId&&scannerStatus!=="online")}>{busy?"Preparing…":"Prepare private assessment ↗"}</button>
   {mode!=="writing"&&uploadProgress&&<p role="status" aria-live="polite">{uploadProgress}</p>}
   {notice&&<p role="alert" className="form-alert">{notice}</p>}
  </form>}
  <p><Link href={kind==="opening"?"/workspace":"/debates/"+debateId} className="inline-arrow">← Return without publishing</Link></p>
 </div>;
}
