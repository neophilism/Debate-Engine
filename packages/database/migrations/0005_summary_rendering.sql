ALTER TABLE derivative_artifacts ADD COLUMN IF NOT EXISTS manifest_sha256 char(64);
ALTER TABLE derivative_artifacts ADD COLUMN IF NOT EXISTS rendered_storage_key text;
ALTER TABLE derivative_artifacts ADD COLUMN IF NOT EXISTS duration_seconds numeric(12,3);
ALTER TABLE derivative_artifacts ADD COLUMN IF NOT EXISTS rendered_at timestamptz;
UPDATE derivative_artifacts SET manifest_sha256=output_sha256 WHERE manifest_sha256 IS NULL;
ALTER TABLE derivative_artifacts ALTER COLUMN manifest_sha256 SET NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS derivative_artifacts_rendered_storage_idx ON derivative_artifacts(rendered_storage_key) WHERE rendered_storage_key IS NOT NULL;
