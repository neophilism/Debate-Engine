# Short-video production — permissioned architecture

Production of a joint summary follows strictly separated steps:

1. Create a candidate-authored editorial plan listing source video clips, timestamps, titles and captions.
2. Each original-video owner grants **clip-scoped editing consent** to the exact draft artifact.
3. An authenticated branch participant requests a durable rendering job. A worker must check every source grant before processing.
4. A sandboxed FFmpeg worker renders and stores the actual file, hashes output bytes and transitions the draft to `awaiting_approval`.
5. Both candidates independently approve the precise rendered file's SHA-256 digest. Plan approval is not file approval.
6. After agreement on an identical policy, an authorized participant may mark the joint output released.
7. The public download endpoint only exposes a summary in `released` state.

This PR implements the workflow/permissions API and schema, but **does not ship the media-rendering worker**. Rendering jobs cannot be processed yet. Do not claim the video summary capability is operational until a secure media worker, byte-integrity checks, artifact preview and independent acceptance are deployed.

As media can carry untrusted payloads and editing is sensitive, worker installation must not be silently simulated. No automatic public uploads to external platforms without separately authorized credentials and approvals.
