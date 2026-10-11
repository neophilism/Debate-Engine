import {NextRequest,NextResponse} from "next/server";
import {requireIdentity,requireSameOrigin,parseJson,record,uuid,field,jsonError,HttpError} from "../../../lib/server/http";
import {transaction} from "../../../lib/server/db";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(request:NextRequest){
 try{
  requireSameOrigin(request);const actor=await requireIdentity(true);const b=record(await parseJson(request));
  const assessmentId=uuid(b.assessmentId,"assessmentId"),candidacyId=uuid(b.candidacyId,"candidacyId");
  const objection=field(b.objection,"objection",4000);
  const timestamp=b.videoTimestampSeconds==null?null:Number(b.videoTimestampSeconds);
  if(timestamp!==null&&(!Number.isFinite(timestamp)||timestamp<0))throw new HttpError(400,"Invalid timestamp.");
  const created=await transaction(async db=>{
   const a=await db.query<{account_id:string}>("SELECT c.account_id FROM candidacies c JOIN accounts a ON a.id=c.account_id WHERE c.id=$1 AND c.verification_status='verified' AND a.identity_provider='neon-auth' AND a.external_subject=$2",[candidacyId,actor.id]);
   if(!a.rowCount)throw new HttpError(403,"Not your verified candidacy.");
   const assessment=await db.query<{debate_id:string;branch_id:string|null}>(
     "SELECT s.debate_id,s.branch_id FROM assessments a JOIN submissions s ON s.id=a.answer_submission_id WHERE a.id=$1 AND s.candidacy_id=$2 AND s.published_at IS NOT NULL",[assessmentId,candidacyId]);
   if(!assessment.rowCount)throw new HttpError(403,"Only the responder assessed may object.");
   const result=await db.query<{id:string}>("INSERT INTO assessment_objections(assessment_id,objecting_candidacy_id,objection,video_timestamp_seconds) VALUES($1,$2,$3,$4) RETURNING id",[assessmentId,candidacyId,objection,timestamp]);
   await db.query("INSERT INTO publication_events(debate_id,branch_id,actor_candidacy_id,kind,object_id) VALUES($1,$2,$3,'assessment_objected',$4)",[assessment.rows[0].debate_id,assessment.rows[0].branch_id,candidacyId,result.rows[0].id]);
   return result.rows[0];
  });
  return NextResponse.json({objectionId:created.id},{status:201});
 }catch(e){return jsonError(e);}
}
