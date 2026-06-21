# 0005 — Quality gates, public safety, and Phase 1 readiness

## Status

Accepted for Phase 1 planning.

## Decision

Phase 1 may start only from the Phase 0 decision baseline captured in `docs/decisions/0001-0005`. Production code remains out of scope until the project skeleton, CI, and test harness are intentionally created.

Quality and public-safety gates are part of the architecture baseline:

- Central security/privacy invariants require failing-test-first TDD evidence, preferably from CI artifacts.
- Public repository safety checks must block likely secrets, real credentials, local absolute paths, customer data dumps, local caches, unsupported lockfiles, and machine-specific metadata.
- Public examples must remain synthetic and use placeholders only.
- Phase 1 must add the deployable skeleton, Docker Compose, `.env.example`, CI workflow, test commands, coverage reporting, linting, formatting, type checking, environment validation, and local setup docs.

## Consequences

- Phase 0 is complete as a decision phase, not as product implementation.
- Any release exception must have an owner, compensating control, expiry, and explicit manual gate.
- Public safety checks must scan the content that is actually staged when running in staged mode.
