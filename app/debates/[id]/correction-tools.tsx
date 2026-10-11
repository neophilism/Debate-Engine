"use client";
import {useEffect,useState,type FormEvent} from "react";
type Source={id:string;candidate_name:string;candidacy_id:string;kind:string};
type Candidate={id:string;verification_status:string;public_name:string};
export default function CorrectionTools({submissions}:{submissions:Source[]}){
 const [mine,setMine]=useState<Candidate[]>([]),[sourceId,setSourceId]=useState("");
 const [body,setBody]=useState(""),[busy,setBusy]=useState(false),[notice,setNotice]=useState("");
 useEffect(()=>{fetch("/api/account/me",{cache:"no-store"}).then(r=>r.json()).then(j=>setMine((j.candidacies||[]).filter((c:Candidate)=>c.verification_status==="verified"))).catch(()=>{})},[]);
 const eligible=submissions.filter(s=>mine.some(c=>c.id===s.candidacy_id));
 const selected=eligible.find(s=>s.id===sourceId);
 async function publish(e:FormEvent){
  e.preventDefault();if(!selected||!body.trim())return;setBusy(true);setNotice("");
  try{
   const response=await fetch("/api/contributions/"+sourceId+"/corrections",{
    method:"POST",headers:{"content-type":"application/json"},
    body:JSON.stringify({candidacyId:selected.candidacy_id,correctionBody:body})
   });
   const j=await response.json();
   if(!response.ok)throw Error(j.error||"Could not publish correction.");
   setNotice("Correction appended permanently. The original contribution has not changed.");setBody("");
   window.location.reload();
  }catch(e){setNotice(e instanceof Error?e.message:"Correction failed.");}finally{setBusy(false)}
 }
 if(!eligible.length)return null;
 return <section className="action-form" aria-label="Publish a correction"><h2>Correct your own published statement</h2>
  <p>This publishes a clearly attributed, permanent correction. It never replaces your original words or alters an opponent's qualifying sequence.</p>
  <form onSubmit={publish}><label>Original contribution<select required value={sourceId} onChange={e=>setSourceId(e.target.value)}>
   <option value="">Choose your published statement</option>{eligible.map(s=><option key={s.id} value={s.id}>{s.candidate_name} — {s.kind} ({s.id.slice(0,8)})</option>)}
  </select></label>
  <label>Correction, clarification or retraction<textarea value={body} onChange={e=>setBody(e.target.value)} minLength={20} maxLength={5000} required placeholder="State exactly what you are correcting and what the record should now reflect."/></label>
  <button className="button button-dark" type="submit" disabled={busy||!selected||body.trim().length<20}>{busy?"Publishing…":"Publish permanent correction ↗"}</button>
  {notice&&<p role="status">{notice}</p>}</form>
 </section>;
}
