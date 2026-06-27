## Linked Issue

Closes #

## PR Type

- [ ] Bug fix (`type:bug`)
- [ ] New feature (`type:feature`)
- [ ] Documentation only (`type:docs`)
- [ ] Code refactoring (`type:refactor`)
- [ ] Maintenance/tooling (`type:chore`)
- [ ] Breaking change (`type:breaking-change`)

## Summary

-

## Changes

| File | Change |
| --- | --- |
| `path/to/file` | What changed |

## Chain context

- Strategy: `feature-branch-chain` / `stacked-to-main` / `single-pr`
- Current slice:
- Base dependency:
- Out of scope:
- Review budget: additions + deletions stay under 400 lines, or `size:exception` is explicitly approved.

## Strict TDD evidence

| Scope | State | RED | GREEN | REFACTOR / follow-up |
| --- | --- | --- | --- | --- |
| | `fail-first evidence present` / `approved exception` / `historical evidence absent; no compliance claim` / `docs-safe` | | | |

## Test Plan

- [ ] Scripts run without errors: `shellcheck scripts/*.sh` when shell scripts change.
- [ ] Affected automated checks pass locally or are documented as intentionally deferred.
- [ ] Manually tested the affected functionality, when applicable.
- [ ] Skills load correctly in the target agent, when skill behavior changes.

## Safety checklist

- [ ] Implementation-affecting changes include failing-test-first evidence or an approved exception.
- [ ] Docs-only narrative changes are marked `docs-safe` and do not alter executable behavior.
- [ ] Historical warning updates do not claim retroactive strict TDD compliance.
- [ ] Public-safety checks pass and no secrets, local absolute paths, private data, or caches are committed.
- [ ] Cleanup actions are inventory-first and do not delete, drop, close, rewrite, or mutate remote state without explicit human approval.

## Contributor checklist

- [ ] Linked an approved issue with `Closes #N`, `Fixes #N`, or `Resolves #N`.
- [ ] Added exactly one `type:*` label to the PR.
- [ ] Ran shellcheck on modified scripts, or no shell scripts changed.
- [ ] Skills were tested in at least one agent, or no skill behavior changed.
- [ ] Docs were updated for behavior changes.
- [ ] Commits use Conventional Commit format.
- [ ] No `Co-Authored-By` trailers are included.
