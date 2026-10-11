-- One continuing public response per predecessor and contender branch.
-- Corrections remain separately linked immutable publications.
CREATE UNIQUE INDEX IF NOT EXISTS one_continuing_reply_per_parent
  ON submissions(branch_id,parent_submission_id)
  WHERE branch_id IS NOT NULL AND parent_submission_id IS NOT NULL AND kind <> 'correction';
CREATE INDEX IF NOT EXISTS policy_versions_branch_recent ON policy_versions(branch_id,created_at DESC,id DESC);
CREATE INDEX IF NOT EXISTS response_issues_by_question ON assessments(question_id,answer_submission_id,created_at DESC);
