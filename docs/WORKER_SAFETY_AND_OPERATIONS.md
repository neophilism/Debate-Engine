# Isolated media worker and lease safety

The render worker is intended for a separately supervised, unprivileged process/container. Dockerfile.worker installs FFmpeg, runs as the non-root node user and loads secrets only at runtime; do not bake production credentials into an image.

Migration 0009 adds explicit owner-and-token job leases. Every worker claim is exclusive using SKIP LOCKED, refreshed every 30 seconds. A final artifact transition requires an unexpired lease with the same owner and token, preventing a slow/stale worker from overwriting the current job. Expired claims can be recovered, with automatic attempts bounded to five; failed jobs require explicit authorized requeue. SIGTERM stops accepting new jobs while permitting an in-flight job to finish until the hosting platform's configured shutdown deadline. Render's maxShutdownDelaySeconds should be 300 seconds if deploying a paid standalone worker; do not deploy paid infrastructure without authorization.

Original SHA-256 and byte count are verified before local FFmpeg runs. Every clip must have original-owner editing consent. Sources are limited to 10 distinct files and summaries to their declared length. Video/audio are normalized; silent sources are given a silent audio track to preserve subsequent clips in concatenation. Actual rendered duration is probed before updating the byte-bound approval state. Text overlays remain unsupported and must fail rather than silently disappear.

This remains an **implementation**, not a production worker installation. Separate egress restrictions, container resource quotas, malware audit, retention, real mixed-source test footage, and complete output authorization must be verified before any production media is advertised.
