import type {Metadata} from "next";
import AssessmentTools from "./assessment-tools";
import ObjectionTools from "./objection-tools";
import PolicyWorkspace from "./policy-workspace";
import SupportingDocuments from "./supporting-documents";
import QualifyingSequence from "./qualifying-sequence";
import { publicDocuments } from "../../../lib/server/documents";
import Link from "next/link";
import {notFound} from "next/navigation";
import {loadPublicDebate} from "../../../lib/server/public-debates";
export const dynamic="force-dynamic";
export const metadata:Metadata={title:"Debate record"};
export default async function DebateDetail({params}:{params:Promise<{id:string}>}){
 const {id}=await params;
 if(!/^[0-9a-f-]{36}$/i.test(id))notFound();
 const data=await loadPublicDebate(id).catch(()=>null);if(!data)notFound();
 const {debate:d,submissions,questions,answers,assessments,objections,branches}=data;
 const documents=await publicDocuments(id).catch(()=>[]);
 const opening=submissions.find(s=>s.kind==="opening");
 return <div className="interior-page debate-detail">
   <p className="eyebrow dark">PUBLIC DEBATE / {d.office_name} / {d.election_label}</p>
   <h1>{d.title}</h1><p className="interior-lead">{d.proposition}</p>
   <div className="record-explainer"><strong>The complete record is permanent.</strong><p>Published responses remain visible whether or not they qualify for the reciprocal debate sequence. Question assessments are attributed to the candidates who made them.</p></div>
   <p><Link className="button button-dark" href={"/debates/"+id+"/respond"}>Answer or challenge this policy ↗</Link></p>
   {opening&&<section className="featured-video" aria-labelledby="opening-heading"><p className="small-label">ORIGINAL PRESENTATION</p>
     <h2 id="opening-heading">{d.originator_name}</h2>
     <video controls preload="metadata" playsInline src={"/api/media/"+opening.media_asset_id+"/play"} aria-label={"Opening policy presentation by "+d.originator_name}><track kind="captions" src={"/api/media/"+opening.media_asset_id+"/captions"} srcLang="en" label="English captions" default/>Your browser does not support HTML video.</video>
     <h3>Questions to competing candidates</h3><ol>{questions.filter(q=>q.submission_id===opening.id).map(q=><li key={q.id}>{q.question_text} <span className="small-label">({Math.round(Number(q.video_timestamp_seconds))}s)</span></li>)}</ol>
   </section>}
   <QualifyingSequence data={{originatorId:d.originator_candidacy_id,branches,submissions,questions,answers,assessments}}/>
   <div className="two-record-views"><article><h2>Complete public record</h2><p>Every published video, including nonqualifying and disputed contributions.</p></article><article><h2>Qualifying sequence</h2><p>Only reciprocal exchanges satisfying the review protocol. Pending obligations remain visible without implying that anyone conceded.</p></article></div>
   <section className="record-section-list"><h2>Published contributions</h2>
     {submissions.map(s=><article className="submission-item" id={"contribution-"+s.id} key={s.id}>
       <div><span className="small-label">{s.kind.toUpperCase()} · {s.candidate_name}</span><h3>{s.candidate_name}</h3><p>Published {new Date(s.published_at).toLocaleDateString("en-US")}</p><video controls preload="none" playsInline src={"/api/media/"+s.media_asset_id+"/play"} aria-label={"Video contribution by "+s.candidate_name}><track kind="captions" src={"/api/media/"+s.media_asset_id+"/captions"} srcLang="en" label="English captions" default/>Video player unavailable.</video></div>
       <div><h4>Questions</h4>{questions.filter(q=>q.submission_id===s.id).map(q=><p className="question-text" key={q.id}>“{q.question_text}”</p>)}
       <h4>Questions answered</h4>{answers.filter(a=>a.submission_id===s.id).map(a=><p key={a.id}>Q: {questions.find(q=>q.id===a.question_id)?.question_text||"Question"} · {Math.round(Number(a.video_timestamp_seconds))}s</p>)}
       <h4>Responsiveness assessments</h4>{assessments.filter(a=>a.answer_submission_id===s.id).map(a=><div className="assessment" key={a.id}><strong>{a.decision.replace(/_/g," ")}</strong><p>{a.reasoning}</p>{objections.filter(o=>o.assessment_id===a.id).map(o=><p key={o.id}>Objection: {o.objection}</p>)}</div>)}
       </div>
     </article>)}
   </section>
   <AssessmentTools submissions={submissions} questions={questions}/>
   <ObjectionTools submissions={submissions} assessments={assessments} questions={questions} electionId={d.election_id}/>
   <section className="branch-summary"><h2>Candidate-to-candidate branches</h2>{branches.length===0?<p>No contender has published a response yet.</p>:branches.map(b=><p key={b.id}>{b.contender_name} · {submissions.filter(s=>s.branch_id===b.id).length} published contributions</p>)}
   </section>
   <section className="source-list"><h2>Published supporting materials</h2>{documents.length===0?<p>No supporting files published yet.</p>:<ul>{documents.map(x=><li key={x.id}><a href={"/api/documents/"+x.id+"/download"}>{x.label} — {x.filename} ↗</a> <small>SHA-256 {x.sha256}</small></li>)}</ul>}</section><SupportingDocuments submissions={submissions}/>
   <PolicyWorkspace branches={branches}/>
   <Link href="/debates" className="inline-arrow">← All debates</Link>
 </div>;
}
