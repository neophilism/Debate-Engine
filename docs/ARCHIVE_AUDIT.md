# Preservation integrity evidence and operating procedures

Run `node scripts/audit-archive.mjs --limit=25 --output=/private/audits/audit.json` from a **dedicated read-only environment** with least-privilege database and private storage credentials. This script streams stored originals, published document attachments and released derivative files; it checks each object's exact SHA-256 against immutable Postgres metadata, checks expected object byte counts, and emits a timestamped report that exits nonzero on missing/tampered items. No content is copied to the report; keys and private credentials never appear in user-facing output.

The public read API `/api/v1/debates/{id}/integrity` gives a deterministic manifest of the expected published digests. That manifest can be compared with externally downloaded originals. It does **not** mean the files have been externally verified or backed up.

Limits: this process audits only the requested number of most recently published objects; it is not a full audit when the dataset exceeds that limit. Production needs a paginated complete audit, tested restore from an independent backup, append-only offsite signed witness of manifest digest, operational alerts, least-privilege object retention settings, and two-person exceptional governance before an immutable archival guarantee is claimed.

Neither a code merge nor a clean SHA-256 audit proves protection from a database administrator with unrestricted privileges. Production archive acceptance remains blocked until operational evidence is generated and independently retained.
