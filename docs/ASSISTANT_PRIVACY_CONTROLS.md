# Private assessment retention and improvement consent

The private Debate Assistant is advisory only; no public score is published or used to determine which opponent responses belong in the qualifying sequence.

## Owner controls

A candidate may withdraw their *assistant-improvement consent* at any time from the owner-only `POST /api/private/drafts/{id}/privacy` endpoint. Aggregation immediately excludes that candidate, even if earlier feedback was explicitly opted in. The original candidate-only preliminary/final assessment history continues to exist until they request its erasure.

The candidate may request erasure through owner-only `DELETE /api/private/drafts/{id}/privacy`. An unpublished draft can be deleted with its private reports and feedback (foreign-key cascade). For an already published contribution, **only the private draft payload, transcript, feedback and model assessments are erased**. The public video, audio or writing and its immutable provenance remain intact. A nonreversible digest and the publication foreign key remain for public audit. Public debate participants cannot delete each other's contributions.

A candidate cannot erase content while publication is in a transition state; client should retry after publication resolves. After erasure, a new model assessment must not recreate a report. No opt-out should silently remove the candidate's real public speech.

## Improvement telemetry

Only feedback provided while explicit improvement consent was present is eligible. A user withdrawing consent is excluded from future aggregate queries. `GET /api/admin/assistant-evaluation` is administrator-only and returns **only category/accept-reject counts** for buckets containing at least five distinct participating accounts; it contains no source speech, quotations, raw suggestions, private notes or account identifiers. Count aggregations are not public debate grades and should be used solely for improving editorial-assistance quality (particularly false positives).

Before external model-provider configuration, the assistant truthfully reports unavailable. No private speech is automatically sent for model training. Private data storage uses managed Neon access controls, but model processing needs a separate privacy and security review; do not imply that third-party model inference is end-to-end encrypted from the server.

## Operational acceptance

Requires real browser controls for withdrawal/erasure, retention policy with scheduled cleanup and protected backups, privileged-access audit, a complete independent privacy review, a verified opt-in provider policy, and a full migration/restore test. A merged PR is not proof these release gates have passed.
