import {NextRequest,NextResponse} from "next/server";
import {database,transaction} from "../../../../../lib/server/db";
import {requireIdentity,requireSameOrigin,parseJson,record,uuid,field,jsonError,HttpError} from "../../../../../lib/server/http";
export const runtime="nodejs";export const dynamic="force-dynamic";
type Props={params:Promise<{id:string}>};
export async function GET(_request:Request,{params}:Props){
 try{
  const id=uuid((await params).id,"submission id");
  const result=await database().query(
   "SELECT x.id,x.submission_id,x.candidacy_id,x.correction_body,x.created_at FROM submission_corrections x JOIN submissions s ON s.id=x.submission_id JOIN debates d ON d.id=s.debate_id WHERE x.submission_id=$1 AND s.published_at IS NOT NULL AND d.status='published' ORDER BY x.event_order",[id]);
  return NextResponse.json({corrections:result.rows},{headers:{"Cache-Control":"public,max-age=30"}});
 }catch(e){return jsonError(e)}
}
export async function POST(request:NextRequest,{params}:Props){
 try{
  requireSameOrigin(request);
  const user=await requireIdentity(true),submissionId=uuid((await params).id,"submission id"),data=record(await parseJson(request));
  const candidacyId=uuid(data.candidacyId,"candidacy id"),body=field(data.correctionBody,"correction",5000);
  if(body.length<20)throw new HttpError(400,"A correction must contain at least 20 characters.");
  const result=await transaction(async db=>{
   const original=await db.query<{debate_id:string;branch_id:string|null;account_id:string}>(
    "SELECT s.debate_id,s.branch_id,c.account_id FROM submissions s JOIN debates d ON d.id=s.debate_id JOIN candidacies c ON c.id=s.candidacy_id JOIN accounts a ON a.id=c.account_id WHERE s.id=$1 AND s.candidacy_id=$2 AND s.published_at IS NOT NULL AND d.status='published' AND c.verification_status='verified' AND a.identity_provider='neon-auth' AND a.external_subject=$3 FOR UPDATE OF s",
    [submissionId,candidacyId,user.id]);
   if(!original.rowCount)throw new HttpError(403,"Only the verified author can correct a published contribution.");
   const row=await db.query<{id:string}>(
    "INSERT INTO submission_corrections(submission_id,candidacy_id,correction_body) VALUES($1,$2,$3) RETURNING id",
    [submissionId,candidacyId,body]);
   const published=original.rows[0];
   await db.query(
    "INSERT INTO publication_events(debate_id,branch_id,actor_candidacy_id,kind,object_id,payload) VALUES($1,$2,$3,'source_correction_published',$4,$5::jsonb)",
    [published.debate_id,published.branch_id,candidacyId,row.rows[0].id,JSON.stringify({correctedSubmissionId:submissionId})]);
   await db.query(
    "INSERT INTO audit_events(actor_account_id,action,target_kind,target_id) VALUES($1,'source_correction_published','submission_correction',$2)",
    [published.account_id,row.rows[0].id]);
   return row.rows[0];
  });
  return NextResponse.json({correctionId:result.id,published:true},{status:201,headers:{"Cache-Control":"private,no-store"}});
 }catch(e){return jsonError(e)}
}
