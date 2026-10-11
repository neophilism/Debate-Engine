ALTER TABLE durable_jobs ADD COLUMN IF NOT EXISTS lease_owner text;
ALTER TABLE durable_jobs ADD COLUMN IF NOT EXISTS lease_token uuid;
CREATE INDEX IF NOT EXISTS durable_jobs_render_leases ON durable_jobs(leased_until,id)
 WHERE job_type='render_debate_summary' AND state='running';
