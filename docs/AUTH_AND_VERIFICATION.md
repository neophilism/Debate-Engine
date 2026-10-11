# Managed authentication and candidacy verification

## Architecture

Neon Auth is a managed Better Auth service scoped to the Debate Engine's Neon project and branch. All sign-in/register/reset endpoints route through the protected same-origin Next.js proxy. Sign-in alone never establishes candidate eligibility.

- Development Neon project: rapid-moon-08277391, branch br-curly-mountain-b56lyomz.
- Managed Auth (development) provisioned using Better Auth, not mock auth.
- Private source-video bucket (development): debate-originals.
- Production Auth, storage and verification remain separate acceptance gates.

## Required runtime variables

- DATABASE_URL: the proper Neon branch's pooled Postgres connection, **server-only**.
- NEON_AUTH_BASE_URL: the corresponding branch's managed auth URL (must not be mixed with another branch).
- NEON_AUTH_COOKIE_SECRET: generated secret of 32+ characters (server-only); rotate with controlled session invalidation.
- PLATFORM_ADMIN_USER_IDS: explicitly approved comma-separated Managed Auth user subject IDs (not emails). If empty, **no** one may administrate eligibility.

Use Neon Auth shared SMTP for development only. Configure custom SMTP, trusted origins and email verification before public production enrollment. Never commit any auth credentials, admin secrets or database URLs.

## Candidate lifecycle

1. Account signs in and verifies email with the configured provider.
2. User registers a candidacy for a known office/cycle. This does not claim verification.
3. A separately appointed platform administrator evaluates the candidacy and records an auditable verification decision.
4. Only a verified candidacy may publish official policy debates or contender responses; scope to the same election and office.
5. The originator of a debate cannot set rivals' verification or exercise platform administrator powers merely by originating a debate.

The admin UI does not independently prove someone's candidacy. External verification evidence, multi-party controls, appeal handling and audit review are needed before production. Avoid implying completed identity assurance.
