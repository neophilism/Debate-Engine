import type { Metadata } from "next";
import Link from "next/link";
export const metadata: Metadata = { title: "Public debates" };
export default function DebatesPage() {
  return <div className="interior-page">
    <p className="eyebrow dark">THE PUBLIC RECORD / DEBATES</p>
    <h1>Debates in<br/><em>the open.</em></h1>
    <p className="interior-lead">Browse the original proposals, every published candidate response, the reciprocal question ledger, and any jointly agreed policies.</p>
    <section className="empty-record" aria-labelledby="empty-title">
      <span className="empty-figure" aria-hidden="true">↔</span>
      <div><p className="small-label">PUBLICATION STATUS</p><h2 id="empty-title">No debates have been published yet.</h2><p>This application is under development. Candidate videos, invitations, and agreements will appear only after their owners actually publish them. No examples are being presented as real political statements.</p><Link href="/protocol" className="inline-arrow">Understand how debates work ↗</Link></div>
    </section>
  </div>;
}
