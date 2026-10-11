# Candidate-consented speech transcription for the private Debate Assistant

Candidate speech in original video/audio can be privately transcribed after its owner checks an explicit provider-consent option. Transcription never runs automatically just because a source was uploaded. The authenticated POST endpoint under the candidate's private draft accepts no arbitrary public URL or media path; it retrieves only the validated, owned source from the private storage bucket and verifies the original SHA-256 before extracting speech audio.

Transcription extracts an MP3 stream using FFmpeg with a local-file protocol allowlist and process timeout; it then sends the audio to an *explicitly configured* HTTPS-compatible transcription service. Environment variables:

- `DEBATE_ASSISTANT_STT_BASE_URL` — trusted HTTPS provider base origin, no user-supplied URLs.
- `DEBATE_ASSISTANT_STT_KEY` — server-only bearer credential.
- `DEBATE_ASSISTANT_STT_MODEL` — authorized transcription model ID.

No variables means **unavailable**, not fabricated speech recognition. Source videos longer than 30 minutes currently require a manually entered reviewed transcript. The returned text is stored as private draft data, and its changed hash invalidates prior preliminary-review acceptance, requiring the candidate to review the latest speech again.

An explicit optional `Transcribe my audio privately` control in the candidate review UI invokes the endpoint; candidate may manually edit the resulting transcript instead or skip advisory assessment entirely. Final speech publication still requires a separate exact-version approval action.

**Production gates:** Verify provider contractual handling of political speech, encrypted transport, retention, cost/rate limits, original-media parser isolation and threat review; confirm that no synthetic transcript or model report is represented as candidate speech. Do not enable this feature with paid provider credentials or infer user consent without an explicit authorization.
