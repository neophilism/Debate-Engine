import "server-only";
import { database } from "./db";
import {decodeDebateCursor,encodeDebateCursor} from "../../packages/domain/pagination";
import type {DebateFilters} from "../../packages/domain/discovery";

export type PublicDebateSummary={
 id:string;title:string;proposition:string;published_at:Date|string;originator:string;
 office:string;office_slug:string;election_id:string;election_label:string;
 contribution_count:number;contender_count:number;
};

/** Public content only: an unpublished draft never enters these search results. */
export async function listPublicDebatesPage(filters:DebateFilters={},requestedLimit=20){
 const limit=Math.max(1,Math.min(100,Math.trunc(requestedLimit)));
 const after=filters.cursor?decodeDebateCursor(filters.cursor):null;
 const data=await database().query<PublicDebateSummary>(
  `SELECT d.id,d.title,d.proposition,d.published_at,c.public_name AS originator,
    o.title AS office,o.slug AS office_slug,e.id AS election_id,e.label AS election_label,
    (SELECT count(*)::integer FROM submissions s WHERE s.debate_id=d.id AND s.published_at IS NOT NULL) AS contribution_count,
    (SELECT count(*)::integer FROM debate_branches b WHERE b.debate_id=d.id) AS contender_count
   FROM debates d JOIN candidacies c ON c.id=d.originator_candidacy_id
    JOIN election_cycles e ON e.id=d.election_id JOIN offices o ON o.id=e.office_id
   WHERE d.status='published' AND d.published_at IS NOT NULL
    AND ($1::text IS NULL OR o.slug=$1)
    AND ($2::uuid IS NULL OR e.id=$2)
    AND ($3::text IS NULL
      OR position(lower($3::text) in lower(concat_ws(' ',d.title,d.proposition,c.public_name)))>0
      OR EXISTS (SELECT 1 FROM submissions s WHERE s.debate_id=d.id
        AND s.published_at IS NOT NULL AND s.modality='writing'
        AND position(lower($3::text) in lower(s.written_content))>0))
    AND ($4::timestamptz IS NULL OR (d.published_at,d.id)<($4::timestamptz,$5::uuid))
   ORDER BY d.published_at DESC,d.id DESC LIMIT $6`,
  [filters.office||null,filters.election||null,filters.q||null,after?.publishedAt||null,after?.id||null,limit+1]);
 const hasMore=data.rows.length>limit;
 const debates=data.rows.slice(0,limit);
 const last=debates.at(-1);
 return {debates,nextCursor:hasMore&&last?encodeDebateCursor(last.published_at,last.id):null};
}

/** Preserve the original internal return shape for existing public clients. */
export async function listPublicDebates(){
 return (await listPublicDebatesPage({},100)).debates;
}

export async function publicDebateFilterOptions(){
 const result=await database().query<{office_title:string;office_slug:string;election_id:string;election_label:string}>(
  "SELECT DISTINCT o.title AS office_title,o.slug AS office_slug,e.id AS election_id,e.label AS election_label FROM debates d JOIN election_cycles e ON e.id=d.election_id JOIN offices o ON o.id=e.office_id WHERE d.status='published' ORDER BY office_title,election_label");
 return result.rows;
}
export async function loadPublicDebate(debateId:string){
 const head=await database().query(
  "SELECT d.*,c.public_name AS originator_name,o.title AS office_name,e.label AS election_label FROM debates d JOIN candidacies c ON c.id=d.originator_candidacy_id JOIN election_cycles e ON e.id=d.election_id JOIN offices o ON o.id=e.office_id WHERE d.id=$1 AND d.status='published'",[debateId]);
 if(!head.rows.length)return null;
 const [submissions,questions,answers,assessments,objections,branches,agreements,obligations,corrections]=await Promise.all([
  database().query("SELECT s.id,s.debate_id,s.branch_id,s.candidacy_id,s.parent_submission_id,s.kind,s.created_at,s.published_at,s.format_issues,s.modality,s.written_content,c.public_name AS candidate_name,m.id AS media_asset_id,m.duration_seconds FROM submissions s JOIN candidacies c ON c.id=s.candidacy_id LEFT JOIN media_assets m ON m.id=s.media_asset_id WHERE s.debate_id=$1 AND s.published_at IS NOT NULL ORDER BY s.published_at,s.id",[debateId]),
  database().query("SELECT q.id,q.submission_id,q.question_text,q.ordinal,q.video_timestamp_seconds,q.written_anchor,q.asked_by_candidacy_id FROM questions q JOIN submissions s ON s.id=q.submission_id WHERE s.debate_id=$1 AND s.published_at IS NOT NULL ORDER BY s.published_at,q.ordinal",[debateId]),
  database().query("SELECT a.id,a.submission_id,a.question_id,a.video_timestamp_seconds,a.written_anchor,a.explanation FROM answers a JOIN submissions s ON s.id=a.submission_id WHERE s.debate_id=$1 AND s.published_at IS NOT NULL",[debateId]),
  database().query("SELECT a.id,a.question_id,a.answer_submission_id,a.reviewer_candidacy_id,a.decision,a.reasoning,a.supersedes_assessment_id,a.created_at FROM assessments a JOIN submissions s ON s.id=a.answer_submission_id WHERE s.debate_id=$1 ORDER BY a.created_at,a.id",[debateId]),
  database().query("SELECT o.id,o.assessment_id,o.objection,o.created_at,o.objecting_candidacy_id FROM assessment_objections o JOIN assessments a ON a.id=o.assessment_id JOIN submissions s ON s.id=a.answer_submission_id WHERE s.debate_id=$1 ORDER BY o.created_at",[debateId]),
  database().query("SELECT b.id,b.responder_candidacy_id,c.public_name AS contender_name FROM debate_branches b JOIN candidacies c ON c.id=b.responder_candidacy_id WHERE b.debate_id=$1 ORDER BY b.created_at",[debateId]),
  database().query("SELECT p.id,p.branch_id,p.policy_body,p.content_sha256,p.created_at,(SELECT count(*)::integer FROM (SELECT DISTINCT ON (candidacy_id) candidacy_id,action FROM policy_endorsement_events e WHERE e.policy_version_id=p.id ORDER BY candidacy_id,event_order DESC) latest WHERE action='accept') AS acceptance_count FROM policy_versions p JOIN debate_branches b ON b.id=p.branch_id WHERE b.debate_id=$1 ORDER BY p.created_at DESC",[debateId]),
  database().query("WITH projected AS (SELECT ro.*,ro.due_at+COALESCE(sum(oa.seconds),0)*interval '1 second' AS effective_due_at FROM reply_obligations ro LEFT JOIN obligation_outage_adjustments oa ON oa.obligation_id=ro.id WHERE ro.debate_id=$1 GROUP BY ro.id) SELECT id,branch_id,source_submission_id,obligated_candidacy_id,obligation_type,opened_at,effective_due_at,received_at,processed_at,CASE WHEN received_at IS NOT NULL AND (effective_due_at IS NULL OR received_at<=effective_due_at) THEN 'fulfilled_on_time' WHEN received_at IS NOT NULL THEN 'fulfilled_late' WHEN effective_due_at IS NOT NULL AND now()>effective_due_at THEN 'overdue' ELSE 'open' END AS state FROM projected ORDER BY opened_at,id",[debateId]),
  database().query("SELECT x.id,x.submission_id,x.candidacy_id,x.correction_body,x.created_at FROM submission_corrections x JOIN submissions s ON s.id=x.submission_id WHERE s.debate_id=$1 AND s.published_at IS NOT NULL ORDER BY x.event_order",[debateId])
 ]);
 return {debate:head.rows[0],submissions:submissions.rows,questions:questions.rows,answers:answers.rows,assessments:assessments.rows,objections:objections.rows,branches:branches.rows,policyProposals:agreements.rows,obligations:obligations.rows,corrections:corrections.rows};
}
