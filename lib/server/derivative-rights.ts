import "server-only";
import {transaction} from "./db";
import {HttpError} from "./http";
import {exactManifestHash,validateManifest,type EditorialManifest} from "../../packages/domain/rights";
import {summaryDurationErrors} from "../../packages/domain/summary";
export async function submitEditorialPlan(input:{manifest:EditorialManifest;candidateId:string;authSubject:string}){
 const errors=[...validateManifest(input.manifest),...summaryDurationErrors(input.manifest)];
 if(input.manifest.clips.length>80)errors.push("At most 80 source clips may be submitted for rendering.");
 if(errors.length)throw new HttpError(400,errors[0]);
 const hash=exactManifestHash(input.manifest);
 return transaction(async db=>{
  const participants=await db.query<{originator_candidacy_id:string;responder_candidacy_id:string}>(
    "SELECT d.originator_candidacy_id,b.responder_candidacy_id FROM debate_branches b JOIN debates d ON d.id=b.debate_id WHERE b.id=$1 AND d.status='published' FOR UPDATE OF b",[input.manifest.branchId]);
  if(!participants.rowCount)throw new HttpError(404,"Published branch not found.");
  const {originator_candidacy_id,responder_candidacy_id}=participants.rows[0];
  if(![originator_candidacy_id,responder_candidacy_id].includes(input.candidateId))
    throw new HttpError(403,"Only a branch participant may draft a joint summary.");
  const auth=await db.query("SELECT 1 FROM candidacies c JOIN accounts a ON a.id=c.account_id WHERE c.id=$1 AND a.identity_provider='neon-auth' AND a.external_subject=$2 AND c.verification_status='verified'",[input.candidateId,input.authSubject]);
  if(!auth.rowCount)throw new HttpError(403,"Candidate identity is not verified.");
  const uniqueIds=[...new Set(input.manifest.clips.map(c=>c.mediaAssetId))];
  for(const id of uniqueIds){
   const row=await db.query<{duration_seconds:string;owner_candidacy_id:string}>(
    "SELECT m.duration_seconds,m.owner_candidacy_id FROM media_assets m JOIN submissions s ON s.media_asset_id=m.id JOIN debates d ON d.id=s.debate_id JOIN debate_branches b ON b.debate_id=d.id WHERE m.id=$1 AND b.id=$2 AND s.published_at IS NOT NULL AND (s.branch_id=$2 OR s.kind='opening') AND m.processing_status='ready' LIMIT 1",
    [id,input.manifest.branchId]);
   if(!row.rowCount)throw new HttpError(400,"A source clip does not belong to the published branch.");
   if(input.manifest.clips.some(c=>c.mediaAssetId===id&&c.endSeconds>Number(row.rows[0].duration_seconds)))
     throw new HttpError(400,"Clip time range exceeds source duration.");
   if(![originator_candidacy_id,responder_candidacy_id].includes(row.rows[0].owner_candidacy_id))
     throw new HttpError(403,"Source owner not a branch participant.");
  }
  // A planning record is NOT final rendered media. Distinct output hash/approval is necessary before publication.
  const result=await db.query<{id:string}>(
    "INSERT INTO derivative_artifacts(branch_id,output_sha256,source_manifest,status) VALUES($1,$2,$3::jsonb,'draft') RETURNING id",
    [input.manifest.branchId,hash,JSON.stringify(input.manifest)]);
  return {artifactId:result.rows[0].id,manifestSha256:hash,status:"draft",requiresFinalOutputApproval:true};
 });
}
export async function grantEditPermission(input:{mediaId:string;candidateId:string;authSubject:string;scope:{artifactId:string;clipStart:number;clipEnd:number}}){
 if(input.scope.clipStart<0||input.scope.clipEnd<=input.scope.clipStart||!Number.isFinite(input.scope.clipEnd))throw new HttpError(400,"Invalid edit scope.");
 return transaction(async db=>{
  const original=await db.query<{duration_seconds:string}>(
    "SELECT m.duration_seconds FROM media_assets m JOIN submissions s ON s.media_asset_id=m.id JOIN candidacies c ON c.id=m.owner_candidacy_id JOIN accounts a ON a.id=c.account_id WHERE m.id=$1 AND s.published_at IS NOT NULL AND m.owner_candidacy_id=$2 AND a.external_subject=$3 AND a.identity_provider='neon-auth' AND c.verification_status='verified' FOR UPDATE OF m",
    [input.mediaId,input.candidateId,input.authSubject]);
  if(!original.rowCount)throw new HttpError(403,"Only the verified original owner may grant editing rights.");
  if(input.scope.clipEnd>Number(original.rows[0].duration_seconds))throw new HttpError(400,"Edit scope exceeds media duration.");
  const artifact=await db.query("SELECT 1 FROM derivative_artifacts a JOIN debate_branches b ON b.id=a.branch_id JOIN submissions s ON s.media_asset_id=$2 AND s.debate_id=b.debate_id WHERE a.id=$1 AND (s.branch_id=b.id OR s.kind='opening')",[input.scope.artifactId,input.mediaId]);
  if(!artifact.rowCount)throw new HttpError(400,"Derivative plan and source do not share a debate branch.");
  const permission=await db.query<{id:string}>(
    "INSERT INTO media_permissions(candidate_id,media_asset_id,permission,scope) VALUES($1,$2,'edit',$3::jsonb) RETURNING id",
    [input.candidateId,input.mediaId,JSON.stringify(input.scope)]);
  return {permissionId:permission.rows[0].id};
 });
}
