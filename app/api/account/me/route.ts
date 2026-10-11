import { NextResponse } from "next/server";
import { requireIdentity,jsonError } from "../../../../lib/server/http";
import { database } from "../../../../lib/server/db";
export const runtime="nodejs"; export const dynamic="force-dynamic";
export async function GET() {
 try {
   const user=await requireIdentity();
   const q=await database().query(
     "SELECT c.id,c.public_name,c.affiliation,c.verification_status,c.election_id,o.title AS office_title,e.label FROM candidacies c JOIN accounts a ON a.id=c.account_id JOIN election_cycles e ON e.id=c.election_id JOIN offices o ON o.id=e.office_id WHERE a.identity_provider='neon-auth' AND a.external_subject=$1 ORDER BY e.election_date DESC",[user.id]);
   return NextResponse.json({user:{id:user.id,name:user.name,emailVerified:user.emailVerified},candidacies:q.rows},{headers:{"Cache-Control":"private, no-store"}});
 }catch(e){return jsonError(e);}
}
