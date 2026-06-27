# Strict TDD Evidence

Strict TDD is mandatory for every implementation-affecting HelpDock AI change. Reviewers should use this checklist to verify evidence without guessing what happened during implementation.

## Quick path

1. Decide whether the change affects executable behavior.
2. If it does, capture RED evidence before implementation.
3. Capture GREEN evidence after the minimum implementation change.
4. Run the relevant check again after refactor, or state that no refactor was needed.
5. Record exceptions explicitly instead of hiding missing evidence.

## Evidence states

| State | Meaning | Allowed use |
| --- | --- | --- |
| `fail-first evidence present` | A failing test, command, log, or CI artifact existed before implementation. | Normal implementation-affecting changes. |
| `approved exception` | Automation was not viable and a reviewer accepted a compensating control. | Rare, scoped exceptions with owner and expiry/follow-up. |
| `historical evidence absent; no compliance claim` | Work already happened without captured RED evidence. | Historical warning ledgers only; never mark as strict TDD compliant. |
| `docs-safe` | Narrative documentation changed without executable behavior changes. | Docs-only changes with public-safety and review checks. |

## Required record

| Field | Required content |
| --- | --- |
| Change scope | Files, packages, scripts, CI jobs, or docs behavior affected. |
| RED | Failing command, test name, log, or CI artifact captured before implementation. |
| GREEN | Passing command, test name, log, or CI artifact after the minimum change. |
| REFACTOR | Passing command after cleanup, or `None needed`. |
| Exception | Owner, reason, compensating control, approval, and expiry/follow-up when RED/GREEN is not viable. |

## Reviewer checklist

- [ ] Product code, scripts, CI, tooling, executable docs, cleanup automation, migrations, and configuration behavior include RED/GREEN/REFACTOR evidence.
- [ ] Docs-only narrative edits state that no executable behavior changed.
- [ ] Historical warnings do not claim compliance when RED evidence was not captured.
- [ ] Exceptions have an owner, compensating control, approval, and expiry or follow-up.
- [ ] Public-safety checks still pass before merge.
