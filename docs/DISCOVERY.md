# Public participant and debate discovery

Only verified candidacies are listed in the candidate directory. Historical candidate profiles remain inspectable if their verification status changes after public contributions, without rewriting the original attribution. The directory is an index of public platform activity, **not** a platform determination of ballot qualification, electoral significance, or policy quality. No engagement-based ranking is generated.

## Public debate discovery (PDE-17)

The archive at /debates and read-only GET /api/debates supports optional \`office\` slug, \`election\` UUID, and \`q\` plain-text substring filters. Topic, proposition, originator name and **published writing** participate in the search. Neither unpublished writing nor private Debate Assistant assessments are searched. The database always applies \`d.status='published'\` and \`s.published_at IS NOT NULL\` before matching contributions.

The collection is sorted by publication time (newest first), breaking timestamp ties by debate UUID. Each request returns up to 20 items and an opaque \`nextCursor\`, implemented with the existing stable cursor encoder; API clients pass this back via \`cursor\`. An invalid cursor is a client error rather than a fallback to the wrong page. The HTML page has keyboard-accessible native filters, clear reset and a next-page link. No sample fixtures are substituted if the database is unavailable.

To accept this feature operationally, test publication and pagination of at least 21 genuine fixture debates in a disposable PostgreSQL branch, the unpublished-written-text negative case, cross-filter combinations, and keyboard/mobile discovery in a browser. No invented candidate contributions should appear on production.
