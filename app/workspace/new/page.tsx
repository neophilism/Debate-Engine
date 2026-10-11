"use client";
import Link from "next/link";
import {useEffect,useState,type FormEvent} from "react";
import {ALL_MODALITIES,type DebateModality} from "../../../packages/domain/modalities";
type Candidate={id:string;public_name:string;office_title:string;verification_status:string};
type PromptQuestion={text:string;position:string};
const descriptions={video:"Video",audio:"Audio",writing:"Writing"};
export default function NewDebatePage(){
 const[candidates,setCandidates]=useState<Candidate[]>([]),[candidateId,setCandidateId]=useState("");
 const[title,setTitle]=useState(""),[proposition,setProposition]=useState("");
 const[allowed,setAllowed]=useState<DebateModality[]>(["video"]),[modality,setModality]=useState<DebateModality>("video");
 const[maxResponseSeconds,setMaxResponseSeconds]=useState(300),[replyWindowHours,setReplyWindowHours]=useState(72);
 const[questions,setQuestions]=useState<PromptQuestion[]>([{text:"",position:"0"}]);
 const[file,setFile]=useState<File|null>(null),[mediaAssetId,setMediaAssetId]=useState(""),[writtenContent,setWrittenContent]=useState("");
 const[archiveConsent,setArchiveConsent]=useState(false),[sequenceConsent,setSequenceConsent]=useState(false);
 const[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 useEffect(()=>{fetch("/api/account/me",{cache:"no-store"}).then(async r=>{if(!r.ok)throw Error("Sign in to continue.");return r.json();}).then(j=>setCandidates((j.candidacies||[]).filter((c:Candidate)=>c.verification_status==="verified"))).catch(e=>setMessage(e instanceof Error?e.message:"Candidates unavailable."));},[]);
 function toggleAllowed(choice:DebateModality){
  const next=allowed.includes(choice)?allowed.filter(x=>x!==choice):ALL_MODALITIES.filter(x=>[...allowed,choice].includes(x));
  if(next.length===0){setMessage("Select at least one permitted format.");return;}
  setAllowed([...next]);if(!next.includes(modality)){setModality(next[0]);setFile(null);setMediaAssetId("");}
 }
 async function upload(){
  if(!file||!candidateId)throw Error("Choose your candidate and original recording.");
  if(file.size>60*1024*1024)throw Error("Current upload limit is 60 MiB.");
  const data=new FormData();data.set("candidacyId",candidateId);data.set("modality",modality);data.set("original",file);
  const res=await fetch("/api/media/upload",{method:"POST",body:data});const out=await res.json();
  if(!res.ok)throw Error(out.error||"Upload failed.");
  setMediaAssetId(out.mediaAssetId);
  setMessage("Original "+modality+" recording validated and stored privately; review before publication.");
 }
 async function publish(event:FormEvent){
  event.preventDefault();setBusy(true);setMessage("");
  try{
   if(modality!=="writing"&&!mediaAssetId)throw Error("Validate your original recording first.");
   const mapped=questions.map(q=>modality==="writing"?{text:q.text,characterOffset:Number(q.position)}:{text:q.text,timestamp:Number(q.position)});
   const res=await fetch("/api/debates",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({
     candidacyId:candidateId,modality,allowedModalities:allowed,mediaAssetId:modality==="writing"?undefined:mediaAssetId,
     writtenContent:modality==="writing"?writtenContent:undefined,title,proposition,maxResponseSeconds,replyWindowHours,
     questions:mapped,archiveConsent,sequenceConsent
   })});const out=await res.json();if(!res.ok)throw Error(out.error||"Publication failed.");
   window.location.assign("/debates/"+out.debateId);
  }catch(e){setMessage(e instanceof Error?e.message:"Publication failed.");}finally{setBusy(false);}
 }
 const writing=modality==="writing";
 return <div className="interior-page"><p className="eyebrow dark">CANDIDATE WORKSPACE / OPEN A DEBATE</p>
  <h1>Start with<br/><em>a proposition.</em></h1><p className="interior-lead">The debate's rules apply equally to written speeches, audio recordings and videos. Choose which media are allowed, then publish your own opening presentation in one of them. Your published original cannot be silently rewritten.</p>
  <form onSubmit={publish} className="action-form">
   <label>Verified candidacy<select required value={candidateId} onChange={e=>{setCandidateId(e.target.value);setMediaAssetId("");}}><option value="">Select your candidacy</option>{candidates.map(c=><option key={c.id} value={c.id}>{c.public_name} — {c.office_title}</option>)}</select></label>
   <label>Policy title<input required maxLength={180} value={title} onChange={e=>setTitle(e.target.value)}/></label>
   <label>Policy proposition / description<textarea required maxLength={20000} value={proposition} onChange={e=>setProposition(e.target.value)}/></label>
   <fieldset><legend>Permitted debate media (choose one, two or all three)</legend>{ALL_MODALITIES.map(m=><label className="checkline" key={m}><input type="checkbox" checked={allowed.includes(m)} onChange={()=>toggleAllowed(m)}/>{descriptions[m]}</label>)}</fieldset>
   <label>Your opening presentation medium<select value={modality} onChange={e=>{setModality(e.target.value as DebateModality);setFile(null);setMediaAssetId("");}}>{allowed.map(x=><option key={x} value={x}>{descriptions[x]}</option>)}</select></label>
   {writing?<label>Full written opening speech<textarea minLength={1} maxLength={100000} required value={writtenContent} onChange={e=>setWrittenContent(e.target.value)} placeholder="Write your speech here, including the questions for your interlocutor."/></label>:
    <><label>Unedited {modality} original (up to 60 MiB)<input type="file" accept={modality==="video"?"video/mp4,video/quicktime,video/webm":"audio/mpeg,audio/mp4,audio/wav,audio/ogg,audio/webm"} required={!mediaAssetId} onChange={e=>{setFile(e.target.files?.[0]||null);setMediaAssetId("");}}/></label>
    <button type="button" className="button button-dark" disabled={busy||!file||!candidateId||Boolean(mediaAssetId)} onClick={async()=>{setBusy(true);try{await upload()}catch(e){setMessage(e instanceof Error?e.message:"Upload failed.")}finally{setBusy(false)}}}>{mediaAssetId?"Original stored ✓":"Validate and store original ↗"}</button></>}
   <label>Maximum subsequent response duration (seconds; written equivalent is 150 words/minute)<input type="number" required min={1} max={7200} value={maxResponseSeconds} onChange={e=>setMaxResponseSeconds(Number(e.target.value))}/></label>
   <label>Reciprocal reply window (hours)<input type="number" required min={1} max={720} value={replyWindowHours} onChange={e=>setReplyWindowHours(Number(e.target.value))}/></label>
   <fieldset><legend>One to three questions in your opening speech</legend>{questions.map((q,i)=><div key={i} className="question-editor"><label>Question {i+1}<textarea required maxLength={600} value={q.text} onChange={e=>setQuestions(questions.map((v,n)=>n===i?{...v,text:e.target.value}:v))}/></label><label>{writing?"Character offset in written speech":"Recording timestamp in seconds"}<input required type="number" min={0} step={writing?1:0.1} value={q.position} onChange={e=>setQuestions(questions.map((v,n)=>n===i?{...v,position:e.target.value}:v))}/></label></div>)}<button type="button" className="link-button" disabled={questions.length>=3} onClick={()=>setQuestions([...questions,{text:"",position:"0"}])}>+ Add question</button>{questions.length>1&&<button type="button" className="link-button" onClick={()=>setQuestions(questions.slice(0,-1))}>Remove last question</button>}</fieldset>
   <label className="checkline"><input type="checkbox" required checked={archiveConsent} onChange={e=>setArchiveConsent(e.target.checked)}/>I authorize permanent public archival publication of this original {modality} contribution.</label>
   <label className="checkline"><input type="checkbox" required checked={sequenceConsent} onChange={e=>setSequenceConsent(e.target.checked)}/>I authorize unedited inclusion when the reciprocal conditions are met.</label>
   <button className="button button-dark" disabled={busy||(!writing&&!mediaAssetId)||!archiveConsent||!sequenceConsent}>{busy?"Working…":"Publish the debate ↗"}</button>
  </form>{message&&<p role="status" className="form-alert">{message}</p>}<Link href="/workspace" className="inline-arrow">← Candidate workspace</Link></div>;
}
