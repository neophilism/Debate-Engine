import {NextRequest,NextResponse} from "next/server";
import {requireIdentity,requireSameOrigin,parseJson,record,field,uuid,HttpError,jsonError} from "../../../../../lib/server/http";
import {transaction} from "../../../../../lib/server/db";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  requireSameOrigin(request);const user=await requireIdentity(true),candidateId=uuid((await params).id,"candidate id");
  const body=record(await parseJson(request));
  const statement=field(body.statement,"appeal statement",4000);
  if(statement.length<25)throw new HttpError(400,"Explain the basis for your appeal in at least 25 characters.");
  const result=await transaction(async db=>{
   const owner=await db.query<{account_id:string}>(
    "SELECT c.account_id FROM candidacies c JOIN accounts a ON a.id=c.account_id WHERE c.id=$1 AND c.verification_status='rejected' AND a.identity_provider='neon-auth' AND a.external_subject=$2 FOR UPDATE OF c",[candidateId,user.id]);
   if(!owner.rowCount)throw new HttpError(409,"Only the candidate may appeal a currently rejected candidacy.");
   await db.query("UPDATE candidacies SET verification_status='appealed' WHERE id=$1",[candidateId]);
   const rec=await db.query<{id:string}>(
    "INSERT INTO candidacy_verification_events(candidacy_id,actor_account_id,event_type,public_reason,private_explanation) VALUES($1,$2,'appealed','Candidate requested independent reconsideration.',$3) RETURNING id",
    [candidateId,owner.rows[0].account_id,statement]);
   await db.query("INSERT INTO audit_events(actor_account_id,action,target_kind,target_id) VALUES($1,'candidate_verification_appeal','candidacy',$2)",[owner.rows[0].account_id,candidateId]);
   return rec.rows[0];
  });
  return NextResponse.json({eventId:result.id,status:"appealed"},{status:201});
 }catch(e){return jsonError(e);}
}
