# Agent handoff — Public Debate Engine

Start with [docs/DEVELOPMENT_PLAN.md](docs/DEVELOPMENT_PLAN.md) and [docs/DEBATE_PROTOCOL.md](docs/DEBATE_PROTOCOL.md). These are the project specification, not an account's conversation memory.

## Working rules

- Develop approved roadmap milestones in dependency order; chain pull requests when checks pass, without requiring routine approvals.
- Stop on failing checks, merge conflicts, missing permissions/credentials, safety issues, unauthorized spending, or material unapproved choices.
- Treat Render project `prj-db5cv0nlot8c73eh9nng` and Neon project `rapid-moon-08277391` as the **only** designated Debate Engine infrastructure. Do not deploy into a similarly named or unrelated project.
- Existing Neon production branch is `br-autumn-hall-b5e4r3l2`; use a separate branch for dev migrations and tests.
- No external candidate invitations or published candidate positions until the real candidate confirms them.
- Never hard-code the initial candidate, their issues, or the presidential race into reusable domain packages.
- Published contributions are not deletable by debate originators. Only independently governed legal/security restrictions may affect visibility, with an auditable process.
- Being publicly visible is not the same as qualifying for the reciprocal sequence. Preserve both views.
- No ordinary role may edit a third party's source footage or impersonate consent. A joint summary needs both candidates' precise approval.
- Tests must verify the adversarial cases in the plan, not only the happy path.
- Keep docs, tests, roadmap evidence, and Engine Room in sync; do not count merged work as independently accepted production operation.
- Never publish development/demo fixture records as real candidacies or policy agreements.
- Do not create paid services or leak credentials. No background agent is presumed to exist between sessions.

## Start-up commands

`npm install`, `npm run typecheck`, `npm test`, `npm run build`.

## Open decisions

The user's unfinished requirement beginning “When a candidate uploads a video...” is not completed by inference. Keep it flagged in the full plan; do not manufacture a rule.