import { NextRequest, NextResponse } from "next/server";
import { getAuthServer } from "../../../../lib/auth/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";
type Verb = "GET"|"POST"|"PUT"|"PATCH"|"DELETE";
function handler(verb:Verb) {
  return async function authRoute(request:NextRequest, context:{params:Promise<{path:string[]}>}) {
    const auth=getAuthServer();
    if (!auth) return NextResponse.json({error:"Authentication service not configured."},{status:503});
    return auth.handler()[verb](request,context);
  };
}
export const GET=handler("GET");
export const POST=handler("POST");
export const PUT=handler("PUT");
export const PATCH=handler("PATCH");
export const DELETE=handler("DELETE");
