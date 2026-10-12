-- Store immutable evidence that an original passed its configured scanner.
CREATE TABLE media_scan_attestations (
 media_asset_id uuid PRIMARY KEY REFERENCES media_assets(id),
 original_sha256 char(64) NOT NULL CHECK(original_sha256 ~ '^[0-9a-f]{64}$'),
 scanner text NOT NULL CHECK(scanner='clamav'),
 verdict text NOT NULL CHECK(verdict='clean'),
 scanned_at timestamptz NOT NULL DEFAULT now()
);
CREATE TRIGGER pde_media_scan_immutable BEFORE UPDATE OR DELETE ON media_scan_attestations FOR EACH ROW EXECUTE FUNCTION pde_block_any_mutation();
