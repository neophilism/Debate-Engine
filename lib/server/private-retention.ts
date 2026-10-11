import "server-only";
import {transaction,database} from "./db";
import {HttpError} from "./http";
import {loadPrivateDraft} from "./private-drafts";

/**
 * Withdraws improvement participation at any time without erasing the author's
 * real published contribution or mutating its immutable archive.
 */
export async function withdrawAssistantImprovement(draftId:string,subject:string){
 return transaction(async db=>{
  const draft=await loadPrivateDraft(draftId,subject,true,db);
  if(draft.privacy_erased_at)return {consentWithdrawn:true,alreadyErased:true};
  await db.query("UPDATE private_submission_drafts SET improvement_consent=false,updated_at=now() WHERE id=$1",[draftId]);
  return {consentWithdrawn:true,alreadyErased:false};
 });
}

/** Erases private reports, source transcript and unpublished drafts at owner's request. */
export async function erasePrivateAssistantData(draftId:string,subject:string){
 return transaction(async db=>{
  const draft=await loadPrivateDraft(draftId,subject,true,db);
  if(draft.privacy_erased_at)return {erased:true,alreadyErased:true,publishedOriginalPreserved:draft.status==="published"};
  if(draft.status==="confirming")throw new HttpError(409,"Publication is being confirmed. Retry erasure after confirmation resolves.");
  if(draft.status!=="published"){
   // Unpublished work has no immutable public reference. Cascade removes its
   // private assessment history and feedback.
   const refs=await db.query("SELECT 1 FROM submissions WHERE origin_draft_id=$1",[draftId]);
   if(refs.rowCount)throw new HttpError(409,"This draft has a public reference; deletion is not permitted.");
   await db.query("DELETE FROM private_submission_drafts WHERE id=$1",[draftId]);
   return {erased:true,alreadyErased:false,publishedOriginalPreserved:false};
  }
  // For published contributions preserve only the non-reversible integrity
  // digest and the FK needed by the immutable public provenance record.
  await db.query("DELETE FROM private_debate_assessments WHERE draft_id=$1",[draftId]);
  await db.query("UPDATE private_submission_drafts SET payload=jsonb_build_object('privacyErased',true),transcript_text=NULL,provider_consent=false,improvement_consent=false,privacy_erased_at=now(),updated_at=now() WHERE id=$1",[draftId]);
  return {erased:true,alreadyErased:false,publishedOriginalPreserved:true};
 });
}

/**
 * Aggregated opt-in evaluation, deliberately without raw speech, excerpts,
 * account identifiers, small-cell breakdowns, or individual model scores.
 */
export async function consentedImprovementSummary(){
 const q=await database().query<{category:string;choice:string;participants:number;responses:number}>(
  `WITH opted AS (
     SELECT COALESCE(elem->>'category','uncategorized') AS category,
            f.choice, f.owner_account_id
     FROM private_assessment_feedback f
     JOIN private_debate_assessments a ON a.id=f.assessment_id
     JOIN private_submission_drafts d ON d.id=a.draft_id
     JOIN LATERAL jsonb_array_elements(
       CASE WHEN jsonb_typeof(a.findings->'findings')='array'
            THEN a.findings->'findings' ELSE '[]'::jsonb END
     ) elem ON elem->>'id'=f.finding_id
     WHERE f.improvement_opt_in=true AND d.improvement_consent=true
       AND d.privacy_erased_at IS NULL
   )
   SELECT category,choice,count(DISTINCT owner_account_id)::integer AS participants,
          count(*)::integer AS responses
   FROM opted GROUP BY category,choice
   HAVING count(DISTINCT owner_account_id)>=5
   ORDER BY category,choice LIMIT 100`);
 return {aggregateOnly:true,minParticipants:5,rows:q.rows,
  notice:"Opted-in categorical feedback, not raw speech or a public scoring system. Absence of an aggregate does not imply a zero count."};
}
