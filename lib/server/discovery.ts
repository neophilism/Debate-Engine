import "server-only";
import {database} from "./db";
export async function candidateDirectory(office:string|null, election:string|null){
 const result=await database().query<{
 id:string;public_name:string;affiliation:string|null;office_title:string;office_slug:string;
 election_label:string;election_id:string;contributions:string;
 }>("SELECT c.id,c.public_name,c.affiliation,o.title AS office_title,o.slug AS office_slug,e.label AS election_label,e.id AS election_id,(SELECT count(*)::text FROM submissions s WHERE s.candidacy_id=c.id AND s.published_at IS NOT NULL) AS contributions FROM candidacies c JOIN election_cycles e ON e.id=c.election_id JOIN offices o ON o.id=e.office_id WHERE c.verification_status='verified' AND ($1::text IS NULL OR o.slug=$1) AND ($2::uuid IS NULL OR e.id=$2::uuid) ORDER BY e.election_date DESC,o.title,c.public_name LIMIT 200",[office,election]);
 return result.rows;
}
export async function candidateProfile(candidateId:string){
 const result=await database().query(
  "SELECT c.id,c.public_name,c.affiliation,c.verified_at,c.verification_status,o.title AS office_title,o.slug AS office_slug,e.label AS election_label FROM candidacies c JOIN election_cycles e ON e.id=c.election_id JOIN offices o ON o.id=e.office_id WHERE c.id=$1 AND (c.verification_status='verified' OR EXISTS(SELECT 1 FROM submissions s WHERE s.candidacy_id=c.id AND s.published_at IS NOT NULL))",[candidateId]);
 if(!result.rowCount)return null;
 const debates=await database().query(
  "SELECT d.id,d.title,d.published_at,s.id AS submission_id,s.kind FROM submissions s JOIN debates d ON d.id=s.debate_id WHERE s.candidacy_id=$1 AND s.published_at IS NOT NULL AND d.status='published' ORDER BY s.published_at DESC LIMIT 100",[candidateId]);
 return {candidate:result.rows[0],contributions:debates.rows};
}
