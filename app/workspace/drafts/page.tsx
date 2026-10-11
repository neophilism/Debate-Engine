"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
type Row={id:string;kind:string;modality:string;status:string;created_at:string};
export default function PrivateDraftDirectory(){
 const [rows,setRows]=useState<Row[]>([]),[message,setMessage]=useState("Loading your private records…");
 useEffect(()=>{fetch("/api/private/drafts",{cache:"no-store"}).then(async r=>{const j=await r.json();if(!r.ok)throw Error(j.error);setRows(j.drafts||[]);setMessage("");}).catch(e=>setMessage(e instanceof Error?e.message:"Cannot load drafts."));},[]);
 return <div className="interior-page"><p className="eyebrow dark">CANDIDATE WORKSPACE / PRIVATE RECORDS</p><h1>Your speech<br/><em>workbench.</em></h1>
  <p className="interior-lead">Private drafts, preliminary feedback, and final assessments belong to your account. They are not part of the public debate archive unless you explicitly publish the speech itself.</p>
  {message&&<p className="form-alert" role="status">{message}</p>}
  <div className="debate-grid">{rows.map(x=><Link className="debate-card" key={x.id} href={"/workspace/drafts/"+x.id}><p className="small-label">{x.kind.toUpperCase()} / {x.modality.toUpperCase()}</p><h2>{x.status==="published"?"Published original":"Private draft"}</h2><p>Created {new Date(x.created_at).toLocaleDateString("en-US")}</p><span className="inline-arrow">View private assessment ↗</span></Link>)}</div>
  {rows.length===0&&!message&&<p>No private debate drafts have been prepared yet.</p>}
  <p><Link className="inline-arrow" href="/workspace">← Candidate workspace</Link></p>
 </div>;
}
