-- Candidate-controlled privacy retirement without changing published public evidence.
-- Published speech remains in submissions; private drafts and advisory reports can be erased.
ALTER TABLE private_submission_drafts ADD COLUMN privacy_erased_at timestamptz;
CREATE INDEX private_drafts_erasure_idx ON private_submission_drafts(privacy_erased_at) WHERE privacy_erased_at IS NOT NULL;
CREATE INDEX private_feedback_opt_in_idx ON private_assessment_feedback(assessment_id,choice)
 WHERE improvement_opt_in = true;
