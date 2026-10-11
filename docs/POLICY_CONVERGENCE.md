# Policy synthesis, exact-version acceptance and subsequent withdrawal (PDE-19)

A candidate can propose multiple immutable policy texts, optionally linking to an earlier proposal. A joint agreement is recorded only when both verified participants in a branch actively endorse **the same version and content hash**. This is a report of candidate agreement, not a claim that any policy is objectively correct.

## Current endorsement and historical record

- \`policy_acceptances\` records the **first irreversible historical acceptance** for each candidate and version, including previously approved versions. It is never deleted or revised.
- \`policy_endorsement_events\` is a separate append-only event stream. It is backfilled from existing acceptance history. Later events may \`accept\` (including reaffirmation after withdrawal) or \`withdraw\` a candidate's **current** endorsement.
- The current state is the latest event **per candidate and policy version**, ordered by event timestamp and immutable ID. Only versions with both branch participants' current \`accept\` events are jointly endorsed.
- The public policy API exposes current endorsers, active endorsement count and historical acceptance count. A withdrawal produces an attributable public publication event; it never erases past approvals or changes prior media/source records.
- Authorized new summary releases also recheck both participants' **current** policy endorsement. Previously released summary records remain preserved; withdrawal alone is not permission to erase another person's media.
- Two recorded endorsements in different branches never combine into agreement. Actions require verified account ownership and same-branch membership.

## Pending scope

This update implements current support, withdrawal and reaffirmation. Partial scope of agreed provisions, supporting attachment manifests, acceptance of altered policy attachments, independent candidate browser acceptance, and review of effects on already issued distributions remain separate launch work. The protocol does not infer consensus from silence.
