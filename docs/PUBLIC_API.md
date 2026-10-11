# Public read-only API v1 and campaign integration

The public namespace is /api/v1. It exposes stable paginated lists, full attributed public debate records and mutually accepted policy evidence. It never exposes private drafts, account emails, login sessions, or unverified candidate registrations.

The open API contract is in contracts/openapi.yaml. The TypeScript read-only client in packages/sdk/client.ts works in frontends and Node runtimes with standard fetch. Example: instantiate PublicDebateEngineClient("https://public-debate-engine-preview.onrender.com"), then await client.debates({limit:20}) and await client.debate(id).

Use the read-only iframe path /embed/debates/{id} with an independent link to the full archive when embedding on a separate campaign website. An iframe of the opener alone is not the entire debate.

The API must never be mistaken for permission to clip, edit, republish or commercially distribute another candidate's video; editorial media permissions are a separate process. The engine has no winner scores, audience targeting or partisan ranking.
