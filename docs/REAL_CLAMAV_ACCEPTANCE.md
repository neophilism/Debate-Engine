# Real ClamAV acceptance on free GitHub Actions (PDE-08)

GitHub CI now starts an actual native ClamAV daemon on its ephemeral Ubuntu worker and drives the application's real \`zINSTREAM\` Unix-socket client against it. A **CI-only synthetic custom signature** verifies clean, detected, and unavailable-scanner responses without distributing actual malware or importing any production content or credentials. This tests the **real native protocol and detection path**, unlike the separate simulated-socket unit tests.

The synthetic database tests the programmatic integration, **not** current virus detection coverage: production scanning requires authenticated and current official signature databases, ongoing updates, a supervised scanner process with bounded memory/CPU and egress, and an independently verified real end-to-end media upload. Do **not** substitute the synthetic CI database for official ClamAV signatures in development or production. It is installed only inside a disposable GitHub runner and never copied to Render, storage, or candidate records.

The current free Render preview intentionally retains a **fail-closed** upload path if \`CLAMD_SOCKET_PATH\` is missing. No attempt is made to claim production uploads work or to configure a paid scanner. GitHub-hosted public-repository CI runners are used without new billed infrastructure.
