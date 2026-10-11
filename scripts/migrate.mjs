#!/usr/bin/env node
/**
 * Explicit, transactional Postgres migration runner.
 * Requires an authorized DATABASE_URL; never automatically provisions a database.
 */
import { createHash } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import { resolve } from "node:path";
import pg from "pg";

const url = process.env.DATABASE_URL;
if (!url) throw new Error("DATABASE_URL is required. No migration was attempted.");
const dryRun = process.argv.includes("--check");
const root = resolve(process.cwd(), "packages/database/migrations");
const filenames = (await readdir(root)).filter((name) => /^\d+_[a-z0-9_-]+\.sql$/.test(name)).sort();
const client = new pg.Client({ connectionString: url, connectionTimeoutMillis: 10000 });
await client.connect();
try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(8237460021)");
  if (!dryRun) {
    await client.query("CREATE TABLE IF NOT EXISTS schema_migrations (filename text PRIMARY KEY, sha256 char(64) NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())");
  }
  const exists = await client.query("SELECT to_regclass('public.schema_migrations') AS relation");
  const applied = exists.rows[0].relation
    ? (await client.query("SELECT filename, sha256 FROM schema_migrations")).rows
    : [];
  const checksums = new Map(applied.map((item) => [item.filename, item.sha256]));
  for (const name of filenames) {
    const content = await readFile(resolve(root, name), "utf8");
    const digest = createHash("sha256").update(content).digest("hex");
    if (checksums.has(name)) {
      if (checksums.get(name) !== digest) throw new Error("Migration was changed after applying: " + name);
      console.log("Already applied:", name);
      continue;
    }
    console.log(dryRun ? "Would apply:" : "Applying:", name);
    if (!dryRun) {
      await client.query(content);
      await client.query("INSERT INTO schema_migrations(filename, sha256) VALUES ($1, $2)", [name, digest]);
    }
  }
  await client.query(dryRun ? "ROLLBACK" : "COMMIT");
} catch (err) {
  await client.query("ROLLBACK").catch(() => {});
  throw err;
} finally {
  await client.end();
}
