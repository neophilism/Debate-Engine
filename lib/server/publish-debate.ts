import "server-only";
import {transaction} from "./db";
import {HttpError} from "./http";
import {validateRules} from "../../packages/domain/debate";
import {parseModalities,type DebateModality} from "../../packages/domain/modalities";
import {verifiedCandidateSource,validateReference,type ContributionSource,type AnchoredQuestion} from "./contribution-source";
export type OpeningInput={
 candidateId:string;authSubject:string;title:string;proposition:string;
 source:ContributionSource;allowedModalities:DebateModality[];
 maxResponseSeconds:number;replyWindowHours:number|null;questions:AnchoredQuestion[];
};
export async function publishOpening(input:OpeningInput){
 const allowed=parseModalities(input.allowedModalities);
 if(!allowed.includes(input.source.modality))throw new HttpError(400,"Opening medium is not permitted.");
 const errors=validateRules({maxResponseSeconds:input.maxResponseSeconds,replyWindowHours:input.replyWindowHours,openingQuestionLimit:input.questions.length});
 if(errors.length)throw new HttpError(400,errors[0]);
 if(input.maxResponseSeconds>7200)throw new HttpError(400,"Maximum response length exceeds two hours.");
 if(input.replyWindowHours!==null&&input.replyWindowHours>720)throw new HttpError(400,"Reply window exceeds 30 days.");
 if(new Set(input.questions.map(x=>x.text.toLowerCase())).size!==input.questions.length)
  throw new HttpError(400,"Opening questions must be distinct.");
 return transaction(async db=>{
  const candidate=await verifiedCandidateSource(db,{candidateId:input.candidateId,authSubject:input.authSubject,source:input.source});
  const maxPosition=input.source.modality==="writing"?input.source.writtenContent!.length:candidate.duration!;
  const positions=input.questions.map(x=>validateReference(input.source.modality,x,maxPosition));
  const debate=await db.query<{id:string}>(
   "INSERT INTO debates(election_id,originator_candidacy_id,title,proposition,max_response_seconds,reply_window_hours,allowed_modalities) VALUES($1,$2,$3,$4,$5,$6,$7::text[]) RETURNING id",
   [candidate.election_id,input.candidateId,input.title,input.proposition,input.maxResponseSeconds,input.replyWindowHours,allowed]);
  const debateId=debate.rows[0].id;
  const submission=await db.query<{id:string}>(
   "INSERT INTO submissions(debate_id,candidacy_id,media_asset_id,modality,written_content,kind) VALUES($1,$2,$3,$4,$5,'opening') RETURNING id",
   [debateId,input.candidateId,input.source.mediaAssetId,input.source.modality,input.source.writtenContent]);
  const sid=submission.rows[0].id;
  for(let i=0;i<input.questions.length;i++){
   const q=input.questions[i],p=positions[i];
   await db.query("INSERT INTO questions(submission_id,asked_by_candidacy_id,ordinal,question_text,video_timestamp_seconds,written_anchor) VALUES($1,$2,$3,$4,$5,$6)",
    [sid,input.candidateId,i+1,q.text,p.timestamp,p.anchor]);
  }
  if(input.source.mediaAssetId)await db.query(
   "INSERT INTO media_permissions(candidate_id,media_asset_id,permission) VALUES($1,$2,'archive'),($1,$2,'sequence')",[input.candidateId,input.source.mediaAssetId]);
  await db.query("UPDATE submissions SET published_at=now() WHERE id=$1",[sid]);
  await db.query("UPDATE debates SET status='published',published_at=now() WHERE id=$1",[debateId]);
  await db.query("INSERT INTO publication_events(debate_id,actor_candidacy_id,kind,object_id,payload) VALUES($1,$2,'debate_opened',$3,$4::jsonb)",
   [debateId,input.candidateId,sid,JSON.stringify({modality:input.source.modality,allowedModalities:allowed})]);
  await db.query("INSERT INTO audit_events(actor_account_id,action,target_kind,target_id) VALUES($1,'debate_published','debate',$2)",[candidate.account_id,debateId]);
  return {debateId,submissionId:sid};
 });
}
