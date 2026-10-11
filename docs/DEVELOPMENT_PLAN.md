# Public Debate Engine
## Full development plan and implementation handoff

**Status:** Approved for initial implementation following the October 10, 2026 resource handoff. Publication of actual candidate debates, external notifications, paid resources, and production launch remain subject to their separate authorization and acceptance gates.

**Product:** A dedicated public interface and reusable engine for asynchronous policy debates that require reciprocal answers, preserve the public record, and help participants develop a mutually accepted better policy.

**Initial application:** Three foundational policy debates initiated by Phillip Galinsky, open to other candidates for President of the United States in the 2028 election. Candidate-specific branding, policies, and integrations belong in configuration/content or a downstream campaign repository, not hard-coded into the reusable engine. Actual videos and policy documents must be supplied and approved; do not fabricate submissions, candidacies, invitations, or endorsements.

---

## 1. Product purpose and boundaries

The central product is neither a live debate room nor a political social network. It is a structured, asynchronous exchange in which viewers can inspect the proposal, understand the questions, watch the answers, see exactly what remains disputed, and inspect any jointly accepted alternative.

Its core separation is between the public record and the qualifying debate sequence. A candidate cannot make a competing response disappear merely by deciding that it did not answer a question. Equally, a candidate cannot use another participant's response in the official debate sequence without fulfilling the reciprocal answer obligation.

The engine should make responsible conduct easier and evasive conduct visible. It must not claim that its software can compel sincerity, certify a policy as objectively best, or decide who won.

Version 1 includes the complete debate lifecycle, original-media preservation, the dedicated public interface, candidate tools, agreement workflow, approved summary production, and authorized dissemination. It excludes live stages, audience voting, winner rankings, reaction feeds, fundraising, ad targeting, private messaging networks, an AI adjudicator, and a general-purpose video editor.

## 2. Authoritative requirements and proposed implementation defaults

### 2.1 Requirements supplied by the user

1. Exchanges are asynchronous.
2. A candidate initiates a debate with a policy/view video, supporting materials, and a few specific questions for other candidates seeking the same office.
3. Responses must answer the initiating candidate's questions to qualify for the main sequence. The initiator judges that responsiveness.
4. Nonqualifying responses are footnoted and remain available to the public.
5. A responder also poses questions. The originator must answer those questions before using the responder's video in the qualifying debate video.
6. Submitted videos remain unedited unless their contributor permits editing.
7. An originator-set response limit also binds the originator's subsequent responses.
8. Exchanges continue until a participant stops responding or both accept a better policy that resolves or transcends the disagreement.
9. On agreement, retain the full debate and produce a concise faithful version and progressively shorter public/media summaries.
10. Other candidates' responses cannot be deleted by the initiating candidate.

The user's unfinished sentence, "When a candidate uploads a video, whether the original video or", has no recoverable continuation. Do not invent an additional requirement from it. The upload workflow in this plan is a proposed implementation, not a recovered rule.

### 2.2 Defaults submitted for approval with this plan

**Separate time controls.** Model a maximum response-video duration and an elapsed reply window as different settings. Both are reciprocal. The initial proposal may have its own disclosed video limit; the originator does not receive longer subsequent turns. Do not silently choose numerical limits for the user's actual debates.

**Few questions.** The standard profile permits one to three focused questions per continuing turn. Closing agreement/withdrawal records do not require invented questions. Material subquestions count against the limit; the composer should discourage bundling a questionnaire into one numbered item.

**Reciprocal assessment.** The original questioner decides whether their questions were answered. In the reverse direction, the responder assesses the answers to their own questions. Assessments are attributed participant judgments, not the platform's declaration of truth. Public disagreement with an assessment is always possible. This symmetric reverse-direction assessment is an implementation safeguard proposed here.

**Immutable published versions.** Drafts can change; published videos, questions, supporting-document versions, rules, and decisions cannot be silently replaced. Corrections and reversals create linked new records.

**No ordinary deletion of published contributions.** Neither the initiator nor the contributor has a normal delete/unpublish capability for the established public record. Account closure does not erase it. An independent platform safety process handles exceptional restrictions with recorded reasons and appeals.

**Two permissions, not one.** Permission for full unedited archival publication is distinct from permission to include media in a reciprocal debate sequence, and both are distinct from permission for editorial excerpts and summaries.

## 3. Repository and product organization

Use `Public-Debate-Engine` as the proposed reusable repository name. A repository URL has not been provided for this project; do not assume it exists or create it before approval and authorization.

Build a modular monolith, not a fleet of microservices. The engine can contain its neutral dedicated reference interface because that interface serves all offices and candidates. Candidate-branded integrations belong in a downstream repository, such as the existing `Galinsky-2028` campaign site, consuming a versioned SDK/API or embed.

Recommended structure:

```text
apps/reference-web/          Neutral dedicated public site and candidate workspace
packages/domain/            Rules, questions, obligations, states, eligibility
packages/api/               Authenticated commands and public read models
packages/database/          Schema, migrations, transactional jobs and outbox
packages/ui/                Accessible shared debate interface components
packages/sdk/               Versioned downstream client and embed contract
workers/media/              Isolated scanning, probing, encoding and exports
contracts/                  OpenAPI, JSON schemas, event and manifest versions
fixtures/                   Explicitly fictional test debates and media
registry/                   Roadmap, implementation mappings and evidence
spec/                       Normative product protocol and state transitions
docs/                       Full plan, decisions, runbooks and agent handoff
```

The initial deployment should need one web application, a Postgres database, object storage, and a media-worker runtime. The worker is a separate process/container boundary because uploaded media is untrusted and media processing must not block ordinary web requests. Avoid mandatory Redis, a vector database, blockchain, Kubernetes, or an LLM subscription.

## 4. Participants, eligibility, and permissions

### 4.1 Roles

The public can watch every published response, read sources, search transcripts, inspect reasons for exclusion, and download authorized materials without an account.

A verified candidate can initiate eligible debates, submit responses, assess answers to their own questions, challenge assessments, propose resolutions, and approve uses of their media. An initiating candidate cannot edit opponents' records, hide their response counts, alter their account access, or approve their editing permissions.

Campaign delegates may prepare material within explicitly assigned permissions. Publishing a candidate's position, accepting an agreement, and granting editorial permissions require the candidate or an explicitly authorized publisher. Delegation grants, revocations, and actions are audited.

Platform verifiers establish account/campaign authenticity under a published standard. Platform safety administrators handle technical abuse and narrowly defined content restrictions, separately from debate adjudication. Campaign ownership is not platform moderation authority.

### 4.2 Candidate and race model

Represent an office, jurisdiction, and election cycle separately from a person's account and campaign. Record party/independent status and election phase as metadata rather than assuming one party or one primary constitutes the entire office contest.

The initial presidential profile must accept qualifying candidates from all parties and independent campaigns. Do not add polling, fundraising, media prominence, or ballot-access thresholds as hidden conditions. Use a published identity/candidacy verification process that can accommodate declared candidates before later election milestones.

A response from a newly registering candidate can be held in a transparent identity-verification queue; it is not classified as evasive. Verification evidence containing private information is not published. Decisions have reasons and an appeal route.

Snapshot candidacy and authorization at submission time. A later withdrawal, party change, or account closure does not rewrite historical attribution or erase the contribution.

### 4.3 Multiple contenders

A policy topic has one originating proposal and independent candidate-to-candidate branches. If Candidates B and C respond to Candidate A, their exchanges are separate branches sharing the same original proposal. Candidate B does not have to answer Candidate C's questions merely to participate against Candidate A.

Deadlines, assessments, agreements, and publication permissions are tracked per branch. Agreement in A/B never implies agreement by C or closes C's branch.

## 5. Rules and timing

Before publication, the originator selects and previews a versioned rule set. Required fields include question limit, maximum response-video duration, reply window, participation eligibility, assessment rules, correction policy, and publication/derivative permissions.

The rules are displayed before a candidate submits. The accepted rule version is stored with each submission. The originator cannot change limits retroactively. Changes affecting an existing branch require explicit mutual acceptance and apply prospectively; they never rewrite an expired deadline or make an old video newly noncompliant.

Use a server-authoritative clock and store UTC timestamps while displaying the viewer's timezone and the exact due time. Never rely on a browser countdown as the source of truth.

For a directly invited candidate's first response, record when the proposal is usable and when an invitation is actually sent/delivered according to the provider's available evidence. An invitation draft is not a sent invitation. Do not accuse a candidate of missing an invitation that was never sent. Open participation remains possible for verified same-office candidates who were not individually invited, under the topic's published joining rules.

Subsequent reply clocks begin when the opponent's relevant contribution is published and usable, not when the originator eventually decides to review it. The review process cannot silently reset the response clock. Distinguish review obligations from reply obligations and record their deadlines separately when necessary.

A completed upload/submission receives a server receipt. A timely valid submission remains timely when later platform processing is slow. Failed or invalid uploads retain their actual failure state; they do not become valid replies merely because a browser showed progress.

Documented platform outages can extend affected clocks under the same prepublished policy. Extensions are visible. Notification failure, media-processing failure, and actual candidate nonresponse are different states.

Use neutral labels such as "Response due", "No response received by [date]", "Reply received late", and "Debate inactive". Do not infer that someone conceded, was defeated, or will never respond. Late responses remain publicly publishable and can resume an exchange under the same rules, with lateness recorded.

## 6. Submission and question workflow

### 6.1 Starting a debate

The initiation composer collects the issue title, short plain-language proposition, originating video, source documents, one to three ending questions, matching question text and video timestamps, and the selected rules.

Provide a final preview showing exactly what will become public and which permissions are being granted. A candidate must confirm that the text questions match those asked in the video. Publication is a deliberate final action, not a side effect of uploading.

The original proposal, document versions, video hash, rules, and questions become an immutable publication record. Do not publish placeholder videos or invented policy materials to make a launch page appear complete.

### 6.2 Answering

The response composer displays every outstanding question. For each, the responder links one or more timestamps in their video and may include a short written summary and relevant source citations. Written summaries supplement the video rather than substituting a different answer.

The responder then enters the next few questions and their video timestamps. A qualified answer may disagree, challenge a premise, or explain uncertainty; the system does not require agreement or a forced yes/no answer.

Structural checks can identify missing mappings, too many questions, an overlong video, or mismatched timestamps. A warning is not a private veto on the public archive. Safe submissions by verified eligible candidates may still be published as nonqualifying/footnoted responses when they fail debate-format requirements. Technical safety and universal storage limits remain separately enforced and disclosed.

### 6.3 Responsiveness decisions

Each question has immutable text and an identifier. Each answer claim points to a submission and timestamp range. Each assessment records the reviewing questioner, judgment, specific reason, and time. Allowed judgments include answered, partly answered, not answered, and disputed-premise response, with sufficient detail to explain the actual decision.

An assessment that excludes a response must identify the particular unmet question or format condition. The interface labels it as the participant's assessment. The assessed candidate may add a public objection and timestamp evidence. No AI or moderator silently overwrites the questioner's decision under the standard profile.

A corrected response is a new contribution linked to the earlier one. The earlier response and the decision about it remain accessible. Assessment reversals also create new events rather than deleting history.

### 6.4 Fair public visibility

Every topic prominently displays total published responses, qualifying exchanges, responses awaiting reciprocal answers, and footnoted responses. Footnotes link directly to the full response, disputed questions, reasons, and objections. They must not be buried in an admin page or excluded from all search results.

An originator who does not review a response is shown as not having reviewed it. The platform does not turn neglect into a hidden rejection or make the response disappear.

## 7. Reciprocal sequence protocol

Use completed exchange units, not a simplistic alternating playlist and not a recursive requirement that every new question must already have an answer before anything can be shown.

Example:

```text
A0: Candidate A's original proposal; asks Q1 and Q2.
B1: Candidate B answers Q1/Q2; asks Q3/Q4.
A2: Candidate A answers Q3/Q4; may ask the next questions.
```

B1 is public as soon as it passes independent safety/identity processing and is published. It is not automatically authorized for the official compiled sequence.

The completed unit containing B1 and A2 qualifies when A has accepted B1's answers and B has accepted A2's reciprocal answers under the proposed symmetric assessment rule. The authoritative sequence can then contain A0, B1, A2. A2's new questions open the next obligation; they do not prevent that completed unit from being shown.

If A never answers B1's questions, B1 remains public and is labeled as awaiting the originator's reciprocal answer. It must not be misleadingly labeled as nonresponsive on B's part. If A answers but B disputes the answer, the disagreement and both videos remain public while that exchange unit remains outside the jointly qualifying sequence.

If a response fails the originator's questions, it is footnoted with the attributed reasons and any objections. Later corrections can qualify a new unit without erasing the earlier one.

The official sequence is a versioned manifest of full, authorized source videos. Candidates cannot drag-and-drop opponents out of a published manifest. New eligible exchanges produce new sequence versions; prior published sequence versions remain inspectable. Ordinary subsequent disagreement does not silently revoke a previously authorized unedited exchange.

Provide a separate chronological public-record view of all safe published contributions, including pending and footnoted material. This is not mislabeled as the qualifying debate compilation and does not grant the originator editorial rights over the responder's work.

## 8. State model and integrity invariants

Store independent state dimensions rather than one overloaded `status` field.

| Dimension | Representative states |
| --- | --- |
| Publication | private draft, submitted for publication, processing, published, exceptionally restricted |
| Media | uploading, validating, playable, processing failed, degraded |
| Assessment | awaiting review, accepted, disputed, not accepted |
| Inclusion | public only, awaiting reciprocal answer, qualifying, footnoted |
| Obligation | open, fulfilled on time, fulfilled late, overdue, superseded by recorded agreement |
| Branch | awaiting response, active, inactive, resolution proposed, partial agreement, resolved |
| Derivative | drafting, consent incomplete, rendering, awaiting approvals, approved, distributed |

State transitions must be defined in `spec/state-machine.md`, with actor, preconditions, emitted events, errors, and acceptance tests.

Core invariants: no originator deletion of an opponent's contribution; no mutable published question; no inclusion without reciprocity; no edited output without scoped permission; no agreement without both confirmations of the same version; no candidate/team cross-access; no timeout implying victory; no retry duplicating publication or sending; no successful status without supporting evidence.

## 9. Dedicated interface

### 9.1 Public home and discovery

Use an editorial civic presentation with strong typography, generous spacing, prominent video, readable policy summaries, and clear next steps. Do not turn the public site into a table-heavy admin console. Suggested positioning: "Better questions. Real answers. Better policy."

Provide topic, office, election-cycle, candidate, and branch filters. Use clear chronological or explicit editorial ordering, not engagement optimization or an outrage-based ranking. Display real data only. Demo fixtures are visibly fictional and never appear in the production archive.

### 9.2 Debate page

The top of the page contains the topic, originating candidate and office, original video, core proposition, original questions, supporting documents, rules, and a visible response count. Viewers should not need to understand engine vocabulary to find the argument.

Below, offer understandable routes to the qualifying debate, all responses, questions and answers, supporting materials, and any agreed solution. Each contender's branch has its own timeline and status. Provide direct question/answer timestamp links, a transcript, speaker labels, and visible unresolved obligations.

A footnoted response gets a normal full-video page, not a tiny dismissive tooltip. Pending reciprocal answers are visibly distinct from content rejected as nonresponsive.

### 9.3 Candidate workspace

Show action-oriented tasks: questions to answer, responses to assess, publication approvals, deadlines, failed uploads, proposed policy changes, and media permissions. Offer resumable upload, previews, drafts, side-by-side source/question review, and explicit final publication confirmation.

Support narrow screens from the beginning. Long captions, candidate names, document titles, loading states, empty states, permissions failures, and expired sessions must be designed and tested, not left as raw server errors.

### 9.4 Agreement and press pages

An agreement page contains the exact jointly approved policy version, what changed from the original positions, both confirmations, a concise explanation, approved summary videos, and direct access to the full debate and sources. Show partial agreement honestly.

A press page provides approved downloadable files, captions, transcript, source manifest, policy materials, attribution, usage permissions, and permanent links. It must not suggest that outside publishers endorsed the result.

## 10. Resolution and policy synthesis

Either participant can submit a versioned policy proposal intended to resolve the disagreement. The proposal identifies the questions it addresses, changes from both prior positions, implementation details, tradeoffs, supporting materials, and remaining disagreements.

The other participant may accept the exact version, request changes, counterpropose, or record partial agreement. Each change creates a new version. Prior acceptance never carries over automatically to a different text or attachment.

A resolved state requires affirmative approval by both authorized participants of the same policy manifest/digest, including its attachments and defined scope. Ask each to affirm that this is their jointly preferred solution to the stated disagreement. The software reports that agreement; it does not certify objective policy correctness.

A partial agreement remains partial. A later withdrawal of support becomes a new public event and a changed current endorsement status; it does not delete the historical agreement. A new agreement or reopened debate links back to that history.

## 11. Original media, summaries, and permissions

### 11.1 Originals and playback copies

Store uploaded originals under non-overwritable object identifiers and cryptographic checksums. Keep the actual original distinct from full-length playback encodes, captions, thumbnails, compiled sequences, and editorial summaries.

Technical delivery transformations need explicit publication terms. Preserve the entire content and ordering of each contribution; do not trim silences, accelerate speech, insert editorial overlays, crop meaningful visuals, or normalize content in a way the participant did not authorize. Provide a downloadable original where allowed by the publication license and safety status.

A full debate can first play as a manifest-backed sequence, avoiding repeated re-encoding of an entire growing debate. Offer a concatenated full-length export with provenance when requested/approved. Supporting title cards are outside the speakers' original footage.

### 11.2 Consent ledger

Record separate scoped permissions for archival display, qualifying unedited inclusion, full-length technical encodes, specific excerpts, captions/translations, compilation, summary rendering, and public distribution. Do not bury editorial permission inside a general upload checkbox.

An edit decision list identifies the source asset and exact in/out points of every excerpt, plus script, title cards, captions, and transformations. Approvals bind to the version and checksum of the final output. A new edit invalidates earlier final-output approval.

Original-publication obligations and optional new derivative permissions have different revocation semantics. Future optional uses can be disabled under the agreed terms; the platform must not promise to retrieve already distributed copies from third parties. No one may approve another candidate's clips.

### 11.3 Summary production

After a jointly approved resolution, generate a faithful concise master covering the disagreement, material answers, decisive changes, and agreed policy. Its length is driven by substance rather than an arbitrary target.

Then create progressively shorter formats, proposed targets of five minutes, three minutes, sixty seconds, and thirty seconds, only where each is actually shorter than the preceding version. Targets are configurable. Short announcements must not be labeled as complete accounts of the argument.

Use an accessible review interface for exact clips, captions, contextual cards, and export previews. Both participants approve joint summaries before they are branded and released as joint products. They must approve any editing of their footage. No synthetic candidate speech, invented quotations, or impersonated agreement.

Policy agreement and derivative-media approval are independent states. A withheld editing approval does not undo an already confirmed policy agreement; it leaves the relevant summary unreleased. Lack of a summary never delays or removes the original public record.

The workflow must work without an LLM: participants/editors can supply text, select timestamps, and render deterministic outputs. Optional transcription/summarization adapters may suggest drafts only; their outputs are untrusted until checked against source media and approved. Unavailable AI must never prevent the ordinary debate from operating.

## 12. Publishing and dissemination

Release the agreed policy page, approved concise master, shorter variants, full qualifying debate, complete public response record, captions, transcripts, and provenance manifest as a linked set.

Provide shareable pages, read-only embeds, a public feed, and a downloadable press kit. Add a connector boundary for authorized email and social/video destinations without assuming that an unavailable provider is configured.

Distribution requires the appropriate permission for the artifact, selected destinations/recipients, and authenticated accounts. Record separate states for queued, provider accepted, delivered where verifiable, failed, and retried. A provider accepting an upload is not proof that the media reached an audience.

Use an idempotent outbox and per-destination retry policy. Failure at one destination does not duplicate successful sends to another. Never claim press coverage or publish to accounts that have not been connected and authorized. Do not use a scraped mass mailing list as a default feature.

## 13. Technical architecture

### 13.1 Application and data

Use TypeScript and a maintained Next.js/React application, with exact supported dependencies pinned and verified during implementation. Keep the domain protocol independent of framework request handlers. Use Neon Postgres for durable relational data and a bounded connection strategy appropriate to the actual deployed runtime.

Use database-backed durable jobs and an outbox initially. Jobs require leases, idempotency keys, bounded retries, backoff, visibility into failures, and a dead-letter recovery path. Worker restarts must not lose publication state, deadlines, or rendering progress records.

### 13.2 Storage and worker

Use an S3-compatible object-storage adapter, with Backblaze B2 as the preferred existing-ecosystem candidate subject to credentials, available capacity, transfer costs, and approved retention configuration. Do not store videos in Postgres or rely on application local files as the archive.

Render's ordinary filesystem is ephemeral across service restarts and redeploys; persistent storage must therefore be deliberate. Render also provides worker services designed for asynchronous processing. These are reasons to separate archival object storage from temporary worker scratch space. [S1, S2]

Direct-to-storage resumable/multipart uploads use short-lived, size-limited, actor-scoped authorizations. Validate checksums, actual file type, duration, codec, and object ownership server-side. Quarantine media/documents before processing or public delivery.

Run media parsers and FFmpeg in a restricted worker with memory/CPU/disk/time limits, network restrictions, non-root execution, and no access to unrelated secrets. An arbitrary submitted URL must not cause unrestricted server-side fetching. For version 1, uploaded files are the authoritative archive; external video links can be supplementary, not the only retained copy.

### 13.3 Important entities

| Entity group | Contents |
| --- | --- |
| Identity | User, Campaign, Membership, RoleGrant, VerificationRecord |
| Eligibility | Office, Jurisdiction, ElectionCycle, CandidacySnapshot |
| Debate | Topic, Debate, Branch, RuleSetVersion, Invitation |
| Exchange | Submission, Question, AnswerReference, Assessment, AssessmentObjection, ReplyObligation |
| Media and sources | Asset, AssetVersion, DocumentVersion, TranscriptVersion, ProcessingJob |
| Publications | PublicRecordEvent, SequenceManifest, SequenceEntry, CorrectionLink |
| Resolution | PolicyProposal, PolicyVersion, PolicyDiff, AgreementAttestation |
| Rights | PermissionGrant, EditDecisionList, DerivativeArtifact, ArtifactApproval |
| Operations | DistributionJob, Notification, AuditEvent, RestrictionCase, Appeal, RestoreEvidence |

Store references and metadata in Postgres; store media bytes in object storage. Public versions are immutable. Current-state read models are rebuildable from retained events and source records; a database restore must not silently lose later public publications.

### 13.4 API and integration contract

Provide versioned public GET endpoints for topics, branches, full response records, questions, answer maps, sequence manifests, agreements, and approved media. Public reads must never expose private verification evidence, account identifiers, unpublished drafts, or private notification addresses.

Authenticated commands cover draft creation, upload authorization, submission/publication, assessment, objection, correction, proposal revision, agreement confirmation, permission grants, derivative approval, and authorized distribution. Every sensitive write has server-side authorization, validation, idempotency, and an audit event.

Representative command paths include `POST /v1/debates`, `POST /v1/branches/{id}/submissions`, `POST /v1/assessments`, `POST /v1/policies/{id}/attestations`, and `POST /v1/artifacts/{id}/approvals`. Paths are illustrative contract targets, not claims of implemented endpoints. There is no ordinary DELETE endpoint for published contributions.

Use optimistic version checks for conflicting edits and transactions for agreement/publication changes. Signed outgoing webhooks include unique event IDs, timestamps, and retry/replay protections. Downstream sites use the SDK or public embed rather than copying the debate database.

## 14. Security, privacy, and archive governance

### 14.1 E2EESA applicability

Apply the End-To-End-Everywhere Security Architecture Standard by component and data flow. Public debate publications are intentionally public; integrity, provenance, authorization, and availability are the central protections. Calling a public archive end-to-end confidential would be misleading.

Private drafts must not silently become server-readable merely to support AI tools. The initial low-complexity design keeps unpublished working content local, with safe local export; optional cloud private-draft synchronization remains disabled unless an appropriately reviewed E2EE component is available. A deliberate "submit for publication" action explicitly releases the selected content to the server's safety/processing pipeline. Account and verification metadata are separately protected and not falsely described as E2EE.

Do not invent a cryptographic protocol or claim certification from a passing schema check. The upstream README currently describes development toward 0.9.0-rc.2 and explicitly says that the development tree is not a production certification basis. Pin the adopted revision, document applicability and exclusions, and retain test/review evidence. [S3]

### 14.2 Application controls

Use established authentication, secure sessions, campaign-scoped authorization, and stronger authentication for privileged publication/administration actions. Prevent cross-campaign asset access, forged candidate approvals, replayed consent, CSRF, stored script injection, malicious captions/documents, upload abuse, server-side request forgery, and notification-header injection.

Keep secrets outside Git, logs, URLs, and public bundles. Separate storage credentials for uploads, processing, public delivery, and exceptional retention administration. Ordinary application credentials must not overwrite originals or delete published archive data.

Public uploads must receive the same checks regardless of the candidate or viewpoint. Rate and size controls are documented and applied consistently; resource limits must not become a pretext for political exclusion.

### 14.3 Preservation and exceptional restrictions

Use non-overwritable originals, append-only application records, independent backups, routine checksum checks, downloadable manifests, and restore exercises. Hashes establish consistency with stored/published bytes, not factual truth or proof that a pictured speaker personally authored a statement.

Object-lock capability can strengthen retention, but configuration has operational consequences. Backblaze documents that enabling Object Lock on a bucket cannot be reversed and that retention modes differ in who can override them. Choose approved retention settings deliberately and test recovery/moderation procedures before enabling production locks. [S4]

No candidate gets a deletion or suppression tool for another candidate's response. Exceptional platform restrictions for security, safety, or applicable legal requirements use a separate policy, documented authority, reason categories, independent review where feasible, appeal, and a non-misleading public notice where permissible. Do not republish private/harmful material in the audit reason itself. Preserve only what may appropriately be retained under that process.

Review publication licenses, candidate authorization, archival continuity, content restrictions, and press-use terms before real public onboarding. This is a release review requirement, not a claim that one drafted term resolves every jurisdiction's legal issues.

"Permanent public record" means a durable preservation and access commitment with continuity arrangements, not a promise that a single hosting account can never fail or that all copies can survive without resources.

## 15. Accessibility, performance, and cost

Target WCAG 2.2 AA and test manually as well as automatically. Provide keyboard navigation, visible focus, meaningful headings, accessible controls, error announcements, mobile reflow, and contrast. Provide accurate captions, speaker/non-speech labels, transcripts, and audio description or other appropriate treatment for meaningful visual information. A transcript alone is not automatically sufficient for all applicable media criteria. W3C's media guidance should drive the implementation and test matrix. [S5, S6]

Version transcript corrections separately from original media. Mark machine-generated text until reviewed. Publication checks should ensure accessible delivery without treating a delayed platform caption job as candidate lateness. Do not describe unreviewed auto-captions as verified transcription.

Use CDN-backed public media, lazy-loaded players, cacheable public read models, pagination, and database indexes. Keep private responses out of shared caches. Proposed staging benchmarks: public-page largest-contentful-paint at or below 2.5 seconds on a documented mobile test profile; cached metadata API p95 below 500 milliseconds at a documented modest pilot load; tested resumability for the configured maximum upload. These are engineering targets, not current measured performance or unconditional worldwide SLAs.

Measure storage, egress, processing minutes, captioning costs, email volume, queue lag, and failed jobs. Configure per-file limits and per-debate processing budgets before accepting uploads. Preserve already published originals when funds are constrained; pause optional derivative generation before risking the archive. No new paid resource or subscription is authorized by this plan alone.

## 16. Pull-request development sequence

Stable roadmap identifiers below are not reserved GitHub PR numbers. Implement in dependency order and map actual PR URLs/SHAs to these IDs. Security, authorization, and accessibility start in the foundations; later hardening work does not permit unsafe earlier public deployment.

| ID | Deliverable | Required acceptance evidence | Dependencies |
| --- | --- | --- | --- |
| PDE-01 | Commit this complete plan after approval; protocol, state model, decisions, AGENTS instructions, machine-readable roadmap; register as planned in Engine Room. | Repository contains all rules and approval assumptions; no reliance on chat memory; no claim of implementation. | Approval and authorized repository |
| PDE-02 | TypeScript workspace, neutral web shell, accessible component foundations, domain package, CI, local setup, fictional fixtures. | Clean install, lint, typecheck, unit test, production build and smoke route succeed; production cannot enable development identity. | 01 |
| PDE-03 | Postgres schema/migrations, versioning, audit events, transactional outbox, durable-job primitives and archive constraints. | Migration on empty DB; supported upgrade rehearsal; retry and transaction rollback tests; published records resist ordinary update/delete. | 02 |
| PDE-04 | Authentication, campaign membership, scoped roles, delegate permissions, privileged approval checks and session recovery. | Cross-campaign authorization matrix, revoked delegate tests, session/CSRF protections and no self-assigned verifier/admin. | 03 |
| PDE-05 | Offices/cycles/candidacy profiles, verification queue and appeals, invitations and public candidate identity snapshots. | Same-office rules tested; all-party/independent profile works; private evidence stays private; unsent invitations are not shown as delivered. | 04 |
| PDE-06 | Versioned rules, question identities/limits, duration and reply-window models, immutable acceptance snapshots. | Symmetric limits, no retroactive changes, terminal-turn exceptions, clock boundary and compound-question handling tests. | 03-05 |
| PDE-07 | Object-store adapter, resumable direct uploads, ownership checks, publication receipts, quarantine and checksums. | Resume interrupted upload; reject foreign-object finalization, spoofed type, oversized payload and invalid checksum; no lost receipt on retry. | 04, 06 |
| PDE-08 | Isolated media jobs, scan/probe/encode pipeline, playback derivatives, caption import and reviewed transcription workflow. | Corrupt and hostile fixtures fail safely; originals remain unchanged; restart resumes work; no duplicate asset publication. | 07 |
| PDE-09 | Versioned supporting documents, safe previews/downloads, source references and correction links. | Historical documents remain addressable; unsafe document/script payloads cannot execute; content/version permissions pass. | 07-08 |
| PDE-10 | Initiation composer, original questions/timestamps, rule preview, final publication authorization and root topic page. | Realistic end-to-end create/preview/publish; no accidental publish; no placeholder material can masquerade as a real debate. | 05-09 |
| PDE-11 | Response composer, per-contender branches, video answer maps, reciprocal questions and nonqualifying public submissions. | B/C branches stay independent; format failure does not silently erase an eligible response; uploads and timestamps validate. | 10 |
| PDE-12 | Per-question assessment, reasons, objections, visible unreviewed states, corrected responses and assessment reversals. | Only question owner can assess; no mutable question/reason history; public can inspect full rejected response and objection. | 11 |
| PDE-13 | Completed exchange-unit eligibility, versioned official manifests, all-contributions view and source-preserving playback. | A0/B1/A2 protocol test; B1 public before inclusion; unanswered reciprocity blocks official use; no infinite approval regress. | 12 |
| PDE-14 | Durable deadline jobs, review/reply obligations, notifications, overdue/late labels, documented outage adjustments. | Database-clock tests including timezone/DST display, delayed processing, unsent invite, double job execution and late reply recovery. | 06, 11-13 |
| PDE-15 | Complete dedicated public debate page: large video, sources, question ledger, independent branches and visible footnotes. | Anonymous user can find every safe published response; candidate cannot hide exclusions or unanswered reciprocal questions. | 13-14 |
| PDE-16 | Accessible player, transcript/caption navigation, question timestamp deep links and public transcript search. | Keyboard/screen-reader checks, mobile playback, reviewed captions and search isolation for private/unpublished content. | 08, 15 |
| PDE-17 | Home, discovery, office/candidate/topic pages, stable share URLs, indexable public text and honest empty states. | Filtering and ordering tests; no engagement winner rankings; no fabricated live content; representative mobile screenshots. | 15-16 |
| PDE-18 | Candidate workspace, publishing/delegate review, task inbox, local drafts/export, deadlines and upload recovery UX. | Originator and responder can complete multi-round debate using UI only; error/expired-session/accessibility states verified. | 14-17 |
| PDE-19 | Versioned synthesis proposals, differences, counterproposals, scoped partial agreements and exact-version joint confirmations. | One approval cannot resolve; changed attachment invalidates prior acceptance; third candidate remains unaffected; later withdrawal preserves history. | 12-18 |
| PDE-20 | Media permission ledger, edit-decision lists, candidate-specific consent, final-output approvals and future-use controls. | No party grants another's rights; changed source/cut invalidates approval; missing permission fails closed; ordinary original archive persists. | 08, 19 |
| PDE-21 | Concise-master editor and deterministic progressively shorter video rendering with caption/source manifests and previews. | Source timestamps match; only approved media used; both approve exact joint output; pipeline works without paid AI. | 20 |
| PDE-22 | Agreement page, approved media library, press kit, complete public-record export, captions, manifests and public feed. | Every derivative links to full sources; private material excluded; exported archive verifies and can be read independently. | 19-21 |
| PDE-23 | Authorized dissemination adapters, destination selection, idempotent outbox, receipts, retry/recovery and honest delivery states. | No unauthorized send; fake credentials cannot display success; partial destination failures retry without duplicate successful sends. | 22 |
| PDE-24 | Versioned public API/SDK and safe embeds; campaign integration in downstream repository; initial three-topic configuration as drafts. | Contract tests; neutral engine contains no campaign-specific code; campaign reads current data; missing source videos remain unpublished. | 15-23 |
| PDE-25 | Threat-model review, E2EESA component/data-flow matrix, credential/permission hardening and evidence registry. | Negative authorization, replay, injection, parser-isolation and public/private boundary tests; no unsupported conformance claims. | 04-24 |
| PDE-26 | Independent restriction/appeal workflow, archival continuity, backups, integrity verification and disaster-recovery rehearsal. | Originator still cannot suppress opponents; account closure retains publications; documented DB/object restore verifies checksums and recent events. | 25 |
| PDE-27 | Comprehensive model-based protocol, adversarial concurrency, regression and multi-actor end-to-end acceptance suite. | All mandatory scenarios in Section 17 pass, including disputed answers, withheld approvals, worker outage and competing synthesis versions. | 26 |
| PDE-28 | Visual/accessibility polish, Safari/mobile/desktop tests, load tests, upload quotas, budget controls and documentation of measured limits. | Manual WCAG/media review, no broken controls, performance evidence, budget exhaustion behavior and safe accessible error states. | 27 |
| PDE-29 | Approved Render/Neon/storage deployment configuration, production migrations, real worker and notifications, monitors and rollback. | Correct authorized project/service, real write/read/playback, worker health, restore evidence, migration/rollback rehearsal and external checks. | 28; required credentials/budget |
| PDE-30 | Real deployment acceptance, final source/press workflow rehearsal, Engine Room reconciliation, release artifacts and complete handoff. | Commit SHA matched to live release; genuine evidence for all gates; roadmap accurately reflects all PRs; no open blocker hidden as complete. | 29; launch materials/authorizations |

An Engine Room or campaign-site change associated with a roadmap item may be a linked PR in another repository. The item is not complete until its required linked changes and acceptance evidence are complete. Adding real new scope adds roadmap items and increases the denominator; it is not silently buried in an unrelated PR.

## 17. Mandatory acceptance scenarios

The suite must run at the domain, integration, and browser levels where appropriate, using distinct identities and isolated test data.

| Scenario | Required behavior |
| --- | --- |
| B does not answer A's original questions | B remains public; A's attributed reasons and B's objections are visible; official inclusion blocked. |
| B answers A, but A never answers B | B remains visible as awaiting reciprocity; A cannot include B in a supposedly complete qualifying sequence. |
| A rejects an answer that B considers responsive | Both positions and exact answer timestamps are available; no platform claim that A's opinion is objective truth. |
| A ignores a submitted response entirely | The response appears publicly; pending assessment/overdue action is attributed to A, not concealed. |
| A attempts to delete, hide, overwrite, or de-index B's contribution | Authorization denies the attempt; archive and response counters remain correct. |
| A published a question and later changes its wording | Existing question cannot be overwritten; a linked correction/new version is required. |
| B posts an overlong or structurally noncompliant but safe response | The archive/footnote route remains available under universal technical limits; qualification is honestly labeled. |
| Two contenders respond to one proposal | Separate branches, obligations, agreements, and permissions; neither branch overwrites the other. |
| A and B accept different policy versions | No joint agreement; the mismatch is explicit. |
| Both accept a scoped partial agreement | Partial status only; unresolved questions remain visible. |
| Editor changes an approved clip by one cut/title/caption revision | Prior output approval cannot authorize the changed artifact. |
| A participant refuses optional excerpt permission | Original debate remains public; unapproved derivative release is blocked. |
| Upload finishes before deadline but processing finishes later | Valid candidate receipt preserves timeliness; processing delay is attributed to the platform. |
| Email provider or worker is down | Durable jobs persist; no fabricated sent/delivered status; recovery is idempotent. |
| Deadline job executes twice or server restarts | No duplicate obligations, notifications, votes, approvals, publications, or sends. |
| Candidate closes account or withdraws from election | Historic records remain attributed and accessible; private account data handled separately. |
| A safety restriction is appealed | Independent workflow and reason history; no campaign-controlled suppression. |
| Storage/processing budget is exhausted | New optional work pauses with honest messages; no automatic deletion of published originals. |
| Backup is restored | Database, public events, object checksums, permission/approval records and manifests reconcile. |
| Visitor uses keyboard/screen reader/mobile Safari | Core reading, watching, navigation and candidate workflows remain usable without inaccessible controls. |

## 18. Deployment and operational acceptance

Provision only into the correct authorized Render project and Neon project/branch. This plan does not identify new project IDs or authorize substituting another application's infrastructure.

Keep development, staging, and production data isolated. Production must fail closed when real authentication, object storage, publication secrets, or required services are missing; do not silently fall back to demo authentication or local-file archival storage.

Configure health, readiness, media-worker heartbeat, queue backlog, storage integrity, error rate, database availability, processing failures, public playback checks, and spend thresholds. Report distinct states for application availability, media readiness, and source freshness.

Use backwards-compatible migrations where feasible, explicit migration locks, tested rollback/runbooks, and retained release SHAs. Validate real production sign-in, candidate permission boundaries, submission receipt, object persistence across a redeploy, public playback, reciprocal eligibility, agreement, approved summary export, and authorized delivery with test recipients before public launch.

Before launch, account for backups of both relational records and objects. Document recovery-point and recovery-time targets after the selected infrastructure and budget are known; do not invent an SLA in advance. Test restore and inspect whether recently published records survive reconciliation.

The existing Engine Room README already distinguishes merged development from operational acceptance. Preserve that distinction here: a completed PR roadmap is not proof of a secure, functional public deployment. [S7]

## 19. Development rules and Engine Room reporting

After approval, chain implementation PRs in dependency order during authorized development sessions. Run the required checks, fix failures, and merge when the gates pass without waiting for routine product-owner approval of technical details. Pause for missing credentials, unauthorized spending, unsafe/destructive changes, genuinely unresolved product choices, or a failing gate that cannot be responsibly resolved.

Do not promise work will continue in the background merely because an agent conversation has ended. A scheduled development system would require a separately configured and verified execution environment; none is authorized or claimed here.

Every PR must update relevant tests, interfaces, documentation, and roadmap evidence. Keep fixture data clearly fictional. Never mark an item complete because a page exists, an adapter is stubbed, or an endpoint returns a placeholder success.

Engine Room must show this project's repositories, full plan, total approved roadmap items, actual PR mappings, merged/accepted items, implemented-but-unmerged items, remaining work, live URLs, deployment SHA, health, required credentials, blockers, and evidence freshness. All approved work shares one denominator. Merged/accepted work is green; implemented open work is yellow; unimplemented work is empty. New scope increases the denominator. Tests, merge, deployment, and independent review remain separately inspectable.

## 20. Required handoff documentation

The repository must contain the entire approved plan, not just a link to this conversation. Required documents are:

```text
docs/DEVELOPMENT_PLAN.md
AGENTS.md
spec/debate-protocol.md
spec/state-machine.md
spec/permission-and-consent-model.md
spec/archive-and-restriction-policy.md
docs/architecture.md
docs/decisions/                 Versioned ADRs
docs/local-development.md
docs/deployment-runbook.md
docs/operations-and-cost-controls.md
docs/backup-and-restore.md
docs/security-and-E2EESA-applicability.md
docs/accessibility-test-plan.md
docs/acceptance-evidence.md
docs/agent-handoff.md
registry/roadmap.json
.env.example                   Placeholders only, never working secrets
```

The handoff must state exact current versions, repository boundaries, existing infrastructure identifiers once verified, unresolved requirements, commands for tests/migrations/build, provider setup, evidence locations, and the next unblocked task. Another account or developer should be able to continue without personal memory of any conversation.

## 21. Launch inputs and definition of done

No further personal inputs are needed to review this product plan. Implementation prerequisites, when reached, are an authorized repository, correct hosting/database/storage credentials, an approved cost ceiling, authentication and notification configuration, archival/publication terms, and the actual launch videos/materials.

For the initial three debates, supply the final original videos, source documents, opening questions, chosen reply limits, and authorized campaign publisher. Their absence does not block generic engine development, but it does prevent honestly claiming the real debates are published. Recipient lists and connected distribution accounts are required only for actual external dissemination.

Version 1 is complete only when a verified contender can respond through the interface; all safe published responses remain publicly discoverable; reciprocal eligibility cannot be bypassed; time limits and judgments are transparent; originals remain unaltered; a genuine joint policy approval is version-specific; approved shorter videos can actually be rendered and distributed; public users can inspect the full record; and production security, accessibility, persistence, recovery, and handoff gates have evidence.

**Approval of this plan would authorize proceeding to implementation under the stated boundaries. No implementation or deployment has been performed by producing this plan.**

## Source notes

These sources ground current infrastructure constraints and existing repository conventions; product-specific rules and proposed defaults above are separately identified.

- S1. Render, Persistent Disks: https://render.com/docs/disks
- S2. Render, Background Workers: https://render.com/docs/background-workers
- S3. Existing upstream E2EESA README, retrieved through GitHub: https://github.com/neophilism/End-To-End-Everywhere-Security-Architecture-Standard/blob/main/README.md (retrieved blob SHA b2ce78b0cf2a22564818a5568afd0a0a4a0c775b).
- S4. Backblaze, Object Lock: https://www.backblaze.com/docs/cloud-storage-object-lock
- S5. W3C WAI, Making Audio and Video Media Accessible: https://www.w3.org/WAI/media/av/
- S6. W3C WAI, Understanding SC 1.2.2 Captions (Prerecorded): https://www.w3.org/WAI/WCAG22/Understanding/captions-prerecorded.html
- S7. Existing Engine Room README, retrieved through GitHub: https://github.com/neophilism/Engine-Room/blob/main/README.md (retrieved blob SHA 3f6ff61d931bc8764652fdafa1d812c88c42ad6f).