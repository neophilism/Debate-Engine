import "server-only";
import {transaction} from "./db";
import {HttpError} from "./http";

async function branchMember(db:import("pg").PoolClient,branchId:string,candidateId:string,subject:string){
 const r=await db.query<{originator_candidacy_id:string;responder_candidacy_id:string;debate_id:string}>(
  "SELECT d.originator_candidacy_id,b.responder_candidacy_id,d.id AS debate_id FROM debate_branches b JOIN debates d ON d.id=b.debate_id JOIN candidacies c ON c.id=$2 AND c.verification_status='verified' JOIN accounts a ON a.id=c.account_id WHERE b.id=$1 AND a.external_subject=$3 AND a.identity_provider='neon-auth' AND c.id IN(d.originator_candidacy_id,b.responder_candidacy_id)",[branchId,candidateId,subject]);
 if(!r.rowCount)throw new HttpError(403,"Only verified participants may approve or release this summary.");
 return r.rows[0];
}

export async function enqueueRender(input:{branchId:string;artifactId:string;candidateId:string;authSubject:string}){
 return transaction(async db=>{
  await branchMember(db,input.branchId,input.candidateId,input.authSubject);
  const a=await db.query<{id:string;status:string}>(
   "SELECT id,status FROM derivative_artifacts WHERE id=$1 AND branch_id=$2 FOR UPDATE",[input.artifactId,input.branchId]);
  if(!a.rowCount)throw new HttpError(404,"Artifact not found.");
  if(a.rows[0].status!=="draft")throw new HttpError(409,"Only draft artifacts may be rendered.");
  const job=await db.query<{id:string}>(
   "INSERT INTO durable_jobs(job_type,dedupe_key,arguments) VALUES('render_debate_summary',$1,$2::jsonb) ON CONFLICT(job_type,dedupe_key) DO UPDATE SET arguments=durable_jobs.arguments RETURNING id",
   [input.artifactId,JSON.stringify({artifactId:input.artifactId})]);
  return {jobId:job.rows[0].id,queued:true};
 });
}

export async function approveRendered(input:{branchId:string;artifactId:string;candidateId:string;authSubject:string;outputSha256:string}){
 return transaction(async db=>{
  const p=await branchMember(db,input.branchId,input.candidateId,input.authSubject);
  const art=await db.query<{status:string;output_sha256:string;rendered_storage_key:string|null}>(
   "SELECT status,output_sha256,rendered_storage_key FROM derivative_artifacts WHERE id=$1 AND branch_id=$2 FOR UPDATE",[input.artifactId,input.branchId]);
  if(!art.rowCount)throw new HttpError(404,"Summary not found.");
  const a=art.rows[0];
  if(!["awaiting_approval","approved"].includes(a.status)||!a.rendered_storage_key)
    throw new HttpError(409,"Only actually rendered outputs can be approved.");
  if(a.output_sha256!==input.outputSha256)throw new HttpError(409,"Approval digest differs from rendered file.");
  const row=await db.query("SELECT 1 FROM derivative_approvals WHERE artifact_id=$1 AND candidacy_id=$2",[input.artifactId,input.candidateId]);
  if(row.rowCount)throw new HttpError(409,"Candidate already approved this file.");
  await db.query("INSERT INTO derivative_approvals(artifact_id,output_sha256,candidacy_id) VALUES($1,$2,$3)",[input.artifactId,input.outputSha256,input.candidateId]);
  const approvals=await db.query<{candidacy_id:string}>("SELECT candidacy_id FROM derivative_approvals WHERE artifact_id=$1",[input.artifactId]);
  const ids=new Set(approvals.rows.map(x=>x.candidacy_id));
  const both=ids.has(p.originator_candidacy_id)&&ids.has(p.responder_candidacy_id);
  if(both)await db.query("UPDATE derivative_artifacts SET status='approved' WHERE id=$1",[input.artifactId]);
  await db.query("INSERT INTO publication_events(debate_id,branch_id,actor_candidacy_id,kind,object_id,payload) VALUES($1,$2,$3,$4,$5,$6::jsonb)",
   [p.debate_id,input.branchId,input.candidateId,both?"summary_jointly_approved":"summary_approved",input.artifactId,JSON.stringify({outputSha256:input.outputSha256})]);
  return {bothApproved:both,outputSha256:input.outputSha256};
 });
}

export async function releaseSummary(input:{branchId:string;artifactId:string;candidateId:string;authSubject:string}){
 return transaction(async db=>{
  const p=await branchMember(db,input.branchId,input.candidateId,input.authSubject);
  const art=await db.query<{rendered_storage_key:string|null}>(
   "SELECT rendered_storage_key FROM derivative_artifacts WHERE id=$1 AND branch_id=$2 AND status='approved' FOR UPDATE",[input.artifactId,input.branchId]);
  if(!art.rowCount||!art.rows[0].rendered_storage_key)throw new HttpError(409,"Both candidate approvals of a rendered file are required.");
  const policy=await db.query<{id:string}>(
   "SELECT p.id FROM policy_versions p JOIN policy_acceptances x ON x.policy_version_id=p.id AND x.candidacy_id=$2 JOIN policy_acceptances y ON y.policy_version_id=p.id AND y.candidacy_id=$3 WHERE p.branch_id=$1 LIMIT 1",
   [input.branchId,p.originator_candidacy_id,p.responder_candidacy_id]);
  if(!policy.rowCount)throw new HttpError(409,"No jointly accepted policy exists for this branch.");
  await db.query("UPDATE derivative_artifacts SET status='released' WHERE id=$1",[input.artifactId]);
  await db.query("INSERT INTO publication_events(debate_id,branch_id,actor_candidacy_id,kind,object_id) VALUES($1,$2,$3,'summary_released',$4)",[p.debate_id,input.branchId,input.candidateId,input.artifactId]);
  return {released:true};
 });
}
