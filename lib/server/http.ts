import "server-only";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser, isPlatformAdmin } from "../auth/server";
import { database } from "./db";
import {isTrustedMutationOrigin} from "../../packages/domain/request-origin";

export class HttpError extends Error {
  constructor(public readonly status: number, message: string) { super(message); }
}
export function jsonError(error: unknown) {
  if (error instanceof HttpError) return NextResponse.json({ error: error.message }, {status: error.status});
  if (error instanceof Error && error.message === "DATABASE_UNAVAILABLE")
    return NextResponse.json({error:"Database is not configured."}, {status:503});
  console.error("Debate Engine request failed", error instanceof Error ? error.name : "unknown");
  return NextResponse.json({error:"Request could not be completed."}, {status:500});
}
/** Cookie-authenticated requests require same-origin browser provenance. */
export function requireSameOrigin(request: NextRequest) {
  if(!isTrustedMutationOrigin({
    origin:request.headers.get("origin"),
    host:request.headers.get("host"),
    forwardedHost:request.headers.get("x-forwarded-host"),
    forwardedProto:request.headers.get("x-forwarded-proto"),
    canonicalOrigin:process.env.PUBLIC_APP_ORIGIN,
    environment:process.env.NODE_ENV
  }))throw new HttpError(403,"A genuine same-origin browser request is required.");
}
export async function parseJson(request: NextRequest): Promise<unknown> {
  if (!request.headers.get("content-type")?.toLowerCase().startsWith("application/json"))
    throw new HttpError(415, "Expected application/json.");
  const body = await request.text();
  if (body.length > 40000) throw new HttpError(413, "Request is too large.");
  try { return JSON.parse(body); } catch { throw new HttpError(400, "Invalid JSON body."); }
}
export function record(value: unknown): Record<string, unknown> {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new HttpError(400,"Expected an object.");
  return value as Record<string, unknown>;
}
export function field(value: unknown, label: string, max = 240) {
  if (typeof value !== "string" || !value.trim() || value.length > max)
    throw new HttpError(400, label + " must be nonempty and at most " + max + " characters.");
  return value.trim();
}
export function uuid(value: unknown, label: string) {
  const str = field(value,label,36);
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(str))
    throw new HttpError(400, label + " must be a UUID.");
  return str;
}
export async function requireIdentity(verified = false) {
  const user = await getAuthenticatedUser();
  if (!user) throw new HttpError(401,"Sign in is required.");
  if (verified && !user.emailVerified) throw new HttpError(403,"Verify your email before continuing.");
  return user;
}
export async function requireAdmin() {
  const user = await requireIdentity(true);
  if (!isPlatformAdmin(user)) throw new HttpError(403,"Platform administrator access required.");
  return user;
}
/** The Neon auth subject is authoritative; an email address is never an admin key. */
export async function syncAccount(user: {id:string;name:string}) {
  const q=await database().query<{id:string}>(
    "INSERT INTO accounts(identity_provider, external_subject, display_name) VALUES('neon-auth',$1,$2) ON CONFLICT(identity_provider,external_subject) DO UPDATE SET display_name=EXCLUDED.display_name RETURNING id",
    [user.id,user.name||"Registered user"]);
  return q.rows[0].id;
}
