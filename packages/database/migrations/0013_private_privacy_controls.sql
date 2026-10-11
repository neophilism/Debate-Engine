-- Private, append-only privacy control history. Never published in public debate APIs.
CREATE TABLE IF NOT EXISTS private_assessment_privacy_events (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_account_id uuid NOT NULL REFERENCES accounts(id),
 action text NOT NULL CHECK(action IN ('improvement_consent_revoked')),
 details jsonb NOT NULL DEFAULT '{}'::jsonb,
 created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS private_assessment_privacy_events_owner ON private_assessment_privacy_events(owner_account_id,created_at DESC);
CREATE TRIGGER pde_privacy_events_immutable BEFORE UPDATE OR DELETE ON private_assessment_privacy_events FOR EACH ROW EXECUTE FUNCTION pde_block_any_mutation();
REVOKE ALL ON private_assessment_privacy_events FROM PUBLIC;
