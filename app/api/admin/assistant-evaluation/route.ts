import {NextResponse} from "next/server";
import {requireAdmin,jsonError} from "../../../../lib/server/http";
import {consentedImprovementSummary} from "../../../../lib/server/private-retention";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(){
 try{await requireAdmin();return NextResponse.json(await consentedImprovementSummary(),{
  headers:{"Cache-Control":"private,no-store","X-Content-Type-Options":"nosniff"}
 });}catch(e){return jsonError(e);}
}
