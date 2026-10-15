# Repository naming and integration continuity

The product's canonical name is **Public Debate Engine**. The currently hosted GitHub repository slug is `neophilism/Debate-Engine`. Approved rename target: `neophilism/Public-Debate-Engine`.

The connected GitHub integration does not currently offer a repository-rename operation. The slug has **not** been changed. An authorized repository administrator should use GitHub Settings → General → Repository name to apply `Public-Debate-Engine`, after checking GitHub Pages, CI, webhook permissions and links.

After the slug changes, confirm GitHub's old URL redirect and update the `repository` field of the canonical `registry/prs.json`. Preserve `Debate-Engine` as a historical alias only through a validated shared-registry contract change; do not add an unrecognized field ad hoc. `registry/roadmap.json` is a retired redirect and must not become authoritative again. Engine Room must reconcile the renamed repository by immutable GitHub identity and canonical registry evidence.

Verify Render's GitHub repository connection, automated deploy webhook, Neon/project-bound environment variables, and all internal GitHub links. Do not provision a replacement repository or detach Render's existing service.

This is distinct from the independent, nonpolitical Live Debate Engine and the later branded thin application **Interlocutor**.
