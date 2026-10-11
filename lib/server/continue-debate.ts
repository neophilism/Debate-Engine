import "server-only";
import {transaction} from "./db";
import {HttpError} from "./http";
import {recordPublishedContinuationObligations} from "./obligations";

type QuestionInput={text:string;timestamp:number};
type AnswerInput={questionId:string;timestamp:number;explanation?:string};
export type ContinuationInput={debateId:string;candidateId:string;authSubject:string;parentSubmissionId:string;
  mediaAssetId:string;questions:QuestionInput[];answers:AnswerInput[];
};

export async function publishContinuation(input:ContinuationInput){
 if(input.questions.length>3||input.questions.some(q=>!q.text.trim()||q.text.length>600||!Number.isFinite(q.timestamp)||q.timestamp<0))
   throw new HttpError(400,"At most three valid questions are permitted.");
 if(input.answers.some(a=>!Number.isFinite(a.timestamp)||a.timestamp<0))throw new HttpError(400,"Invalid answer timestamp.");
 const ids=input.answers.map(a=>a.questionId);
 if(ids.length!==new Set(ids).size)throw new HttpError(400,"An answer may be mapped once per question.");
 return transaction(async db=>{
  // Serialize a branch continuation to prevent competing inserts from diverging the public chain.
  const discussion=await db.query<{originator_candidacy_id:string;election_id:string;max_response_seconds:number;reply_window_hours:number|null}>(
   "SELECT originator_candidacy_id,election_id,max_response_seconds,reply_window_hours FROM debates WHERE id=$1 AND status='published' FOR UPDATE",[input.debateId]);
  if(!discussion.rowCount)throw new HttpError(404,"Published debate not found.");
  const rule=discussion.rows[0];
  const actor=await db.query<{account_id:string;duration_seconds:string}>(
   "SELECT c.account_id,m.duration_seconds FROM candidacies c JOIN accounts a ON a.id=c.account_id JOIN media_assets m ON m.owner_candidacy_id=c.id AND m.id=$2 WHERE c.id=$1 AND c.election_id=$3 AND c.verification_status='verified' AND m.processing_status='ready' AND a.identity_provider='neon-auth' AND a.external_subject=$4 FOR UPDATE OF m",[input.candidateId,input.mediaAssetId,rule.election_id,input.authSubject]);
  if(!actor.rowCount)throw new HttpError(403,"Verified same-election candidate with an owned validated video required.");
  const duration=Number(actor.rows[0].duration_seconds);
  if(duration>Number(rule.max_response_seconds)+0.001)throw new HttpError(400,"Video exceeds the reciprocal time limit.");
  if(input.questions.some(x=>x.timestamp>duration)||input.answers.some(x=>x.timestamp>duration))
   throw new HttpError(400,"Question or answer timestamp exceeds the submitted video duration.");
  const parent=await db.query<{id:string;candidacy_id:string;branch_id:string|null;kind:string}>(
   "SELECT id,candidacy_id,branch_id,kind FROM submissions WHERE id=$1 AND debate_id=$2 AND published_at IS NOT NULL FOR UPDATE",[input.parentSubmissionId,input.debateId]);
  if(!parent.rowCount)throw new HttpError(404,"A published parent contribution is required.");
  const prev=parent.rows[0];
  if(prev.candidacy_id===input.candidateId)throw new HttpError(400,"A candidate cannot answer their own video in a reciprocal exchange.");
  let branchId=prev.branch_id;
  let kind:"response"|"reply"="reply";
  if(prev.kind==="opening"){
    if(input.candidateId===rule.originator_candidacy_id)throw new HttpError(400,"Originator cannot respond to themselves.");
    if(!input.questions.length)throw new HttpError(400,"The first contender response must ask at least one reciprocal question.");
    const b=await db.query<{id:string}>("INSERT INTO debate_branches(debate_id,responder_candidacy_id) VALUES($1,$2) ON CONFLICT(debate_id,responder_candidacy_id) DO UPDATE SET responder_candidacy_id=EXCLUDED.responder_candidacy_id RETURNING id",[input.debateId,input.candidateId]);
    branchId=b.rows[0].id;kind="response";
    if((await db.query("SELECT 1 FROM submissions WHERE branch_id=$1 AND kind='response' AND published_at IS NOT NULL",[branchId])).rowCount)
      throw new HttpError(409,"This contender has already published a first response; continue from the last opponent reply.");
  }else{
    const b=await db.query<{responder_candidacy_id:string}>("SELECT responder_candidacy_id FROM debate_branches WHERE id=$1 AND debate_id=$2",[branchId,input.debateId]);
    if(!b.rowCount)throw new HttpError(400,"Invalid branch.");
    const allowed=[rule.originator_candidacy_id,b.rows[0].responder_candidacy_id];
    if(!allowed.includes(input.candidateId))throw new HttpError(403,"Only the two branch participants may continue their exchange.");
  }
  // Always identify the questions in the immediately preceding video.
  const pending=await db.query<{id:string}>("SELECT id FROM questions WHERE submission_id=$1",[prev.id]);
  const allowedQuestions=new Set(pending.rows.map(q=>q.id));
  if(input.answers.some(a=>!allowedQuestions.has(a.questionId)))throw new HttpError(400,"Answers must refer to questions in the immediately preceding video.");
  if((await db.query("SELECT 1 FROM submissions WHERE branch_id=$1 AND parent_submission_id=$2 AND kind<>'correction'",[branchId,prev.id])).rowCount)
    throw new HttpError(409,"A response already continues this predecessor on the branch.");
  if((await db.query("SELECT 1 FROM submissions WHERE media_asset_id=$1",[input.mediaAssetId])).rowCount)
    throw new HttpError(409,"Original media already belongs to another public contribution.");
  const row=await db.query<{id:string}>(
   "INSERT INTO submissions(debate_id,branch_id,candidacy_id,parent_submission_id,media_asset_id,kind) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",
   [input.debateId,branchId,input.candidateId,prev.id,input.mediaAssetId,kind]);
  const sid=row.rows[0].id;
  for(let i=0;i<input.questions.length;i++)await db.query("INSERT INTO questions(submission_id,asked_by_candidacy_id,ordinal,question_text,video_timestamp_seconds) VALUES($1,$2,$3,$4,$5)",[sid,input.candidateId,i+1,input.questions[i].text.trim(),input.questions[i].timestamp]);
  for(const a of input.answers)await db.query("INSERT INTO answers(submission_id,question_id,video_timestamp_seconds,explanation) VALUES($1,$2,$3,$4)",[sid,a.questionId,a.timestamp,a.explanation||null]);
  await db.query("INSERT INTO media_permissions(candidate_id,media_asset_id,permission) VALUES($1,$2,'archive'),($1,$2,'sequence')",[input.candidateId,input.mediaAssetId]);
  if(!branchId)throw new HttpError(500,"Published continuation is missing a branch.");
  const published=await db.query<{published_at:Date}>("UPDATE submissions SET published_at=now() WHERE id=$1 RETURNING published_at",[sid]);
  await recordPublishedContinuationObligations(db,{
    debateId:input.debateId,branchId,sourceSubmissionId:sid,parentSubmissionId:prev.id,
    publishingCandidacyId:input.candidateId,obligatedCandidacyId:prev.candidacy_id,
    publishedAt:published.rows[0].published_at,replyWindowHours:rule.reply_window_hours,
    opensReview:input.answers.length>0,opensReply:input.questions.length>0,
  });
  await db.query("INSERT INTO publication_events(debate_id,branch_id,actor_candidacy_id,kind,object_id,payload) VALUES($1,$2,$3,'contribution_published',$4,$5::jsonb)",[input.debateId,branchId,input.candidateId,sid,JSON.stringify({parentSubmissionId:prev.id})]);
  await db.query("INSERT INTO audit_events(actor_account_id,action,target_kind,target_id) VALUES($1,'contribution_published','submission',$2)",[actor.rows[0].account_id,sid]);
  return {submissionId:sid,branchId,published:true};
 });
}
