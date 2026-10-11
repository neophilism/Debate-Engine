"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
type Privacy={draftCount:number;optedInDrafts:number;privateAssessmentCount:number;improvementConsentDefault:boolean};
export default function PrivacyPage(){
 const[data,setData]=useState<Privacy|null>(null),[busy,setBusy]=useState(false),[message,setMessage]=useState("");
 async function refresh(){const r=await fetch("/api/private/privacy",{cache:"no-store"});const x=await r.json();if(!r.ok)throw Error(x.error||"Privacy settings unavailable.");setData(x);}
 useEffect(()=>{refresh().catch(e=>setMessage(e instanceof Error?e.message:"Unable to load."));},[]);
 async function revoke(){setBusy(true);setMessage("");try{const r=await fetch("/api/private/privacy",{method:"POST"});const x=await r.json();if(!r.ok)throw Error(x.error||"Consent update failed.");await refresh();setMessage("Improvement consent has been withdrawn for existing drafts and feedback. This does not remove previously published debate contributions.");}catch(e){setMessage(e instanceof Error?e.message:"Unable to update consent.");}finally{setBusy(false);}}
 return <div className="interior-page"><p className="eyebrow dark">PRIVATE WORKSPACE / DATA CONTROLS</p><h1>Your analysis.<br/><em>Your choice.</em></h1>
 <p className="interior-lead">Preliminary and final Debate Assistant reports remain private to the candidate. They are never public debate scores, and improvement consent is separate from consent to analyze a draft.</p>
 {data?<section className="workspace-panel"><p>{data.draftCount} private drafts · {data.privateAssessmentCount} private reports</p><p>{data.optedInDrafts} drafts currently allow assistant-improvement use.</p><button className="button button-dark" type="button" disabled={busy||data.optedInDrafts===0} onClick={revoke}>Withdraw all assistant-improvement consent ↗</button><p>Withdrawing stops any future eligible improvement use. It cannot retroactively reverse any completed external processing. No model-improvement pipeline is active by default.</p></section>:<p>Loading your private settings…</p>}
 {message&&<p role="status" className="form-alert">{message}</p>}<p><Link href="/workspace" className="inline-arrow">← Candidate workspace</Link></p></div>;
}
