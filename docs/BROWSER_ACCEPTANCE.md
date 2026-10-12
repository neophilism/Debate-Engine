# Chromium desktop/mobile acceptance (PDE-28)

The GitHub Actions **chromium-public** job creates a disposable PostgreSQL 18 database, applies all real migrations, builds the actual Next.js application, starts a local HTTP server, and uses headless Chromium to verify the public pages without simulation.

It checks semantic navigation, keyboard focus, desktop and 375/390px mobile rendering, lack of horizontal overflow, public archive filtering and reset behavior, error handling for invalid filters, five protocol stages, and the sign-in / sign-up UI toggle. The workflow fails on uncaught browser runtime errors. It does not inject false political records or require a real person's login.

This establishes repeatable **public UI browser acceptance**, not a two-authenticated-candidate browser pilot, human WCAG 2.2 AA audit, Safari/Firefox verification, actual original-media scanning, external notification delivery, or production authorization. Complete those separately before marking PDE-27/PDE-28/PDE-44 operationally accepted.
