# Production release evidence gate (PDE-44)

Production readiness is **not** a synonym for merged pull requests, a healthy preview, passing unit tests, or an approved development plan. Run `npm run release:check` locally or in the dedicated CI check to see the current seven operational blockers. The command reads only `registry/roadmap.json` and `registry/production-acceptance.json`, never deploys or mutates Neon or Render.

Each gate needs a dated acceptance record, a named independent reviewer, and a link to externally inspectable evidence (such as a documented test report). The approved roadmap must also independently record `accepted` for every gate. Both conditions are necessary, so a developer cannot grant production readiness merely by writing a successful test or marking a PR merged.

Required areas: verified candidate identity governance; distinct-account browser pilot; isolated media worker; authorized external distribution; independent backup + real restore; independent security/privacy/accessibility review; and explicit production release authorization.

**Do not mark these accepted without actual evidence.** The initial evidence file intentionally lists all gates pending. Release acceptance still requires human oversight and deployment authorization. The checker is a safeguard, not a replacement for independent review.
