# Infrastructure binding (2026-10-10)

These identifiers were supplied by the project owner. They are **targets**, not evidence that deployment is running.

- GitHub: https://github.com/neophilism/Debate-Engine
- Render **project**: https://dashboard.render.com/project/prj-db5cv0nlot8c73eh9nng
- Neon **project**: `rapid-moon-08277391`
- Neon **production branch**: `br-autumn-hall-b5e4r3l2`
- Neon console: https://console.neon.tech/app/projects/rapid-moon-08277391/branches/br-autumn-hall-b5e4r3l2

The initial inspection found an empty GitHub repository, no existing published application tables on the designated Neon branch, and no Render web service associated with the Debate-Engine repository in the accessible workspace. Do not report a live deployment until a real service, matching repo/branch, running release, and readiness check have all been verified.

## Planned configuration

`DATABASE_URL` must refer to the specified Neon project. Application runtime must not use a development branch as production. Secrets must be configured through the authorized infrastructure and never committed. Persistent media storage and a separate worker are not configured yet.

Use a separate database branch for development migrations. Do not run schema migrations against production without testing, review, and a deployment rollback path.

A Render **project URL** by itself does not identify an existing deployable web service or authorize paid-plan creation.
