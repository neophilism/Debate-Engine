import test from "node:test";
import assert from "node:assert/strict";
import {invitedReplyOpenedAt, notificationDedupeKey, projectObligation} from "../packages/domain/deadlines.ts";

test("server instants survive a daylight-saving boundary without changing elapsed time", () => {
  const result = projectObligation({
    id: "dst", openedAt: "2026-11-01T00:30:00-04:00", dueAt: "2026-11-01T02:30:00-05:00",
  }, "2026-11-01T07:29:59Z");
  assert.equal(result.state, "open");
  assert.equal(result.effectiveDueAt, "2026-11-01T07:30:00.000Z");
});

test("a timely receipt stays timely when platform processing finishes after the deadline", () => {
  const result = projectObligation({id:"processing",openedAt:"2026-10-10T10:00:00Z",dueAt:"2026-10-10T11:00:00Z",
    receivedAt:"2026-10-10T10:59:59Z",processedAt:"2026-10-10T12:30:00Z"},"2026-10-10T12:30:00Z");
  assert.equal(result.state,"fulfilled_on_time");
});

test("an unsent invitation does not start a reply clock", () => {
  assert.equal(invitedReplyOpenedAt("2026-10-10T10:00:00Z",null),null);
  assert.equal(invitedReplyOpenedAt("2026-10-10T10:00:00Z","2026-10-10T10:05:00Z"),"2026-10-10T10:05:00.000Z");
});

test("repeated deadline scans use the same reminder key", () => {
  const first=notificationDedupeKey("ob-1","overdue","2026-10-11T10:00:00Z");
  assert.equal(first,notificationDedupeKey("ob-1","overdue","2026-10-11T10:00:00Z"));
});

test("late replies recover the branch without being relabeled on time", () => {
  const result=projectObligation({id:"late",openedAt:"2026-10-10T10:00:00Z",dueAt:"2026-10-10T11:00:00Z",
    receivedAt:"2026-10-10T11:00:01Z"},"2026-10-10T11:00:01Z");
  assert.equal(result.state,"fulfilled_late");
});

test("documented outage adjustments are additive and reject duplicate evidence", () => {
  const result=projectObligation({id:"outage",openedAt:"2026-10-10T10:00:00Z",dueAt:"2026-10-10T11:00:00Z",
    adjustments:[{id:"incident-1",seconds:300}],receivedAt:"2026-10-10T11:04:00Z"},"2026-10-10T11:06:00Z");
  assert.equal(result.state,"fulfilled_on_time");
  assert.throws(()=>projectObligation({id:"duplicate",openedAt:"2026-10-10T10:00:00Z",dueAt:"2026-10-10T11:00:00Z",
    adjustments:[{id:"same",seconds:60},{id:"same",seconds:60}]},"2026-10-10T10:30:00Z"),/unique/);
});
