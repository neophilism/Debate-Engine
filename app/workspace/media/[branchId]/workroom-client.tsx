"use client";
import Link from "next/link";
import {useCallback,useEffect,useMemo,useState,type FormEvent} from "react";
type Candidate={id:string;public_name:string;verification_status:string;election_id:string};
type Source={id:string;media_asset_id:string;candidacy_id:string;candidate_name:string;duration_seconds:string;branch_id:string|null;kind:string};
type Segment={mediaAssetId:string;startSeconds:number;endSeconds:number};
type Artifact={id:string;status:string;output_sha256:string;manifest_sha256:string;
 source_manifest:{clips:Segment[];outputKind:string;releaseTitle:string};
 rendered_at:string|null;duration_seconds:string|null;has_file:boolean};
type Grant={artifact_id:string;media_asset_id:string;candidate_id:string;scope:{artifactId:string;clipStart:number;clipEnd:number}};
type Directory={branch:{debate_id:string;originator_candidacy_id:string;responder_candidacy_id:string};
 participantId:string|null;artifacts:Artifact[];ownerConsentGrants:Grant[];candidateOutputApprovals:Array<{artifact_id:string;candidacy_id:string}>};
const kindLabels:{[key:string]:string}={master:"Faithful concise master (20 minutes max)",five_minutes:"Five-minute summary",three_minutes:"Three-minute summary",one_minute:"One-minute summary",thirty_seconds:"Thirty-second summary"};
const maxTime:{[key:string]:number}={master:1200,five_minutes:300,three_minutes:180,one_minute:60,thirty_seconds:30};
export default function MediaWorkroom({branchId}:{branchId:string}){
 const[info,setInfo]=useState<Directory|null>(null);
 const[sources,setSources]=useState<Source[]>([]);
 const[candidates,setCandidates]=useState<Candidate[]>([]);
 const[candidateId,setCandidateId]=useState("");
 const[title,setTitle]=useState("");
 const[kind,setKind]=useState("five_minutes");
 const[clips,setClips]=useState<Segment[]>([{mediaAssetId:"",startSeconds:0,endSeconds:30}]);
 const[confirmation,setConfirmation]=useState<Record<string,boolean>>({});
 const[busy,setBusy]=useState(false),[loading,setLoading]=useState(true),[message,setMessage]=useState("");
 const refresh=useCallback(async()=>{
  const [d,a]=await Promise.all([
   fetch("/api/branches/"+branchId+"/derivatives",{cache:"no-store"}).then(r=>r.json()),
   fetch("/api/account/me",{cache:"no-store"}).then(r=>r.json())
  ]);
  if(!d.branch||!d.participantId)throw Error("Only verified candidates in this debate branch can access the media workroom.");
  const detail=await fetch("/api/debates/"+d.branch.debate_id,{cache:"no-store"}).then(r=>r.json());
  if(!detail.debate)throw Error("Public debate record unavailable.");
  setInfo(d);
  setSources((detail.submissions||[]).filter((s:Source)=>s.kind==="opening"||s.branch_id===branchId));
  const owners=[d.branch.originator_candidacy_id,d.branch.responder_candidacy_id];
  setCandidates((a.candidacies||[]).filter((c:Candidate)=>c.verification_status==="verified"&&owners.includes(c.id)));
  setCandidateId(prev=>owners.includes(prev)?prev:d.participantId);
  setLoading(false);
 },[branchId]);
 useEffect(()=>{refresh().catch(e=>{setMessage(e instanceof Error?e.message:"Unable to load workroom.");setLoading(false);})},[refresh]);
 const available=useMemo(()=>new Map(sources.map(x=>[x.media_asset_id,x])),[sources]);
 const duration=clips.reduce((total,c)=>total+(c.endSeconds-c.startSeconds),0);
 const validClips=clips.length>=1&&clips.length<=80&&clips.every(c=>{
  const video=available.get(c.mediaAssetId);
  return video&&Number.isFinite(c.startSeconds)&&Number.isFinite(c.endSeconds)&&c.startSeconds>=0&&c.endSeconds>c.startSeconds&&c.endSeconds<=Number(video.duration_seconds);
 });
 const validDuration=duration>0&&duration<=maxTime[kind];
 async function send(path:string,body:unknown){
  const response=await fetch(path,{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify(body)});
  const result=await response.json();
  if(!response.ok)throw Error(result.error||"Action was not accepted.");
  return result;
 }
 async function act(action:()=>Promise<string>){
  setBusy(true);setMessage("");
  try{setMessage(await action());await refresh();}
  catch(err){setMessage(err instanceof Error?err.message:"Request failed.");}
  finally{setBusy(false);}
 }
 async function submit(event:FormEvent){
  event.preventDefault();
  await act(async()=>{
   if(!validClips||!validDuration)throw Error("Source clips must stay within original video durations and the chosen summary length.");
   const r=await send("/api/branches/"+branchId+"/derivatives",
    {candidacyId:candidateId,manifest:{branchId,clips,captions:[],outputKind:kind,releaseTitle:title}});
   return "Editorial plan "+r.artifactId+" saved. Each original-video owner must now approve use of the specific clips.";
  });
 }
 async function grant(artifact:Artifact,clip:Segment){
  await act(async()=>{
   await send("/api/media/"+clip.mediaAssetId+"/edit-permissions",
    {candidacyId: candidateId,scope:{artifactId:artifact.id,clipStart:clip.startSeconds,clipEnd:clip.endSeconds}});
   return "The original owner’s exact clip-scoped editing permission is recorded. It cannot authorize broader editing.";
  });
 }
 function hasGrant(artifact:Artifact,clip:Segment){
  const video=available.get(clip.mediaAssetId);
  return Boolean(video&&info?.ownerConsentGrants.some(g=>g.artifact_id===artifact.id&&g.media_asset_id===clip.mediaAssetId&&g.candidate_id===video.candidacy_id&&g.scope.clipStart<=clip.startSeconds&&g.scope.clipEnd>=clip.endSeconds));
 }
 async function queue(artifact:Artifact){
  await act(async()=>{
   const response=await send("/api/branches/"+branchId+"/derivatives/"+artifact.id+"/render",{candidacyId:candidateId});
   return "Rendering job queued ("+response.jobId+"). A separately configured media worker must execute it before any preview can exist.";
  });
 }
 async function approve(artifact:Artifact){
  await act(async()=>{
   if(!confirmation[artifact.id])throw Error("Review the exact rendered video and confirm its SHA-256 before approving.");
   const output=await send("/api/branches/"+branchId+"/derivatives/"+artifact.id+"/approve",
    {candidacyId:candidateId,outputSha256:artifact.output_sha256});
   return output.bothApproved?"Both candidates approved the exact rendered file.":"Your output approval is recorded; the other candidate must approve the same bytes.";
  });
 }
 async function release(artifact:Artifact){
  await act(async()=>{
   await send("/api/branches/"+branchId+"/derivatives/"+artifact.id+"/release",{candidacyId:candidateId});
   return "The jointly approved summary is now released and available for public download.";
  });
 }
 return <div className="interior-page">
  <p className="eyebrow dark">CANDIDATE WORKSPACE / VIDEO RIGHTS</p>
  <h1>Build an honest<br/><em>summary.</em></h1>
  <p className="interior-lead">Nothing here changes a candidate’s original video. Each original owner authorizes specific excerpts; both candidates review and approve the exact rendered file before it can be released.</p>
  <p><Link className="inline-arrow" href={info?"/debates/"+info.branch.debate_id:"/workspace"}>← Return to public debate</Link></p>
  {loading?<p>Loading authorized workroom…</p>:!info?<p role="alert" className="form-alert">{message}</p>:<>
   <button className="link-button" onClick={()=>{refresh().catch(e=>setMessage(String(e)));}} disabled={busy}>Refresh workroom status ↻</button>
   <label className="workroom-actor">Acting candidate
    <select value={candidateId} onChange={e=>setCandidateId(e.target.value)}>{candidates.map(x=><option key={x.id} value={x.id}>{x.public_name}</option>)}</select>
   </label>
   <section className="workspace-panel">
    <h2>1. Prepare a concise editorial plan</h2>
    <p>Select specific public-source excerpts. The system does not infer permission to edit from permission to publish originals.</p>
    <form className="action-form" onSubmit={submit}>
     <label>Summary headline<input required maxLength={180} value={title} onChange={e=>setTitle(e.target.value)} placeholder="A mutually accepted better policy"/></label>
     <label>Format<select value={kind} onChange={e=>setKind(e.target.value)}>{Object.entries(kindLabels).map(([key,label])=><option key={key} value={key}>{label}</option>)}</select></label>
     {clips.map((clip,i)=><fieldset key={i}><legend>Excerpt {i+1}</legend>
      <label>Original unedited video<select required value={clip.mediaAssetId} onChange={e=>setClips(clips.map((x,j)=>j===i?{...x,mediaAssetId:e.target.value}:x))}>
       <option value="">Choose source video</option>{sources.map(s=><option key={s.media_asset_id} value={s.media_asset_id}>{s.candidate_name} · {s.kind} · {Math.round(Number(s.duration_seconds))}s</option>)}
      </select></label>
      <label>Clip begins at (seconds)<input type="number" min="0" step="0.1" value={clip.startSeconds} onChange={e=>setClips(clips.map((x,j)=>j===i?{...x,startSeconds:Number(e.target.value)}:x))}/></label>
      <label>Clip ends at (seconds)<input type="number" min="0" step="0.1" value={clip.endSeconds} onChange={e=>setClips(clips.map((x,j)=>j===i?{...x,endSeconds:Number(e.target.value)}:x))}/></label>
      {clips.length>1&&<button type="button" className="link-button" onClick={()=>setClips(clips.filter((_,j)=>j!==i))}>Remove excerpt</button>}
     </fieldset>)}
     <button type="button" className="link-button" disabled={clips.length>=8} onClick={()=>setClips([...clips,{mediaAssetId:"",startSeconds:0,endSeconds:30}])}>+ Add excerpt</button>
     <p role="status">{duration.toFixed(1)} seconds planned · Maximum for selected format: {maxTime[kind]} seconds</p>
     <button className="button button-dark" disabled={busy||!candidateId||!validClips||!validDuration}>Save immutable editorial plan ↗</button>
    </form>
   </section>
   <section className="workspace-panel">
    <h2>2. Obtain original-video editing consent</h2>
    <p>Only the video’s verified owner can grant permission for their specific clip. An archived original remains public even if no excerpt receives permission.</p>
    {info.artifacts.length===0?<p>No editorial plans have been created.</p>:info.artifacts.map(a=><article className="mini-card" key={a.id}>
     <p className="small-label">{a.source_manifest.outputKind?.replaceAll("_"," ")} · {a.status.replaceAll("_"," ")}</p><h3>{a.source_manifest.releaseTitle}</h3>
     <p>{a.status==="draft"?"Plan hash (not a rendered video): ":"Actual output SHA-256: "}{a.status==="draft"?a.manifest_sha256:a.output_sha256}</p>
     <p>{a.source_manifest.clips.length} excerpt(s)</p>
     {a.source_manifest.clips.map((clip,i)=>{
      const source=available.get(clip.mediaAssetId),granted=hasGrant(a,clip);
      return <div className="workroom-clip" key={i}>
       <p>{source?.candidate_name||"Source"} · {clip.startSeconds}s–{clip.endSeconds}s · {granted?"Editing consent recorded":"Editing consent still required"}</p>
       {a.status==="draft"&&!granted&&source?.candidacy_id===candidateId&&<button disabled={busy} onClick={()=>grant(a,clip)}>Grant editing permission for exactly this clip</button>}
      </div>;
     })}
     {a.status==="draft"&&<button disabled={busy||!a.source_manifest.clips.every(x=>hasGrant(a,x))} onClick={()=>queue(a)}>Queue video rendering ↗</button>}
     {a.has_file&&["awaiting_approval","approved"].includes(a.status)&&<>
      <p><a className="inline-arrow" href={"/api/branches/"+branchId+"/derivatives/"+a.id+"/preview"} target="_blank" rel="noopener noreferrer">Watch exact rendered file ↗</a></p>
      <p>Output SHA-256 (verify this is the file you watched): {a.output_sha256}</p>
      <label className="checkline"><input type="checkbox" checked={Boolean(confirmation[a.id])} onChange={e=>setConfirmation({...confirmation,[a.id]:e.target.checked})}/>I reviewed and approve this exact rendered video, not merely the editorial plan.</label>
      <button disabled={busy||!confirmation[a.id]||info.candidateOutputApprovals.some(v=>v.artifact_id===a.id&&v.candidacy_id===candidateId)} onClick={()=>approve(a)}>Approve exact video bytes ↗</button>
     </>}
     {a.status==="approved"&&<button disabled={busy} onClick={()=>release(a)}>Release jointly approved summary ↗</button>}
     {a.status==="released"&&<a className="inline-arrow" href={"/api/branches/"+branchId+"/derivatives/"+a.id+"/download"}>Download public summary ↗</a>}
     <p>{info.candidateOutputApprovals.filter(x=>x.artifact_id===a.id).length} candidate output approval(s) recorded.</p>
    </article>)}
   </section>
  </>}
  {message&&info&&<p role="status" className="form-alert">{message}</p>}
 </div>;
}
