# 0004 — RAG, retention, deletion replay, and release thresholds

## Status

Accepted for Phase 1 planning.

## Decision

Public answers require active, scoped, visibility-eligible `public_widget` evidence. Retrieval must filter by scope and visibility before vector candidates are returned. Policy/guardrail documents control behavior but are not factual sources for end-user answers.

Retention defaults:

| Data class | Default duration |
| --- | ---: |
| Temporary uploads/parser artifacts | 24 hours |
| Active documents/chunks/embeddings | Until archived/deleted |
| Archived document versions | 180 days |
| Conversations/messages/feedback | 180 days after last activity |
| Closed tickets and ticket messages | 2 years after closure |
| Redacted answer traces | 90 days |
| Eval traces | 180 days; release evidence 400 days |
| Privacy-safe audit references | 400 days |
| Exports | 7 days; hard max 30 days |
| Quarantined late provider results | 14 days |
| Runbook evidence | 400 days |
| Deletion ledger/tombstones/external deletion evidence | 3 years or max backup retention + 1 year, whichever is longer |

Release thresholds:

- Public answers need citations for every factual paragraph, at least 2 eligible chunks or 1 exact authoritative FAQ/policy chunk, no contradictions, and no stale/restricted sources.
- Auto-answer requires top score `>= 0.78`, average top-3 `>= 0.72`, and margin `>= 0.05`; `0.70-0.78` requires exact FAQ match; below `0.70` refuses/escalates.
- Required invariant suites must pass at 100% for scope isolation, visibility gates, RBAC, ticket access, deletion replay, exports/redaction, parser isolation, and runbook evidence storage.
- RAG eval minimums are `>= 92%` grounded-answer pass, `>= 98%` correct refusal, `>= 98%` citation integrity, `>= 90%` recall@5, and zero restricted-source answers.

First-release cost caps:

| Scope | Default cap | Required behavior |
| --- | ---: | --- |
| Workspace total AI spend | USD 100/month | Stop non-essential AI generation and alert Owner/Admin at 80% and 100%. |
| Site/widget public AI spend | USD 25/month | Refuse new public AI answers and offer escalation when exhausted. |
| Public widget abuse burst | USD 2/hour per widget | Temporarily degrade to retrieval-only refusal/escalation mode when exhausted. |
| Single conversation | USD 0.25 | Stop further model calls for that conversation and escalate to a ticket. |

Hallucination regression blocking threshold:

- Production activation is blocked if the current release candidate increases unsupported or contradicted factual answers by more than `0.5 percentage points` against the approved baseline, or if any restricted-source answer appears.
- If no approved production baseline exists yet, the release candidate baseline is the Phase 1 pre-production eval suite and must still satisfy the RAG eval minimums above.

Documentation gap SLA:

| Gap state | First-release SLA |
| --- | --- |
| Ownership assigned | Within 2 business days of gap creation |
| Triage decision recorded | Within 3 business days of gap creation |
| Draft, link, or explicit rejection submitted | Within 10 business days of gap creation |
| Approved closure or escalation | Within 15 business days of gap creation |

## Consequences

- Backup restore cannot resume traffic until deletion/anonymization replay succeeds.
- Thresholds are approved defaults and can only be recalibrated with eval evidence.
- No production activation is allowed without central invariant evidence.
- Cost caps and documentation gap SLAs are conservative first-release defaults; teams may lower them per workspace, but raising them requires an explicit release decision and audit trail.
