import { neon } from "@neondatabase/serverless";

export function hasDatabaseConfiguration(): boolean {
  return Boolean(process.env.DATABASE_URL && /^postgres(ql)?:\/\//.test(process.env.DATABASE_URL));
}

/**
 * Only server code may call this. No dummy data or unconfigured fallback.
 * Use parameterized tagged queries and enforce user authorization separately.
 */
export function getDatabase() {
  if (!hasDatabaseConfiguration()) {
    throw new Error("DATABASE_URL is not configured.");
  }
  return neon(process.env.DATABASE_URL!);
}
