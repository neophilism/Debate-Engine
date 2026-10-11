-- PDE-36: append-only public candidate corrections. Original speeches/answers stay intact.
CREATE TABLE submission_corrections (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 submission_id uuid NOT NULL REFERENCES submissions(id),
 candidacy_id uuid NOT NULL REFERENCES candidacies(id),
 correction_body text NOT NULL CHECK(length(btrim(correction_body)) BETWEEN 20 AND 5000),
 created_at timestamptz NOT NULL DEFAULT now(),
 event_order bigint GENERATED ALWAYS AS IDENTITY UNIQUE
);
CREATE INDEX submission_corrections_source_idx ON submission_corrections(submission_id,event_order);
CREATE OR REPLACE FUNCTION pde_guard_published_correction() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE owner uuid;public_time timestamptz;state text;
BEGIN
 SELECT s.candidacy_id,s.published_at,d.status INTO owner,public_time,state
 FROM submissions s JOIN debates d ON d.id=s.debate_id WHERE s.id=NEW.submission_id;
 IF public_time IS NULL OR state IS DISTINCT FROM 'published' OR owner IS DISTINCT FROM NEW.candidacy_id THEN
  RAISE EXCEPTION 'Only the author may correct an already published contribution.' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER pde_correction_author BEFORE INSERT ON submission_corrections
 FOR EACH ROW EXECUTE FUNCTION pde_guard_published_correction();
CREATE TRIGGER pde_correction_immutable BEFORE UPDATE OR DELETE ON submission_corrections
 FOR EACH ROW EXECUTE FUNCTION pde_block_any_mutation();
