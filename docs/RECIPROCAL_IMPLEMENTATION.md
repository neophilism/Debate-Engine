# The reciprocal public-debate implementation

The API distinguishes **public contribution** from **qualified unedited sequence**.

1. Only verified candidates for the same election may publish; all published media are retained without ordinary deletion.
2. Initial opponent response requires at least one reciprocal question, which the originator must answer before the exchange can qualify.
3. A candidate publishes a new contribution as a child of their opponent's most recent contribution, maintaining independent branch continuity and symmetric video duration rules.
4. The candidate who asked a question publishes attributed assessments of the following opponent video. Changes are new immutable, superseding records, not edits. The respondent can object.
5. The deterministic sequence projection reads the entire published record and emits only completed reciprocal exchanges. Disputes and pending replies do not suppress any video.
6. A published but late contribution remains public. Reply-window notification/reminder and policy for deadline consequences still require separate agreement.
7. The roadmap requires durable, immutable snapshots of each official qualifying sequence version and complete adversarial browser tests before release. Runtime projection is interim; do not claim completed versioned sequences yet.

**Current limitation:** the initial responder composer provides one reciprocal question per turn, though the API can accept up to three. Supporting materials, large resumable videos, validated transcripts, policy syntheses, and short-video agreement workflows remain outstanding.
