import {NextRequest,NextResponse} from "next/server";
import {requireIdentity,requireSameOrigin,parseJson,record,uuid,field,jsonError,HttpError} from "../../../lib/server/http";
import {transaction} from "../../../lib/server/db";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(request:NextRequest){
 try{
  requireSameOrigin(request);const actor=await requireIdentity(true);const b=record(await parseJson(request));
  const questionId=uuid(b.questionId,"questionId"),answerSubmissionId=uuid(b.answerSubmissionId,"answerSubmissionId");
  const candidacyId=uuid(b.candidacyId,"candidacyId"),reasoning=field(b.reasoning,"reasoning",4000);
  const decision=b.decision;if(!["answered","not_answered","partly_answered","disputed_premise"].includes(String(decision)))
    throw new HttpError(400,"Unsupported assessment decision.");
  const result=await transaction(async db=>{
   const reviewer=await db.query("SELECT c.id FROM candidacies c JOIN accounts a ON a.id=c.account_id WHERE c.id=$1 AND c.verification_status='verified' AND a.identity_provider='neon-auth' AND a.external_subject=$2",[candidacyId,actor.id]);
   if(!reviewer.rowCount)throw new HttpError(403,"Only verified questioners may assess.");
   const relation=await db.query<{debate_id:string;branch_id:string|null}>(
    "SELECT answer.debate_id,answer.branch_id FROM questions q JOIN submissions asking ON asking.id=q.submission_id JOIN submissions answer ON answer.id=$2 AND answer.debate_id=asking.debate_id AND answer.parent_submission_id=asking.id JOIN debates d ON d.id=asking.debate_id WHERE q.id=$1 AND q.asked_by_candidacy_id=$3 AND answer.candidacy_id<>$3 AND asking.published_at IS NOT NULL AND answer.published_at IS NOT NULL",[questionId,answerSubmissionId,candidacyId]);
   if(!relation.rowCount)throw new HttpError(403,"This question is not yours to assess on the specified opponent video.");
   const latest=await db.query<{id:string}>("SELECT id FROM assessments WHERE question_id=$1 AND answer_submission_id=$2 ORDER BY created_at DESC,id DESC LIMIT 1 FOR UPDATE",[questionId,answerSubmissionId]);
   const supersedes=latest.rows[0]?.id||null;
   const made=await db.query<{id:string}>(
    "INSERT INTO assessments(question_id,answer_submission_id,reviewer_candidacy_id,decision,reasoning,supersedes_assessment_id) VALUES($1,$2,$3,$4,$5,$6) RETURNING id",
    [questionId,answerSubmissionId,candidacyId,decision,reasoning,supersedes]);
   await db.query("INSERT INTO publication_events(debate_id,branch_id,actor_candidacy_id,kind,object_id,payload) VALUES($1,$2,$3,'question_assessed',$4,$5::jsonb)",[relation.rows[0].debate_id,relation.rows[0].branch_id,candidacyId,made.rows[0].id,JSON.stringify({questionId,answerSubmissionId,decision})]);
   return made.rows[0];
  });
  return NextResponse.json({assessmentId:result.id},{status:201});
 }catch(e){return jsonError(e);}
}
