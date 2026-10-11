"use client";
import {useEffect,useState,type FormEvent} from "react";
type Contribution={id:string;candidate_name:string;candidacy_id:string};
type Candidate={id:string;public_name:string;verification_status:string};
export default function SupportingDocuments({submissions}:{submissions:Contribution[]}){
 const [candidates,setCandidates]=useState<Candidate[]>([]),[candidacyId,setCandidacyId]=useState(""),[submissionId,setSubmissionId]=useState(""),[label,setLabel]=useState(""),[file,setFile]=useState<File|null>(null),[message,setMessage]=useState(""),[busy,setBusy]=useState(false);
 useEffect(()=>{fetch("/api/account/me",{cache:"no-store"}).then(r=>r.json()).then(j=>setCandidates((j.candidacies||[]).filter((c:Candidate)=>c.verification_status==="verified"))).catch(()=>{})},[]);
 const owned=submissions.filter(s=>s.candidacy_id===candidacyId);
 if(!candidates.length)return null;
 async function submit(e:FormEvent){
  e.preventDefault();setBusy(true);setMessage("");
  try{if(!file)throw Error("Choose a file first.");
   const data=new FormData();data.set("candidacyId",candidacyId);data.set("label",label);data.set("document",file);
   const res=await fetch("/api/contributions/"+submissionId+"/documents",{method:"POST",body:data});const json=await res.json();
   if(!res.ok)throw Error(json.error||"Upload failed.");
   setMessage("Supporting document published. Refresh the debate to see it in the permanent public record.");setFile(null);setLabel("");
  }catch(e){setMessage(e instanceof Error?e.message:"Upload failed.");}finally{setBusy(false);}
 }
 return <section className="source-upload"><h2>Add source material</h2><p>The source becomes part of the permanent record alongside your published video. New evidence is added, not substituted for existing evidence.</p>
 <form className="action-form" onSubmit={submit}><label>Your verified candidacy<select required value={candidacyId} onChange={e=>{setCandidacyId(e.target.value);setSubmissionId("");}}><option value="">Choose candidate</option>{candidates.map(c=><option key={c.id} value={c.id}>{c.public_name}</option>)}</select></label><label>Published video<select required value={submissionId} onChange={e=>setSubmissionId(e.target.value)}><option value="">Choose your video</option>{owned.map(x=><option key={x.id} value={x.id}>{x.candidate_name} · {x.id.slice(0,8)}</option>)}</select></label><label>Document title<input required maxLength={240} value={label} onChange={e=>setLabel(e.target.value)}/></label><label>Source file (PDF, DOCX, or TXT, up to 20 MiB)<input required type="file" accept=".pdf,.docx,.txt" onChange={e=>setFile(e.target.files?.[0]||null)}/></label><button className="button button-dark" disabled={busy}>Publish supporting source ↗</button></form>{message&&<p role="status">{message}</p>}
 </section>;
}
