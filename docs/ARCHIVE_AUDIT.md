# Preservation integrity evidence and operating procedures

From a dedicated, least-privilege read-only environment with the correct branch's database and private media storage credentials, run:

- \`node scripts/audit-archive.mjs --limit=25 --output=/private/audits/sample.json\` for an explicitly bounded, recent sample.
- \`node scripts/audit-archive.mjs --all --output=/private/audits/full.json\` for a complete, publication-bounded, cursor-paginated audit of **all** published original video/audio objects, public source documents and released derivative files.

Each object is streamed from S3 and compared to its immutable expected SHA-256 and byte count when available. Results never include raw content or storage credentials. A failed/missing object produces a nonzero exit status. The complete audit retrieves records in stable descending timestamp/kind/id order, queries pages of at most 101 records, and uses a fixed start-time cutoff to prevent moving pagination windows. A sample report must not claim to be complete if items remain; the full report marks \`complete\` only once every page has been exhausted.

**Operational acceptance is not yet achieved.** No independent offsite backup and restore has been demonstrated, and no external immutable witness has certified these reports. The command must actually run against the designated database and real retained objects, with independent, protected evidence of the result, before claiming preservation readiness. Database administrator and object-store owner risks require separate independent governance.
