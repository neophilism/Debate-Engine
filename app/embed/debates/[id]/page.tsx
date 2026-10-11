import {notFound} from "next/navigation";
import Link from "next/link";
import {loadPublicDebate} from "../../../../lib/server/public-debates";
export const dynamic="force-dynamic";
export default async function DebateEmbed({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^[0-9a-f-]{36}$/i.test(id))notFound();
 const data=await loadPublicDebate(id).catch(()=>null);if(!data)notFound();
 const opening=data.submissions.find(x=>x.kind==="opening");
 return <main style={{fontFamily:"Arial,sans-serif",background:"#162532",color:"#f4f1e9",padding:"24px",minHeight:"300px",margin:0}}>
  <p style={{textTransform:"uppercase",fontSize:"11px",letterSpacing:"2px"}}>Public Debate Engine / Unedited Public Record</p>
  <h1 style={{fontFamily:"Georgia,serif",fontSize:"clamp(24px,4vw,40px)",lineHeight:1.15}}>{data.debate.title}</h1>
  <p style={{lineHeight:1.6}}>{data.debate.originator_name} · {data.debate.office_name} · {data.debate.election_label}</p>
  {opening&&<video controls preload="metadata" playsInline style={{width:"100%",aspectRatio:"16/9",background:"#000"}}
   src={"/api/media/"+opening.media_asset_id+"/play"} aria-label="Unedited original opening video">
   <track kind="captions" src={"/api/media/"+opening.media_asset_id+"/captions"} srcLang="en" label="English captions" default/>
   Your browser does not support video playback.
  </video>}
  <p style={{fontSize:"13px",lineHeight:1.7}}>This embed shows the originator's video only. Contender responses, disputes, and complete evidence are available in the full record.</p>
  <Link href={"/debates/"+id} target="_blank" rel="noopener noreferrer" style={{color:"#dfc293",fontWeight:700,textDecoration:"underline"}}>Open the complete public debate ↗</Link>
 </main>;
}
