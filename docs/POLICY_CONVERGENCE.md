# Policy synthesis and exact-version agreement

A policy branch can contain multiple immutable proposals. Any verified participant can create a new version and reference a parent version without editing previous text. Both debate participants must accept the exact same content hash and version ID for a joint agreement. The acceptance records are append-only, attributable and public.

This is a **reported joint agreement**, not an objective determination that the policy is best. Summary creation, publication and third-party distribution remain strictly separated from agreement itself. Unapproved derivative artifacts must never be distributed.

Read APIs return proposal versions and acceptance counts; write APIs require verified same-branch candidacy, authenticated origin, and version/hash match. Proposal bodies currently support text. Supporting attachments and rights-managed resolution media remain future milestones.

Acceptance of an old version is a historical statement, not a mechanism to undo later versions. Additional work will expose this in the public UI and reconcile agreement status across new proposals.
