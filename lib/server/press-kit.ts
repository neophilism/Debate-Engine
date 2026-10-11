import "server-only";
import {database} from "./db";
import {HttpError} from "./http";

export async function pressKitForBranch(branchId:string){
 const header=await database().query<{
  debate_id:string;title:string;proposition:string;published_at:string;
  originator_name:string;originator_id:string;contender_name:string;contender_id:string;
  office:string;election_label:string;
 }>("SELECT d.id AS debate_id,d.title,d.proposition,d.published_at,origin.public_name AS originator_name,d.originator_candidacy_id AS originator_id,contender.public_name AS contender_name,b.responder_candidacy_id AS contender_id,office.title AS office,cycle.label AS election_label FROM debate_branches b JOIN debates d ON d.id=b.debate_id JOIN candidacies origin ON origin.id=d.originator_candidacy_id JOIN candidacies contender ON contender.id=b.responder_candidacy_id JOIN election_cycles cycle ON cycle.id=d.election_id JOIN offices office ON office.id=cycle.office_id WHERE b.id=$1 AND d.status='published'",[branchId]);
 if(!header.rowCount)throw new HttpError(404,"Public debate branch not found.");
 const context=header.rows[0];
 const policies=await database().query<{
  policy_version_id:string;policy_body:string;content_sha256:string;created_at:string;author_name:string;
 }>("SELECT p.id AS policy_version_id,p.policy_body,p.content_sha256,p.created_at,c.public_name AS author_name FROM policy_versions p JOIN candidacies c ON c.id=p.proposed_by_candidacy_id JOIN policy_acceptances ao ON ao.policy_version_id=p.id AND ao.candidacy_id=$2 JOIN policy_acceptances ar ON ar.policy_version_id=p.id AND ar.candidacy_id=$3 WHERE p.branch_id=$1 ORDER BY p.created_at DESC,p.id DESC LIMIT 1",[branchId,context.originator_id,context.contender_id]);
 if(!policies.rowCount)throw new HttpError(409,"This branch has no mutually accepted policy yet.");
 const policy=policies.rows[0];
 const [videos,documents,summaries]=await Promise.all([
  database().query<{submission_id:string;kind:string;candidate_name:string;sha256:string;published_at:string;media_asset_id:string;duration_seconds:string}>(
   "SELECT s.id AS submission_id,s.kind,c.public_name AS candidate_name,m.original_sha256 AS sha256,s.published_at,m.id AS media_asset_id,m.duration_seconds FROM submissions s JOIN candidacies c ON c.id=s.candidacy_id JOIN media_assets m ON m.id=s.media_asset_id WHERE s.debate_id=$1 AND (s.branch_id=$2 OR s.kind='opening') AND s.published_at IS NOT NULL ORDER BY s.published_at,s.id",[context.debate_id,branchId]),
  database().query<{id:string;submission_id:string;sha256:string;label:string;filename:string;mime_type:string}>(
   "SELECT docs.id,docs.submission_id,docs.sha256,docs.label,docs.filename,docs.mime_type FROM submission_documents docs JOIN submissions s ON s.id=docs.submission_id WHERE s.debate_id=$1 AND (s.branch_id=$2 OR s.kind='opening') AND s.published_at IS NOT NULL ORDER BY docs.published_at,docs.id",[context.debate_id,branchId]),
  database().query<{id:string;output_sha256:string;source_manifest:unknown;duration_seconds:string|null}>(
   "SELECT id,output_sha256,source_manifest,duration_seconds FROM derivative_artifacts WHERE branch_id=$1 AND status='released' AND rendered_storage_key IS NOT NULL ORDER BY rendered_at DESC,id",[branchId])
 ]);
 return {
  schemaVersion:"1.0.0" as const,
  kind:"mutually_agreed_policy_press_kit" as const,
  generatedAt:new Date().toISOString(),
  debate:{id:context.debate_id,title:context.title,proposition:context.proposition,
   office:context.office,election:context.election_label,publishedAt:context.published_at,
   publicPath:"/debates/"+context.debate_id},
  branch:{id:branchId,originator:context.originator_name,contender:context.contender_name},
  agreement:{versionId:policy.policy_version_id,body:policy.policy_body,
   sha256:policy.content_sha256,proposedBy:policy.author_name,createdAt:policy.created_at,
   description:"Both debate participants explicitly accepted this exact policy version; the platform does not certify it as objectively best."},
  originals:videos.rows.map(v=>({...v,publicPath:"/api/media/"+v.media_asset_id+"/play"})),
  supportingDocuments:documents.rows.map(x=>({...x,publicPath:"/api/documents/"+x.id+"/download"})),
  releasedSummaries:summaries.rows.map(x=>({...x,publicPath:"/api/branches/"+branchId+"/derivatives/"+x.id+"/download"})),
  notices:[
    "Published original videos are preserved unedited and remain accessible independently of qualifying status.",
    "A complete unedited multi-candidate record is accessible through the debate public path.",
    "No condensed video is represented as released unless the exact output was jointly approved.",
    "The words of participating candidates are their own; these sources are not independent fact-checking."
  ]
 };
}
export type PressKit=Awaited<ReturnType<typeof pressKitForBranch>>;
export function pressKitText(k:PressKit,baseURL:string){
 const u=(path:string)=>new URL(path,baseURL).toString();
 const intro=[
  "PUBLIC DEBATE ENGINE — PUBLIC PRESS PACKAGE",
  "Debate: "+k.debate.title,
  "Office: "+k.debate.office+" | Election: "+k.debate.election,
  "Participants: "+k.branch.originator+" / "+k.branch.contender,
  "Public full record: "+u(k.debate.publicPath),
  "Agreement: both participants approved the exact policy below.",
  "Proposed by: "+k.agreement.proposedBy,
  "Policy version SHA-256: "+k.agreement.sha256,
  "",
  "FULL AGREED POLICY TEXT",
  "-----------------------",
  k.agreement.body,
  "",
  "UNEDITED SOURCE VIDEOS ("+k.originals.length+")"
 ];
 for(const v of k.originals)intro.push(v.candidate_name+" | "+v.kind+" | SHA-256 "+v.sha256+" | "+u(v.publicPath));
 intro.push("","SUPPORTING MATERIALS ("+k.supportingDocuments.length+")");
 for(const d of k.supportingDocuments)intro.push(d.label+" | "+d.filename+" | SHA-256 "+d.sha256+" | "+u(d.publicPath));
 intro.push("","APPROVED SHORT VIDEOS ("+k.releasedSummaries.length+")");
 for(const v of k.releasedSummaries)intro.push("SHA-256 "+v.output_sha256+" | "+u(v.publicPath));
 intro.push("","PRESERVATION AND ATTRIBUTION NOTES",...k.notices);
 return intro.join("\n")+"\n";
}
