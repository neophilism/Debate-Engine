# Private Debate Assistant privacy controls

- Provider analysis requires explicit providerConsent for each draft; if disabled the candidate can still skip and publish.
- Separate improvementConsent defaults false, and only applies to research/improvement use of submitted private assessment feedback. No automatic training pipeline is currently active.
- GET /api/private/privacy reads private owner-scoped counts. POST /api/private/privacy, with same-origin authentication, withdraws improvement consent for all current drafts and earlier feedback, recording an append-only privacy event.
- These data are never included in public debate APIs, archive exports, SDKs or Interlocutor.
- A completed external provider analysis cannot be retroactively recalled; candidate-facing copy must not claim full erasure. Full private-data retention/deletion, provider contract audit and opt-in enforcement require independent release acceptance before training is ever enabled.
