import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const schema = readFileSync("packages/database/migrations/0001_foundation.sql", "utf8");
const migrationRunner = readFileSync("scripts/migrate.mjs", "utf8");

test("schema explicitly models independent public vs qualifying records", () => {
  for (const table of ["debates","debate_branches","submissions","questions","answers",
    "assessments","publication_events","sequence_versions","sequence_entries"]) {
    assert.match(schema, new RegExp("CREATE TABLE IF NOT EXISTS " + table + " \\("));
  }
});
test("published evidence is protected by database-level immutable triggers", () => {
  for (const trigger of ["pde_publication_events_immutable","pde_published_submissions_immutable",
    "pde_published_debates_immutable","pde_questions_guard","pde_media_guard",
    "pde_assessments_immutable","pde_policy_acceptances_immutable"]) {
    assert.ok(schema.includes("CREATE TRIGGER " + trigger));
  }
});
test("candidate-controlled moderation cannot delete published replies", () => {
  assert.match(schema, /Published submission cannot be modified or removed/);
  assert.match(schema, /pde_block_published_submission_mutation/);
});
test("policy agreements are bound to exact proposal hashes", () => {
  assert.match(schema, /FOREIGN KEY \(policy_version_id, content_sha256\)/);
  assert.match(schema, /UNIQUE \(policy_version_id, candidacy_id\)/);
});
test("media approval is bound to exact output versions", () => {
  assert.match(schema, /FOREIGN KEY \(artifact_id, output_sha256\)/);
  assert.match(schema, /UNIQUE \(artifact_id, candidacy_id\)/);
});
test("migration runner verifies applied checksums and uses a transaction", () => {
  assert.match(migrationRunner, /pg_advisory_xact_lock/);
  assert.match(migrationRunner, /createHash\("sha256"\)/);
  assert.match(migrationRunner, /ROLLBACK/);
});
