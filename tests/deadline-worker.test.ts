import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const worker=readFileSync("scripts/deadline-worker.mjs","utf8");
const inbox=readFileSync("app/workspace/obligation-inbox.tsx","utf8");

test("deadline worker uses leases and database locking for duplicate execution",()=>{
  assert.match(worker,/FOR UPDATE SKIP LOCKED/);
  assert.match(worker,/leased_until < now\(\)/);
  assert.match(worker,/WHERE NOT EXISTS[\s\S]*kind='obligation_overdue'/);
});

test("outage adjustments reschedule work instead of declaring an early timeout",()=>{
  assert.match(worker,/effective_due_at > current\.checked_at/);
  assert.match(worker,/state='queued',available_at=\$2/);
});

test("worker records neutral in-product evidence without external delivery",()=>{
  assert.match(worker,/obligation_overdue/);
  assert.doesNotMatch(worker,/fetch\(|sendMail|provider_receipt|outgoing_actions/);
});

test("candidate inbox is scoped by authenticated subject and exposes honest states",()=>{
  assert.match(inbox,/external_subject=\$1/);
  for(const state of ["open","overdue","fulfilled_on_time","fulfilled_late"]) assert.ok(inbox.includes(state));
  assert.match(inbox,/Prepare a reply/);
  assert.match(inbox,/Review the response/);
});
