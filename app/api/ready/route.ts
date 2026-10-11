import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export function GET() {
  return NextResponse.json({ status: "not_ready", reason: "Database-backed publication and authorization are not configured." }, { status: 503, headers: { "Cache-Control": "no-store" } });
}
