import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";

const publication = readFileSync("lib/server/continue-debate.ts", "utf8");
const assessments = readFileSync("app/api/assessments/route.ts", "utf8");
const obligations = readFileSync("lib/server/obligations.ts", "utf8");
const publicRead = readFileSync("lib/server/public-debates.ts", "utf8");

test("publication records clocks inside the contribution transaction", () => {
  assert.match(publication, /recordPublishedContinuationObligations\(db/);
  assert.match(publication, /RETURNING published_at/);
  assert.match(obligations, /UPDATE reply_obligations SET received_at/);
  assert.match(obligations, /ON CONFLICT\(branch_id,source_submission_id,obligated_candidacy_id,obligation_type\) DO NOTHING/);
});

test("review assessments fulfill their matching durable obligation", () => {
  assert.match(assessments, /fulfillReviewObligation\(db/);
  assert.match(obligations, /obligation_type='review'/);
});

test("deadline jobs are durable, deduplicated, and do not send externally", () => {
  assert.match(obligations, /INSERT INTO durable_jobs/);
  assert.match(obligations, /ON CONFLICT\(job_type,dedupe_key\) DO NOTHING/);
  assert.doesNotMatch(obligations, /fetch\(|outgoing_actions|sendMail|provider_receipt/);
});

test("public read model distinguishes honest deadline states", () => {
  for (const state of ["open", "overdue", "fulfilled_on_time", "fulfilled_late"]) {
    assert.ok(publicRead.includes("'" + state + "'"));
  }
  assert.match(publicRead, /obligation_outage_adjustments/);
});
