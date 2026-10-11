# Original media intake and publication

Candidate-controlled video/audio ingestion now offers **authenticated resumable 8 MiB multipart uploads**, capped at the currently validated 60 MiB total. A browser interruption does not require restarting successfully stored chunks. The candidate must reselect the **same local original** if they reload; SHA-256 ties the upload session to the exact bytes, rather than trusting only a file name. Only verified candidates can create, read, upload to, complete, or cancel their own sessions.

## Upload protocol (PDE-07)

1. POST \`/api/media/uploads\` with candidate, audio/video medium, declared size, claimed MIME and SHA-256; stores a candidate-owned, 24-hour upload session and a private S3 multipart upload.
2. GET \`/api/media/uploads/{sessionId}\` lists the S3-acknowledged chunks for authenticated recovery. PUT \`/api/media/uploads/{sessionId}/parts/{n}\` sends an exactly sized part (8 MiB except the last).
3. POST \`/api/media/uploads/{sessionId}/complete\` verifies **S3's** authoritative part list and sizes, assembles the private object, checks final size and SHA-256, then runs FFprobe/sniff validation. It only creates a \`ready\` media asset after all checks pass, in a database transaction. Retries return the same validated media asset rather than publishing duplicates.
4. DELETE the session endpoint cancels an upload that has not begun finalization. Cancellation never deletes a completed/published original.

No browser receives S3 credentials or presigned third-party upload URLs. All parts travel over same-origin authenticated requests to the server, then private S3 storage. A failed or interrupted part can be retried with the exact original. A failed final digest/container check cannot publish and requires a new session.

## Safety and current boundaries

The previous one-shot endpoint remains for legacy callers, with the same max size, validation and owner controls. Neither uploading nor successful media validation publishes a candidate position; the separate private candidate-review workflow, explicit publication confirmation and media permissions remain mandatory. Playback is signed, permitted only when an original appears in a public submission.

The new multipart workflow needs S3-compatible \`CreateMultipartUpload\`, \`UploadPart\`, \`ListParts\`, \`CompleteMultipartUpload\`, \`AbortMultipartUpload\`, \`HeadObject\`, \`GetObject\` and \`DeleteObject\` privileges. **Expiry cleanup must be scheduled before broad production use** so abandoned S3 multipart uploads do not accrue unnecessary storage costs. Storage lifecycle rules should abort incomplete multipart uploads after an approved period independent of web-server uptime. Session rows are intentionally not an archival original.

The current 60 MiB limit is enforced for process memory and FFprobe safety. Large-file streaming validation, antivirus scanning, independently verified retention/restore, real browser resume testing, and a separately hosted bounded media-processing worker remain release gates. A merged implementation is not operational acceptance. See \`docs/DEVELOPMENT_PLAN.md\` and \`registry/roadmap.json\`.

## Expired multipart maintenance

Use `npm run worker:uploads:cleanup:dry-run` for a bounded read-only report, then `npm run worker:uploads:cleanup` from an authorized isolated maintenance environment with the correct Neon database and S3 storage credentials. This aborts only expired sessions still `uploading`. Expired `finalizing` sessions are deliberately left for operator reconciliation because S3 might already contain the final original; no existing published originals are ever deleted. The bounded batch defaults to 25 sessions (max 100), and errors produce a failing process status. Schedule recurring runs only after an authorized job runner is configured. Also configure bucket-side abort-incomplete-multipart lifecycle retention; no timer is implicitly running just because this command exists.
