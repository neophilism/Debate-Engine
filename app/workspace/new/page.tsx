"use client";
import Link from "next/link";
import {useEffect,useState,type FormEvent} from "react";
type Candidacy={id:string;public_name:string;verification_status:string;office_title:string;};
type Question={text:string;timestamp:number};
export default function NewDebatePage(){
 const [list,setList]=useState<Candidacy[]>([]);
 const [candidacyId,setCandidacyId]=useState("");
 const [title,setTitle]=useState("");const[proposition,setProposition]=useState("");
 const [maxResponseSeconds,setMaxResponseSeconds]=useState(300);
 const [replyWindowHours,setReplyWindowHours]=useState(72);
 const [questions,setQuestions]=useState<Question[]>([{text:"",timestamp:0}]);
 const [file,setFile]=useState<File|null>(null);const[mediaId,setMediaId]=useState("");
 const [archiveConsent,setArchiveConsent]=useState(false);const[sequenceConsent,setSequenceConsent]=useState(false);
 const [busy,setBusy]=useState(false);const[message,setMessage]=useState("");
 useEffect(()=>{fetch("/api/account/me",{cache:"no-store"}).then(r=>r.json()).then(j=>setList((j.candidacies||[]).filter((c:Candidacy)=>c.verification_status==="verified"))).catch(()=>setMessage("Could not load verified candidacies."))},[]);
 async function upload(){
  if(!file||!candidacyId)throw Error("Choose a verified candidacy and an original video.");
  if(file.size>60*1024*1024)throw Error("Maximum original video size is currently 60 MiB.");
  const data=new FormData();data.set("candidacyId",candidacyId);data.set("video",file);
  const response=await fetch("/api/media/upload",{method:"POST",body:data});
  const json=await response.json();if(!response.ok)throw Error(json.error||"Video upload failed.");
  setMediaId(json.mediaAssetId);setMessage("Original video validated and stored. You may now publish the debate.");
 }
 async function publish(event:FormEvent){
  event.preventDefault();setBusy(true);setMessage("");
  try{
   if(!mediaId){await upload();throw Error("Video stored. Review its questions and select Publish again.");}
   const response=await fetch("/api/debates",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({candidacyId,mediaAssetId:mediaId,title,proposition,maxResponseSeconds,replyWindowHours,questions,archiveConsent,sequenceConsent})});
   const json=await response.json();if(!response.ok)throw Error(json.error||"Could not publish.");
   window.location.assign("/debates/"+json.debateId);
  }catch(error){setMessage(error instanceof Error?error.message:"Could not complete request.");}
  finally{setBusy(false);}
 }
 return <div className="interior-page"><p className="eyebrow dark">CANDIDATE WORKSPACE / START A DEBATE</p><h1>Put forward<br/><em>a policy.</em></h1>
  <p className="interior-lead">Your initial presentation remains intact. Put one to three precise questions near the end of the video, and offer the same reply limits you expect from others.</p>
  <form className="action-form" onSubmit={publish}>
    <label>Verified candidacy<select required value={candidacyId} onChange={e=>{setCandidacyId(e.target.value);setMediaId("");}}><option value="">Select candidate and office</option>{list.map(c=><option key={c.id} value={c.id}>{c.public_name} · {c.office_title}</option>)}</select></label>
    <label>Policy title<input required maxLength={180} value={title} onChange={e=>setTitle(e.target.value)}/></label>
    <label>Policy outline / description<textarea required maxLength={20000} value={proposition} onChange={e=>setProposition(e.target.value)}/></label>
    <label>Maximum duration for each subsequent video (seconds)<input type="number" min={1} max={7200} required value={maxResponseSeconds} onChange={e=>setMaxResponseSeconds(Number(e.target.value))}/></label>
    <label>Reciprocal reply window (hours)<input type="number" min={1} max={720} required value={replyWindowHours} onChange={e=>setReplyWindowHours(Number(e.target.value))}/></label>
    <fieldset><legend>Questions in your opening video (1–3)</legend>{questions.map((q,i)=><div className="question-editor" key={i}><label>Question {i+1}<textarea maxLength={600} required value={q.text} onChange={e=>setQuestions(questions.map((x,n)=>n===i?{...x,text:e.target.value}:x))}/></label><label>Video timestamp (seconds)<input type="number" min="0" step=".1" required value={q.timestamp} onChange={e=>setQuestions(questions.map((x,n)=>n===i?{...x,timestamp:Number(e.target.value)}:x))}/></label></div>)}
    <button type="button" className="link-button" disabled={questions.length>=3} onClick={()=>setQuestions([...questions,{text:"",timestamp:0}])}>+ Add question</button>{questions.length>1&&<button type="button" className="link-button" onClick={()=>setQuestions(questions.slice(0,-1))}>Remove last question</button>}</fieldset>
    <label>Unedited original video (MP4, MOV or WebM, currently 60 MiB maximum)<input type="file" accept="video/mp4,video/webm,video/quicktime" required={!mediaId} onChange={e=>{setFile(e.target.files?.[0]||null);setMediaId("");}}/></label>
    <button type="button" className="button button-dark" disabled={busy||!file||!candidacyId||Boolean(mediaId)} onClick={async()=>{setBusy(true);try{await upload();}catch(e){setMessage(e instanceof Error?e.message:"Upload failed.");}finally{setBusy(false);}}}>{mediaId?"Original stored ✓":"Upload & validate original"}</button>
    <label className="checkline"><input type="checkbox" checked={archiveConsent} onChange={e=>setArchiveConsent(e.target.checked)} required/>I authorize permanent public archival publication of this original video.</label>
    <label className="checkline"><input type="checkbox" checked={sequenceConsent} onChange={e=>setSequenceConsent(e.target.checked)} required/>I authorize unedited inclusion in the qualifying debate sequence under the reciprocal rules.</label>
    <button className="button button-dark" disabled={busy||!mediaId||!archiveConsent||!sequenceConsent}>{busy?"Working…":"Publish policy debate ↗"}</button>
   </form>{message&&<p role="status" className="form-alert">{message}</p>}
   <Link href="/workspace" className="inline-arrow">← Back to workspace</Link>
 </div>;
}
