# Contributing to HelpDock AI

HelpDock AI is intended to be a public repository. Do not commit private files, local caches, credentials, customer data, or machine-specific configuration.

## Public safety harness

Before committing, install the local Git hooks:

```bash
chmod +x scripts/*.sh
scripts/install-git-hooks.sh
```

The hooks run:

```bash
scripts/check-public-safe.sh
```

This check blocks common private or unsafe files, including:

- `.env` files except `.env.example`,
- private keys and certificates,
- local cache files such as `.atl/*.cache.json`,
- logs and OS-generated files,
- common secret/token patterns in staged text files.

## Rules for public commits

- Commit `.env.example`, never `.env`.
- Commit documentation and source files only when they are safe for public review.
- Do not commit real credentials, customer data, private prompts, local traces, or generated caches.
- If the safety harness blocks a file, remove the sensitive content instead of bypassing the check.
