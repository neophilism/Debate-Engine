import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: { default: "Public Debate Engine", template: "%s | Public Debate Engine" },
  description: "An asynchronous public debate system built for specific questions, genuine answers, and better public policy.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en"><body>
    <div className="shell">
      <header className="site-header">
        <Link href="/" className="brand" aria-label="Public Debate Engine home">
          <span className="brand-mark" aria-hidden="true">↔</span>
          <span>PUBLIC<br/>DEBATE ENGINE</span>
        </Link>
        <nav aria-label="Main navigation" className="nav-links">
          <Link href="/debates">Debates</Link><Link href="/protocol">The protocol</Link>
        </nav>
        <Link href="/debates" className="nav-action">Explore debates <span aria-hidden="true">↗</span></Link>
      </header>
      <main id="main-content">{children}</main>
      <footer className="site-footer">
        <div><span className="footer-symbol">↔</span><strong>PUBLIC DEBATE ENGINE</strong><p>A better medium for the public argument.</p></div>
        <div><p>Every answer accountable. Every published response accessible.</p><p>Neutral engine · Open public record</p></div>
        <Link href="/protocol">How the protocol works ↗</Link>
      </footer>
    </div>
  </body></html>;
}
