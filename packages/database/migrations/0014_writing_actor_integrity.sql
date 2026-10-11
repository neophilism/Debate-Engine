-- PDE-44: preserve strong author/source ownership for video and audio, while allowing media-free writing.
-- Written contributions must contain authored text, and may not borrow media IDs.
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
  IF NEW.modality = 'writing' THEN
    IF NEW.media_asset_id IS NOT NULL OR NULLIF(btrim(NEW.written_content),'') IS NULL THEN
      RAISE EXCEPTION 'Written contributions require text and no media asset.' USING ERRCODE='23514';
    END IF;
  ELSE
    SELECT m.owner_candidacy_id INTO asset_owner FROM media_assets m WHERE m.id=NEW.media_asset_id;
    IF asset_owner IS DISTINCT FROM NEW.candidacy_id THEN
      RAISE EXCEPTION 'Source media must belong to its credited candidate.' USING ERRCODE='23514';
    END IF;
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
      RAISE EXCEPTION 'A reciprocal contribution requires a parent submission.' USING ERRCODE='23514';
    END IF;
  END IF;
  RETURN NEW;
END; $$;
