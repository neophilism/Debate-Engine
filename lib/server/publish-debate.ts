import "server-only";
import { transaction } from "./db";
import { HttpError } from "./http";
import { validateRules } from "../../packages/domain/debate";

export type OpeningInput={
 candidateId:string;authSubject:string;title:string;proposition:string;mediaAssetId:string;
 maxResponseSeconds:number;replyWindowHours:number|null;questions:Array<{text:string;timestamp:number}>;
};
export async function publishOpening(input:OpeningInput){
 const errors=validateRules({maxResponseSeconds:input.maxResponseSeconds,replyWindowHours:input.replyWindowHours,openingQuestionLimit:input.questions.length});
 if(errors.length)throw new HttpError(400,errors[0]);
 if(input.maxResponseSeconds>7200)throw new HttpError(400,"Response duration limit exceeds two hours.");
 if(input.replyWindowHours!==null&&input.replyWindowHours>720)throw new HttpError(400,"Reply window exceeds 30 days.");
 if(input.questions.some(q=>!q.text.trim()||q.text.length>600||!Number.isFinite(q.timestamp)||q.timestamp<0))
  throw new HttpError(400,"Questions must contain concise text and valid video timestamps.");
 if(new Set(input.questions.map(q=>q.text.trim().toLowerCase())).size!==input.questions.length)
  throw new HttpError(400,"Opening questions must not duplicate each other.");
 return transaction(async(db)=>{
  const row=await db.query<{election_id:string;duration_seconds:string;account_id:string}>(
   "SELECT c.election_id,m.duration_seconds,c.account_id FROM candidacies c JOIN accounts a ON a.id=c.account_id JOIN media_assets m ON m.owner_candidacy_id=c.id AND m.id=$2 WHERE c.id=$1 AND a.identity_provider='neon-auth' AND a.external_subject=$3 AND c.verification_status='verified' AND m.processing_status='ready' FOR UPDATE OF c,m",
   [input.candidateId,input.mediaAssetId,input.authSubject]);
  if(!row.rowCount)throw new HttpError(403,"A verified candidate and validated owned video are required.");
  const profile=row.rows[0];
  if(input.questions.some(q=>q.timestamp>Number(profile.duration_seconds)))throw new HttpError(400,"A question timestamp exceeds the video duration.");
  const prior=await db.query("SELECT 1 FROM submissions WHERE media_asset_id=$1",[input.mediaAssetId]);if(prior.rowCount)throw new HttpError(409,"Source video is already assigned to a contribution.");
  const debate=await db.query<{id:string}>("INSERT INTO debates(election_id,originator_candidacy_id,title,proposition,max_response_seconds,reply_window_hours) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",
   [profile.election_id,input.candidateId,input.title,input.proposition,input.maxResponseSeconds,input.replyWindowHours]);
  const debateId=debate.rows[0].id;
  const submission=await db.query<{id:string}>("INSERT INTO submissions(debate_id,candidacy_id,media_asset_id,kind) VALUES($1,$2,$3,'opening') RETURNING id",
   [debateId,input.candidateId,input.mediaAssetId]);
  const submissionId=submission.rows[0].id;
  for(let i=0;i<input.questions.length;i++){const q=input.questions[i];await db.query("INSERT INTO questions(submission_id,asked_by_candidacy_id,ordinal,question_text,video_timestamp_seconds) VALUES($1,$2,$3,$4,$5)",[submissionId,input.candidateId,i+1,q.text.trim(),q.timestamp]);}
  await db.query("INSERT INTO media_permissions(candidate_id,media_asset_id,permission) VALUES($1,$2,'archive'),($1,$2,'sequence')",[input.candidateId,input.mediaAssetId]);
  await db.query("UPDATE submissions SET published_at=now() WHERE id=$1",[submissionId]);
  await db.query("UPDATE debates SET status='published',published_at=now() WHERE id=$1",[debateId]);
  await db.query("INSERT INTO publication_events(debate_id,actor_candidacy_id,kind,object_id,payload) VALUES($1,$2,'debate_opened',$3,'{}'::jsonb)",[debateId,input.candidateId,submissionId]);
  await db.query("INSERT INTO audit_events(actor_account_id,action,target_kind,target_id) VALUES($1,'debate_published','debate',$2)",[profile.account_id,debateId]);
  return {debateId,submissionId};
 });
}
