"use client";
import Link from "next/link";
import { useCallback,useEffect,useState,type FormEvent } from "react";
import { authClient } from "../../lib/auth/client";
type Candidacy={id:string;public_name:string;affiliation:string|null;verification_status:string;election_id:string;office_title:string;label:string;};
type Election={id:string;office_title:string;label:string;event_date:string};
export default function CandidateWorkspace({displayName,admin,verifiedEmail}:{displayName:string;admin:boolean;verifiedEmail:boolean}) {
 const [candidacies,setCandidacies]=useState<Candidacy[]>([]);
 const [elections,setElections]=useState<Election[]>([]);
 const [pending,setPending]=useState<Candidacy[]>([]);
 const [loading,setLoading]=useState(true);
 const [message,setMessage]=useState("");
 const [publicName,setPublicName]=useState(displayName);
 const [affiliation,setAffiliation]=useState("");
 const [electionId,setElectionId]=useState("");
 const [busy,setBusy]=useState(false);
 const load=useCallback(async()=>{
   try {
     const [mine,cycles,review]=await Promise.all([
       fetch("/api/account/me",{cache:"no-store"}).then(r=>r.json()),
       fetch("/api/elections",{cache:"no-store"}).then(r=>r.json()),
       admin?fetch("/api/admin/candidacies",{cache:"no-store"}).then(r=>r.json()):Promise.resolve({candidacies:[]}),
     ]);
     setCandidacies(mine.candidacies||[]);setElections(cycles.elections||[]);setPending(review.candidacies||[]);
   }catch{setMessage("Could not load workspace details.");}
   finally{setLoading(false);}
 },[admin]);
 useEffect(()=>{void load()},[load]);
 async function submit(event:FormEvent){
   event.preventDefault();setBusy(true);setMessage("");
   try{
     const response=await fetch("/api/candidacies",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({electionId,publicName,affiliation})});
     const result=await response.json();
     if(!response.ok) throw Error(result.error||"Unable to submit.");
     setMessage("Candidate registration submitted. Verification remains pending.");
     await load();
   }catch(e){setMessage(e instanceof Error?e.message:"Unable to register.");}finally{setBusy(false);}
 }
 async function decide(candidateId:string,approve:boolean){
   setBusy(true);
   try{
     const response=await fetch("/api/admin/candidacies/"+candidateId+"/verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({approve})});
     const result=await response.json();
     if(!response.ok)throw Error(result.error);
     await load();
   }catch(e){setMessage(e instanceof Error?e.message:"Failed to review.");}finally{setBusy(false);}
 }
 return <div className="interior-page">
   <p className="eyebrow dark">PRIVATE WORKSPACE</p><h1>Hello,<br/><em>{displayName}.</em></h1>
   {!verifiedEmail&&<p role="alert" className="form-alert">Your email is not yet verified. Publication privileges will remain unavailable until verification.</p>}
   <p className="interior-lead">Manage your candidacy and future policy debates. Public debate records are never editable from this private workspace.</p>
   <div className="workspace-grid">
     <section className="workspace-panel"><p className="small-label">YOUR CANDIDACIES</p>
       {loading?<p>Loading…</p>:candidacies.length===0?<p>No candidacy registered yet.</p>:candidacies.map(c=><article className="mini-card" key={c.id}><strong>{c.public_name} · {c.office_title}</strong><p>{c.label} · {c.verification_status}</p>{c.verification_status==="verified"&&<Link href="/workspace/new" className="inline-arrow">Prepare a debate ↗</Link>}</article>)}
     </section>
     <section className="workspace-panel"><p className="small-label">REGISTER FOR AN ELECTION</p>
       {elections.length===0?<p>No election cycle has been published yet. A platform administrator must register one before candidacies can be submitted.</p>:
       <form className="action-form" onSubmit={submit}><label>Election
         <select required value={electionId} onChange={e=>setElectionId(e.target.value)}><option value="">Select office and election</option>{elections.map(e=><option value={e.id} key={e.id}>{e.office_title} — {e.label}</option>)}</select>
       </label><label>Public candidate name<input required maxLength={160} value={publicName} onChange={e=>setPublicName(e.target.value)}/></label>
       <label>Affiliation (optional)<input maxLength={160} value={affiliation} onChange={e=>setAffiliation(e.target.value)}/></label><button disabled={busy||!verifiedEmail} className="button button-dark">Request verification ↗</button></form>}
     </section>
   </div>
   {admin&&<section className="workspace-panel admin-panel"><p className="small-label">PLATFORM ADMINISTRATION</p><p>Identity and election verification are independent of debate responsiveness decisions.</p><Link href="/workspace/admin/elections" className="inline-arrow">Manage election cycles ↗</Link><h2>Pending candidacies</h2>{pending.length?pending.map(c=><article key={c.id} className="mini-card"><strong>{c.public_name}</strong><p>{c.office_title} · {c.label} · {c.verification_status}</p><button disabled={busy} onClick={()=>decide(c.id,true)}>Verify candidate</button> <button disabled={busy} onClick={()=>decide(c.id,false)}>Reject</button></article>):<p>No candidates awaiting review.</p>}</section>}
   {message&&<p role="status" className="form-alert">{message}</p>}
   <button className="link-button" onClick={async()=>{await authClient.signOut();window.location.assign("/");}}>Sign out</button>
 </div>;
}
