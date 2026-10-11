import "server-only";
import { createHash } from "node:crypto";
import { transaction } from "./db";
import { HttpError } from "./http";

export function policyHash(body: string, attachments: readonly string[]): string {
  return createHash("sha256").update(JSON.stringify({
    body:body.replace(/\r\n/g,"\n"),attachments:[...attachments].sort()
  })).digest("hex");
}
async function participant(db:import("pg").PoolClient,branchId:string,candidateId:string,authSubject:string){
 const r=await db.query<{debate_id:string;originator_candidacy_id:string;responder_candidacy_id:string;account_id:string}>(
  "SELECT d.id AS debate_id,d.originator_candidacy_id,b.responder_candidacy_id,c.account_id FROM debate_branches b JOIN debates d ON d.id=b.debate_id JOIN candidacies c ON c.id=$2 AND c.verification_status='verified' JOIN accounts a ON a.id=c.account_id WHERE b.id=$1 AND a.identity_provider='neon-auth' AND a.external_subject=$3 AND c.id IN(d.originator_candidacy_id,b.responder_candidacy_id) FOR UPDATE OF b",
  [branchId,candidateId,authSubject]);
 if(!r.rowCount)throw new HttpError(403,"Only a verified participant in this debate branch may act.");
 return r.rows[0];
}
export async function proposePolicy(input:{branchId:string;candidateId:string;authSubject:string;body:string;parentVersionId:string|null}){
 const normalized=input.body.replace(/\r\n/g,"\n").trim();
 if(normalized.length<20||normalized.length>50000)throw new HttpError(400,"Policy must be between 20 and 50,000 characters.");
 return transaction(async db=>{
  const member=await participant(db,input.branchId,input.candidateId,input.authSubject);
  if(input.parentVersionId){
   const parent=await db.query("SELECT 1 FROM policy_versions WHERE id=$1 AND branch_id=$2",[input.parentVersionId,input.branchId]);
   if(!parent.rowCount)throw new HttpError(400,"Parent policy version belongs to another branch or does not exist.");
  }
  const digest=policyHash(normalized,[]);
  const row=await db.query<{id:string}>("INSERT INTO policy_versions(branch_id,proposed_by_candidacy_id,content_sha256,policy_body,parent_version_id) VALUES($1,$2,$3,$4,$5) RETURNING id",[input.branchId,input.candidateId,digest,normalized,input.parentVersionId]);
  await db.query("INSERT INTO publication_events(debate_id,branch_id,actor_candidacy_id,kind,object_id,payload) VALUES($1,$2,$3,'policy_version_proposed',$4,$5::jsonb)",[member.debate_id,input.branchId,input.candidateId,row.rows[0].id,JSON.stringify({contentSha256:digest,parentVersionId:input.parentVersionId})]);
  return {policyVersionId:row.rows[0].id,sha256:digest};
 });
}
export async function acceptPolicy(input:{branchId:string;candidateId:string;authSubject:string;versionId:string;sha256:string}){
 return transaction(async db=>{
  const participantRecord=await participant(db,input.branchId,input.candidateId,input.authSubject);
  const version=await db.query<{content_sha256:string}>("SELECT content_sha256 FROM policy_versions WHERE id=$1 AND branch_id=$2",[input.versionId,input.branchId]);
  if(!version.rowCount)throw new HttpError(404,"Policy version not found in this branch.");
  if(version.rows[0].content_sha256!==input.sha256)throw new HttpError(409,"Policy content has changed. Read and approve the current exact hash.");
  const existing=await db.query("SELECT id FROM policy_acceptances WHERE policy_version_id=$1 AND candidacy_id=$2",[input.versionId,input.candidateId]);
  if(existing.rowCount)throw new HttpError(409,"This candidate already accepted this version.");
  await db.query("INSERT INTO policy_acceptances(policy_version_id,content_sha256,candidacy_id) VALUES($1,$2,$3)",[input.versionId,input.sha256,input.candidateId]);
  const approvals=await db.query<{candidacy_id:string}>("SELECT candidacy_id FROM policy_acceptances WHERE policy_version_id=$1",[input.versionId]);
  const voters=new Set(approvals.rows.map(x=>x.candidacy_id));
  const jointlyAgreed=voters.has(participantRecord.originator_candidacy_id)&&voters.has(participantRecord.responder_candidacy_id);
  await db.query("INSERT INTO publication_events(debate_id,branch_id,actor_candidacy_id,kind,object_id,payload) VALUES($1,$2,$3,$4,$5,$6::jsonb)",[participantRecord.debate_id,input.branchId,input.candidateId,jointlyAgreed?"policy_jointly_accepted":"policy_accepted",input.versionId,JSON.stringify({sha256:input.sha256,jointlyAgreed})]);
  return {policyVersionId:input.versionId,jointlyAgreed};
 });
}
