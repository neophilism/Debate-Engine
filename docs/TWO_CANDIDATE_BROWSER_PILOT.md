# Two-candidate authenticated browser pilot on $0 infrastructure

The **candidate-pilot** GitHub Actions job runs the real compiled Next.js application against its own disposable PostgreSQL 18 database. Chromium opens **three independent signed HTTP-cookie session contexts**: one fictional independent reviewer and two separately signed fictional candidate identities, plus an unauthenticated visitor. All HTTP calls go through actual production route handlers, database transactions, candidate authorization and the public debate UI.

## Workflow verified

1. Unauthenticated and tampered session cookies cannot read accounts or private drafts.
2. The independent fixture reviewer registers a fictional election; candidates register through the real browser form.
3. Unverified candidates cannot prepare a private publication; a candidate cannot approve a verification decision.
4. The reviewer independently approves two synthetic fixture candidacies with attributable reasons.
5. Candidate A drafts an opening writing contribution, opts out of external AI access, and explicitly reviews and confirms before publication. The other candidate and the public cannot see the private draft.
6. Candidate B responds using a separate browser session, answers the first question and asks a reciprocal one.
7. Only Candidate A can assess the answer to Candidate A's question. Candidate A replies to Candidate B's reciprocal question; only Candidate B can assess it.
8. Public qualifying-sequence logic recognizes the three authorized contributions, while the original archive preserves every published submission.
9. Neither candidate can alter the other's original. A correction by the original author is permanently and publicly attributed.
10. Public archive search and actual detail page show only explicitly published fictional speech.

## Authentication boundary: critical

**This is NOT a test of Neon Managed Auth itself.** The isolated CI runner temporarily replaces *its own local* \`lib/auth/server.ts\` working-copy file with an HMAC-cookie verifier and three hard-coded **fictional** identities. There is no CI-only authentication route in the committed Next.js application, and **the replacement file is not committed, merged, deployed to Render or deployed to Neon**. A random HMAC key is generated anew for every test job. The patch script fails closed unless running in GitHub Actions with the exact localhost fixture database, with production Neon Auth variables absent and an explicit CI pilot flag set. The test runner is discarded after completing.

The production source keeps using \`@neondatabase/auth/next/server\`, with unmodified, branch-scoped session verification. A separate, real two-account Neon Auth pilot is required before production release, including verified signup/signin/signout, CSRF protections, identity governance, session expiry, manual cross-account privacy evaluation and a real candidate's explicit agreement. No real candidate names, accounts, elections or contributions are entered in the public development preview during this CI exercise.

This is meaningful **full-stack browser/HTTP authorization and publication acceptance** on a true isolated database, unlike earlier tests that wrote rows directly. It is still **not production operational acceptance**. In particular it does not authorize real candidate identity verification, independently approve security, release the public domain, or configure a paid media worker.
