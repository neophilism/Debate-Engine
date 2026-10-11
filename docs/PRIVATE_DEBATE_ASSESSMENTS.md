# Private debate assessments

These tables are an internal candidate-only store, completely separate from the public debate record and qualification sequence. No public assessment, score, or ranking endpoint is implemented.

Preliminary and final assessments are separate nondeterministic model runs, both bound to a SHA-256 digest of the exact input. Findings are suggestions, never changes to the candidate's speech. Feedback and model-improvement consent are tracked separately, defaulting to no consent.

This initial migration provides persistence constraints only. Do not turn on collection or training before verified candidate authorization, retention and withdrawal procedures, an approved model provider, and a documented privacy review are in place.