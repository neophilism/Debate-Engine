# Deadline and notification contract

PDE-14 represents review and reply duties as separate server-authoritative obligations. A direct-invitation clock begins only after the proposal is usable and there is provider evidence that the invitation was accepted for sending. Drafting an invitation is not delivery evidence.

All stored instants are UTC `timestamptz` values. User interfaces may render the viewer's timezone, but browser clocks never decide lateness. The upload receipt time determines whether a contribution is on time even when scanning or media processing completes later. Late responses remain publishable and recover the exchange while retaining the neutral `fulfilled_late` label.

Documented outage extensions are append-only adjustments with public reasons. Deadline scans enqueue work through the existing `durable_jobs` table. Reminders and overdue notices use a dedupe key containing obligation, phase, and effective due instant, so a restarted or duplicated scan cannot create a second outgoing action. Provider acceptance and delivery remain distinct downstream states; this milestone does not configure or authorize an external notification provider.

Contribution publication fulfills the parent reply clock and opens review/reply clocks in the same transaction; attributed assessments fulfill the matching review clock. The public API exposes neutral open, overdue, fulfilled-on-time, and fulfilled-late projections including outage adjustments. The candidate workspace shows only obligations owned by the signed-in candidate and links each unfinished item to the appropriate review or response flow.

Run one bounded worker batch with `npm run worker:deadlines`. The worker claims due jobs with a database lease and `SKIP LOCKED`, requeues clocks extended by outage evidence, and appends at most one neutral `obligation_overdue` publication event before completing the job. It never contacts an external provider. A process supervisor may invoke repeated batches, but no hosted worker is claimed until an authorized deployment records health and execution evidence.

The pure projection and source-level regression tests cover timezone/DST display boundaries, delayed processing, unsent invitations, concurrent/double job execution, outage rescheduling, candidate access scoping, and late-reply recovery. Actual external notification provider integration remains separately gated and unauthorized by this implementation.
