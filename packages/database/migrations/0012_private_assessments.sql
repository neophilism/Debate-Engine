-- Assessment records are private to their author and have no public scoreboard.
CREATE TABLE private_debate_assessment_runs (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 account_id uuid NOT NULL REFERENCES accounts(id),
 candidacy_id uuid NOT NULL REFERENCES candidacies(id),
 phase text NOT NULL CHECK (phase IN ('preliminary','final')),
 source_digest char(64) NOT NULL CHECK(source_digest ~ '^[0-9a-f]{64}$'),
 model_id text NOT NULL,
 assessment jsonb NOT NULL CHECK (jsonb_typeof(assessment)='object'),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE private_debate_assessment_feedback (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 run_id uuid NOT NULL REFERENCES private_debate_assessment_runs(id),
 account_id uuid NOT NULL REFERENCES accounts(id),
 finding_id text NOT NULL,
 feedback text NOT NULL CHECK(feedback IN ('accepted','rejected','uncertain')),
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE private_debate_improvement_consent (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 account_id uuid NOT NULL REFERENCES accounts(id),
 opt_in boolean NOT NULL DEFAULT false,
 terms_revision text NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX private_assessment_owner_idx ON private_debate_assessment_runs(account_id,created_at DESC);
CREATE TRIGGER pde_private_runs_immutable BEFORE UPDATE OR DELETE ON private_debate_assessment_runs FOR EACH ROW EXECUTE FUNCTION pde_block_any_mutation();
CREATE TRIGGER pde_private_feedback_immutable BEFORE UPDATE OR DELETE ON private_debate_assessment_feedback FOR EACH ROW EXECUTE FUNCTION pde_block_any_mutation();
CREATE TRIGGER pde_private_consent_immutable BEFORE UPDATE OR DELETE ON private_debate_improvement_consent FOR EACH ROW EXECUTE FUNCTION pde_block_any_mutation();
REVOKE ALL ON private_debate_assessment_runs,private_debate_assessment_feedback,private_debate_improvement_consent FROM PUBLIC;
