# Recoverable candidate publication confirmation (PDE-10)

A candidate's deliberate publish confirmation may be interrupted after the database sets \`private_submission_drafts.status='confirming'\` but before the public transaction commits. The old behavior could strand the draft indefinitely. New recovery checks, under a row lock, first look for an existing immutable published submission associated with \`origin_draft_id\`; the unique database constraint ensures no draft ever produces two public originals.

When no publication exists and the confirming state is older than five minutes, the same candidate may retry with the **exact previously reviewed SHA-256 fingerprint**. The original required review/explicit-skip and media permissions are rechecked, and then the confirming lease is refreshed. Concurrent retries cannot steal a recent in-flight confirmation. If a first request eventually completes, database uniqueness prevents duplicate public publication, and the losing request reconciles to the existing original.

No published speech is edited or deleted. These are pure recovery and idempotency changes, not permission to publish a draft without candidate confirmation. Verify two-session authenticated browser behavior separately before production launch.
