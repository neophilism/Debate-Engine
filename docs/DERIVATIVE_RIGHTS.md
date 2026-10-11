# Derivative editorial rights — source-aware preliminary implementation

A candidate cannot unilaterally edit an opponent's video. Every editorial proposal has a canonical SHA-256 manifest specifying its source clips, exact in/out points, captions and summary format. The source footage remains intact and independently accessible.

Only the verified owner of an original video may grant an edit scope for a source segment. The grant is linked to the derivative proposal and logged as an append-only permission. A proposed editorial plan is **not** permission to publish an edited video. Before media production and distribution, implement the exact-output checks, both candidates' consent to the final file bytes, and independently verified policy agreement status.

The approved output hash must be the hash of actual rendered media, not merely its edit-plan manifest. This foundation deliberately leaves all artifact statuses in draft to prevent a false grant of rights.

Planned follow-on: render approved storyboard into trial file; validate every segment against its grant; calculate final output SHA-256; require both candidate approvals of that exact output; generate full archive-relative citations, captions and a downloadable press kit.
