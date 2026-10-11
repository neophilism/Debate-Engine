# Debate-summary worker operations

This worker is **not deployed** merely because the source code exists. It must be launched as a separately supervised process on an isolated host with FFmpeg, database access, private media S3 credentials, memory/CPU limits, monitoring, and backups.

Entry point: `node scripts/render-summary.mjs` (daemon), `node scripts/render-summary.mjs --once` (one job, for disposable test environments).

Security gates:
- Uses existing `durable_jobs` lease and PostgreSQL `FOR UPDATE SKIP LOCKED` to prevent competing workers claiming the same job.
- Reads only branch-specific original media from the private S3 bucket. Validates original size and SHA-256.
- Verifies source belongs to the public branch and candidate has explicit edit permission covering each exact requested clip.
- FFmpeg runs without external URL input, with fixed preset, bounded duration and process timeout. Workers should further run unprivileged inside resource-limited containers with no egress except the authorized database and storage endpoints.
- Writes the actual media bytes under content hash and updates `derivative_artifacts.output_sha256` only after rendering, producing an awaiting-approval state.
- Published release requires joint approval of the **actual output bytes** and a jointly agreed policy. The web service may not approve for a participant.
- The worker is not an AI generator and never synthesizes a candidate's voice. Caption-overlay rendering, multi-format trimming, comprehensive metadata provenance and production redundancy remain unfinished.

Current limitations: The renderer expects videos with consistent compatible audio streams for concatenation; videos without audio or with variant audio track presence may need normalization. Never declare production-ready without real multi-clip source integration tests and viewer checks.
