-- Source media selection is immutable once an originator publishes.
-- Existing debates and submissions remain video-only; no published records are rewritten.
ALTER TABLE debates ADD COLUMN allowed_modalities text[] NOT NULL DEFAULT ARRAY['video']::text[];
ALTER TABLE debates ADD CONSTRAINT debates_modalities_valid CHECK (
 cardinality(allowed_modalities) BETWEEN 1 AND 3
 AND allowed_modalities <@ ARRAY['video','audio','writing']::text[]
 AND array_position(allowed_modalities,NULL) IS NULL
 AND cardinality(array_positions(allowed_modalities,'video'))<=1
 AND cardinality(array_positions(allowed_modalities,'audio'))<=1
 AND cardinality(array_positions(allowed_modalities,'writing'))<=1
);
ALTER TABLE submissions ADD COLUMN modality text NOT NULL DEFAULT 'video';
ALTER TABLE submissions ADD COLUMN written_content text;
ALTER TABLE submissions ALTER COLUMN media_asset_id DROP NOT NULL;
ALTER TABLE submissions ADD CONSTRAINT submission_modality_valid CHECK (
 (modality IN ('video','audio') AND media_asset_id IS NOT NULL AND written_content IS NULL)
 OR (modality='writing' AND media_asset_id IS NULL AND written_content IS NOT NULL
  AND length(btrim(written_content)) BETWEEN 1 AND 100000)
);
ALTER TABLE questions ALTER COLUMN video_timestamp_seconds DROP NOT NULL;
ALTER TABLE questions ADD COLUMN written_anchor text;
ALTER TABLE questions ADD CONSTRAINT questions_reference_valid CHECK (
 (video_timestamp_seconds IS NOT NULL AND written_anchor IS NULL)
 OR (video_timestamp_seconds IS NULL AND written_anchor ~ '^char:[0-9]{1,6}$')
);
ALTER TABLE answers ALTER COLUMN video_timestamp_seconds DROP NOT NULL;
ALTER TABLE answers ADD COLUMN written_anchor text;
ALTER TABLE answers ADD CONSTRAINT answers_reference_valid CHECK (
 (video_timestamp_seconds IS NOT NULL AND written_anchor IS NULL)
 OR (video_timestamp_seconds IS NULL AND written_anchor ~ '^char:[0-9]{1,6}$')
);
CREATE OR REPLACE FUNCTION pde_validate_submission_modality() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE allowed text[]; underlying_mime text;
BEGIN
 SELECT allowed_modalities INTO allowed FROM debates WHERE id=NEW.debate_id;
 IF allowed IS NULL OR NOT (NEW.modality=ANY(allowed)) THEN
  RAISE EXCEPTION 'This debate does not permit the requested contribution medium' USING ERRCODE='23514';
 END IF;
 IF NEW.modality <> 'writing' THEN
  SELECT mime_type INTO underlying_mime FROM media_assets WHERE id=NEW.media_asset_id;
  IF (NEW.modality='video' AND underlying_mime NOT LIKE 'video/%')
   OR (NEW.modality='audio' AND underlying_mime NOT LIKE 'audio/%') THEN
   RAISE EXCEPTION 'Media asset type does not match contribution medium' USING ERRCODE='23514';
  END IF;
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER pde_submission_modality_guard BEFORE INSERT OR UPDATE OF modality,media_asset_id,debate_id,written_content ON submissions
 FOR EACH ROW EXECUTE FUNCTION pde_validate_submission_modality();
-- Existing immutable-publication triggers still guard against changing published content or enabled formats.
