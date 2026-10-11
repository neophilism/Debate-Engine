CREATE TABLE IF NOT EXISTS media_captions (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 media_asset_id uuid NOT NULL REFERENCES media_assets(id),
 published_by_candidacy_id uuid NOT NULL REFERENCES candidacies(id),
 language_code varchar(12) NOT NULL CHECK(language_code ~ '^[a-z]{2,3}(-[A-Z]{2})?$'),
 caption_text text NOT NULL CHECK(length(caption_text) BETWEEN 1 AND 250000),
 searchable_text text NOT NULL,
 reviewed_by_human boolean NOT NULL DEFAULT false,
 published_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE(media_asset_id,language_code,reviewed_by_human)
);
CREATE INDEX IF NOT EXISTS media_captions_search_idx ON media_captions USING GIN(to_tsvector('english',searchable_text));
CREATE TRIGGER pde_media_captions_immutable BEFORE UPDATE OR DELETE ON media_captions
 FOR EACH ROW EXECUTE FUNCTION pde_block_any_mutation();
