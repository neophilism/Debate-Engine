-- Record debate-format problems instead of hiding technically safe candidate speech.
-- Content remains published and immutable; only sequence eligibility changes.
ALTER TABLE submissions ADD COLUMN IF NOT EXISTS format_issues jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE submissions ADD CONSTRAINT submission_format_issues_array CHECK(jsonb_typeof(format_issues)='array' AND jsonb_array_length(format_issues)<=10);
