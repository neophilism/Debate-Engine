import "server-only";
import {database,transaction} from "./db";
import {HttpError} from "./http";
import {loadPrivateDraft} from "./private-drafts";
import {assistantProvider,requestPrivateAnalysis} from "./assistant-model";
export async function privateReportHistory(draftId:string,authSubject:string){
 await loadPrivateDraft(draftId,authSubject);
 const r=await database().query(
  "SELECT id,stage,content_sha256,model_provider,model_name,findings,generated_at FROM private_debate_assessments WHERE draft_id=$1 ORDER BY generated_at DESC,id DESC LIMIT 30",[draftId]);
 return r.rows;
}
export async function runPrivateAssessment(input:{draftId:string;authSubject:string;stage:"preliminary"|"final"}){
 const draft=await loadPrivateDraft(input.draftId,input.authSubject);
 if(draft.privacy_erased_at)throw new HttpError(410,"Private assessment data has been erased.");
 if(!draft.provider_consent)throw new HttpError(403,"Explicit consent to send this speech to the model provider is required.");
 if(input.stage==="preliminary"&&!["draft","reviewed"].includes(draft.status))
  throw new HttpError(409,"This draft can no longer undergo preliminary review.");
 if(input.stage==="final"&&(draft.status!=="published"||!draft.published_submission_id))
  throw new HttpError(409,"Final review requires actual candidate-approved publication.");
 if(!assistantProvider())throw new HttpError(503,"The private Debate Assistant is not configured. You may publish without its suggestions.");
 const text=draft.modality==="writing"?draft.payload.writtenContent:draft.transcript_text;
 if(typeof text!=="string"||text.trim().length<20)
  throw new HttpError(422,"This audio/video draft needs an author-reviewed transcript before analysis. No findings have been invented.");
 if(text.length>48000)throw new HttpError(413,"Assistant input is too long.");
 let result;
 try{result=await requestPrivateAnalysis({stage:input.stage,text});}
 catch(e){
  if(e instanceof Error && e.message==="ASSISTANT_UNAVAILABLE")throw new HttpError(503,"Private Debate Assistant unavailable.");
  throw new HttpError(502,"Could not complete a verified model assessment; no report was saved.");
 }
 return transaction(async db=>{
  const fresh=await loadPrivateDraft(input.draftId,input.authSubject,true,db);
  if(fresh.privacy_erased_at||fresh.content_sha256!==draft.content_sha256||fresh.status!==draft.status)
   throw new HttpError(409,"Speech was edited while assessment was running. Review the current draft again.");
  const record=await db.query<{id:string}>(
   "INSERT INTO private_debate_assessments(draft_id,owner_account_id,stage,content_sha256,model_provider,model_name,findings) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb) RETURNING id",
   [draft.id,draft.owner_account_id,input.stage,draft.content_sha256,result.provider,result.model,JSON.stringify(result.report)]);
  if(input.stage==="preliminary")
   await db.query("UPDATE private_submission_drafts SET status='reviewed',skipped_preliminary=false,updated_at=now() WHERE id=$1",[draft.id]);
  return {assessmentId:record.rows[0].id,report:result.report,contentSha256:draft.content_sha256,stage:input.stage};
 });
}
export async function submitPrivateFeedback(input:{
 assessmentId:string;authSubject:string;findingId:string;choice:"accept"|"reject"|"uncertain";note:string|null;
}){
 if(input.note && input.note.length>2000)throw new HttpError(400,"Feedback note too long.");
 return transaction(async db=>{
  const r=await db.query<{owner_account_id:string;improvement_consent:boolean;findings:{findings?:Array<{id:string}>}}>(
   "SELECT p.owner_account_id,p.improvement_consent,a.findings FROM private_debate_assessments a JOIN private_submission_drafts p ON p.id=a.draft_id JOIN accounts actor ON actor.id=p.owner_account_id WHERE a.id=$1 AND actor.identity_provider='neon-auth' AND actor.external_subject=$2 FOR UPDATE OF p",
   [input.assessmentId,input.authSubject]);
  if(!r.rowCount)throw new HttpError(404,"Private report not found.");
  const validatedFinding=r.rows[0].findings?.findings?.some(f=>f.id===input.findingId);
  if(!validatedFinding)throw new HttpError(400,"Feedback must reference a finding in this private report.");
  const f=await db.query<{id:string}>(
   "INSERT INTO private_assessment_feedback(assessment_id,owner_account_id,finding_id,choice,note,improvement_opt_in) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",
   [input.assessmentId,r.rows[0].owner_account_id,input.findingId,input.choice,input.note,r.rows[0].improvement_consent]);
  return {feedbackId:f.rows[0].id,improvementOptIn:r.rows[0].improvement_consent};
 });
}
