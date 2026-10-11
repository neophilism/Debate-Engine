import pg from "pg";
import {resolve} from "node:path";
import {pathToFileURL} from "node:url";

const {Pool} = pg;
const leaseSeconds = 300;
const batchSize = Math.max(1, Math.min(100, Number(process.env.DEADLINE_BATCH_SIZE || 25)));

function database() {
  const url = process.env.DATABASE_URL;
  if (!url?.startsWith("postgres")) throw new Error("DATABASE_URL must be a PostgreSQL connection string.");
  return new Pool({connectionString: url, max: 2, idleTimeoutMillis: 20_000, connectionTimeoutMillis: 10_000});
}

async function claimJob(db) {
  const result = await db.query(`
    WITH candidate AS (
      SELECT id FROM durable_jobs
      WHERE job_type = 'obligation_deadline'
        AND available_at <= now()
        AND (state IN ('queued','failed') OR (state = 'running' AND leased_until < now()))
      ORDER BY available_at,id
      FOR UPDATE SKIP LOCKED
      LIMIT 1
    )
    UPDATE durable_jobs AS job
    SET state = 'running', attempt_count = attempt_count + 1,
        leased_until = now() + ($1 * interval '1 second'), last_error = NULL
    FROM candidate WHERE job.id = candidate.id
    RETURNING job.id,job.arguments`, [leaseSeconds]);
  return result.rows[0] || null;
}

async function processOne(pool) {
  const db = await pool.connect();
  let job = null;
  try {
    await db.query("BEGIN");
    job = await claimJob(db);
    if (!job) { await db.query("COMMIT"); return false; }
    const obligationId = job.arguments?.obligationId;
    if (typeof obligationId !== "string") throw new Error("Deadline job is missing obligationId.");

    const obligation = await db.query(`
      SELECT ro.id,ro.debate_id,ro.branch_id,ro.obligated_candidacy_id,ro.obligation_type,
        ro.received_at,ro.due_at + COALESCE((
          SELECT sum(oa.seconds) FROM obligation_outage_adjustments oa WHERE oa.obligation_id=ro.id
        ),0) * interval '1 second' AS effective_due_at,
        now() AS checked_at
      FROM reply_obligations ro
      WHERE ro.id = $1
      FOR UPDATE OF ro`, [obligationId]);
    if (!obligation.rows.length) throw new Error("Deadline obligation no longer exists.");
    const current = obligation.rows[0];
    if (!current.effective_due_at) throw new Error("Deadline obligation has no effective due time.");

    if (!current.received_at && current.effective_due_at > current.checked_at) {
      await db.query("UPDATE durable_jobs SET state='queued',available_at=$2,leased_until=NULL WHERE id=$1",
        [job.id,current.effective_due_at]);
    } else {
      if (!current.received_at) {
        await db.query(`
          INSERT INTO publication_events(debate_id,branch_id,kind,object_id,payload)
          SELECT $1,$2,'obligation_overdue',$3,$4::jsonb
          WHERE NOT EXISTS (
            SELECT 1 FROM publication_events WHERE kind='obligation_overdue' AND object_id=$3
          )`, [current.debate_id,current.branch_id,current.id,JSON.stringify({
            obligationType: current.obligation_type,
            obligatedCandidacyId: current.obligated_candidacy_id,
            effectiveDueAt: current.effective_due_at,
          })]);
      }
      await db.query("UPDATE durable_jobs SET state='completed',finished_at=now(),leased_until=NULL WHERE id=$1",[job.id]);
    }
    await db.query("COMMIT");
    return true;
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    if (job) await pool.query(
      "UPDATE durable_jobs SET state='failed',leased_until=NULL,last_error=$2 WHERE id=$1",
      [job.id,error instanceof Error ? error.message.slice(0,500) : "Unknown deadline worker error"],
    );
    throw error;
  } finally { db.release(); }
}

export async function runBatch(pool = database()) {
  let processed = 0;
  try {
    while (processed < batchSize && await processOne(pool)) processed += 1;
    return processed;
  } finally { await pool.end(); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  runBatch().then(count => console.log(`Processed ${count} deadline job(s).`)).catch(error => {
    console.error(error instanceof Error ? error.message : "Deadline worker failed.");
    process.exitCode = 1;
  });
}
