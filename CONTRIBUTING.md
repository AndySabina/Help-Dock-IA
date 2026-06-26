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
scripts/check-public-safe.sh --staged
```

CI runs the same harness in full tracked-tree mode:

```bash
scripts/check-public-safe.sh --all
```

This check blocks common private or unsafe files, including:

- `.env` files except `.env.example`,
- private keys and certificates,
- local cache files such as `.atl/*.cache.json`,
- logs and OS-generated files,
- dump, backup, archive, and unsupported package-manager lockfiles,
- common secret/token patterns and machine-local absolute paths in scanned text files.

## Strict TDD delivery gate

Strict TDD is mandatory for every implementation-affecting change, not only central product invariants. This includes product code, scripts, CI, tooling, executable documentation, cleanup automation, migrations, configuration behavior, and any change that can alter runtime, verification, or delivery behavior.

Docs-only narrative edits are docs-safe when they do not change executable behavior. They still need normal review, public-safety checks, and a clear statement that no implementation behavior changed.

Every implementation-affecting pull request must provide failing-test-first evidence before merge:

| Evidence field | Required content |
| --- | --- |
| RED | The failing test, command, log, or CI artifact captured before the implementation change. |
| GREEN | The passing command, log, or CI artifact after the minimum implementation change. |
| REFACTOR | The post-refactor passing command, or `None needed` when no refactor was performed. |
| Scope | The behavior protected by the test and the files or packages affected. |

Exceptions are allowed only when automation is not viable for the specific change. An exception must name the owner, reason, compensating control, expiry or follow-up, and reviewer approval. Historical work without captured RED evidence must be recorded as `historical evidence absent; no compliance claim` instead of being retroactively marked compliant.

See `docs/governance/strict-tdd-evidence.md` for the evidence checklist used by reviewers.

## Rules for public commits

- Commit `.env.example`, never `.env`.
- Commit documentation and source files only when they are safe for public review.
- Do not commit real credentials, customer data, private prompts, local traces, or generated caches.
- If the safety harness blocks a file, remove the sensitive content instead of bypassing the check.
