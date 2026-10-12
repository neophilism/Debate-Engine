# Free continuous source and dependency security checks (PDE-25)

The public repository runs GitHub **CodeQL v4** with security-extended JavaScript/TypeScript queries on pull requests, merges to main and each Wednesday. CodeQL results are uploaded to GitHub code scanning under the repository's \`security-events: write\` permission. This is **source-oriented static analysis**, not a live production penetration test and not a formal compliance certification.

The separate GitHub **Dependency Review Action v5** runs on pull requests and refuses newly introduced dependencies with known *high or critical* advisories. This is intentionally a differential gate: previously existing vulnerabilities must be inventoried and independently resolved, not falsely assumed absent merely because the PR only changes unrelated files. CodeQL findings must be triaged and repaired; absence of reported alerts is never proof of absence of vulnerabilities.

Both use standard GitHub-hosted runners for this **public repository**. They require no paid external scanner, new cloud service, real candidate data, or repository secrets beyond GitHub's short-lived built-in workflow token. The workflows request the smallest necessary token permissions. If GitHub account settings disable code scanning or dependency review, the CI results must show failure; do not silently skip verification or claim the security stage accepted.

Production security acceptance additionally requires threat modeling, actual end-to-end account and content privacy tests, official antivirus signatures, isolated media worker review, independent expert assessment, and the upstream E2EESA control/test tracking. Do not mark the independent security review complete based only on merged code or these scans.
