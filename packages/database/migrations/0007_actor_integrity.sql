-- PDE-25: enforce ownership and branch integrity in SQL as defense in depth.
-- API authentication is still required; these constraints prevent accidental cross-actor writes.
CREATE UNIQUE INDEX IF NOT EXISTS pde_one_submission_per_source ON submissions(media_asset_id);

CREATE OR REPLACE FUNCTION public.pde_guard_submission_actor() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  debate_election_id uuid;
  originator_id uuid;
  asset_owner uuid;
  branch_responder uuid;
  branch_debate uuid;
  parent_debate uuid;
  parent_actor uuid;
  parent_branch uuid;
  parent_kind text;
BEGIN
  SELECT d.election_id,d.originator_candidacy_id INTO debate_election_id,originator_id FROM debates d WHERE d.id=NEW.debate_id;
  SELECT m.owner_candidacy_id INTO asset_owner FROM media_assets m WHERE m.id=NEW.media_asset_id;
  IF asset_owner IS DISTINCT FROM NEW.candidacy_id THEN
    RAISE EXCEPTION 'Source media must belong to its credited candidate.' USING ERRCODE='23514';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM candidacies c WHERE c.id=NEW.candidacy_id AND c.election_id=debate_election_id) THEN
    RAISE EXCEPTION 'Candidate is not a participant in the debate election.' USING ERRCODE='23514';
  END IF;
  IF NEW.kind='opening' THEN
    IF NEW.candidacy_id IS DISTINCT FROM originator_id OR NEW.branch_id IS NOT NULL OR NEW.parent_submission_id IS NOT NULL THEN
      RAISE EXCEPTION 'Opening must belong to originator and have no parent branch.' USING ERRCODE='23514';
    END IF;
  ELSE
    SELECT b.debate_id,b.responder_candidacy_id INTO branch_debate,branch_responder FROM debate_branches b WHERE b.id=NEW.branch_id;
    IF branch_debate IS DISTINCT FROM NEW.debate_id OR NOT NEW.candidacy_id=ANY(ARRAY[originator_id,branch_responder]) THEN
      RAISE EXCEPTION 'Contributor is not an authorized participant of the branch.' USING ERRCODE='23514';
    END IF;
    IF NEW.parent_submission_id IS NOT NULL THEN
      SELECT s.debate_id,s.candidacy_id,s.branch_id,s.kind INTO parent_debate,parent_actor,parent_branch,parent_kind FROM submissions s WHERE s.id=NEW.parent_submission_id;
      IF parent_debate IS DISTINCT FROM NEW.debate_id OR parent_actor IS NOT DISTINCT FROM NEW.candidacy_id THEN
        RAISE EXCEPTION 'Reply must reference an opposing candidate in the same debate.' USING ERRCODE='23514';
      END IF;
      IF parent_kind<>'opening' AND parent_branch IS DISTINCT FROM NEW.branch_id THEN
        RAISE EXCEPTION 'Reply cannot jump between candidate branches.' USING ERRCODE='23514';
      END IF;
      IF NEW.kind='response' AND (parent_kind<>'opening' OR NEW.candidacy_id IS DISTINCT FROM branch_responder) THEN
        RAISE EXCEPTION 'Initial contender response must answer the opening.' USING ERRCODE='23514';
      END IF;
    ELSIF NEW.kind<>'correction' THEN
      RAISE EXCEPTION 'A reciprocal contribution requires a parent video.' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.pde_guard_question_author() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (SELECT 1 FROM submissions s WHERE s.id=NEW.submission_id AND s.candidacy_id=NEW.asked_by_candidacy_id) THEN
   RAISE EXCEPTION 'Only the source-video author can ask its questions.' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;
CREATE OR REPLACE FUNCTION public.pde_guard_answer_parent() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM submissions s JOIN questions q ON q.id=NEW.question_id
   WHERE s.id=NEW.submission_id AND s.parent_submission_id=q.submission_id
 ) THEN
   RAISE EXCEPTION 'Answer must reference a question from the immediately preceding video.' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;
CREATE OR REPLACE FUNCTION public.pde_guard_media_owner_permission() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(SELECT 1 FROM media_assets m WHERE m.id=NEW.media_asset_id AND m.owner_candidacy_id=NEW.candidate_id) THEN
   RAISE EXCEPTION 'Only original video owner can authorize its use.' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.pde_guard_assessment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE question_owner uuid; question_debate uuid; asking_submission uuid;
  answer_debate uuid; answer_author uuid; answer_parent uuid; answer_published timestamptz;
BEGIN
 SELECT q.asked_by_candidacy_id,s.debate_id,s.id INTO question_owner,question_debate,asking_submission
   FROM questions q JOIN submissions s ON s.id=q.submission_id WHERE q.id=NEW.question_id;
 SELECT s.debate_id,s.candidacy_id,s.parent_submission_id,s.published_at
   INTO answer_debate,answer_author,answer_parent,answer_published
   FROM submissions s WHERE s.id=NEW.answer_submission_id;
 IF question_owner IS DISTINCT FROM NEW.reviewer_candidacy_id OR
    question_debate IS DISTINCT FROM answer_debate OR
    answer_author IS NOT DISTINCT FROM question_owner OR
    answer_parent IS DISTINCT FROM asking_submission OR answer_published IS NULL THEN
   RAISE EXCEPTION 'Assessment must be authored by questioner about the immediately following opponent video.' USING ERRCODE='23514';
 END IF;
 IF NEW.supersedes_assessment_id IS NOT NULL AND NOT EXISTS (
   SELECT 1 FROM assessments a WHERE a.id=NEW.supersedes_assessment_id AND
     a.question_id=NEW.question_id AND
     a.answer_submission_id=NEW.answer_submission_id AND
     a.reviewer_candidacy_id=NEW.reviewer_candidacy_id
 ) THEN
   RAISE EXCEPTION 'Assessment reversal cannot refer to a different question, response or reviewer.' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.pde_guard_objection_author() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS(
   SELECT 1 FROM assessments a JOIN submissions s ON s.id=a.answer_submission_id
   WHERE a.id=NEW.assessment_id AND s.candidacy_id=NEW.objecting_candidacy_id
 ) THEN RAISE EXCEPTION 'Only the responder whose video was assessed may object.' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.pde_guard_policy_proposer() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM debate_branches b JOIN debates d ON d.id=b.debate_id
   WHERE b.id=NEW.branch_id AND NEW.proposed_by_candidacy_id=ANY(ARRAY[d.originator_candidacy_id,b.responder_candidacy_id])
 ) THEN RAISE EXCEPTION 'Policy proposer is not a branch participant.' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;
CREATE OR REPLACE FUNCTION public.pde_guard_policy_acceptor() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM policy_versions p JOIN debate_branches b ON b.id=p.branch_id JOIN debates d ON d.id=b.debate_id
   WHERE p.id=NEW.policy_version_id AND NEW.candidacy_id=ANY(ARRAY[d.originator_candidacy_id,b.responder_candidacy_id])
 ) THEN RAISE EXCEPTION 'Policy acceptance must come from a branch participant.' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;
CREATE OR REPLACE FUNCTION public.pde_guard_derivative_approver() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF NOT EXISTS (
   SELECT 1 FROM derivative_artifacts a JOIN debate_branches b ON b.id=a.branch_id JOIN debates d ON d.id=b.debate_id
   WHERE a.id=NEW.artifact_id AND a.status IN('awaiting_approval','approved') AND
     a.output_sha256=NEW.output_sha256 AND a.rendered_storage_key IS NOT NULL AND
     NEW.candidacy_id=ANY(ARRAY[d.originator_candidacy_id,b.responder_candidacy_id])
 ) THEN RAISE EXCEPTION 'Only participants can approve the exact rendered bytes.' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END; $$;

CREATE TRIGGER pde_submission_actor BEFORE INSERT OR UPDATE ON submissions
 FOR EACH ROW EXECUTE FUNCTION public.pde_guard_submission_actor();
CREATE TRIGGER pde_question_author BEFORE INSERT OR UPDATE ON questions
 FOR EACH ROW EXECUTE FUNCTION public.pde_guard_question_author();
CREATE TRIGGER pde_answer_parent BEFORE INSERT OR UPDATE ON answers
 FOR EACH ROW EXECUTE FUNCTION public.pde_guard_answer_parent();
CREATE TRIGGER pde_media_rights_owner BEFORE INSERT ON media_permissions
 FOR EACH ROW EXECUTE FUNCTION public.pde_guard_media_owner_permission();
CREATE TRIGGER pde_objection_author BEFORE INSERT ON assessment_objections
 FOR EACH ROW EXECUTE FUNCTION public.pde_guard_objection_author();
CREATE TRIGGER pde_policy_proposer BEFORE INSERT ON policy_versions
 FOR EACH ROW EXECUTE FUNCTION public.pde_guard_policy_proposer();
CREATE TRIGGER pde_policy_acceptor BEFORE INSERT ON policy_acceptances
 FOR EACH ROW EXECUTE FUNCTION public.pde_guard_policy_acceptor();
CREATE TRIGGER pde_policy_versions_immutable BEFORE UPDATE OR DELETE ON policy_versions
 FOR EACH ROW EXECUTE FUNCTION public.pde_block_any_mutation();
CREATE TRIGGER pde_derivative_approver BEFORE INSERT ON derivative_approvals
 FOR EACH ROW EXECUTE FUNCTION public.pde_guard_derivative_approver();
