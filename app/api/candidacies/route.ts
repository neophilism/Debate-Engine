import { NextRequest,NextResponse } from "next/server";
import { requireIdentity,requireSameOrigin,parseJson,record,field,uuid,jsonError,HttpError } from "../../../lib/server/http";
import { transaction } from "../../../lib/server/db";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(request:NextRequest) {
 try{
   requireSameOrigin(request);
   const user=await requireIdentity(true);
   const body=record(await parseJson(request));
   const electionId=uuid(body.electionId,"electionId");
   const publicName=field(body.publicName,"publicName",160);
   const affiliation=body.affiliation?field(body.affiliation,"affiliation",160):null;
   const result=await transaction(async(db)=>{
     const c=await db.query<{id:string}>("INSERT INTO accounts(identity_provider,external_subject,display_name) VALUES('neon-auth',$1,$2) ON CONFLICT(identity_provider,external_subject) DO UPDATE SET display_name=EXCLUDED.display_name RETURNING id",[user.id,user.name]);
     const a=c.rows[0].id;
     const e=await db.query("SELECT id FROM election_cycles WHERE id=$1",[electionId]);if(!e.rowCount)throw new HttpError(404,"Election not found.");
     const existing=await db.query("SELECT id FROM candidacies WHERE account_id=$1 AND election_id=$2",[a,electionId]);if(existing.rowCount)throw new HttpError(409,"You have already registered for this election.");
     const response=await db.query<{id:string}>("INSERT INTO candidacies(account_id,election_id,public_name,affiliation,verification_status) VALUES($1,$2,$3,$4,'pending') RETURNING id",[a,electionId,publicName,affiliation]);
     await db.query("INSERT INTO audit_events(actor_account_id,action,target_kind,target_id) VALUES($1,'candidacy_requested','candidacy',$2)",[a,response.rows[0].id]);
     await db.query("INSERT INTO candidacy_verification_events(candidacy_id,actor_account_id,event_type,public_reason) VALUES($1,$2,'submitted','Candidate requested identity and candidacy verification.')",[response.rows[0].id,a]);
     return response.rows[0];
   });
   return NextResponse.json({candidacyId:result.id,status:"pending"},{status:201});
 }catch(e){return jsonError(e);}
}
