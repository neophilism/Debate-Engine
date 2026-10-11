# Public preview smoke runbook

The preview-smoke GitHub Actions workflow runs after a merge to main, without any database or provider credentials. It checks that the deployed Render preview serves the public pages, health and readiness APIs, public election/debate indexes, a neutral RSS feed and sitemap. It also verifies private account/admin endpoints reject anonymous requests and cross-site writes cannot bypass origin protection.

This deliberately does not create actual candidate accounts, debates, responses, press messages, videos, or external submissions. The full candidate-authenticated multi-browser pilot and original-media preservation audit remain separate launch gates.

The workflow retries transient Render deploy/wake-up states but fails if the preview does not reach the expected state within the bounded window. No paid infrastructure or external monitoring subscription is provisioned.
