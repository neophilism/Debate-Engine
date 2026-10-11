# Media-mode requirements, migration and compatibility

Existing debates remain `allowed_modalities=['video']` and existing published video records remain byte-for-byte intact. A new debate originator selects any nonempty subset of `video`, `audio`, `writing`, locked on public publication. The responder may choose a different permitted medium on every reply; reciprocal answer rules and source permanence remain unchanged. Audio/video uses timecode references, writing uses `char:<offset>` references. Both kinds are validated.

The existing video-duration rule is mirrored for written replies using an explicit 150 words/minute equivalence (`ceil(max_response_seconds * 2.5)`). Over-length published responses are kept available but marked outside the qualifying sequence; disallowed media is rejected before publication, not censored after upload.

The first SQL migration adds nullable source media only for writing, original immutable text storage, enabled-media arrays, anchored question/answer references and a database-level allowed-medium guard. Older video API signatures continue working during rolling implementation.
