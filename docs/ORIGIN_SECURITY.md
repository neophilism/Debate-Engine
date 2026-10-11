# Browser mutation origin security (PDE-25)

Authenticated account and candidate mutations require a genuine HTTPS same-origin \`Origin\` and a matching request \`Host\`. Malformed proxy headers, comma-separated forwarded hosts, protocol downgrades, embedded URL paths/query, and mismatched origins are rejected before attempting a database write.

An optional \`PUBLIC_APP_ORIGIN\` is an exact HTTPS allowlist entry to configure on authorized production Render services. This setting is server-side and need not be provided in development; local HTTP is permitted only on localhost or 127.0.0.1 outside production. Do not accept wildcard origins or preview hosts for production mutation acceptance.

The application must be deployed behind a trusted proxy that sanitizes \`X-Forwarded-Host\` and \`X-Forwarded-Proto\`; host matching alone cannot prove that upstream proxies are correctly configured. This is a defense-in-depth guard, not an independent security audit.
