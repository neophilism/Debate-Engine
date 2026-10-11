-- PDE-19: immutable acceptance history, reversible *current endorsement* without erasure.
CREATE TABLE policy_endorsement_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 policy_version_id uuid NOT NULL,
 content_sha256 char(64) NOT NULL CHECK(content_sha256 ~ '^[0-9a-f]{64}$'),
 candidacy_id uuid NOT NULL REFERENCES candidacies(id),
 action text NOT NULL CHECK(action IN ('accept','withdraw')),
 occurred_at timestamptz NOT NULL DEFAULT now(),
 event_order bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
 FOREIGN KEY (policy_version_id,content_sha256) REFERENCES policy_versions(id,content_sha256)
);
-- Existing immutable policy_acceptances represent the first historical acceptance by each candidate.
INSERT INTO policy_endorsement_events(policy_version_id,content_sha256,candidacy_id,action,occurred_at)
 SELECT policy_version_id,content_sha256,candidacy_id,'accept',signed_at FROM policy_acceptances;
CREATE INDEX policy_endorsement_latest_idx ON policy_endorsement_events
 (policy_version_id,candidacy_id,event_order DESC);
CREATE OR REPLACE FUNCTION pde_guard_policy_endorsement() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE originator uuid;contender uuid;actual_digest char(64);
BEGIN
 SELECT d.originator_candidacy_id,b.responder_candidacy_id,p.content_sha256
  INTO originator,contender,actual_digest
  FROM policy_versions p JOIN debate_branches b ON b.id=p.branch_id
  JOIN debates d ON d.id=b.debate_id WHERE p.id=NEW.policy_version_id;
 IF actual_digest IS DISTINCT FROM NEW.content_sha256
  OR NEW.candidacy_id IS NULL
  OR NOT (NEW.candidacy_id=ANY(ARRAY[originator,contender])) THEN
  RAISE EXCEPTION 'Policy event requires a matching version and authorized branch candidate' USING ERRCODE='23514';
 END IF;
 IF NEW.action='accept' AND NOT EXISTS(
   SELECT 1 FROM policy_acceptances a WHERE a.policy_version_id=NEW.policy_version_id AND a.candidacy_id=NEW.candidacy_id
 ) THEN
  RAISE EXCEPTION 'First policy endorsement needs an immutable acceptance record' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER pde_policy_endorsement_actor BEFORE INSERT ON policy_endorsement_events
 FOR EACH ROW EXECUTE FUNCTION pde_guard_policy_endorsement();
CREATE TRIGGER pde_policy_endorsement_immutable BEFORE UPDATE OR DELETE ON policy_endorsement_events
 FOR EACH ROW EXECUTE FUNCTION pde_block_any_mutation();
