# Scanner-aware media intake on free infrastructure

Before opening an S3 multipart upload, the authenticated candidate upload API now probes the configured **local ClamAV Unix socket** with the native \`zPING\` protocol. If there is no working scanner, it returns HTTP 503 immediately, before creating an S3 upload session, transferring a recording or consuming unnecessary storage capacity. The older one-shot upload API also checks before parsing a potentially 60 MiB multipart request.

\`GET /api/capabilities\` exposes only simple, secret-free preflight state (scanner online/offline, storage configured/unconfigured, new-media preflight blocked/available-for-validation). It does **not** expose socket paths, credentials, provider details or applicant data, and never claims production certification. The candidate composer informs a user when video/audio is unavailable and still permits written submissions.

A successful PONG proves only that a process is listening. Every actual original must still pass the full INSTREAM detection step and immutable matching hash/scan attestation before a media asset is approved. A scanner can fail between the preflight and final scan; in that case the upload remains unapproved and can be retried without accepting any unscanned bytes.

The free Render preview is permitted to have \`mediaScanner: unavailable\`. Its \`/api/ready\` status continues to assess basic web/database readiness separately, while the media-specific endpoint reports actual limits. CI tests use a fake Unix socket for negative probes and separately use a **real ClamAV daemon** in the live integration job. Production safety still depends on current official signatures, verified resources, isolated scanning and independent external review.
