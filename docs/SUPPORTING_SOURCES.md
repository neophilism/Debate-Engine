# Append-only supporting documents

Each published contribution may have additional published sources authored by that contribution's independently verified candidate. Sources are never overwritten; uploading a correction results in a new linked publication event.

Original bytes reside in the private permanent-media S3 bucket and are referenced by key. Public download is exposed through a short-lived signed URL only when the attached contribution is already public. Office files are delivered as attachments, never rendered unsanitized into the browser.

The initial uploader supports PDF, DOCX, or plain text up to 20 MiB. Full malware scanning, DOCX internal-structure validation, PDF text extraction, and accessibility review are still required before broad public production intake. Untrusted uploaded files must not be opened by server processes with dangerous privileges.

Browser UI for adding supporting sources is provided separately from public document publication.
