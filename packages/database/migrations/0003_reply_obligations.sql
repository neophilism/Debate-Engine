-- PDE-14: server-authoritative reply/review obligations and idempotent reminders.
CREATE TABLE IF NOT EXISTS reply_obligations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  debate_id uuid NOT NULL REFERENCES debates(id),
  branch_id uuid NOT NULL REFERENCES debate_branches(id),
  source_submission_id uuid NOT NULL REFERENCES submissions(id),
  obligated_candidacy_id uuid NOT NULL REFERENCES candidacies(id),
  obligation_type text NOT NULL CHECK (obligation_type IN ('review','reply')),
  opened_at timestamptz NOT NULL,
  due_at timestamptz,
  received_at timestamptz,
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  CHECK (due_at IS NULL OR due_at >= opened_at),
  CHECK (received_at IS NULL OR received_at >= opened_at),
  CHECK (processed_at IS NULL OR (received_at IS NOT NULL AND processed_at >= received_at)),
  UNIQUE (branch_id, source_submission_id, obligated_candidacy_id, obligation_type)
);
CREATE INDEX IF NOT EXISTS reply_obligations_due_idx
  ON reply_obligations(due_at, id) WHERE received_at IS NULL AND due_at IS NOT NULL;

CREATE TABLE IF NOT EXISTS obligation_outage_adjustments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  obligation_id uuid NOT NULL REFERENCES reply_obligations(id),
  seconds integer NOT NULL CHECK (seconds > 0),
  public_reason text NOT NULL CHECK (length(trim(public_reason)) > 0),
  authorized_by uuid REFERENCES accounts(id),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (obligation_id, id)
);

CREATE TRIGGER pde_obligation_outage_adjustments_immutable
  BEFORE UPDATE OR DELETE ON obligation_outage_adjustments
  FOR EACH ROW EXECUTE FUNCTION public.pde_block_any_mutation();

-- Existing durable_jobs and outgoing_actions uniqueness constraints make repeated
-- deadline scans and provider retries idempotent when callers use obligation/phase/due-time keys.
