# Repository naming and integration continuity

The product's canonical name is **Public Debate Engine**. The currently hosted GitHub repository slug is `neophilism/Debate-Engine`. Approved rename target: `neophilism/Public-Debate-Engine`.

The connected GitHub integration does not currently offer a repository-rename operation. The slug has **not** been changed. An authorized repository administrator should use GitHub Settings → General → Repository name to apply `Public-Debate-Engine`, after checking GitHub Pages, CI, webhook permissions and links.

After the slug changes, confirm GitHub's old URL redirect, update the `repository` field of `registry/roadmap.json` and include `previousRepositoryNames: ["Debate-Engine"]` for historical PR references. Engine Room reads the canonical registry and can use those declared aliases.

Verify Render's GitHub repository connection, automated deploy webhook, Neon/project-bound environment variables, and all internal GitHub links. Do not provision a replacement repository or detach Render's existing service.

This is distinct from the independent, nonpolitical Live Debate Engine and the later branded thin application **Interlocutor**.
