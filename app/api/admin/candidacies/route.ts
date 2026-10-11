import { NextResponse } from "next/server";
import { requireAdmin,jsonError } from "../../../../lib/server/http";
import { database } from "../../../../lib/server/db";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(){
 try{await requireAdmin();
 const q=await database().query("SELECT c.id,c.public_name,c.affiliation,c.verification_status,e.label,o.title AS office_title FROM candidacies c JOIN election_cycles e ON e.id=c.election_id JOIN offices o ON o.id=e.office_id WHERE c.verification_status IN('unverified','pending','appealed') ORDER BY c.created_at LIMIT 100");
 return NextResponse.json({candidacies:q.rows},{headers:{"Cache-Control":"private, no-store"}});}
 catch(e){return jsonError(e);}
}
