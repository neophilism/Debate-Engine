"use client";
import Link from "next/link";
import { useCallback,useEffect,useState,type FormEvent } from "react";
import { authClient } from "../../lib/auth/client";
type Candidacy={id:string;public_name:string;affiliation:string|null;verification_status:string;election_id:string;office_title:string;label:string;};
type Election={id:string;office_title:string;label:string;event_date:string};
type VerificationEvent={event_type:string;public_reason:string;private_explanation:string|null;occurred_at:string};
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
 const [verificationReason,setVerificationReason]=useState("");
 const [appealStatements,setAppealStatements]=useState<Record<string,string>>({});
 const [verificationHistory,setVerificationHistory]=useState<Record<string,VerificationEvent[]>>({});
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
     const response=await fetch("/api/admin/candidacies/"+candidateId+"/verify",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({approve,reason:verificationReason})});
     const result=await response.json();
     if(!response.ok)throw Error(result.error);
     setVerificationReason("");await load();
   }catch(e){setMessage(e instanceof Error?e.message:"Failed to review.");}finally{setBusy(false);}
 }

 async function appeal(candidacyId:string){
   setBusy(true);setMessage("");
   try{
     const response=await fetch("/api/candidacies/"+candidacyId+"/appeal",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({statement:appealStatements[candidacyId]||""})});
     const result=await response.json();
     if(!response.ok)throw Error(result.error||"Appeal not accepted.");
     setMessage("Your independent verification appeal was submitted.");await load();
   }catch(e){setMessage(e instanceof Error?e.message:"Appeal failed.");}
   finally{setBusy(false);}
 }
 async function viewVerificationHistory(candidacyId:string){
   setBusy(true);setMessage("");
   try{
     const response=await fetch("/api/admin/candidacies/"+candidacyId+"/history",{cache:"no-store"});
     const result=await response.json();
     if(!response.ok)throw Error(result.error||"Verification history not available.");
     setVerificationHistory(old=>({...old,[candidacyId]:result.events||[]}));
   }catch(e){setMessage(e instanceof Error?e.message:"Could not view case history.");}
   finally{setBusy(false);}
 }
 return <div className="interior-page">
   <p className="eyebrow dark">PRIVATE WORKSPACE</p><h1>Hello,<br/><em>{displayName}.</em></h1>
   {!verifiedEmail&&<p role="alert" className="form-alert">Your email is not yet verified. Publication privileges will remain unavailable until verification.</p>}
   <p className="interior-lead">Manage your candidacy and future policy debates. Public debate records are never editable from this private workspace.</p><p><Link href="/workspace/delegates" className="inline-arrow">Manage campaign delegates ↗</Link></p><p><Link href="/workspace/drafts" className="inline-arrow">Your private drafts and Debate Assistant assessments ↗</Link></p></p>
   <div className="workspace-grid">
     <section className="workspace-panel"><p className="small-label">YOUR CANDIDACIES</p>
       {loading?<p>Loading…</p>:candidacies.length===0?<p>No candidacy registered yet.</p>:candidacies.map(c=><article className="mini-card" key={c.id}><strong>{c.public_name} · {c.office_title}</strong><p>{c.label} · {c.verification_status}</p>{c.verification_status==="verified"&&<Link href="/workspace/new" className="inline-arrow">Prepare a debate ↗</Link>}{c.verification_status==="rejected"&&<div className="verification-appeal">
   <p>Your candidacy was not verified. You may request independent reconsideration.</p>
   <label>Private appeal statement (do not include identity documents or sensitive account numbers)<textarea maxLength={4000} rows={4} value={appealStatements[c.id]||""} onChange={e=>setAppealStatements({...appealStatements,[c.id]:e.target.value})}/></label>
   <button disabled={busy||(appealStatements[c.id]||"").trim().length<25} onClick={()=>appeal(c.id)}>Submit verification appeal ↗</button>
  </div>}</article>)}
     </section>
     <section className="workspace-panel"><p className="small-label">REGISTER FOR AN ELECTION</p>
       {elections.length===0?<p>No election cycle has been published yet. A platform administrator must register one before candidacies can be submitted.</p>:
       <form className="action-form" onSubmit={submit}><label>Election
         <select required value={electionId} onChange={e=>setElectionId(e.target.value)}><option value="">Select office and election</option>{elections.map(e=><option value={e.id} key={e.id}>{e.office_title} — {e.label}</option>)}</select>
       </label><label>Public candidate name<input required maxLength={160} value={publicName} onChange={e=>setPublicName(e.target.value)}/></label>
       <label>Affiliation (optional)<input maxLength={160} value={affiliation} onChange={e=>setAffiliation(e.target.value)}/></label><button disabled={busy||!verifiedEmail} className="button button-dark">Request verification ↗</button></form>}
     </section>
   </div>
   {admin&&<section className="workspace-panel admin-panel"><p className="small-label">PLATFORM ADMINISTRATION</p><p>Identity and election verification are independent of debate responsiveness decisions.</p><Link href="/workspace/admin/elections" className="inline-arrow">Manage election cycles ↗</Link><h2>Pending candidacies</h2>
  <label className="verification-review">Required public procedural reason for an approval or rejection
   <textarea rows={4} maxLength={2000} value={verificationReason} onChange={e=>setVerificationReason(e.target.value)} placeholder="Describe the independent identity and candidacy evidence reviewed, or the concrete verification gap."/>
  </label>
  {pending.length?pending.map(c=><article key={c.id} className="mini-card"><strong>{c.public_name}</strong><p>{c.office_title} · {c.label} · {c.verification_status}</p><button disabled={busy||verificationReason.trim().length<20} onClick={()=>decide(c.id,true)}>Approve verification</button>
  <button disabled={busy||verificationReason.trim().length<20} onClick={()=>decide(c.id,false)}>Reject verification</button>
  <button disabled={busy} onClick={()=>viewVerificationHistory(c.id)}>Review case history / appeal</button>
  {verificationHistory[c.id]&&<div className="verification-events"><h3>Independent verification history</h3>{verificationHistory[c.id].length===0?<p>No recorded events.</p>:verificationHistory[c.id].map((event,i)=><div key={i}><strong>{event.event_type}</strong><p>{event.public_reason}</p>{event.private_explanation&&<p>Private appeal statement: {event.private_explanation}</p>}<small>{new Date(event.occurred_at).toLocaleString()}</small></div>)}</div>}</article>):<p>No candidates awaiting review.</p>}</section>}
   {message&&<p role="status" className="form-alert">{message}</p>}
   <button className="link-button" onClick={async()=>{await authClient.signOut();window.location.assign("/");}}>Sign out</button>
 </div>;
}
