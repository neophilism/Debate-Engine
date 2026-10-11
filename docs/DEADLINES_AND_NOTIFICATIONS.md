# Deadline and notification contract

PDE-14 represents review and reply duties as separate server-authoritative obligations. A direct-invitation clock begins only after the proposal is usable and there is provider evidence that the invitation was accepted for sending. Drafting an invitation is not delivery evidence.

All stored instants are UTC `timestamptz` values. User interfaces may render the viewer's timezone, but browser clocks never decide lateness. The upload receipt time determines whether a contribution is on time even when scanning or media processing completes later. Late responses remain publishable and recover the exchange while retaining the neutral `fulfilled_late` label.

Documented outage extensions are append-only adjustments with public reasons. Deadline scans enqueue work through the existing `durable_jobs` table. Reminders and overdue notices use a dedupe key containing obligation, phase, and effective due instant, so a restarted or duplicated scan cannot create a second outgoing action. Provider acceptance and delivery remain distinct downstream states; this milestone does not configure or authorize an external notification provider.

The database migration supplies obligation storage and immutable outage evidence. The pure projection tests cover timezone/DST display boundaries, delayed processing, unsent invitations, duplicate job execution, outage adjustments, and late-reply recovery. Production UI and provider integration remain later roadmap work.
