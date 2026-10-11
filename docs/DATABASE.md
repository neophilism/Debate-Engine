# Database foundation and migration operations

## Guardrails

The PostgreSQL schema is implemented as numbered migrations in \`packages/database/migrations/\`. It is deliberately separate from the public application. Every candidate submission is retained independently of qualifying debate sequence entries.

As of the implementation foundation, no login, campaign, publication API, media upload, or mailing flow is active. There are no fixtures or implied public candidate records in production.

## Design

Core families:
- Accounts, offices, election cycles, candidacies and scoped memberships.
- Debates, independent opponent branches, original submissions, immutable questions and time-coded answers.
- Questioner-attributed assessments, objections, and append-only publication events.
- Versioned policy proposals/acceptances and exact-output media approvals.
- Versioned qualifying manifests kept separate from all public submissions.
- Durable jobs, outgoing actions, and append-only audit events.

The database protects published submissions and debates against updates/deletes with triggers. It also protects attached media, question text, answer mappings, and immutable decisions. This supplements, but does not replace, application authorization.

**Important:** The application must add transaction-level cross-debate alignment checks, verification policies, and user-specific access before enabling any writes. A table existing is not a public API.

## Deployment

The designated Neon project is \`rapid-moon-08277391\` (branch \`br-autumn-hall-b5e4r3l2\` is **production**). Test migrations on development branch \`br-curly-mountain-b56lyomz\` first.

1. Set \`DATABASE_URL\` privately to a connection string for the intended environment.
2. Run \`npm run db:check\` to compare versioned migrations without writes.
3. Run \`npm run db:migrate\` deliberately after verifying the destination and backup/rollback plan.
4. Verify \`schema_migrations\`, constraints and trigger behavior on a disposable test transaction.
5. Only then authorize production migration and configure the application's deployment.

The migration runner uses an advisory transaction lock, hashes migration contents, rejects changed applied migrations, and rolls back on failure. DDL is additive. Any destructive changes, privileged role alterations, or production migration require separate review.

A typical migration is not sufficient evidence that backups restore correctly. Provision restore rehearsal and security review before production launch.
