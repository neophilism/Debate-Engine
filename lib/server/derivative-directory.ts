import "server-only";
import {database} from "./db";
import {getAuthenticatedUser} from "../auth/server";
import {HttpError} from "./http";
type Artifact={id:string;status:string;output_sha256:string;manifest_sha256:string;
 source_manifest:{clips:Array<{mediaAssetId:string;startSeconds:number;endSeconds:number}>;
  outputKind:string;releaseTitle:string;captions:string[]};
 rendered_at:string|null;duration_seconds:string|null;has_file:boolean;created_at:string};
export async function branchArtifactDirectory(branchId:string){
 const branch=await database().query<{id:string;debate_id:string;originator_candidacy_id:string;responder_candidacy_id:string}>(
 "SELECT b.id,b.debate_id,d.originator_candidacy_id,b.responder_candidacy_id FROM debate_branches b JOIN debates d ON d.id=b.debate_id WHERE b.id=$1 AND d.status='published'",[branchId]);
 if(!branch.rowCount)throw new HttpError(404,"Debate branch not found.");
 const user=await getAuthenticatedUser();
 let participantId:string|null=null;
 if(user?.emailVerified){
  const result=await database().query<{id:string}>(
   "SELECT c.id FROM candidacies c JOIN accounts a ON a.id=c.account_id WHERE c.id=ANY(ARRAY[$1::uuid,$2::uuid]) AND a.identity_provider='neon-auth' AND a.external_subject=$3 AND c.verification_status='verified' LIMIT 1",
   [branch.rows[0].originator_candidacy_id,branch.rows[0].responder_candidacy_id,user.id]);
  participantId=result.rows[0]?.id||null;
 }
 const artifacts=await database().query<Artifact>(
  "SELECT a.id,a.status,a.output_sha256,a.manifest_sha256,a.source_manifest,a.created_at,a.rendered_at,a.duration_seconds,(a.rendered_storage_key IS NOT NULL) AS has_file FROM derivative_artifacts a WHERE a.branch_id=$1 AND ($2::boolean OR a.status='released') ORDER BY a.created_at DESC,a.id DESC LIMIT 100",
  [branchId,Boolean(participantId)]
 );
 let permissions:Array<{artifact_id:string;media_asset_id:string;candidate_id:string;scope:unknown}>=[];
 let approvals:Array<{artifact_id:string;candidacy_id:string}>=[];
 if(participantId&&artifacts.rows.length){
  const results=await Promise.all([
   database().query<{artifact_id:string;media_asset_id:string;candidate_id:string;scope:unknown}>(
    "SELECT a.id AS artifact_id,p.media_asset_id,p.candidate_id,p.scope FROM media_permissions p JOIN derivative_artifacts a ON p.scope->>'artifactId'=a.id::text WHERE a.branch_id=$1 AND p.permission='edit' ORDER BY p.granted_at",[branchId]),
   database().query<{artifact_id:string;candidacy_id:string}>(
    "SELECT x.artifact_id,x.candidacy_id FROM derivative_approvals x JOIN derivative_artifacts a ON a.id=x.artifact_id WHERE a.branch_id=$1",[branchId])
  ]);
  permissions=results[0].rows;approvals=results[1].rows;
 }
 return {branch:branch.rows[0],participantId,artifacts:artifacts.rows,
  ownerConsentGrants:permissions,candidateOutputApprovals:approvals};
}
