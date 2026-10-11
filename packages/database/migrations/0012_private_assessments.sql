-- Private editorial assessment is never part of public debate/sequence queries.
-- Only the original author of a draft can review its report or approve publication.
CREATE TABLE private_submission_drafts(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 candidacy_id uuid NOT NULL REFERENCES candidacies(id),
 owner_account_id uuid NOT NULL REFERENCES accounts(id),
 kind text NOT NULL CHECK(kind IN ('opening','response')),
 debate_id uuid REFERENCES debates(id),
 parent_submission_id uuid REFERENCES submissions(id),
 modality text NOT NULL CHECK(modality IN ('video','audio','writing')),
 payload jsonb NOT NULL CHECK(jsonb_typeof(payload)='object'),
 transcript_text text,
 content_sha256 char(64) NOT NULL CHECK(content_sha256 ~ '^[a-f0-9]{64}$'),
 provider_consent boolean NOT NULL DEFAULT false,
 improvement_consent boolean NOT NULL DEFAULT false,
 status text NOT NULL DEFAULT 'draft' CHECK(status IN ('draft','reviewed','confirming','published')),
 skipped_preliminary boolean NOT NULL DEFAULT false,
 published_submission_id uuid UNIQUE REFERENCES submissions(id),
 published_debate_id uuid REFERENCES debates(id),
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now(),
 CHECK ((kind='opening' AND debate_id IS NULL AND parent_submission_id IS NULL)
 OR (kind='response' AND debate_id IS NOT NULL AND parent_submission_id IS NOT NULL))
);
CREATE INDEX private_drafts_owner_idx ON private_submission_drafts(owner_account_id,updated_at DESC);
CREATE TABLE private_debate_assessments(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 draft_id uuid NOT NULL REFERENCES private_submission_drafts(id) ON DELETE CASCADE,
 owner_account_id uuid NOT NULL REFERENCES accounts(id),
 stage text NOT NULL CHECK(stage IN ('preliminary','final')),
 content_sha256 char(64) NOT NULL CHECK(content_sha256 ~ '^[a-f0-9]{64}$'),
 model_provider text NOT NULL,
 model_name text NOT NULL,
 findings jsonb NOT NULL CHECK(jsonb_typeof(findings)='object'),
 generated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX private_assessments_draft_idx ON private_debate_assessments(draft_id,stage,generated_at DESC);
CREATE TABLE private_assessment_feedback(
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 assessment_id uuid NOT NULL REFERENCES private_debate_assessments(id) ON DELETE CASCADE,
 owner_account_id uuid NOT NULL REFERENCES accounts(id),
 finding_id text NOT NULL CHECK(length(finding_id) BETWEEN 1 AND 120),
 choice text NOT NULL CHECK(choice IN ('accept','reject','uncertain')),
 note text CHECK(length(note)<=2000),
 improvement_opt_in boolean NOT NULL DEFAULT false,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX private_feedback_owner_idx ON private_assessment_feedback(owner_account_id,created_at DESC);
ALTER TABLE submissions ADD COLUMN origin_draft_id uuid REFERENCES private_submission_drafts(id);
CREATE UNIQUE INDEX submissions_one_publication_per_draft ON submissions(origin_draft_id) WHERE origin_draft_id IS NOT NULL;
CREATE OR REPLACE FUNCTION pde_guard_private_assessment_owner() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actual_owner uuid;
BEGIN
 IF TG_TABLE_NAME='private_debate_assessments' THEN
  SELECT owner_account_id INTO actual_owner FROM private_submission_drafts WHERE id=NEW.draft_id;
 ELSIF TG_TABLE_NAME='private_assessment_feedback' THEN
  SELECT owner_account_id INTO actual_owner FROM private_debate_assessments WHERE id=NEW.assessment_id;
 END IF;
 IF actual_owner IS DISTINCT FROM NEW.owner_account_id THEN
  RAISE EXCEPTION 'The private report owner must be the draft account owner' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER private_assessment_owner_insert BEFORE INSERT ON private_debate_assessments
 FOR EACH ROW EXECUTE FUNCTION pde_guard_private_assessment_owner();
CREATE TRIGGER private_assessment_feedback_owner_insert BEFORE INSERT ON private_assessment_feedback
 FOR EACH ROW EXECUTE FUNCTION pde_guard_private_assessment_owner();
-- No publication_events, public API views, or public cached DTOs may include these tables.
