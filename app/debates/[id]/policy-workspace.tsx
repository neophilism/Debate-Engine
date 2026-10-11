"use client";
import {useEffect,useState,type FormEvent} from "react";
type Branch={id:string;contender_name:string};
type Version={id:string;content_sha256:string;policy_body:string;created_at:string;proposer:string;approval_count:number};
type Candidacy={id:string;public_name:string;verification_status:string};
export default function PolicyWorkspace({branches}:{branches:Branch[]}){
 const[branchId,setBranchId]=useState(branches[0]?.id||"");
 const[policies,setPolicies]=useState<Version[]>([]);
 const[candidates,setCandidates]=useState<Candidacy[]>([]);
 const[candidateId,setCandidateId]=useState("");
 const[body,setBody]=useState("");
 const[message,setMessage]=useState("");
 const[busy,setBusy]=useState(false);
 const[confirmed,setConfirmed]=useState<string|null>(null);
 useEffect(()=>{fetch("/api/account/me",{cache:"no-store"}).then(r=>r.json()).then(j=>setCandidates((j.candidacies||[]).filter((x:Candidacy)=>x.verification_status==="verified"))).catch(()=>{})},[]);
 useEffect(()=>{if(!branchId)return;fetch("/api/branches/"+branchId+"/policies",{cache:"no-store"}).then(r=>r.json()).then(j=>setPolicies(j.policies||[])).catch(()=>setMessage("Could not load proposals."))},[branchId]);
 async function submit(e:FormEvent){
  e.preventDefault();setBusy(true);setMessage("");
  try{const r=await fetch("/api/branches/"+branchId+"/policies",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({candidacyId:candidateId,policyBody:body})});const j=await r.json();if(!r.ok)throw Error(j.error||"Proposal failed.");setBody("");setMessage("Policy proposal published with immutable version identifier.");const response=await fetch("/api/branches/"+branchId+"/policies",{cache:"no-store"});setPolicies((await response.json()).policies||[]);
  }catch(e){setMessage(e instanceof Error?e.message:"Proposal failed.");}finally{setBusy(false);}
 }
 async function accept(v:Version){
  if(confirmed!==v.id){setConfirmed(v.id);return;}
  setBusy(true);setMessage("");
  try{const r=await fetch("/api/branches/"+branchId+"/policies/"+v.id+"/accept",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({candidacyId:candidateId,sha256:v.content_sha256})});const j=await r.json();if(!r.ok)throw Error(j.error||"Approval failed.");setMessage(j.jointlyAgreed?"Both candidates have accepted this exact policy version.":"Acceptance recorded. Waiting for the other candidate's consent.");setConfirmed(null);const response=await fetch("/api/branches/"+branchId+"/policies",{cache:"no-store"});setPolicies((await response.json()).policies||[]);
  }catch(e){setMessage(e instanceof Error?e.message:"Approval failed.");}finally{setBusy(false);}
 }
 if(!branches.length)return null;
 return <section className="policy-convergence"><p className="small-label">TOWARD A BETTER POLICY</p><h2>Can the disagreement lead somewhere?</h2><p>A jointly accepted proposal requires both candidates to approve exactly the same version. No one can approve another candidate’s position or change the proposal after approval.</p>
  <label className="policy-branch">Debate branch <select value={branchId} onChange={e=>{setBranchId(e.target.value);setConfirmed(null);}}>{branches.map(b=><option key={b.id} value={b.id}>{b.contender_name}</option>)}</select></label>
  <div className="policy-list">{policies.length===0?<p>No policy synthesis proposals have been published for this branch.</p>:policies.map(v=><article key={v.id}><p className="small-label">PROPOSED BY {v.proposer} · {new Date(v.created_at).toLocaleDateString("en-US")}</p><h3>Policy version</h3><p className="policy-copy">{v.policy_body}</p><p className="policy-digest">SHA-256: <code>{v.content_sha256}</code></p><p>{v.approval_count} candidate approval(s) recorded</p>{candidates.length>0&&<button type="button" disabled={busy||!candidateId} onClick={()=>accept(v)}>{confirmed===v.id?"Confirm acceptance of this exact version":"Accept this policy version"}</button>}</article>)}</div>
  {candidates.length>0&&<form className="action-form" onSubmit={submit}><h3>Propose a policy that resolves the disagreement</h3><label>Your verified candidacy<select required value={candidateId} onChange={e=>setCandidateId(e.target.value)}><option value="">Choose candidacy</option>{candidates.map(c=><option key={c.id} value={c.id}>{c.public_name}</option>)}</select></label><label>Complete policy text<textarea minLength={20} required maxLength={50000} value={body} onChange={e=>setBody(e.target.value)}/></label><button className="button button-dark" disabled={busy}>Publish immutable policy version ↗</button></form>}
  {message&&<p role="status" className="form-alert">{message}</p>}
 </section>;
}
