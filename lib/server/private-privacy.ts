import "server-only";
import {database,transaction} from "./db";
import {HttpError} from "./http";
export async function privatePrivacySummary(authSubject:string){
 const account=await database().query<{id:string}>("SELECT id FROM accounts WHERE identity_provider='neon-auth' AND external_subject=$1 AND status='active'",[authSubject]);
 if(!account.rowCount)throw new HttpError(404,"Private account not found.");
 const id=account.rows[0].id;
 const summary=await database().query<{draft_count:number;opted_in_drafts:number;report_count:number}>(
 "SELECT (SELECT count(*)::int FROM private_submission_drafts WHERE owner_account_id=$1) AS draft_count,(SELECT count(*)::int FROM private_submission_drafts WHERE owner_account_id=$1 AND improvement_consent) AS opted_in_drafts,(SELECT count(*)::int FROM private_debate_assessments WHERE owner_account_id=$1) AS report_count",[id]);
 return {draftCount:summary.rows[0].draft_count,optedInDrafts:summary.rows[0].opted_in_drafts,privateAssessmentCount:summary.rows[0].report_count,improvementConsentDefault:false};
}
export async function revokeImprovementConsent(authSubject:string){
 return transaction(async db=>{
  const owner=await db.query<{id:string}>("SELECT id FROM accounts WHERE identity_provider='neon-auth' AND external_subject=$1 AND status='active' FOR UPDATE",[authSubject]);
  if(!owner.rowCount)throw new HttpError(404,"Private account not found.");
  const id=owner.rows[0].id;
  const drafts=await db.query("UPDATE private_submission_drafts SET improvement_consent=false,updated_at=now() WHERE owner_account_id=$1 AND improvement_consent=true",[id]);
  const feedback=await db.query("UPDATE private_assessment_feedback SET improvement_opt_in=false WHERE owner_account_id=$1 AND improvement_opt_in=true",[id]);
  const event=await db.query<{id:string}>("INSERT INTO private_assessment_privacy_events(owner_account_id,action,details) VALUES($1,'improvement_consent_revoked',$2::jsonb) RETURNING id",[id,JSON.stringify({draftsUpdated:drafts.rowCount,feedbackUpdated:feedback.rowCount})]);
  return {eventId:event.rows[0].id,improvementConsent:false,draftsUpdated:drafts.rowCount,feedbackUpdated:feedback.rowCount};
 });
}
