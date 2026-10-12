# Multi-candidate fictional transaction pilot (PDE-27)

The PostgreSQL CI runs a **fully rolled-back fictional scenario** with three verified test candidacies for the same election and two independent contender branches. It publishes a written opening and its question, two intact public contender responses, a reciprocal originator reply, and the opposing candidates' individual question assessments.

The test checks that B's full reciprocal exchange qualifies only after both sides answer and review, that C's unassessed nonqualifying response remains publicly available, that non-owners cannot assess responses or modify/delete published materials, and that two-candidate policy agreement can be withdrawn and reaffirmed without erasing historical acceptance. It also verifies immutable, author-only corrections. The test database is rolled back on completion and never generates political content in the live preview.

Run with \`npm run test:db\` after disposable database migrations. This is real PostgreSQL integrity and pure sequence-engine acceptance, **not** an authenticated two-browser acceptance test. Managed Neon Auth, S3 upload/FFprobe/ClamAV, mobile/browser UI interactions, worker processing, notifications, backup restoration and manual security review remain separate acceptance evidence.
