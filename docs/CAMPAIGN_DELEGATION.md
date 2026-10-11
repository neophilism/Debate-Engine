# Account-backed, revocable campaign delegate grants

Candidate ownership and candidate verification are separate. Only the authenticated owner of a candidacy can grant or revoke access. Every grant references an existing managed-auth account and is auditable and reversible without erasing grant history.

Initial roles: `editor` and `publisher`, stored as authorization metadata. The public policy/video publication endpoints **do not** yet accept delegates: candidate signature and media-consent semantics remain owner-only until explicit signed-approval and authorized campaign workflows are added. These roles currently have no publication powers. Do not promise otherwise.

Do not publish account subject identifiers or delegate account information on public endpoints. Explicit least-privilege session checks are required for every future delegated operation; never infer delegation merely from a submitted candidacy ID.
