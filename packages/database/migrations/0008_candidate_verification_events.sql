CREATE TABLE IF NOT EXISTS candidacy_verification_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 candidacy_id uuid NOT NULL REFERENCES candidacies(id),
 actor_account_id uuid NOT NULL REFERENCES accounts(id),
 event_type text NOT NULL CHECK(event_type IN('submitted','approved','rejected','appealed','information_requested')),
 public_reason text NOT NULL CHECK(length(trim(public_reason)) BETWEEN 10 AND 2000),
 private_explanation text CHECK(private_explanation IS NULL OR length(private_explanation) <= 4000),
 occurred_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS candidacy_verification_history ON candidacy_verification_events(candidacy_id,occurred_at,id);
CREATE TRIGGER pde_verification_events_immutable BEFORE UPDATE OR DELETE ON candidacy_verification_events
 FOR EACH ROW EXECUTE FUNCTION public.pde_block_any_mutation();
