export type ObligationState = "open" | "overdue" | "fulfilled_on_time" | "fulfilled_late";

export type OutageAdjustment = {
  id: string;
  seconds: number;
};

export type ObligationClock = {
  id: string;
  openedAt: string;
  dueAt: string | null;
  receivedAt?: string | null;
  processedAt?: string | null;
  adjustments?: readonly OutageAdjustment[];
};

export type ObligationProjection = {
  state: ObligationState;
  effectiveDueAt: string | null;
  receivedAt: string | null;
  processedAt: string | null;
};

function instant(value: string, label: string): number {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(`${label} must be an ISO-8601 instant.`);
  return parsed;
}

function uniqueAdjustmentSeconds(adjustments: readonly OutageAdjustment[]): number {
  const seen = new Set<string>();
  let total = 0;
  for (const adjustment of adjustments) {
    if (!adjustment.id || seen.has(adjustment.id)) throw new Error("Outage adjustment identifiers must be unique.");
    if (!Number.isSafeInteger(adjustment.seconds) || adjustment.seconds <= 0) {
      throw new Error("Outage adjustment seconds must be positive integers.");
    }
    seen.add(adjustment.id);
    total += adjustment.seconds;
  }
  return total;
}

/** Project an obligation from server-authoritative instants. Receipt time, not later processing, decides timeliness. */
export function projectObligation(clock: ObligationClock, now: string): ObligationProjection {
  const openedAt = instant(clock.openedAt, "openedAt");
  const observedAt = instant(now, "now");
  if (observedAt < openedAt) throw new Error("now cannot precede the obligation opening time.");

  const dueAt = clock.dueAt === null ? null : instant(clock.dueAt, "dueAt");
  if (dueAt !== null && dueAt < openedAt) throw new Error("dueAt cannot precede openedAt.");
  const effectiveDue = dueAt === null ? null : dueAt + uniqueAdjustmentSeconds(clock.adjustments ?? []) * 1000;
  const receivedAt = clock.receivedAt ? instant(clock.receivedAt, "receivedAt") : null;
  const processedAt = clock.processedAt ? instant(clock.processedAt, "processedAt") : null;
  if (receivedAt !== null && receivedAt < openedAt) throw new Error("receivedAt cannot precede openedAt.");
  if (processedAt !== null && receivedAt === null) throw new Error("Processing cannot succeed without a receipt.");
  if (processedAt !== null && processedAt < receivedAt!) throw new Error("processedAt cannot precede receivedAt.");

  let state: ObligationState;
  if (receivedAt !== null) state = effectiveDue === null || receivedAt <= effectiveDue ? "fulfilled_on_time" : "fulfilled_late";
  else state = effectiveDue !== null && observedAt > effectiveDue ? "overdue" : "open";

  return {
    state,
    effectiveDueAt: effectiveDue === null ? null : new Date(effectiveDue).toISOString(),
    receivedAt: receivedAt === null ? null : new Date(receivedAt).toISOString(),
    processedAt: processedAt === null ? null : new Date(processedAt).toISOString(),
  };
}

/** A direct-invitation clock cannot begin before both the proposal is usable and provider evidence says it was sent. */
export function invitedReplyOpenedAt(proposalUsableAt: string, providerAcceptedAt: string | null): string | null {
  if (providerAcceptedAt === null) return null;
  return new Date(Math.max(instant(proposalUsableAt, "proposalUsableAt"), instant(providerAcceptedAt, "providerAcceptedAt"))).toISOString();
}

export function notificationDedupeKey(obligationId: string, phase: "due_soon" | "overdue", effectiveDueAt: string): string {
  if (!obligationId) throw new Error("obligationId is required.");
  instant(effectiveDueAt, "effectiveDueAt");
  return `obligation:${obligationId}:${phase}:${effectiveDueAt}`;
}
