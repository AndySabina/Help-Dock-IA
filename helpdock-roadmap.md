# HelpDock AI — Professional Development Roadmap

This roadmap turns the approved HelpDock AI product concept, architecture baseline, and PRD into an execution plan. It is intentionally phased so the project can grow step by step without compromising the core security, privacy, and reliability constraints.

## Source baseline

| Document | Role |
| --- | --- |
| `helpdock-ai.md` | Original product concept and hardened constraints. |
| `helpdock-product-architecture.md` | Approved architecture baseline; Judgment Day Round 19 approved. |
| `helpdock-product-requirements.md` | Approved PRD; Judgment Day PRD Round 3 approved. |
| `docs/decisions/0001-0005` | Phase 0 approved decision baseline for Phase 1 planning. |

## Roadmap principles

- Build the boring foundation before the impressive AI features.
- Treat self-hosting, scope isolation, visibility gates, RBAC, audit safety, and deletion replay as first-class product features.
- Use strict failing-test-first TDD for central security and privacy invariants.
- Keep each phase independently reviewable and shippable.
- Do not activate public production traffic until release gates and operational evidence are ready.

## Phase overview

| Phase | Outcome | Primary focus |
| --- | --- | --- |
| 0. Foundation decisions | Resolve release-blocking unknowns before implementation. | Stack, roles, retention, providers, thresholds. |
| 1. Project skeleton | Create the deployable application foundation. | Monorepo/app setup, Docker Compose, CI, test harness. |
| 2. Core data model, tenancy, and governance foundations | Establish safe data boundaries and pre-feature privacy/security foundations. | Scope, migrations, repositories, minimal audit, integrity-protected deletion ledger, processor lifecycle gating, token exceptions. |
| 3. Auth, setup, and RBAC | Secure internal access from day one. | Setup token, dashboard auth, backend authorization, audit emission. |
| 4. Document ingestion | Load knowledge safely. | Uploads, parser isolation, documents, chunks, embeddings metadata gated by processor consent. |
| 5. RAG answer engine | Answer only with eligible evidence. | Scoped retrieval, visibility filters, refusal behavior, traces. |
| 6. Public widget | Expose the customer-facing experience safely. | Widget UI, sessions, action tokens, rate limits, abuse controls. |
| 7. Ticketing and queues | Escalate unresolved conversations. | Ticket creation, scoped access, agent queues, manager controls. |
| 8. Admin dashboard | Operate the system. | Documents, tickets, conversations, gaps, metrics, settings. |
| 9. Gaps, evals, and quality | Improve answer quality continuously. | Gap workflow, eval datasets, quality gates, cost/latency metrics. |
| 10. External processor operations | Expand processor governance operations. | Dashboards, operational visibility, review workflows, runbook evidence. |
| 11. Audit, exports, and privacy operations | Make compliance operations real. | Audit viewer, exports, deletion/anonymization workflow using the verified deletion ledger and Phase 2 processor lifecycle controls. |
| 12. Backup restore and runbooks | Prove operational recovery. | Provenance-verified deletion ledger replay, restore verification, runbook evidence. |
| 13. Production release hardening | Prepare first production activation. | Release gates, security review, docs, demo, operational checklist. |

## Phase 0 — Foundation decisions

### Goal

Resolve the release-blocking decisions that would otherwise cause architectural rework.

### Scope

- Choose implementation stack and repository structure.
- Define first-release RBAC roles and permissions.
- Define default retention windows.
- Choose first supported model, embedding, email, tracing, storage, and vector database providers.
- Define evidence thresholds, eval pass/fail thresholds, escalation thresholds, cost caps, and hallucination regression limits in `docs/decisions/0004-rag-retention-deletion-replay-and-release-thresholds.md` under `Release thresholds`, `First-release cost caps`, and `Hallucination regression blocking threshold`.
- Define the first-release documentation gap SLA in `docs/decisions/0004-rag-retention-deletion-replay-and-release-thresholds.md` under `Documentation gap SLA`.

### Deliverables

- `docs/decisions/0001-self-hosted-foundation-and-llm-boundary.md`
- `docs/decisions/0002-data-platform-and-provider-baseline.md`
- `docs/decisions/0003-security-secrets-rbac-and-multi-tenancy.md`
- `docs/decisions/0004-rag-retention-deletion-replay-and-release-thresholds.md`
- `docs/decisions/0005-quality-gates-public-safety-and-phase-1-readiness.md`

### Exit criteria

- All release-blocking PRD questions have an approved first-release answer, including the concrete `docs/decisions/0004-rag-retention-deletion-replay-and-release-thresholds.md` cost caps, hallucination regression blocker, and documentation gap SLA.
- Phase 0 decision docs exist in `docs/decisions/0001-0005` and are the repo source of truth for Phase 1 planning.
- The chosen stack supports Docker Compose, CI, background jobs, migrations, and test isolation.
- The review scope for Phase 1 is clear.

## Phase 1 — Project skeleton

### Goal

Create a professional application foundation that can support strict TDD and self-hosted deployment.

### Scope

- Initialize application structure.
- Add Docker Compose for local self-hosted development.
- Add database, cache/rate-limit store, and background worker service placeholders.
- Add CI pipeline.
- Add test commands and coverage reporting.
- Add linting, formatting, type checking, and environment validation.
- Add base documentation for local development.

### Deliverables

- Application skeleton.
- `docker-compose.yml`.
- `.env.example`.
- CI workflow.
- Test harness with at least one failing-test-first demonstration.
- `README.md` local setup guide.

### Required tests

- Environment validation fails when required production secrets are missing.
- Test harness is proven in CI.
- Docker Compose services start in a clean environment.

### Exit criteria

- A developer can clone, configure, boot, test, and inspect the application locally.
- CI runs automatically and blocks broken checks.

## Phase 2 — Core data model, tenancy, and governance foundations

### Goal

Implement the data and governance foundation that prevents cross-tenant leakage and blocks privacy/security-sensitive features from running without their required controls.

### Scope

- Model installation, workspace, site, widget, user, role, document, conversation, ticket, gap, eval, audit, export, and processor entities.
- Define effective scope tuple behavior.
- Add migrations and seed data.
- Add scoped repository/query helpers.
- Add deny-by-default tenant context.
- Add migration checks for missing or inconsistent scopes.
- Add a minimal privacy-safe audit schema and append-only audit service before setup, RBAC, ticketing, or exports can emit audit events.
- Add an independent deletion ledger/tombstone foundation before any deletion/anonymization workflow can execute, with append-only or equivalent integrity guarantees, signing/checksum verification, RBAC/access controls, replay file provenance, and linkage to restore verification reports.
- Add a minimal processor registry with data-category consent enforcement and outbound-send gating before any embedding, model, provider, or external job can run.
- Add required external processor lifecycle controls before any provider/external job can run: revocation behavior, queued-job revalidation, best-effort cancellation or future-unsent-send blocking for in-flight jobs, long-running/multi-step revalidation before each external send, late-result accept/quarantine/discard policy, credential and rotation status, and external deletion evidence records with exception handling.
- Add a token one-time exception registry for explicitly approved reusable/replay-tolerant token cases.

### Deliverables

- Database schema and migrations.
- Scoped query layer.
- Seed fixtures for multiple installations/sites/widgets.
- Architecture notes for scope rules.
- Minimal privacy-safe audit event schema and write service.
- Independent deletion ledger/tombstone schema and write/read service with integrity verification, access controls, replay provenance metadata, and restore-report linkage.
- Minimal processor registry, category consent records, outbound-send gate, lifecycle state model, credential/rotation status records, revocation/revalidation policy, quarantine policy, and external deletion evidence/exception records.
- Token one-time exception registry with owner, reason, compensating control, expiry, and review status.

### Required tests

- Scope isolation fails first, then passes.
- Queries cannot return records from another installation/site/widget.
- Rows missing required scope are rejected or detected.
- Audit events reject raw PII, full messages, full prompts, secrets, and dictionary-reversible hashes.
- Deletion tombstones are durable, independently scoped, integrity-protected, access-controlled, and cannot be removed by normal feature deletion flows.
- Deletion ledger writes, reads, replay files, and restore-report links fail closed when signatures/checksums, provenance, RBAC authorization, or integrity verification are missing or invalid.
- Embedding, model, provider, and other external jobs fail closed when no active processor registry entry, category consent, valid credential/rotation status, and lifecycle approval exist.
- Queued jobs revalidate processor consent/lifecycle state before execution; long-running or multi-step jobs revalidate before each external send.
- Revocation blocks future unsent sends, attempts best-effort cancellation of in-flight jobs, and routes late results to accept/quarantine/discard handling according to policy.
- Quarantined late results cannot feed answers, embeddings, evals, metrics, suggestions, or exports.
- External deletion evidence records and approved exceptions are required and verifiable for processors that received deleted/anonymized data.
- Reusable or replay-tolerant token behavior is rejected unless a valid one-time exception registry entry exists.

### Exit criteria

- Cross-scope data access is blocked by tests and implementation.
- Future phases must use the scoped query layer rather than ad hoc queries.
- Future audit emitters must use the privacy-safe audit service.
- Future deletion/anonymization workflows must write and verify against the independent, integrity-protected deletion ledger/tombstones before execution proceeds.
- No embedding, model, provider, or external job can be introduced without using the outbound-send gate and Phase 2 lifecycle controls.
- Release gates can enumerate and fail on expired or unapproved token one-time exceptions.

## Phase 3 — Auth, setup, and RBAC

### Goal

Secure the internal dashboard and privileged actions before product features are exposed.

### Scope

- Implement first manager/admin bootstrap.
- Protect setup with `SETUP_TOKEN`.
- Disable or consume setup token after bootstrap.
- Add dashboard authentication.
- Implement backend-enforced RBAC.
- Add role and permission matrix.
- Add safe audit events for setup/auth/RBAC actions.

### Deliverables

- Auth flow.
- Setup flow.
- RBAC middleware/policies.
- Permission matrix documentation.
- Auth and RBAC audit events.

### Required tests

- Setup token is single-use or disabled after bootstrap.
- Setup token is never logged in clear text.
- Backend denies unauthorized actions even if frontend routes are accessed directly.
- RBAC permissions match the approved role matrix.

### Exit criteria

- No dashboard feature can ship without backend authorization.
- Setup is safe enough for production configuration.

## Phase 4 — Document ingestion

### Goal

Allow managers to create and upload knowledge while protecting the system from unsafe files.

### Scope

- Create document CRUD.
- Support document statuses and visibilities.
- Add upload pipeline.
- Extract text, chunks, embeddings metadata, and document metadata.
- Generate embeddings only through the Phase 2 outbound-send gate.
- Keep raw uploads temporary by default.
- Isolate parser workers.
- Add parser abuse fixtures.

### Deliverables

- Document management API.
- Parser worker.
- Temporary upload cleanup.
- Chunk and embedding metadata storage.
- Parser runbook draft with required no-egress, resource-limit, temporary-filesystem, macro-disablement, external-resource-blocking, and cleanup evidence.

### Required tests

- Public widget cannot retrieve non-`public_widget` documents.
- Archived/deleted documents stop being eligible.
- Parser rejects or safely handles decompression bombs, oversized files, malformed PDFs/DOCX, external HTML resources, timeouts, and cleanup failures.
- Parser isolation proves no network egress, CPU/memory/time limits, limited temporary filesystem access, no macro execution, no external HTML resource loading, and cleanup of temporary artifacts.
- Embedding generation fails closed when the outbound-send gate denies processor/category consent.

### Exit criteria

- Documents can be ingested safely.
- Parser isolation evidence exists in CI for no network egress, CPU/memory/time limits, limited temporary filesystem access, macro blocking, external HTML resource blocking, and cleanup.

## Phase 5 — RAG answer engine

### Goal

Build the answer pipeline that responds only from sufficient, scoped, visibility-eligible evidence.

### Scope

- Implement retrieval with pre-filtered scope and visibility.
- Add answer generation with evidence threshold checks.
- Add refusal/escalation behavior.
- Add policy/guardrail documents as behavioral controls, not factual sources.
- Add redacted internal answer traces.
- Add model/provider abstraction that can execute calls only through the Phase 2 outbound-send gate.

### Deliverables

- RAG service.
- Retrieval query tests.
- Refusal behavior.
- Redacted answer traces.
- Provider abstraction wired to processor registry/category consent checks.

### Required tests

- Retrieval filters by scope and visibility before candidates return.
- The engine refuses when evidence is insufficient, stale, restricted, unavailable, or contradictory.
- Policy documents do not become factual answer sources.
- Visibility downgrades immediately stop future retrieval.
- Model/provider calls fail closed when the outbound-send gate denies processor/category consent.

### Exit criteria

- The system can answer trusted questions and refuse unsafe ones.
- RAG invariants are protected by strict TDD evidence.

## Phase 6 — Public widget

### Goal

Expose a safe, embeddable support experience.

### Scope

- Build embeddable widget bundle served from `${PUBLIC_APP_URL}/widget.js`.
- Add launcher, chat panel, conversation history, loading states, feedback, and escalation path.
- Add widget sessions.
- Add allowed-domain/widget binding as defense-in-depth.
- Add action tokens for public mutations.
- Check action-token replay behavior against the Phase 2 token one-time exception registry.
- Add rate limits, cost caps, abuse monitoring, and safe degraded mode.

### Deliverables

- Widget script.
- Public widget API.
- Widget session/token system.
- Token one-time exception registry integration for public mutation tokens.
- Abuse controls.
- Safe maintenance/degraded messaging.

### Required tests

- `public_widget_id` is not treated as a secret.
- Mutations require scoped context or action tokens.
- Sensitive mutations use one-time tokens by default.
- Any non-one-time token behavior requires a valid token one-time exception registry entry.
- Missing/unreliable `Origin` or `Referer` does not bypass protections.
- Expensive calls fail closed when counters are unavailable.

### Exit criteria

- The widget can be embedded safely in a local/demo site.
- Public endpoints have production-grade safety controls.
- Release gates fail on missing, expired, or unapproved token one-time exceptions.

## Phase 7 — Ticketing and queues

### Goal

Convert unresolved conversations into secure human-support workflows.

### Scope

- Create tickets from widget conversations.
- Capture contact channel and conversation context.
- Generate issue summary.
- Add scoped ticket access links/tokens.
- Add customer ticket view/reply flow.
- Add shared and personal queues.
- Add manager assignment, reassignment, movement, and priority controls.

### Deliverables

- Ticket creation API.
- Customer ticket access flow.
- Agent queue APIs.
- Manager queue controls.
- Ticket audit events.

### Required tests

- Customers can access only their scoped tickets.
- Ticket tokens are hashed, expirable, revocable, rotatable, and replay-protected where applicable.
- Unauthorized agents cannot view or mutate tickets outside their permissions.

### Exit criteria

- A full unresolved-question-to-ticket workflow works safely.
- Ticket access invariants are covered by tests.

## Phase 8 — Admin dashboard

### Goal

Give internal users a secure operating surface for HelpDock AI.

### Scope

- Build dashboard navigation and layout.
- Add views for documents, conversations, tickets, gaps, evals, metrics, processors, exports, audit, and system health.
- Add role-based UI visibility as UX only.
- Connect dashboard actions to backend RBAC.
- Add redaction by role.

### Deliverables

- Dashboard app.
- Document management UI.
- Conversation/ticket review UI.
- Metrics and health views.
- Settings and processor views.

### Required tests

- Backend authorization remains authoritative.
- Role redaction hides restricted traces, PII, prompts, and diagnostics.
- Dashboard views respect scope and visibility.

### Exit criteria

- Managers and agents can operate the main workflows from the dashboard.
- Dashboard access does not weaken backend security.

## Phase 9 — Gaps, evals, and quality

### Goal

Close the loop between bad answers, unresolved questions, documentation improvements, and release quality.

### Scope

- Create documentation gaps from unresolved questions, repeated escalations, failed evals, and staff input.
- Add gap owner, priority, status, linked tickets/conversations, proposed resolution, and approval workflow.
- Add eval datasets.
- Add groundedness, retrieval quality, hallucination risk, refusal behavior, latency, and cost checks.
- Add visible job states for evals and expensive AI jobs, with any external execution routed through the Phase 2 outbound-send gate.

### Deliverables

- Gap workflow.
- Eval runner.
- Quality dashboards.
- Cost and latency metrics.
- Release quality gate checks.

### Required tests

- Gap-created knowledge is not retrieval-eligible until approved.
- Evals respect scope and visibility.
- External eval/AI jobs fail closed when the outbound-send gate denies processor/category consent.
- Release gate fails when eval thresholds are not met.

### Exit criteria

- The system can measure quality and prevent unsafe regressions.
- Documentation improvements follow an approval workflow.

## Phase 10 — External processor operations

### Goal

Expand the Phase 2 processor lifecycle foundation into operational visibility, management UX, and runbook evidence without introducing new safety prerequisites after external jobs already exist.

### Scope

- Expand processor registry management UI/API on top of the Phase 2 registry, consent, lifecycle, credential, revocation, revalidation, quarantine, and external deletion evidence foundations.
- Add operator dashboards for consent state, revocation state, credential/rotation status, queued/in-flight revalidation outcomes, quarantine decisions, external deletion evidence, and approved exceptions.
- Add review workflows for processor configuration changes, revocation drills, quarantine review, external deletion evidence review, and exception expiry.
- Add operational reports and runbook evidence for processor lifecycle controls.

### Deliverables

- Processor settings UI/API backed by the Phase 2 registry, outbound-send gate, and lifecycle controls.
- Consent, credential, revocation, revalidation, quarantine, deletion evidence, and exception dashboards backed by Phase 2 records.
- Review and approval workflows for processor operations.
- Processor lifecycle runbook drill reports.

### Required tests

- Dashboards accurately reflect Phase 2 consent, lifecycle, credential/rotation, revocation, queued/in-flight revalidation, quarantine, external deletion evidence, and exception states.
- Operational actions cannot bypass Phase 2 outbound-send gating, lifecycle controls, or RBAC.
- Review workflows enforce owner, reason, expiry, and approval requirements for processor exceptions.
- Runbook drills leave durable evidence for revocation, revalidation, quarantine review, credential rotation, and external deletion evidence review.

### Exit criteria

- External processors are operationally visible, reviewable, and auditable without bypassing the Phase 2 outbound-send gate or lifecycle controls.
- External data behavior is understandable to managers.

## Phase 11 — Audit, exports, and privacy operations

### Goal

Make accountability and privacy operations usable without turning logs into permanent PII stores.

### Scope

- Implement privacy-safe audit logging.
- Add export workflows with permission, scope, bounds, redaction, CSV formula protection, and audit.
- Add deletion/anonymization request workflow backed by the Phase 2 independent, integrity-protected deletion ledger/tombstones and external processor lifecycle controls.
- Add privacy request states: submitted, needs_review, approved, rejected, executing, waiting_external_processor, completed, failed, exception_recorded.
- Add evidence capture.

### Deliverables

- Audit viewer and expanded audit event coverage using the Phase 2 privacy-safe audit service.
- Export service.
- Privacy deletion/anonymization workflow.
- Evidence records linked to deletion ledger/tombstones, external deletion evidence, and restore verification reports.

### Required tests

- Audit logs do not store raw PII, full messages, full prompts, secrets, or dictionary-reversible hashes.
- Exports are scoped, permissioned, bounded, redacted, escaped, and audited.
- Privacy requests require RBAC authorization and leave durable evidence.
- Privacy request execution fails closed when required deletion ledger/tombstone writes, integrity checks, replay provenance, restore-report links, or external deletion evidence/exception records cannot be verified.

### Exit criteria

- Operators can prove who did what without leaking sensitive data.
- Privacy workflows are enforceable, reviewable, and backed by the independent, integrity-protected deletion ledger/tombstones plus Phase 2 external processor deletion evidence/exception records.

## Phase 12 — Backup restore and runbooks

### Goal

Prove the system can recover safely without resurrecting deleted or anonymized data.

### Scope

- Implement deletion ledger/tombstone replay for backup restore using the Phase 2 integrity-protected foundation and replay provenance metadata.
- Implement restore replay bundle support.
- Add restore verification report.
- Add maintenance mode behavior.
- Add required operational runbooks.
- Add durable runbook drill evidence storage.

### Deliverables

- Provenance-verified deletion ledger replay bundle.
- Restore verification workflow.
- Maintenance mode.
- Runbook set.
- Runbook drill evidence store.

### Required tests

- Restoring an old backup cannot resume traffic until deletion replay succeeds and links to the restore verification report.
- Restore fails closed when ledger/replay integrity, signing/checksums, RBAC authorization, provenance, or restore-report linkage cannot be verified.
- Verification covers conversations, tickets, messages, documents, uploads, parser artifacts, jobs, embeddings, traces, evals, exports, gaps, notifications, audit references, access tokens, quarantine stores/results, external deletion records, and configured storage backends.

### Exit criteria

- Restore safety is demonstrable.
- Required runbooks have evidence, owner, reviewer, cadence, and closure tracking.

## Phase 13 — Production release hardening

### Goal

Prepare the first credible production activation.

### Scope

- Run full invariant suite.
- Run eval suite.
- Run parser abuse suite.
- Run external processor consent/revocation scenarios.
- Run restore drill.
- Review audit/export/privacy behavior.
- Review docs, setup, and demo path.
- Freeze release exceptions with owner, compensating control, expiry, and manual gate.

### Deliverables

- Release readiness report.
- Security/privacy review checklist.
- Operational readiness checklist.
- Demo guide.
- Known limitations and future roadmap.

### Required tests

- All central invariant suites pass with failing-test-first evidence.
- Release gates block production activation when required evidence is missing.
- Any exception is explicit, owned, time-bound, and reviewable.

### Exit criteria

- The product is ready for first controlled production/demo activation.
- Remaining work is consciously deferred rather than accidentally ignored.

## Cross-phase invariant suites

These suites must grow throughout the roadmap. They are not one-time tasks.

| Suite | Starts in | Must protect |
| --- | --- | --- |
| Scope isolation | Phase 2 | No cross-installation/workspace/site/widget data access. |
| Visibility gates | Phase 4 | Public widget retrieves only `public_widget` knowledge. |
| RAG evidence/refusal | Phase 5 | Answers require sufficient eligible evidence. |
| Ticket access | Phase 7 | Customers access only their scoped tickets. |
| Permissions/RBAC | Phase 3 | Backend denies unauthorized actions. |
| Parser isolation | Phase 4 | Malicious files cannot compromise parsing; CI proves no network egress, resource limits, limited temporary filesystem access, no macro execution, no external HTML resource loading, and cleanup. |
| Exports/redaction | Phase 11 | Exports are bounded, redacted, escaped, and audited. |
| Privacy-safe audit | Phase 2 | Audit emitters cannot store raw PII, full messages, full prompts, secrets, or dictionary-reversible hashes. |
| External processor lifecycle | Phase 2 | Embedding, model, provider, and external jobs require active registry entries, category consent, valid credential/rotation status, revocation/revalidation checks before each send, late-result policy, quarantine isolation, and external deletion evidence/exception records through outbound-send gating. |
| Token one-time exceptions | Phase 2 | Reusable/replay-tolerant token behavior requires an explicit, approved, time-bound exception and release gate. |
| Deletion ledger/restore replay | Phase 2 | Deletion/anonymization writes durable, integrity-protected, access-controlled tombstones before privacy workflows execute; replay files preserve provenance, link to restore reports, and old backups cannot resurrect deleted/anonymized data. |
| Runbook evidence | Phase 12 | Operational drills leave durable, reviewable evidence. |

## Suggested implementation slices

To keep review healthy, each phase should be split into reviewable work units:

1. Decision/docs slice.
2. Schema/contracts slice.
3. Failing tests slice.
4. Minimal implementation slice.
5. UI/API integration slice.
6. Operational evidence/docs slice.

If a phase is forecast to exceed the review budget, split it into chained PRs before implementation.

## First execution recommendation

Start with Phase 0. Do not write production code before resolving the release-blocking decisions from the PRD. Architecture without those decisions is a castle built on sand: it may look impressive, but you will pay for it when security, retention, RBAC, or provider behavior changes underneath you.
