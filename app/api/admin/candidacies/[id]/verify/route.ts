import { NextRequest,NextResponse } from "next/server";
import { requireSameOrigin,requireAdmin,uuid,parseJson,record,jsonError,HttpError,syncAccount } from "../../../../../../lib/server/http";
import { transaction } from "../../../../../../lib/server/db";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{requireSameOrigin(request);const admin=await requireAdmin();
   const id=uuid((await params).id,"candidate id"),body=record(await parseJson(request));
   if(typeof body.approve!=="boolean")throw new HttpError(400,"approve must be a boolean.");
   const aid=await syncAccount(admin);
   const result=await transaction(async(db)=>{
     const q=await db.query<{id:string}>("UPDATE candidacies SET verification_status=$2,verified_at=CASE WHEN $3 THEN now() ELSE NULL END WHERE id=$1 AND verification_status IN ('unverified','pending','appealed') RETURNING id",[id,body.approve?"verified":"rejected",body.approve]);
     if(!q.rowCount)throw new HttpError(409,"Candidate has already been reviewed or does not exist.");
     await db.query("INSERT INTO audit_events(actor_account_id,action,target_kind,target_id,context) VALUES($1,$2,'candidacy',$3,$4::jsonb)",[aid,"candidate_verification_decision",id,JSON.stringify({approved:body.approve})]);
     return q.rows[0];
   });
   return NextResponse.json({id:result.id,status:body.approve?"verified":"rejected"});
 }catch(e){return jsonError(e);}
}
