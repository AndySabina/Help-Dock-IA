# 0003 — Security, secrets, RBAC, and multi-tenancy

## Status

Accepted for Phase 1 planning.

## Decision

Use tenant/workspace/site/widget scoping with backend-enforced permission-based RBAC. Frontend visibility is UX only. The first-release role model is Owner, Admin, Agent, Operator, Compliance Reviewer, Viewer, and Widget User / End User.

| Domain / Permission | Owner | Admin | Agent | Operator | Compliance Reviewer | Viewer | Widget User / End User |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Tenant / installation settings | Manage, transfer, delete | Read and manage workspace/site settings | - | Read operational settings | Review redacted settings | Read redacted health | - |
| Runbooks and system health | Manage and approve | Manage workspace runbooks | Read assigned operational notes | Execute runbooks, record drill evidence, view full health | Review runbook evidence and closure | Read redacted dashboards | - |
| Metrics and quality dashboards | Manage thresholds | Manage workspace metrics | Read assigned queues and answer quality | Read operational metrics and alerts | Review compliance metrics and evidence | Read redacted dashboards | - |
| Processor operations | Approve/configure/revoke | Configure with audit | - | Operate credential rotation, revocation drills, quarantine triage | Review consent, revocation, deletion evidence, and exceptions | Read redacted status | - |
| Documents/gaps | Manage all visibilities | Manage workspace docs | Use support docs; propose gaps | Read operational status | Review evidence for governed changes | Read permitted/redacted | Receive only `public_widget` answers |
| Tickets/queues | Manage all | Manage workspace queues | Work assigned/shared queues | Read operational queue health | Review redacted workflow evidence | Read redacted permitted queues | Own token-scoped tickets |
| Deletion/privacy requests | Approve, execute, replay | Review/approve scoped; execute if granted | Submit internal request only | Execute approved deletion/replay steps and capture evidence | Review/approve evidence and exceptions; cannot bypass execution controls | Read redacted status | Submit own privacy request |
| Audit/review operations | Manage audit policy/export references | Read workspace audit | Read own/assigned action refs | Read operational audit refs needed for runbooks | Review audit logs, exports, evidence, and exceptions | Read redacted audit | - |

Secrets and sensitive runtime values must not be committed. Synthetic examples and placeholders are allowed only when they cannot be mistaken for real credentials.

## Consequences

- RBAC policies must be tested at backend boundaries.
- Operators can operate health/runbook/processor/deletion execution workflows but do not receive ownership transfer authority.
- Compliance Reviewers can review audit, processor, deletion, privacy, runbook, and release evidence but cannot bypass operational execution gates.
- Audit records must remain privacy-safe and avoid raw PII, full messages, full prompts, secrets, and dictionary-reversible hashes.
