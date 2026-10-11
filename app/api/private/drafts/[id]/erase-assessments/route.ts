import {NextRequest,NextResponse} from "next/server";
import {requireIdentity,requireSameOrigin,jsonError,uuid,HttpError} from "../../../../../../lib/server/http";
import {transaction} from "../../../../../../lib/server/db";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function DELETE(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{
  requireSameOrigin(request);const actor=await requireIdentity(true),id=uuid((await params).id,"draft id");
  const result=await transaction(async db=>{
   const owner=await db.query<{id:string;owner_account_id:string;status:string}>(
    "SELECT p.id,p.owner_account_id,p.status FROM private_submission_drafts p JOIN accounts a ON a.id=p.owner_account_id WHERE p.id=$1 AND a.identity_provider='neon-auth' AND a.external_subject=$2 AND a.status='active' FOR UPDATE OF p",
    [id,actor.id]);
   if(!owner.rowCount)throw new HttpError(404,"Private draft not found.");
   const feedback=await db.query("DELETE FROM private_assessment_feedback WHERE assessment_id IN(SELECT id FROM private_debate_assessments WHERE draft_id=$1)",[id]);
   const reports=await db.query("DELETE FROM private_debate_assessments WHERE draft_id=$1",[id]);
   await db.query("UPDATE private_submission_drafts SET provider_consent=false,improvement_consent=false,transcript_text=NULL,status=CASE WHEN status='reviewed' THEN 'draft' ELSE status END,skipped_preliminary=false,updated_at=now() WHERE id=$1",[id]);
   await db.query("INSERT INTO audit_events(actor_account_id,action,target_kind,target_id,context) VALUES($1,'private_assessment_erased','private_submission_draft',$2,$3::jsonb)",[owner.rows[0].owner_account_id,id,JSON.stringify({reportCount:reports.rowCount,feedbackCount:feedback.rowCount})]);
   return {reportCount:reports.rowCount,feedbackCount:feedback.rowCount,publishedSourcePreserved:owner.rows[0].status==="published"};
  });
  return NextResponse.json({...result,privateReportsErased:true},{headers:{"Cache-Control":"private,no-store"}});
 }catch(e){return jsonError(e);}
}
