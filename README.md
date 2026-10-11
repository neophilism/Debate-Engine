# Public Debate Engine

**Better questions. Real answers. Better policy.**

A reusable, candidate-neutral platform for asynchronous, policy-centered debates. Candidates submit intact videos, address specific questions, and have their reciprocal obligations made visible. All published candidate responses remain discoverable even when excluded from the *qualifying debate sequence*.

## Authoritative development materials

- [Full 30-milestone development plan](docs/DEVELOPMENT_PLAN.md)
- [Normative debate protocol](docs/DEBATE_PROTOCOL.md)
- [Infrastructure and operations](docs/INFRASTRUCTURE.md)
- [Agent handoff](AGENTS.md)

## Development status

**Foundation in progress. Not launched.** No candidate's actual debate content, invitations, endorsements, identities, or policy agreement have been published. A passing CI build alone does not establish production readiness.

## Local development

Requires Node.js 22+, npm, and a local environment that can install dependencies.

```bash
npm install
npm run dev
npm run typecheck
npm test
npm run build
```

Copy `.env.example` to `.env.local` when Neon has been intentionally configured. Never commit secrets. Read-only public pages must never fabricate data when no debates have been published.

## Core publication distinction

1. **Permanent public record:** all published candidate contributions, even disputed or footnoted responses.
2. **Qualifying debate sequence:** only reciprocal exchanges meeting the review protocol.
3. **Resolution media:** derivative videos requiring exact-asset permissions and, for joint products, both participants' approvals.

See `docs/DEBATE_PROTOCOL.md` before implementing any write API.