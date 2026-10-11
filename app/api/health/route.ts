import { NextResponse } from "next/server";
export const dynamic = "force-dynamic";
export function GET() { return NextResponse.json({ status: "ok", service: "public-debate-engine", version: "foundation" }, { headers: { "Cache-Control": "no-store" } }); }
