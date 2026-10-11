# Interlocutor: separately branded client integration

**Interlocutor** is a thin branded site, not a second public archive. It should consume the candidate-neutral Public Debate Engine through versioned public APIs and controlled, explicit sign-in workflows. The common engine is authoritative for publication status, reciprocal qualification, question assessments and source media.

## Boundary
- Public reads: `GET /api/v1/debates`, `GET /api/v1/debates/:id`, optional `/embed/debates/:id`.
- Independent candidate writing/upload actions: only inside Public Debate Engine's secure origin, using the existing candidate-owned account and explicit original-media review. Never copy long-lived auth cookies or media credentials to a second brand.
- Configuration: Interlocutor may pick branding, home page, color themes and which debate IDs to feature, but cannot filter out a published contender contribution from the complete record of a displayed debate.
- Storage and audit: single engine-side source of truth. No independently editable clone of debate records.
- Content: no hard-coded candidate name, office, election year or issue list inside reusable engine code.

## Example read-only adapter
`packages/sdk/interlocutor.ts` exports a small, credential-free API client. It avoids automatic HTTP redirects and refuses insecure origin URLs. The embedding partner should use a restrictive iframe policy and explicit accessibility headings.

## Handoff status
The client-side integration contract is provided here; the branded Interlocutor repository has not been provisioned, because its GitHub repository URL and deployment resources have not been supplied. The existing repository and its Neon/Render resources must not be repurposed as the branded layer.

**Privacy:** Do not expose `/api/private/*`, unpublished drafts, preliminary/final assessments, consent choices, or provider results through this SDK.
