import { NextRequest, NextResponse } from "next/server";
import { requireIdentity, requireSameOrigin, parseJson, record, uuid, field, jsonError } from "../../../../../lib/server/http";
import { database } from "../../../../../lib/server/db";
import { proposePolicy } from "../../../../../lib/server/policy-convergence";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(_request:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const id=uuid((await params).id,"branch id");
  const q=await database().query(`SELECT p.id,p.content_sha256,p.policy_body,p.created_at,p.parent_version_id,c.public_name AS proposer,
  (SELECT count(*)::integer FROM policy_acceptances a WHERE a.policy_version_id=p.id) AS historical_approval_count,
  (SELECT count(*)::integer FROM (
    SELECT DISTINCT ON (candidate_id) candidate_id,action FROM policy_endorsement_events e
     WHERE e.policy_version_id=p.id ORDER BY candidate_id,event_order DESC
   ) decisions WHERE action='accept') AS approval_count,
  COALESCE((SELECT array_agg(candidate_id) FROM (
    SELECT DISTINCT ON (candidate_id) candidate_id,action FROM policy_endorsement_events e
     WHERE e.policy_version_id=p.id ORDER BY candidate_id,event_order DESC
   ) decisions WHERE action='accept'),ARRAY[]::uuid[]) AS active_approvers FROM policy_versions p JOIN candidacies c ON c.id=p.proposed_by_candidacy_id JOIN debate_branches b ON b.id=p.branch_id JOIN debates d ON d.id=b.debate_id WHERE p.branch_id=$1 AND d.status='published' ORDER BY p.created_at DESC,p.id DESC LIMIT 100",[id]);
  return NextResponse.json({policies:q.rows},{headers:{"Cache-Control":"public,max-age=20"}});
 }catch(e){return jsonError(e);}
}
export async function POST(request:NextRequest,{params}:{params:Promise<{id:string}>}){
 try{requireSameOrigin(request);const actor=await requireIdentity(true);const b=record(await parseJson(request));
 const x=await proposePolicy({branchId:uuid((await params).id,"branch id"),candidateId:uuid(b.candidacyId,"candidacyId"),authSubject:actor.id,body:field(b.policyBody,"policyBody",50000),parentVersionId:b.parentVersionId?uuid(b.parentVersionId,"parentVersionId"):null});
 return NextResponse.json(x,{status:201});
 }catch(e){return jsonError(e);}
}
