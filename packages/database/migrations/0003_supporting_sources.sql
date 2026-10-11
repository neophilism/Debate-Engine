-- Supporting sources are appended to a published candidate contribution, never rewritten.
CREATE TABLE IF NOT EXISTS submission_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id uuid NOT NULL REFERENCES submissions(id),
  uploaded_by_candidacy_id uuid NOT NULL REFERENCES candidacies(id),
  filename text NOT NULL CHECK (length(trim(filename)) BETWEEN 1 AND 240),
  storage_key text NOT NULL UNIQUE,
  sha256 char(64) NOT NULL CHECK (sha256 ~ '^[0-9a-f]{64}$'),
  size_bytes bigint NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 20971520),
  mime_type text NOT NULL CHECK (mime_type IN ('application/pdf','text/plain','application/vnd.openxmlformats-officedocument.wordprocessingml.document')),
  label text NOT NULL CHECK (length(trim(label)) BETWEEN 1 AND 240),
  supersedes_document_id uuid REFERENCES submission_documents(id),
  published_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(id,submission_id)
);
CREATE INDEX IF NOT EXISTS submission_documents_read_idx ON submission_documents(submission_id,published_at,id);
CREATE TRIGGER pde_submission_documents_immutable BEFORE UPDATE OR DELETE ON submission_documents
 FOR EACH ROW EXECUTE FUNCTION public.pde_block_any_mutation();
