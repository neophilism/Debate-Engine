-- Least-privilege, account-linked campaign membership grants.
CREATE UNIQUE INDEX IF NOT EXISTS campaign_membership_one_active_role
 ON campaign_memberships(candidacy_id,account_id,role) WHERE revoked_at IS NULL;
CREATE INDEX IF NOT EXISTS campaign_membership_by_account
 ON campaign_memberships(account_id,candidacy_id) WHERE revoked_at IS NULL;
CREATE OR REPLACE FUNCTION pde_guard_campaign_membership() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='INSERT' THEN
  IF NEW.granted_by IS NULL THEN RAISE EXCEPTION 'A named grantor is required'; END IF;
  RETURN NEW;
 END IF;
 IF TG_OP='DELETE' THEN RAISE EXCEPTION 'Membership records must be retained'; END IF;
 IF (to_jsonb(NEW) - 'revoked_at') IS DISTINCT FROM (to_jsonb(OLD) - 'revoked_at')
   OR (OLD.revoked_at IS NOT NULL AND NEW.revoked_at IS DISTINCT FROM OLD.revoked_at)
   OR (OLD.revoked_at IS NULL AND NEW.revoked_at IS NULL) THEN
  RAISE EXCEPTION 'Only one-way membership revocation is permitted';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER pde_guard_campaign_membership_trigger BEFORE INSERT OR UPDATE OR DELETE ON campaign_memberships FOR EACH ROW EXECUTE FUNCTION pde_guard_campaign_membership();
