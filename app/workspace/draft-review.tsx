"use client";
import {useState} from "react";
type Finding={id:string;category:string;excerpt:string;explanation:string;suggestion:string;confidence:"low"|"medium"|"high"};
export type PrivateReview={assessmentId:string;report:{overview:string;strengths:string[];findings:Finding[];limitations:string;stage:string};contentSha256:string};
export default function DraftReview({review,busy,notice,onRevise,onSkip,onConfirm}:{
 review:PrivateReview|null;busy:boolean;notice:string;onRevise:()=>void;onSkip:()=>void;onConfirm:()=>void;
}){
 const [choices,setChoices]=useState<Record<string,string>>({});
 async function feedback(findingId:string,choice:"accept"|"reject"){
  if(!review)return;
  setChoices({...choices,[findingId]:choice});
  try{await fetch("/api/private/assessments/"+review.assessmentId+"/feedback",{
   method:"POST",headers:{"content-type":"application/json"},
   body:JSON.stringify({findingId,choice})
  });}catch{/* The author's decision remains their own even when feedback cannot be recorded. */}
 }
 return <section className="private-review" aria-labelledby="review-heading">
  <p className="small-label">PRIVATE · VISIBLE ONLY TO YOU</p>
  <h2 id="review-heading">Review your speech before publishing.</h2>
  <p>Your original is still unpublished. The assistant's findings are optional and cannot change public debate eligibility or determine a winner.</p>
  {review?<div className="assistant-results"><p>{review.report.overview}</p>
    <h3>What works</h3><ul>{review.report.strengths.map((x,i)=><li key={i}>{x}</li>)}</ul>
    <h3>Possible improvements</h3>{review.report.findings.length===0?<p>No specific concerns were identified by this run. This is not a guarantee that the speech has no reasoning errors.</p>:review.report.findings.map(f=>
      <article className="assistant-finding" key={f.id}><p className="small-label">{f.category} · Confidence: {f.confidence}</p><blockquote>{f.excerpt}</blockquote><p>{f.explanation}</p><p><strong>Optional suggestion:</strong> {f.suggestion}</p>
      <div className="finding-actions"><button type="button" onClick={()=>feedback(f.id,"accept")} aria-pressed={choices[f.id]==="accept"}>Useful suggestion</button><button type="button" onClick={()=>feedback(f.id,"reject")} aria-pressed={choices[f.id]==="reject"}>Disagree / reject</button></div>
      </article>)}
    <p className="assessment-limitations"><strong>Limitations:</strong> {review.report.limitations}</p>
   </div>:<p className="form-alert">No model report is available. You can explicitly skip the optional assessment without changing your right to participate.</p>}
  {notice&&<p role="status" className="form-alert">{notice}</p>}
  <div className="review-actions">
    <button disabled={busy} type="button" className="button button-dark" onClick={onRevise}>Edit my original</button>
    {!review&&<button disabled={busy} type="button" className="button button-dark" onClick={onSkip}>Skip optional assessment</button>}
    <button disabled={busy} type="button" className="button button-dark" onClick={onConfirm}>Approve my final original and publish ↗</button>
  </div>
  <p className="small-label">The final assessment is a separate private analysis, available in your account after publication when a model is configured.</p>
 </section>;
}
