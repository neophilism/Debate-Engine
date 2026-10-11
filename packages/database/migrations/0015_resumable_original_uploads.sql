-- PDE-07: candidate-owned upload sessions. Every published media asset remains separate and immutable.
-- 8 MiB multipart pieces, maximum 60 MiB until the streaming probe/virus-scan gate is complete.
CREATE TABLE media_upload_sessions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 owner_candidacy_id uuid NOT NULL REFERENCES candidacies(id),
 media_asset_id uuid NOT NULL DEFAULT gen_random_uuid() UNIQUE,
 storage_key text NOT NULL UNIQUE,
 storage_upload_id text NOT NULL,
 modality text NOT NULL CHECK(modality IN ('video','audio')),
 claimed_mime text NOT NULL,
 expected_sha256 char(64) NOT NULL CHECK(expected_sha256 ~ '^[0-9a-f]{64}$'),
 declared_size_bytes bigint NOT NULL CHECK(declared_size_bytes BETWEEN 64 AND 62914560),
 part_count integer NOT NULL CHECK(part_count BETWEEN 1 AND 8),
 part_size_bytes integer NOT NULL DEFAULT 8388608 CHECK(part_size_bytes = 8388608),
 status text NOT NULL DEFAULT 'uploading'
  CHECK(status IN ('uploading','finalizing','completed','failed','aborted')),
 expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours'),
 completed_at timestamptz,
 created_at timestamptz NOT NULL DEFAULT now(),
 CHECK((status='completed')=(completed_at IS NOT NULL)),
 CHECK(part_count = ((declared_size_bytes + part_size_bytes - 1)/part_size_bytes))
);
CREATE INDEX media_upload_owner_idx ON media_upload_sessions(owner_candidacy_id,created_at DESC);
CREATE INDEX media_upload_expiry_idx ON media_upload_sessions(expires_at)
 WHERE status IN ('uploading','finalizing');
-- A session can only be completed with a separately validated media_assets row.
