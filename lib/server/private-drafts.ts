import "server-only";
import {database,transaction} from "./db";
import {HttpError} from "./http";
import {draftFingerprint} from "../../packages/domain/private-assessment";
import {readModality} from "./contribution-source";
import {parseModalities} from "../../packages/domain/modalities";
import type {PoolClient} from "pg";

export type DraftKind="opening"|"response";
export type PrivateDraft={
 id:string;kind:DraftKind;candidacy_id:string;owner_account_id:string;debate_id:string|null;
 parent_submission_id:string|null;modality:"video"|"audio"|"writing";payload:Record<string,unknown>;
 transcript_text:string|null;content_sha256:string;provider_consent:boolean;improvement_consent:boolean;
 skipped_preliminary:boolean;status:string;published_debate_id:string|null;published_submission_id:string|null;privacy_erased_at:Date|null;
};
export async function privateOwner(db:PoolClient,candidacyId:string,authSubject:string){
 const r=await db.query<{account_id:string;election_id:string}>(
  "SELECT c.account_id,c.election_id FROM candidacies c JOIN accounts a ON a.id=c.account_id WHERE c.id=$1 AND a.identity_provider='neon-auth' AND a.external_subject=$2 AND c.verification_status='verified' FOR UPDATE OF c",
  [candidacyId,authSubject]);
 if(!r.rowCount)throw new HttpError(403,"A verified candidate account is required.");
 return r.rows[0];
}
export async function createPrivateDraft(input:{
 kind:DraftKind;candidateId:string;authSubject:string;debateId:string|null;parentId:string|null;
 payload:Record<string,unknown>;transcript:string|null;providerConsent:boolean;improvementConsent:boolean
}){
 const mode=readModality(input.payload.modality);
 if(input.payload.candidacyId!==input.candidateId)throw new HttpError(400,"Draft author and candidacy do not match.");
 if(input.kind==="opening"){
  try{parseModalities(input.payload.allowedModalities);}catch{throw new HttpError(400,"Invalid proposed debate media options.");}
  if(input.debateId||input.parentId)throw new HttpError(400,"Opening drafts do not have a parent debate.");
 }else if(!input.debateId||!input.parentId)throw new HttpError(400,"Responses require a public debate and opponent contribution.");
 const content=mode==="writing"?input.payload.writtenContent:input.payload.mediaAssetId;
 if(typeof content!=="string"||!content.trim())throw new HttpError(400,"Draft requires a written speech or original media.");
 if(mode==="writing"&&content.length>100000)throw new HttpError(413,"Written speech exceeds 100,000 characters.");
 if(input.transcript!==null&&input.transcript.length>48000)throw new HttpError(413,"Transcript is too long.");
 const fingerprint=draftFingerprint(input.payload,input.transcript);
 return transaction(async db=>{
  const owner=await privateOwner(db,input.candidateId,input.authSubject);
  if(mode!=="writing"){
   const media=await db.query("SELECT 1 FROM media_assets WHERE id=$1 AND owner_candidacy_id=$2 AND processing_status='ready' AND mime_type LIKE $3",[content,input.candidateId,mode+"/%"]);
   if(!media.rowCount)throw new HttpError(403,"Original media must be validated and belong to the candidate.");
  }
  if(input.kind==="response"){
   const related=await db.query("SELECT 1 FROM submissions s JOIN debates d ON d.id=s.debate_id JOIN candidacies c ON c.id=$3 WHERE s.id=$1 AND s.debate_id=$2 AND s.published_at IS NOT NULL AND d.status='published' AND d.election_id=c.election_id AND c.verification_status='verified'",[input.parentId,input.debateId,input.candidateId]);
   if(!related.rowCount)throw new HttpError(403,"Draft opponent or election cannot be verified.");
  }
  const r=await db.query<{id:string}>(
   "INSERT INTO private_submission_drafts(candidacy_id,owner_account_id,kind,debate_id,parent_submission_id,modality,payload,transcript_text,content_sha256,provider_consent,improvement_consent) VALUES($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11) RETURNING id",
   [input.candidateId,owner.account_id,input.kind,input.debateId,input.parentId,mode,JSON.stringify(input.payload),input.transcript,fingerprint,input.providerConsent,input.improvementConsent]);
  return {draftId:r.rows[0].id,sha256:fingerprint,status:"draft"};
 });
}
export async function loadPrivateDraft(draftId:string,authSubject:string,lock=false,db?:PoolClient):Promise<PrivateDraft>{
 const conn=db||database();
 const q=await conn.query<PrivateDraft>(
  "SELECT p.* FROM private_submission_drafts p JOIN accounts a ON a.id=p.owner_account_id WHERE p.id=$1 AND a.identity_provider='neon-auth' AND a.external_subject=$2"+(lock?" FOR UPDATE OF p":""),
  [draftId,authSubject]);
 if(!q.rowCount)throw new HttpError(404,"Private draft does not exist or is not yours.");
 return q.rows[0];
}
export async function listPrivateDrafts(authSubject:string){
 const q=await database().query(
  "SELECT p.id,p.kind,p.modality,p.status,p.content_sha256,p.created_at,p.updated_at,p.published_submission_id FROM private_submission_drafts p JOIN accounts a ON a.id=p.owner_account_id WHERE a.identity_provider='neon-auth' AND a.external_subject=$1 ORDER BY p.updated_at DESC LIMIT 100",
  [authSubject]);
 return q.rows;
}
export async function updatePrivateDraft(draftId:string,authSubject:string,payload:Record<string,unknown>,transcript:string|null){
 if(transcript!==null&&transcript.length>48000)throw new HttpError(413,"Transcript exceeds 48,000 characters.");
 const mode=readModality(payload.modality);
 if(mode==="writing"&&typeof payload.writtenContent!=="string")throw new HttpError(400,"Written speech is required.");
 return transaction(async db=>{
  const existing=await loadPrivateDraft(draftId,authSubject,true,db);
  if(existing.privacy_erased_at)throw new HttpError(410,"Private draft content was erased.");
  if(existing.status==="published"||existing.status==="confirming")throw new HttpError(409,"Confirmed or published drafts cannot be changed.");
  if(payload.candidacyId!==existing.candidacy_id||mode!==existing.modality)
   throw new HttpError(409,"Cannot replace a draft's author or medium; create a new draft.");
  const original=mode==="writing"?payload.writtenContent:payload.mediaAssetId;
  if(typeof original!=="string"||!original.trim())throw new HttpError(400,"Updated draft has no original contribution.");
  if(mode!=="writing"&&original!==existing.payload.mediaAssetId)throw new HttpError(409,"Upload a new draft to replace the original media.");
  const fingerprint=draftFingerprint(payload,transcript);
  await db.query("UPDATE private_submission_drafts SET payload=$2::jsonb,transcript_text=$3,content_sha256=$4,status='draft',skipped_preliminary=false,updated_at=now() WHERE id=$1",
   [draftId,JSON.stringify(payload),transcript,fingerprint]);
  return {draftId,sha256:fingerprint,status:"draft"};
 });
}
export async function markAssistantSkipped(draftId:string,authSubject:string){
 return transaction(async db=>{
  const current=await loadPrivateDraft(draftId,authSubject,true,db);
  if(current.privacy_erased_at)throw new HttpError(410,"Draft was erased.");
  if(!["draft","reviewed"].includes(current.status))throw new HttpError(409,"Draft is no longer editable.");
  await db.query("UPDATE private_submission_drafts SET status='reviewed',skipped_preliminary=true,updated_at=now() WHERE id=$1",[draftId]);
  return {draftId,sha256:current.content_sha256,status:"reviewed",assessment:"skipped_by_candidate"};
 });
}
