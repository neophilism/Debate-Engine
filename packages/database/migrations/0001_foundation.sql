-- Public Debate Engine: additive foundation migration
-- PostgreSQL 18 / Neon; reviewed, explicit migration before production use.
CREATE TABLE IF NOT EXISTS schema_migrations (
  filename text PRIMARY KEY,
  sha256 char(64) NOT NULL,
  applied_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  identity_provider text NOT NULL,
  external_subject text NOT NULL,
  display_name text NOT NULL CHECK (length(trim(display_name)) > 0),
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','suspended','closed')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (identity_provider, external_subject)
);

CREATE TABLE IF NOT EXISTS offices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  title text NOT NULL,
  jurisdiction text NOT NULL
);
CREATE TABLE IF NOT EXISTS election_cycles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  office_id uuid NOT NULL REFERENCES offices(id),
  election_date date NOT NULL,
  label text NOT NULL,
  UNIQUE (office_id, election_date)
);
CREATE TABLE IF NOT EXISTS candidacies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id),
  election_id uuid NOT NULL REFERENCES election_cycles(id),
  public_name text NOT NULL,
  affiliation text,
  verification_status text NOT NULL DEFAULT 'unverified'
    CHECK (verification_status IN ('unverified','pending','verified','rejected','appealed')),
  verified_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (account_id, election_id),
  UNIQUE (id, election_id)
);
CREATE TABLE IF NOT EXISTS campaign_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidacy_id uuid NOT NULL REFERENCES candidacies(id),
  account_id uuid NOT NULL REFERENCES accounts(id),
  role text NOT NULL CHECK (role IN ('candidate','delegate','publisher','editor')),
  granted_by uuid REFERENCES accounts(id),
  granted_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz,
  CHECK (revoked_at IS NULL OR revoked_at >= granted_at)
);
CREATE INDEX IF NOT EXISTS campaign_memberships_active_idx
  ON campaign_memberships(candidacy_id, account_id) WHERE revoked_at IS NULL;

CREATE TABLE IF NOT EXISTS media_assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_candidacy_id uuid NOT NULL REFERENCES candidacies(id),
  storage_key text NOT NULL UNIQUE,
  original_sha256 char(64) NOT NULL CHECK (original_sha256 ~ '^[0-9a-f]{64}$'),
  size_bytes bigint NOT NULL CHECK (size_bytes > 0),
  mime_type text NOT NULL,
  duration_seconds numeric(12,3) CHECK (duration_seconds IS NULL OR duration_seconds > 0),
  processing_status text NOT NULL DEFAULT 'quarantined'
    CHECK (processing_status IN ('quarantined','validating','ready','rejected')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS debates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  election_id uuid NOT NULL REFERENCES election_cycles(id),
  originator_candidacy_id uuid NOT NULL,
  title text NOT NULL CHECK (length(trim(title)) > 0),
  proposition text NOT NULL CHECK (length(trim(proposition)) > 0),
  opening_question_limit integer NOT NULL DEFAULT 3 CHECK (opening_question_limit BETWEEN 1 AND 3),
  max_response_seconds integer NOT NULL CHECK (max_response_seconds > 0),
  reply_window_hours integer CHECK (reply_window_hours IS NULL OR reply_window_hours > 0),
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','published')),
  published_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT debates_originator_election_fk
    FOREIGN KEY (originator_candidacy_id, election_id)
    REFERENCES candidacies(id, election_id),
  CHECK ((status = 'draft' AND published_at IS NULL) OR (status = 'published' AND published_at IS NOT NULL))
);
CREATE INDEX IF NOT EXISTS debates_published_idx ON debates(published_at DESC)
  WHERE status = 'published';

CREATE TABLE IF NOT EXISTS debate_branches (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id uuid NOT NULL REFERENCES debates(id),
  responder_candidacy_id uuid NOT NULL REFERENCES candidacies(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (debate_id, responder_candidacy_id),
  UNIQUE (id, debate_id)
);

CREATE TABLE IF NOT EXISTS submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id uuid NOT NULL REFERENCES debates(id),
  branch_id uuid,
  candidacy_id uuid NOT NULL REFERENCES candidacies(id),
  parent_submission_id uuid REFERENCES submissions(id),
  media_asset_id uuid NOT NULL REFERENCES media_assets(id),
  kind text NOT NULL CHECK (kind IN ('opening','response','reply','correction')),
  rules_version integer NOT NULL DEFAULT 1 CHECK (rules_version > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz,
  CONSTRAINT submissions_branch_debate_fk FOREIGN KEY (branch_id, debate_id)
    REFERENCES debate_branches(id, debate_id),
  CHECK ((kind = 'opening' AND branch_id IS NULL AND parent_submission_id IS NULL)
      OR (kind <> 'opening' AND branch_id IS NOT NULL))
);
CREATE UNIQUE INDEX IF NOT EXISTS one_opening_per_debate ON submissions(debate_id)
  WHERE kind = 'opening';
CREATE INDEX IF NOT EXISTS submissions_public_idx ON submissions(debate_id, published_at, id)
  WHERE published_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS submissions_branch_idx ON submissions(branch_id, published_at);

CREATE TABLE IF NOT EXISTS questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES submissions(id),
  asked_by_candidacy_id uuid NOT NULL REFERENCES candidacies(id),
  ordinal integer NOT NULL CHECK (ordinal > 0),
  question_text text NOT NULL CHECK (length(trim(question_text)) > 0),
  video_timestamp_seconds numeric(12,3) NOT NULL CHECK (video_timestamp_seconds >= 0),
  UNIQUE (submission_id, ordinal)
);
CREATE TABLE IF NOT EXISTS answers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES submissions(id),
  question_id uuid NOT NULL REFERENCES questions(id),
  video_timestamp_seconds numeric(12,3) NOT NULL CHECK (video_timestamp_seconds >= 0),
  explanation text,
  UNIQUE (submission_id, question_id)
);

CREATE TABLE IF NOT EXISTS assessments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question_id uuid NOT NULL REFERENCES questions(id),
  answer_submission_id uuid NOT NULL REFERENCES submissions(id),
  reviewer_candidacy_id uuid NOT NULL REFERENCES candidacies(id),
  decision text NOT NULL CHECK (decision IN ('answered','partly_answered','not_answered','disputed_premise')),
  reasoning text NOT NULL CHECK (length(trim(reasoning)) > 0),
  supersedes_assessment_id uuid REFERENCES assessments(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, question_id)
);
CREATE INDEX IF NOT EXISTS assessments_latest_idx
  ON assessments(question_id, answer_submission_id, created_at DESC, id DESC);

CREATE TABLE IF NOT EXISTS assessment_objections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES assessments(id),
  objecting_candidacy_id uuid NOT NULL REFERENCES candidacies(id),
  objection text NOT NULL CHECK (length(trim(objection)) > 0),
  video_timestamp_seconds numeric(12,3) CHECK (video_timestamp_seconds IS NULL OR video_timestamp_seconds >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS policy_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES debate_branches(id),
  proposed_by_candidacy_id uuid NOT NULL REFERENCES candidacies(id),
  content_sha256 char(64) NOT NULL CHECK (content_sha256 ~ '^[0-9a-f]{64}$'),
  policy_body text NOT NULL,
  parent_version_id uuid REFERENCES policy_versions(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, content_sha256)
);
CREATE TABLE IF NOT EXISTS policy_acceptances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  policy_version_id uuid NOT NULL,
  content_sha256 char(64) NOT NULL,
  candidacy_id uuid NOT NULL REFERENCES candidacies(id),
  signed_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (policy_version_id, content_sha256) REFERENCES policy_versions(id, content_sha256),
  UNIQUE (policy_version_id, candidacy_id)
);

CREATE TABLE IF NOT EXISTS publication_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id uuid NOT NULL REFERENCES debates(id),
  branch_id uuid REFERENCES debate_branches(id),
  actor_candidacy_id uuid REFERENCES candidacies(id),
  kind text NOT NULL,
  object_id uuid NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  published_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS publication_events_timeline_idx
  ON publication_events(debate_id, published_at ASC, id ASC);

CREATE TABLE IF NOT EXISTS sequence_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES debate_branches(id),
  revision integer NOT NULL CHECK (revision > 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (branch_id, revision)
);
CREATE TABLE IF NOT EXISTS sequence_entries (
  sequence_version_id uuid NOT NULL REFERENCES sequence_versions(id),
  position integer NOT NULL CHECK (position > 0),
  submission_id uuid NOT NULL REFERENCES submissions(id),
  PRIMARY KEY (sequence_version_id, position),
  UNIQUE (sequence_version_id, submission_id)
);

CREATE TABLE IF NOT EXISTS media_permissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  candidate_id uuid NOT NULL REFERENCES candidacies(id),
  media_asset_id uuid NOT NULL REFERENCES media_assets(id),
  permission text NOT NULL CHECK (permission IN ('archive','sequence','edit','distribute')),
  artifact_sha256 char(64) CHECK (artifact_sha256 IS NULL OR artifact_sha256 ~ '^[0-9a-f]{64}$'),
  scope jsonb NOT NULL DEFAULT '{}'::jsonb,
  granted_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS derivative_artifacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  branch_id uuid NOT NULL REFERENCES debate_branches(id),
  output_sha256 char(64) NOT NULL CHECK (output_sha256 ~ '^[0-9a-f]{64}$'),
  source_manifest jsonb NOT NULL,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft','awaiting_approval','approved','released')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (id, output_sha256)
);
CREATE TABLE IF NOT EXISTS derivative_approvals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  artifact_id uuid NOT NULL,
  output_sha256 char(64) NOT NULL,
  candidacy_id uuid NOT NULL REFERENCES candidacies(id),
  approved_at timestamptz NOT NULL DEFAULT now(),
  FOREIGN KEY (artifact_id, output_sha256) REFERENCES derivative_artifacts(id, output_sha256),
  UNIQUE (artifact_id, candidacy_id)
);

CREATE TABLE IF NOT EXISTS durable_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_type text NOT NULL,
  dedupe_key text NOT NULL,
  arguments jsonb NOT NULL DEFAULT '{}'::jsonb,
  state text NOT NULL DEFAULT 'queued' CHECK (state IN ('queued','running','completed','failed')),
  attempt_count integer NOT NULL DEFAULT 0 CHECK (attempt_count >= 0),
  available_at timestamptz NOT NULL DEFAULT now(),
  leased_until timestamptz,
  finished_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (job_type, dedupe_key)
);
CREATE INDEX IF NOT EXISTS durable_jobs_ready_idx
  ON durable_jobs(available_at, id) WHERE state IN ('queued','failed');

CREATE TABLE IF NOT EXISTS outgoing_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_type text NOT NULL,
  destination text NOT NULL,
  dedupe_key text NOT NULL,
  payload jsonb NOT NULL,
  state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','sending','accepted','failed')),
  provider_receipt text,
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  last_attempt_at timestamptz,
  UNIQUE (action_type, destination, dedupe_key)
);
CREATE TABLE IF NOT EXISTS audit_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_account_id uuid REFERENCES accounts(id),
  action text NOT NULL,
  target_kind text NOT NULL,
  target_id uuid NOT NULL,
  context jsonb NOT NULL DEFAULT '{}'::jsonb,
  occurred_at timestamptz NOT NULL DEFAULT now()
);

-- Guard immutable evidence from accidental or malicious ordinary mutations.
CREATE OR REPLACE FUNCTION public.pde_block_any_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  RAISE EXCEPTION 'Published evidence is append-only (%).', TG_TABLE_NAME USING ERRCODE = '55000';
END; $$;
CREATE OR REPLACE FUNCTION public.pde_block_published_submission_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.published_at IS NOT NULL THEN
    RAISE EXCEPTION 'Published submission cannot be modified or removed.' USING ERRCODE = '55000';
  END IF;
  RETURN OLD;
END; $$;
CREATE OR REPLACE FUNCTION public.pde_block_published_debate_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.published_at IS NOT NULL THEN
    RAISE EXCEPTION 'Published debate cannot be modified or removed.' USING ERRCODE = '55000';
  END IF;
  RETURN OLD;
END; $$;
CREATE OR REPLACE FUNCTION public.pde_guard_question_or_answer() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE target_submission uuid;
BEGIN
  target_submission := CASE WHEN TG_OP = 'DELETE' THEN OLD.submission_id ELSE NEW.submission_id END;
  IF EXISTS (SELECT 1 FROM submissions s WHERE s.id = target_submission AND s.published_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Questions and answers attached to published videos are immutable.' USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'UPDATE' AND NEW.submission_id IS DISTINCT FROM OLD.submission_id
    AND EXISTS (SELECT 1 FROM submissions s WHERE s.id = OLD.submission_id AND s.published_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Published question or answer cannot be reassigned.' USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END; $$;
CREATE OR REPLACE FUNCTION public.pde_guard_media_asset() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM submissions s WHERE s.media_asset_id = OLD.id AND s.published_at IS NOT NULL) THEN
    RAISE EXCEPTION 'Published source media cannot be altered or removed.' USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END; $$;
CREATE OR REPLACE FUNCTION public.pde_guard_assessment() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE question_owner uuid; question_debate uuid; answer_debate uuid; answer_author uuid;
BEGIN
  SELECT q.asked_by_candidacy_id, s.debate_id INTO question_owner, question_debate
    FROM questions q JOIN submissions s ON s.id = q.submission_id WHERE q.id = NEW.question_id;
  SELECT s.debate_id, s.candidacy_id INTO answer_debate, answer_author
    FROM submissions s WHERE s.id = NEW.answer_submission_id;
  IF question_owner IS DISTINCT FROM NEW.reviewer_candidacy_id THEN
    RAISE EXCEPTION 'Only the candidate who asked the question may assess it.' USING ERRCODE = '23514';
  END IF;
  IF question_debate IS DISTINCT FROM answer_debate OR answer_author = question_owner THEN
    RAISE EXCEPTION 'Assessment must refer to an opponent response in the same debate.' USING ERRCODE = '23514';
  END IF;
  IF NEW.supersedes_assessment_id IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM assessments a WHERE a.id = NEW.supersedes_assessment_id AND a.question_id = NEW.question_id
    AND a.answer_submission_id = NEW.answer_submission_id AND a.reviewer_candidacy_id = NEW.reviewer_candidacy_id
  ) THEN
    RAISE EXCEPTION 'Assessment reversal must refer to the same question, response and reviewer.' USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS pde_publication_events_immutable ON publication_events;
CREATE TRIGGER pde_publication_events_immutable BEFORE UPDATE OR DELETE ON publication_events
  FOR EACH ROW EXECUTE FUNCTION public.pde_block_any_mutation();
DROP TRIGGER IF EXISTS pde_assessments_immutable ON assessments;
CREATE TRIGGER pde_assessments_immutable BEFORE UPDATE OR DELETE ON assessments
  FOR EACH ROW EXECUTE FUNCTION public.pde_block_any_mutation();
DROP TRIGGER IF EXISTS pde_objections_immutable ON assessment_objections;
CREATE TRIGGER pde_objections_immutable BEFORE UPDATE OR DELETE ON assessment_objections
  FOR EACH ROW EXECUTE FUNCTION public.pde_block_any_mutation();
DROP TRIGGER IF EXISTS pde_policy_acceptances_immutable ON policy_acceptances;
CREATE TRIGGER pde_policy_acceptances_immutable BEFORE UPDATE OR DELETE ON policy_acceptances
  FOR EACH ROW EXECUTE FUNCTION public.pde_block_any_mutation();
DROP TRIGGER IF EXISTS pde_derivative_approvals_immutable ON derivative_approvals;
CREATE TRIGGER pde_derivative_approvals_immutable BEFORE UPDATE OR DELETE ON derivative_approvals
  FOR EACH ROW EXECUTE FUNCTION public.pde_block_any_mutation();
DROP TRIGGER IF EXISTS pde_media_permissions_immutable ON media_permissions;
CREATE TRIGGER pde_media_permissions_immutable BEFORE UPDATE OR DELETE ON media_permissions
  FOR EACH ROW EXECUTE FUNCTION public.pde_block_any_mutation();
DROP TRIGGER IF EXISTS pde_audit_events_immutable ON audit_events;
CREATE TRIGGER pde_audit_events_immutable BEFORE UPDATE OR DELETE ON audit_events
  FOR EACH ROW EXECUTE FUNCTION public.pde_block_any_mutation();
DROP TRIGGER IF EXISTS pde_published_submissions_immutable ON submissions;
CREATE TRIGGER pde_published_submissions_immutable BEFORE UPDATE OR DELETE ON submissions
  FOR EACH ROW EXECUTE FUNCTION public.pde_block_published_submission_mutation();
DROP TRIGGER IF EXISTS pde_published_debates_immutable ON debates;
CREATE TRIGGER pde_published_debates_immutable BEFORE UPDATE OR DELETE ON debates
  FOR EACH ROW EXECUTE FUNCTION public.pde_block_published_debate_mutation();
DROP TRIGGER IF EXISTS pde_questions_guard ON questions;
CREATE TRIGGER pde_questions_guard BEFORE INSERT OR UPDATE OR DELETE ON questions
  FOR EACH ROW EXECUTE FUNCTION public.pde_guard_question_or_answer();
DROP TRIGGER IF EXISTS pde_answers_guard ON answers;
CREATE TRIGGER pde_answers_guard BEFORE INSERT OR UPDATE OR DELETE ON answers
  FOR EACH ROW EXECUTE FUNCTION public.pde_guard_question_or_answer();
DROP TRIGGER IF EXISTS pde_media_guard ON media_assets;
CREATE TRIGGER pde_media_guard BEFORE UPDATE OR DELETE ON media_assets
  FOR EACH ROW EXECUTE FUNCTION public.pde_guard_media_asset();
DROP TRIGGER IF EXISTS pde_assessment_authority ON assessments;
CREATE TRIGGER pde_assessment_authority BEFORE INSERT ON assessments
  FOR EACH ROW EXECUTE FUNCTION public.pde_guard_assessment();

-- Future authentication handlers must use transactions, trusted identity,
-- server-side permissions, and independent public evidence storage.
