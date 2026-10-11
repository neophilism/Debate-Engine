import "server-only";
import {transaction} from "./db";
import {loadPrivateDraft} from "./private-drafts";
import {HttpError} from "./http";

/**
 * Candidate can turn both permissions off at any stage. Turning external
 * provider consent back on requires a fresh, explicit user action.
 * Never change the immutable public contribution.
 */
export async function setPrivateReviewConsent(input:{
 draftId:string;authSubject:string;providerConsent:boolean;improvementConsent:boolean
}){
 return transaction(async db=>{
  const draft=await loadPrivateDraft(input.draftId,input.authSubject,true,db);
  if(draft.privacy_erased_at)throw new HttpError(410,"Private data has already been erased.");
  if(draft.status==="confirming")throw new HttpError(409,"Cannot change permissions during confirmation. Retry after publication resolves.");
  await db.query(
   "UPDATE private_submission_drafts SET provider_consent=$2,improvement_consent=$3,updated_at=now() WHERE id=$1",
   [draft.id,input.providerConsent,input.improvementConsent]);
  await db.query("INSERT INTO audit_events(actor_account_id,action,target_kind,target_id,context) VALUES($1,'private_assistant_consent_changed','private_draft',$2,$3::jsonb)",
   [draft.owner_account_id,draft.id,JSON.stringify({providerAllowed:input.providerConsent,improvementAllowed:input.improvementConsent})]);
  return {draftId:draft.id,providerConsent:input.providerConsent,improvementConsent:input.improvementConsent};
 });
}
