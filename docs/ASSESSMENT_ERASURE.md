# Candidate-requested erasure of private analysis

The authenticated draft owner may DELETE /api/private/drafts/:id/erase-assessments, requiring same-origin provenance and a verified user session. This removes all preliminary and final private AI assessment reports and attached candidate feedback, clears the stored transcript and future analysis/improvement consent, and records only counts in an immutable audit event.

**Not a public deletion:** Any source debate video/audio/written publication stays visible in the public record, as required by the debate protocol. The private draft shell and any published speech are preserved. The underlying original media object is also not deleted by this operation. The UI must never describe this as complete account or original-media erasure.

A reviewed unpublished draft reverts to draft status. It must undergo new review or an explicit candidate skip before publication.

Retention expiry and independent provider deletion guarantees remain future audited production controls.
