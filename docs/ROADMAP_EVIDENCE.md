# Automatically reconciled implementation evidence

The scheduled and post-merge GitHub Actions workflow reads the authoritative PR registry, maps linked PRs to the existing 44 approved milestone IDs, and updates the canonical roadmap's implementation *evidence*. An already merged PR may advance a milestone from \`not_started\` to \`partial\` but can **never** set acceptance to \`accepted\`, change a reviewer, change \`production_ready\`, or change the approved plan denominator. A closed-unmerged PR never counts as implemented. Open PR links are tracked separately.

The roadmap remains distinct from \`registry/production-acceptance.json\`. Only actual independent test evidence and approval can satisfy those operational gates.

To synchronize manually in a checkout after \`npm run registry:sync\`, run \`npm run roadmap:sync\`. GitHub Actions performs both after PR close, on schedule, and by manual dispatch. No manual updates inside Engine Room are necessary: consumers should ingest the machine-readable registry and canonical roadmap on refresh.
