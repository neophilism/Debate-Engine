import "server-only";
import { database } from "./db";
export async function listPublicDebates(){
 const data=await database().query(
  "SELECT d.id,d.title,d.proposition,d.published_at,c.public_name AS originator,o.title AS office,e.label AS election_label,(SELECT count(*)::integer FROM submissions s WHERE s.debate_id=d.id AND s.published_at IS NOT NULL) AS contribution_count,(SELECT count(*)::integer FROM debate_branches b WHERE b.debate_id=d.id) AS contender_count FROM debates d JOIN candidacies c ON c.id=d.originator_candidacy_id JOIN election_cycles e ON e.id=d.election_id JOIN offices o ON o.id=e.office_id WHERE d.status='published' ORDER BY d.published_at DESC LIMIT 100");
 return data.rows;
}
export async function loadPublicDebate(debateId:string){
 const head=await database().query(
  "SELECT d.*,c.public_name AS originator_name,o.title AS office_name,e.label AS election_label FROM debates d JOIN candidacies c ON c.id=d.originator_candidacy_id JOIN election_cycles e ON e.id=d.election_id JOIN offices o ON o.id=e.office_id WHERE d.id=$1 AND d.status='published'",[debateId]);
 if(!head.rows.length)return null;
 const [submissions,questions,answers,assessments,objections,branches,agreements,obligations]=await Promise.all([
  database().query("SELECT s.id,s.debate_id,s.branch_id,s.candidacy_id,s.parent_submission_id,s.kind,s.created_at,s.published_at,c.public_name AS candidate_name,m.id AS media_asset_id,m.duration_seconds FROM submissions s JOIN candidacies c ON c.id=s.candidacy_id JOIN media_assets m ON m.id=s.media_asset_id WHERE s.debate_id=$1 AND s.published_at IS NOT NULL ORDER BY s.published_at,s.id",[debateId]),
  database().query("SELECT q.id,q.submission_id,q.question_text,q.ordinal,q.video_timestamp_seconds,q.asked_by_candidacy_id FROM questions q JOIN submissions s ON s.id=q.submission_id WHERE s.debate_id=$1 AND s.published_at IS NOT NULL ORDER BY s.published_at,q.ordinal",[debateId]),
  database().query("SELECT a.id,a.submission_id,a.question_id,a.video_timestamp_seconds,a.explanation FROM answers a JOIN submissions s ON s.id=a.submission_id WHERE s.debate_id=$1 AND s.published_at IS NOT NULL",[debateId]),
  database().query("SELECT a.id,a.question_id,a.answer_submission_id,a.reviewer_candidacy_id,a.decision,a.reasoning,a.supersedes_assessment_id,a.created_at FROM assessments a JOIN submissions s ON s.id=a.answer_submission_id WHERE s.debate_id=$1 ORDER BY a.created_at,a.id",[debateId]),
  database().query("SELECT o.id,o.assessment_id,o.objection,o.created_at,o.objecting_candidacy_id FROM assessment_objections o JOIN assessments a ON a.id=o.assessment_id JOIN submissions s ON s.id=a.answer_submission_id WHERE s.debate_id=$1 ORDER BY o.created_at",[debateId]),
  database().query("SELECT b.id,b.responder_candidacy_id,c.public_name AS contender_name FROM debate_branches b JOIN candidacies c ON c.id=b.responder_candidacy_id WHERE b.debate_id=$1 ORDER BY b.created_at",[debateId]),
  database().query("SELECT p.id,p.branch_id,p.policy_body,p.content_sha256,p.created_at,(SELECT count(*)::integer FROM policy_acceptances a WHERE a.policy_version_id=p.id) AS acceptance_count FROM policy_versions p JOIN debate_branches b ON b.id=p.branch_id WHERE b.debate_id=$1 ORDER BY p.created_at DESC",[debateId]),
  database().query("WITH projected AS (SELECT ro.*,ro.due_at+COALESCE(sum(oa.seconds),0)*interval '1 second' AS effective_due_at FROM reply_obligations ro LEFT JOIN obligation_outage_adjustments oa ON oa.obligation_id=ro.id WHERE ro.debate_id=$1 GROUP BY ro.id) SELECT id,branch_id,source_submission_id,obligated_candidacy_id,obligation_type,opened_at,effective_due_at,received_at,processed_at,CASE WHEN received_at IS NOT NULL AND (effective_due_at IS NULL OR received_at<=effective_due_at) THEN 'fulfilled_on_time' WHEN received_at IS NOT NULL THEN 'fulfilled_late' WHEN effective_due_at IS NOT NULL AND now()>effective_due_at THEN 'overdue' ELSE 'open' END AS state FROM projected ORDER BY opened_at,id",[debateId])
 ]);
 return {debate:head.rows[0],submissions:submissions.rows,questions:questions.rows,answers:answers.rows,assessments:assessments.rows,objections:objections.rows,branches:branches.rows,policyProposals:agreements.rows,obligations:obligations.rows};
}
