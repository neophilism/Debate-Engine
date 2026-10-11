import Link from "next/link";
export default function HomePage() {
  return <>
    <section className="hero">
      <div className="hero-copy">
        <p className="eyebrow"><span className="eyebrow-dot"/>A DIFFERENT KIND OF PUBLIC DEBATE</p>
        <h1>Less theater.<br/><em>More answers.</em></h1>
        <p className="hero-description">A place where candidates have to address the actual questions, where every published response stays in the record, and where disagreement can lead to something better.</p>
        <div className="hero-actions"><Link href="/debates" className="button button-light">Explore the debates <span aria-hidden="true">↗</span></Link><Link href="/protocol" className="text-link">Understand the rules <span aria-hidden="true">→</span></Link></div>
      </div>
      <div className="hero-art" aria-hidden="true"><div className="orbit orbit-1"/><div className="orbit orbit-2"/><div className="orbit orbit-3"/><div className="art-cross"><span>?</span><div className="art-line"/><span>!</span></div><div className="art-caption">THE ARGUMENT CAN MOVE FORWARD.</div></div>
      <div className="hero-bottom"><span>01 / THE FORMAT</span><span>KEEP THE ARGUMENT. LOSE THE NOISE.</span></div>
    </section>
    <section className="intro-section section-pad">
      <div className="section-kicker">THE IDEA <span>01</span></div>
      <div><h2>The public deserves<br/><em>a real answer.</em></h2><p>A political debate should reveal how proposals work, expose disagreements clearly, and let competitors challenge one another without interruptions or evasion. This format makes answering the question the condition for entering the main debate sequence.</p><Link href="/protocol" className="inline-arrow">Read the rules <span aria-hidden="true">↗</span></Link></div>
    </section>
    <section className="principles section-pad" aria-label="How the format works">
      <div className="section-heading"><p className="section-kicker">HOW IT WORKS <span>02</span></p><h2>Built for substance.</h2></div>
      <div className="principle-grid">
        <article><span className="principle-number">01 / POSE</span><div className="principle-icon">?</div><h3>Ask something specific.</h3><p>A candidate introduces a policy through video and evidence, ending with a few concrete questions for contenders seeking the same office.</p></article>
        <article><span className="principle-number">02 / ANSWER</span><div className="principle-icon">↔</div><h3>Answer in kind.</h3><p>Responders address those questions and pose their own. To include the exchange in the qualifying sequence, the initiator must answer back.</p></article>
        <article><span className="principle-number">03 / ADVANCE</span><div className="principle-icon">✳</div><h3>Find a better solution.</h3><p>Where ideas converge, candidates can publish an agreed policy and approved shorter summaries—without losing the full original debate.</p></article>
      </div>
    </section>
    <section className="record-section section-pad"><div><p className="section-kicker">A PERMANENT ACCOUNT <span>03</span></p><h2>Nothing important<br/><em>disappears.</em></h2></div><div className="record-copy"><p>Every candidate's published response remains publicly available, even if the initiator considers it nonresponsive. The complete record and the qualifying debate sequence are separate, clearly labeled ways to examine what was said.</p><Link className="button button-dark" href="/debates">View the public record <span aria-hidden="true">↗</span></Link></div></section>
    <section className="closing-band"><p>WHAT IF THE POINT OF A DEBATE WAS TO GET SOMEWHERE?</p><Link href="/debates">See what is being debated <span aria-hidden="true">↗</span></Link></section>
  </>;
}
