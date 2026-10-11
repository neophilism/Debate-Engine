import "server-only";
import {transaction,database} from "./db";
import {HttpError,record,uuid,field} from "./http";
import {loadPrivateDraft} from "./private-drafts";
import {runPrivateAssessment} from "./private-assessment-service";
import {publishOpening} from "./publish-debate";
import {publishContinuation} from "./continue-debate";
import {readQuestionItem,readAnswerItem} from "./contribution-source";
import {parseModalities} from "../../packages/domain/modalities";

export async function confirmPrivatePublication(draftId:string,authSubject:string,expectedSha256:string){
 const saved=await transaction(async db=>{
  const d=await loadPrivateDraft(draftId,authSubject,true,db);
  if(d.content_sha256!==expectedSha256)throw new HttpError(409,"The speech changed. Review and confirm its current version.");
  if(d.status==="published"&&d.published_submission_id)
   return {draft:d,alreadyPublished:true};
  if(d.status==="confirming"){
   const existing=await db.query("SELECT id,debate_id FROM submissions WHERE origin_draft_id=$1",[draftId]);
   if(existing.rowCount){
    await db.query("UPDATE private_submission_drafts SET status='published',published_submission_id=$2,published_debate_id=$3,updated_at=now() WHERE id=$1",
     [draftId,existing.rows[0].id,existing.rows[0].debate_id]);
    return {draft:{...d,status:"published",published_submission_id:existing.rows[0].id,published_debate_id:existing.rows[0].debate_id},alreadyPublished:true};
   }
   throw new HttpError(409,"An earlier confirmation is still processing. Retry once its result is known.");
  }
  if(d.status!=="reviewed")throw new HttpError(409,"Run the preliminary review or explicitly choose to skip it before confirmation.");
  if(!d.skipped_preliminary){
   const r=await db.query("SELECT 1 FROM private_debate_assessments WHERE draft_id=$1 AND stage='preliminary' AND content_sha256=$2 LIMIT 1",[draftId,d.content_sha256]);
   if(!r.rowCount)throw new HttpError(409,"The current speech has no matching preliminary assessment.");
  }
  if(d.payload.archiveConsent!==true||d.payload.sequenceConsent!==true)
   throw new HttpError(400,"Explicit archival and qualifying-sequence permissions are required.");
  await db.query("UPDATE private_submission_drafts SET status='confirming',updated_at=now() WHERE id=$1",[draftId]);
  return {draft:d,alreadyPublished:false};
 });
 const d=saved.draft;
 if(saved.alreadyPublished)
  return {debateId:d.published_debate_id,submissionId:d.published_submission_id,alreadyPublished:true,finalAssessment:"previously_requested"};
 const payload=d.payload,modality=d.modality;
 const source={modality,mediaAssetId:modality==="writing"?null:uuid(payload.mediaAssetId,"mediaAssetId"),
  writtenContent:modality==="writing"?field(payload.writtenContent,"writtenContent",100000):null};
 let publication;
 try{
  if(!Array.isArray(payload.questions))throw new HttpError(400,"Questions are required.");
  const questions=payload.questions.map(x=>readQuestionItem(record(x),modality));
  if(d.kind==="opening"){
   publication=await publishOpening({
    draftId:d.id,candidateId:d.candidacy_id,authSubject,title:field(payload.title,"title",180),
    proposition:field(payload.proposition,"proposition",20000),source,
    allowedModalities:parseModalities(payload.allowedModalities),questions,
    maxResponseSeconds:Number(payload.maxResponseSeconds),
    replyWindowHours:payload.replyWindowHours==null?null:Number(payload.replyWindowHours)
   });
  }else{
   if(!Array.isArray(payload.answers))throw new HttpError(400,"Answer references are required.");
   const answers=payload.answers.map(x=>{const v=readAnswerItem(record(x),modality);return {...v,questionId:uuid(v.questionId,"questionId")};});
   publication=await publishContinuation({
    draftId:d.id,candidateId:d.candidacy_id,authSubject,debateId:uuid(d.debate_id,"debateId"),
    parentSubmissionId:uuid(d.parent_submission_id,"parentSubmissionId"),source,questions,answers
   });
  }
  await database().query(
   "UPDATE private_submission_drafts SET status='published',published_debate_id=$2,published_submission_id=$3,updated_at=now() WHERE id=$1",
   [draftId,("debateId" in publication ? publication.debateId : d.debate_id),publication.submissionId]);
 }catch(error){
  const existing=await database().query<{id:string;debate_id:string}>("SELECT id,debate_id FROM submissions WHERE origin_draft_id=$1",[draftId]);
  if(existing.rowCount){
   await database().query("UPDATE private_submission_drafts SET status='published',published_debate_id=$2,published_submission_id=$3,updated_at=now() WHERE id=$1",
     [draftId,existing.rows[0].debate_id,existing.rows[0].id]);
   return {debateId:existing.rows[0].debate_id,submissionId:existing.rows[0].id,alreadyPublished:true,finalAssessment:"recoverable"};
  }
  await database().query("UPDATE private_submission_drafts SET status='reviewed',updated_at=now() WHERE id=$1 AND status='confirming'",[draftId]);
  throw error;
 }
 let finalAssessment="not_requested";
 if(d.provider_consent){
  try{await runPrivateAssessment({draftId,authSubject,stage:"final"});finalAssessment="available_privately";}
  catch{finalAssessment="unavailable_retry_from_workspace";}
 }
 return {debateId:("debateId" in publication ? publication.debateId : d.debate_id),submissionId:publication.submissionId,alreadyPublished:false,finalAssessment};
}
