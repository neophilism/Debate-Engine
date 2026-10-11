import {notFound} from "next/navigation";
import Link from "next/link";
import {loadPublicDebate} from "../../../../lib/server/public-debates";
import SubmissionContent from "../../../debates/[id]/submission-content";
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
  {opening&&<SubmissionContent item={opening} featured/>}
  <p style={{fontSize:"13px",lineHeight:1.7}}>This embed shows the original opening contribution in its chosen medium only. Contender responses, disputes, and complete evidence are available in the full record.</p>
  <Link href={"/debates/"+id} target="_blank" rel="noopener noreferrer" style={{color:"#dfc293",fontWeight:700,textDecoration:"underline"}}>Open the complete public debate ↗</Link>
 </main>;
}
