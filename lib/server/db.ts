import "server-only";
import { Pool, type PoolClient } from "pg";

let pool: Pool | null = null;
export function database() {
  const url = process.env.DATABASE_URL;
  if (!url?.startsWith("postgres")) throw new Error("DATABASE_UNAVAILABLE");
  pool ??= new Pool({ connectionString: url, max: 5, idleTimeoutMillis: 20000, connectionTimeoutMillis: 10000 });
  return pool;
}
export async function transaction<T>(fn: (db: PoolClient) => Promise<T>): Promise<T> {
  const db = await database().connect();
  try {
    await db.query("BEGIN");
    const result = await fn(db);
    await db.query("COMMIT");
    return result;
  } catch (error) {
    await db.query("ROLLBACK").catch(() => {});
    throw error;
  } finally { db.release(); }
}
