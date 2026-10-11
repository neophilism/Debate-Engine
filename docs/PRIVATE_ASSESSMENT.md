# Debate Assistant: private candidate-controlled review

Candidate drafts and preliminary/final assessments are account-private, never published as public debate evidence. The author may reject every preliminary suggestion, revise the work, and explicitly approve the exact final source. A separate final analysis belongs only in that author's workspace and need not agree with the preliminary model's interpretation.

Private tables carry the candidate owner's account key; database-level triggers prevent mismatched report ownership. No public serializer, search, sitemap, feed, embed or SDK may return these reports. An approved public contribution remains immutable and can link to only one original draft. Draft deletion must not delete the public contribution.

A third-party AI provider is contacted only on the author's explicit consent. Analysis of video/audio requires a transcript or an authorized private transcription provider. Missing configuration must surface a truthful unavailable status, never simulated model findings. Assistant improvement from feedback requires specific opt-in and privacy review.

Production publication APIs must be changed to reject bypass of the authenticated candidate-reviewed draft workflow. Validate signed owner, exact approved draft fingerprint, no reused draft, consent, and immutable public publication. Automatic synthetic video/audio edits are a future optional feature with separate permissions.
