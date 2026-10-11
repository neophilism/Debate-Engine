import type { Metadata } from "next";
import Link from "next/link";
export const metadata: Metadata = { title: "The debate protocol" };
const stages = [
 {number:"01",heading:"A proposal and a few questions",body:"An eligible candidate publishes a complete policy video, sources, and a small number of direct questions to competing candidates for the same office."},
 {number:"02",heading:"A response with questions of its own",body:"A contender submits an intact response video, addresses the original questions, and puts reciprocal questions to the initiator."},
 {number:"03",heading:"Answers have to travel both ways",body:"The originator cannot include a contender's response in the qualifying sequence without answering that contender's questions. Each questioner assesses answers to their questions."},
 {number:"04",heading:"Nothing gets quietly erased",body:"A response the originator considers inadequate is footnoted, with the reasons visible. It remains available in full in the permanent public record, with any objection."},
 {number:"05",heading:"A chance to reach something better",body:"Participants can propose a refined policy, accept the identical version, and release mutually approved summaries. The complete debate remains available."},
];
export default function ProtocolPage() {
  return <div className="interior-page">
    <p className="eyebrow dark">THE PUBLIC RECORD / THE RULES</p>
    <h1>Debate that<br/><em>goes somewhere.</em></h1>
    <p className="interior-lead">A format built to reward understanding rather than interruption. Every candidate follows reciprocal rules, and every published contribution has a place in the record.</p>
    <div className="protocol-steps">{stages.map((stage)=><article className="protocol-step" key={stage.number}><div className="step-number">{stage.number}</div><div><h2>{stage.heading}</h2><p>{stage.body}</p></div><span className="step-arrow" aria-hidden="true">↗</span></article>)}</div>
    <section className="protocol-note"><span>THE DISTINCTION THAT MATTERS</span><h2>Public record ≠ qualifying sequence.</h2><p>The originator may evaluate responsiveness but cannot make opponents' published contributions disappear. Readers can always inspect both what qualified and what did not.</p><Link className="button button-light" href="/debates">Explore public debates ↗</Link></section>
  </div>;
}
