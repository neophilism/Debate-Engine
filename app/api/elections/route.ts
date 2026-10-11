import { NextResponse } from "next/server";
import { database } from "../../../lib/server/db";
import { jsonError } from "../../../lib/server/http";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET() {
 try{const result=await database().query("SELECT e.id, o.title AS office_title,o.slug,o.jurisdiction,e.label, e.election_date::text AS event_date FROM election_cycles e JOIN offices o ON o.id=e.office_id ORDER BY e.election_date DESC,o.title LIMIT 100");
 return NextResponse.json({elections:result.rows},{headers:{"Cache-Control":"public, max-age=60"}});}
 catch(e){return jsonError(e);}
}
