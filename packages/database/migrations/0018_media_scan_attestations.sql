-- Store immutable evidence that an original passed its configured scanner.
CREATE TABLE media_scan_attestations (
 media_asset_id uuid PRIMARY KEY REFERENCES media_assets(id),
 original_sha256 char(64) NOT NULL CHECK(original_sha256 ~ '^[0-9a-f]{64}$'),
 scanner text NOT NULL CHECK(scanner='clamav'),
 verdict text NOT NULL CHECK(verdict='clean'),
 scanned_at timestamptz NOT NULL DEFAULT now()
);
CREATE OR REPLACE FUNCTION pde_check_scan_binding() RETURNS trigger LANGUAGE plpgsql AS $scan_guard$
DECLARE expected char(64);state text;
BEGIN
 SELECT m.original_sha256,m.processing_status INTO expected,state FROM media_assets m WHERE m.id=NEW.media_asset_id;
 IF expected IS DISTINCT FROM NEW.original_sha256 OR state IS DISTINCT FROM 'ready' THEN
  RAISE EXCEPTION 'Scanner evidence does not match validated original bytes' USING ERRCODE='23514';
 END IF;
 RETURN NEW;
END $scan_guard$;
CREATE TRIGGER pde_media_scan_binding BEFORE INSERT ON media_scan_attestations
 FOR EACH ROW EXECUTE FUNCTION pde_check_scan_binding();
CREATE TRIGGER pde_media_scan_immutable BEFORE UPDATE OR DELETE ON media_scan_attestations FOR EACH ROW EXECUTE FUNCTION pde_block_any_mutation();
