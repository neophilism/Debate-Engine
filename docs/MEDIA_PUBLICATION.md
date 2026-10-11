# Original media intake and public publication (early implementation)

The initial service uses **same-origin streaming-to-memory intake** capped at 60 MiB. Video is sniffed, ffprobe validated, and SHA-256 hashed **before** writing original bytes to the private, branch-scoped S3 bucket. Large/resumable uploads, document versions, worker processing and independent original-storage integrity auditing remain outstanding.

Authenticated and independently verified candidate upload is required. Videos never enter the qualifying sequence merely by uploading. A separate candidate-controlled publication action binds a validated media asset to the first submission and immutable opening questions, and records explicit archival and sequence permissions. Public playback is by short-lived, signed S3 GET redirect, allowed only when the source appears in a published debate submission.

The production release must supply ffprobe (included in the Render Dockerfile), a real private bucket with branch-matching credentials, the matching Neon DB URL, Managed Auth and trusted domains. Object storage is **not** supplied by Render's ephemeral filesystem.

This early synchronous upload path should **not** be described as a full-featured professional-grade video ingest pipeline. A larger, resumable and audited pipeline is required before broad production use. No public launch until retention configuration, integrity monitoring, and real multi-user tests pass.
