# HelpDock AI — Development Roadmap

This roadmap is the planning and review index for HelpDock AI. It keeps phase order, commitments, exit criteria, and review boundaries visible while delegating detailed architecture decisions to the approved source documents.

## Current status

| Area | Status | Next action |
| --- | --- | --- |
| Phase 0 foundation decisions | Verified — committed in `c8ac4a5` | Use `docs/decisions/0001-0005` as the implementation baseline. |
| Phase 1 project skeleton | Archived with warnings — Engram `sdd/phase-1-project-foundation/archive-report` | Treat the project foundation as complete; keep warnings visible until follow-up cleanup is approved. |
| Product implementation | Not started — Phase 2 is the next foundation phase | Start Phase 2 governance/data foundations; do not skip directly to later product features. |
| Public production traffic | Not allowed | Wait until Phase 13 release gates and operational evidence are complete. |

## Executive index

| Reader need | Start here | Why |
| --- | --- | --- |
| Understand what gets built next | [Phase overview](#phase-overview) → [Phase 2](#phase-2--core-data-model-tenancy-and-governance-foundations) | Shows current sequence and immediate implementation target. |
| Review accepted architecture decisions | [Decision baseline](#decision-baseline) | Links to ADRs instead of repeating their details here. |
| Plan a reviewable PR | [Suggested implementation slices](#suggested-implementation-slices) | Keeps work below the 400 changed-line review budget. |
| Check release readiness | [Phase 13](#phase-13--production-release-hardening) and [cross-phase invariant suites](#cross-phase-invariant-suites) | Defines the evidence required before production activation. |

## Source baseline

| Document | Role |
| --- | --- |
| `helpdock-ai.md` | Original product concept and hardened constraints. |
| `helpdock-product-architecture.md` | Approved architecture baseline; Judgment Day Round 19 approved. |
| `helpdock-product-requirements.md` | Approved PRD; Judgment Day PRD Round 3 approved. |
| `docs/decisions/0001-0005` | Phase 0 approved decision baseline for Phase 1 planning. |

## Canonical roadmap governance

`helpdock-roadmap.md` is the only canonical roadmap. Other documents may contain product requirements, architecture decisions, setup instructions, contribution rules, or historical context, but they must not become competing planning roadmaps.

### Update rules

- Preserve requirements by linking to source documents instead of duplicating stable detail.
- Copy only roadmap-critical phase order, exit signals, blocking gates, invariants, and review constraints into this file.
- Before superseding roadmap-like content, record a `Preserve` or `Supersede` decision in the consolidation ledger below; put any nuance in the rationale, not the Action cell.
- Redirect any future roadmap-like file or competing roadmap section back to this master roadmap.
- Keep each roadmap change reviewable; split changes above the 400 changed-line budget into chained PR slices.
- When work pauses or stops, update completed work, pending work, changed scope, evidence links, leaf statuses, derived parent statuses, and next actions before ending the work session.

## Consolidation ledger

| Source | Commitment | Action | Roadmap update target | Evidence | Rationale |
| --- | --- | --- | --- | --- | --- |
| `helpdock-roadmap.md` | Canonical phase order 0-13, statuses, deliverables, required tests, exit criteria, invariant suites, and review slices. | Preserve | [Global delivery workflow status](#global-delivery-workflow-status), [Canonical 0-13 status map](#canonical-0-13-status-map), and [Phase overview](#phase-overview). | Existing roadmap sections and Engram `sdd/roadmap-delivery-workflow-governance/*` evidence. | This file remains the only canonical roadmap and must not be renumbered or replaced by the 9-parent overlay. |
| `README.md` | Phase 1 skeleton scope, local setup path, verification commands, Docker Compose smoke path, CI expectations, and no-product-behavior boundary. | Preserve | [Phase 1](#phase-1--project-skeleton), [Current status](#current-status), DW-6/DW-7 rows, and the maintenance checklist. | `README.md` Phase 1 scope, verification commands, smoke path, exit traceability, and CI expectations. | README keeps contributor setup detail; the roadmap preserves the outcome, evidence, and gates without duplicating setup instructions. |
| `CONTRIBUTING.md` | Public repository safety harness, unsafe-file blockers, public commit rules, and strict TDD delivery gate for all implementation-affecting changes. | Preserve | [Operating principles](#operating-principles), DW-9, [cross-phase invariant suites](#cross-phase-invariant-suites), and [roadmap maintenance checklist](#roadmap-maintenance-checklist). | `CONTRIBUTING.md` public safety harness and strict TDD delivery gate. | Contribution policy remains operational; roadmap keeps the blocking delivery commitment visible. |
| `helpdock-ai.md` | Original product concept: self-hosted support widget, RAG, tickets, evals, observability, dashboard, cost/latency quality loop, and portfolio/case-study intent. | Preserve | Phases 4-10, [Phase 13](#phase-13--production-release-hardening), and [Suggested implementation slices](#suggested-implementation-slices). | `helpdock-ai.md` product/component/MVP sections. | The concept document preserves historical source context; roadmap translates it into phased delivery targets. |
| `helpdock-ai.md` | Security/privacy boundaries: no secrets in widget, scoped visibility-aware retrieval, policy docs not factual sources, parser isolation, privacy-safe audit, deletion replay, external processor consent/lifecycle, token exceptions, and strict TDD evidence. | Preserve | Phases 2-6, 10-13, DW-3/DW-8/DW-9, and [cross-phase invariant suites](#cross-phase-invariant-suites). | `helpdock-ai.md` security/privacy, external processor, backup restore, and TDD sections. | These are product safety commitments, so the roadmap keeps them as phase gates and invariant suites. |
| `helpdock-product-requirements.md` | Product goals, non-goals, personas, journeys, functional requirements, business rules, acceptance criteria, success metrics, release gates, and future decisions. | Preserve | [Source baseline](#source-baseline), phases 2-13, and [Phase 13](#phase-13--production-release-hardening). | PRD status/source docs, functional requirements, acceptance criteria, and open questions sections. | The PRD remains the requirements source of truth; the roadmap carries only phase-level commitments and release blockers. |
| `helpdock-product-requirements.md` | Free-text feedback comments are out of initial product scope; hosted CDN widget is future, optional, explicit, and externally disclosed. | Supersede | Phase 6 keeps binary useful/not-useful feedback and self-hosted `PUBLIC_APP_URL`; future CDN remains out of current canonical phases unless approved later. | PRD non-goals and functional requirements. | Roadmap scope control: these are not removed requirements; they supersede any broader interpretation that initial feedback or CDN hosting must ship by default. |
| `helpdock-product-architecture.md` | Approved architecture baseline: self-hosted deployment, customer-controlled data boundary, consent-gated processors, scoped RAG, backend RBAC, privacy-safe audit, deletion replay, runbooks, and central invariant TDD. | Preserve | [Decision baseline](#decision-baseline), DW-1 through DW-9, and [cross-phase invariant suites](#cross-phase-invariant-suites). | Architecture quick path, core decisions, and domain sections. | Architecture remains the design source of truth; roadmap points implementation phases at the approved baseline. |
| `docs/decisions/0001-self-hosted-foundation-and-llm-boundary.md` | Self-hosted default, customer-controlled data boundary, explicit external LLM/processor consent, public repo safety, and no model-only fallback when scoped evidence is insufficient. | Preserve | DW-1/DW-3, Phases 2, 5, 13, and the source/decision baselines. | ADR 0001 decision and consequences. | Accepted Phase 0 decision remains binding for future implementation. |
| `docs/decisions/0002-data-platform-and-provider-baseline.md` | TypeScript monorepo, NestJS backend, Next.js admin, Vite React widget, pnpm/Turborepo, Docker Compose, PostgreSQL/Drizzle, Valkey, MinIO/S3, Qdrant, OpenTelemetry stack, provider defaults, and strict TDD baseline. | Preserve | DW-4, Phase 1, Phase 2, and later provider/operations phases. | ADR 0002 decision, provider table, and consequences. | Stack choices are accepted implementation constraints, not optional roadmap ideas. |
| `docs/decisions/0003-security-secrets-rbac-and-multi-tenancy.md` | Tenant/workspace/site/widget scoping, backend-enforced RBAC, first-release role model, secrets policy, operator/compliance boundaries, and privacy-safe audit requirements. | Preserve | Phases 2, 3, 8, 10, 11, 13 and RBAC/audit invariant suites. | ADR 0003 decision, role matrix, and consequences. | These decisions define required authorization and audit behavior for all later product phases. |
| `docs/decisions/0004-rag-retention-deletion-replay-and-release-thresholds.md` | Scoped public-widget RAG, retention defaults, release thresholds, eval minimums, cost caps, hallucination blocker, documentation gap SLA, and deletion replay release gate. | Preserve | Phases 2, 4, 5, 9, 11-13 and RAG/deletion/runbook invariant suites. | ADR 0004 thresholds, cost caps, gap SLA, and consequences. | Quantitative release gates must remain explicit so production activation cannot happen by accident. |
| `docs/decisions/0005-quality-gates-public-safety-and-phase-1-readiness.md` | Phase 1 readiness baseline, public-safety gates, synthetic examples only, no production traffic, executable harness expectations, and release exception ownership. | Preserve | Phase 1, DW-6/DW-9, [Current status](#current-status), and maintenance checklist. | ADR 0005 decision and consequences; Engram Phase 1 archive evidence. | Phase 1 is archived as foundation work while warnings and public-safety gates remain visible. |
| Engram `sdd/phase-1-project-foundation/archive-report` | Phase 1 completed as a technical foundation and archived with warnings; product behavior remains out of scope. | Preserve | [Current status](#current-status), DW-4/DW-6/DW-7/DW-9, [Canonical 0-13 status map](#canonical-0-13-status-map), and [Phase 1](#phase-1--project-skeleton). | Engram archive report and prior verification evidence. | Status changes must reconcile with SDD evidence instead of stale roadmap text. |
| Future `*roadmap*.md` files or competing roadmap sections | Any new planning sequence, phase plan, milestone list, release roadmap, or status model outside this file. | Supersede | Copy any missing roadmap-critical commitments into this ledger and the relevant phase/status section, then replace competing content with a link or remove it after review. | Future source review. | Supersede only after preservation review; this prevents roadmap drift while preserving client commitments and review evidence. |

### Deep source review update targets

| Finding | Roadmap target | Handling |
| --- | --- | --- |
| Phase 1 is complete as foundation only and archived with warnings. | Current status, DW-4/DW-6/DW-7/DW-9, canonical phase map, and Phase 1. | Preserve evidence; do not imply product behavior shipped. |
| The 9-parent delivery workflow must guide delivery without replacing phases 0-13. | Global delivery workflow status and child status rows. | Preserve both hierarchies; parent statuses derive from direct children only. |
| Strict failing-test-first evidence now applies to every implementation-affecting change. | DW-9 and cross-phase invariant suites. | Preserve as blocking delivery governance; docs-only narrative edits remain docs-safe only when they do not change executable behavior. |
| Self-hosted data boundary, processor consent, deletion replay, public safety, and release gates are release-blocking. | Phases 2, 5, 10-13, decision baseline, and invariant suites. | Preserve as phase gates and release criteria. |
| Repo-cleanliness/auditability governance and Markdown validation automation are valuable but outside this slice. | Follow-up governance notes. | Preserve as future SDD follow-up; do not implement scripts or new repo-cleanliness rules here. |

## Decision baseline

| Decision | Use it for |
| --- | --- |
| `docs/decisions/0001-self-hosted-foundation-and-llm-boundary.md` | Self-hosted boundary, external LLM consent boundary, public repo safety expectations. |
| `docs/decisions/0002-data-platform-and-provider-baseline.md` | TypeScript monorepo stack, Docker Compose baseline, providers, embeddings, data stores. |
| `docs/decisions/0003-security-secrets-rbac-and-multi-tenancy.md` | First-release roles, permission baseline, tenant/workspace/site/widget scoping, secrets policy. |
| `docs/decisions/0004-rag-retention-deletion-replay-and-release-thresholds.md` | Retention defaults, RAG thresholds, cost caps, hallucination regression gate, documentation gap SLA. |
| `docs/decisions/0005-quality-gates-public-safety-and-phase-1-readiness.md` | Phase 1 readiness, public-safety gates, strict TDD expectations, release exception rules. |

## Operating principles

- Build the boring foundation before the impressive AI features.
- Treat self-hosting, scope isolation, visibility gates, RBAC, audit safety, and deletion replay as first-class product features.
- Use strict failing-test-first TDD for every implementation-affecting change; record approved exceptions explicitly.
- Keep each phase independently reviewable and shippable.
- Keep this roadmap focused on planning; detailed architecture belongs in the source baseline and ADRs above.
- Do not activate public production traffic until release gates and operational evidence are ready.

## Global delivery workflow status

<!-- roadmap-status-schema: v1 -->

This section overlays the 9-parent delivery workflow onto the canonical phases 0-13. It does not replace or renumber the implementation sequence below.

Allowed status values: `Not started`, `Planned`, `Ready`, `In progress`, `Verified`, `Archiving`, `Archived`, `Blocked`.

Status derivation rules: leaf statuses are updated from evidence; parent and intermediate statuses derive only from direct children. If any direct child is `Blocked`, the parent is `Blocked`. If all direct children have the same status, the parent inherits that status. If all direct children are `Verified`, the parent is `Verified`. If all direct children are `Archived`, the parent is `Archived`. If direct children are only `Verified` and `Archived` with at least one `Archived`, the parent is `Archiving`. Other mixed active or planned states derive to `In progress`.

| Parent ID | Parent workflow phase | Status | Canonical mapping | Evidence | Next action |
| --- | --- | --- | --- | --- | --- |
| DW-1 | Understand client requirements | Verified | `helpdock-ai.md`, PRD, Phase 0 | Product concept, PRD approval baseline, ADRs `0001-0005` | Preserve source links; reopen only through a scoped SDD change. |
| DW-2 | Document product understanding | Verified | PRD, architecture, roadmap, Phase 0 | PRD Round 3 and architecture Round 19 approval notes; this roadmap | Keep roadmap updates additive and evidence-linked. |
| DW-3 | Design system foundations | In progress | Phases 0, 2, 3 | ADRs `0001-0005`; Phase 2 and Phase 3 remain planned | Start Phase 2 governance/data foundations next. |
| DW-4 | Select technical stack deliberately | Archived | ADR `0002`, Phase 1 | ADR `0002`; Engram Phase 1 archive report | Use the TypeScript monorepo and Docker Compose baseline. |
| DW-5 | Design user interface before building it | Planned | Phases 6, 8 preconditions | Widget/dashboard requirements only; no wireframes, screen flows, mockups, prototypes, or component-level plans yet | Add UI design artifacts before widget or dashboard build slices. |
| DW-6 | Create development environment | Archived | Phase 1 | Engram `sdd/phase-1-project-foundation/archive-report` | Keep local setup, CI, smoke, and public-safety gates active. |
| DW-7 | Create production/staging environment early | In progress | Phases 1, 12, 13 | Phase 1 local/CI evidence archived; staging/production evidence planned | Add environment evidence before production activation. |
| DW-8 | Iterate with client feedback | Planned | Phases 7, 8, 9, 10 | Ticket, dashboard, gap, eval, and processor-operation phases planned | Capture feedback as requirements before implementing changes. |
| DW-9 | Always work with TDD | In progress | Phase 1 and cross-phase invariant suites | Phase 1 test harness archived with warning; permanent strict TDD governance now applies to all implementation-affecting changes | Require failing-test-first evidence or an approved exception for every implementation-affecting change. |

### Delivery workflow child status rows

These parseable child rows make parent status derivation auditable without replacing the canonical phase sections below.

| Child ID | Parent ID | Canonical phase/source | Status | Evidence | Derivation note |
| --- | --- | --- | --- | --- | --- |
| DW-1.1 | DW-1 | `helpdock-ai.md`, PRD, Phase 0 | Verified | Product concept, approved PRD baseline, ADRs `0001-0005` | Direct child verifies DW-1. |
| DW-2.1 | DW-2 | PRD, architecture, roadmap, Phase 0 | Verified | PRD Round 3, architecture Round 19, this roadmap | Direct child verifies DW-2. |
| DW-3.1 | DW-3 | Phase 0 foundation decisions | Verified | ADRs `0001-0005`, commit `c8ac4a5` | Mixed with planned children; DW-3 derives `In progress`. |
| DW-3.2 | DW-3 | Phase 2 governance/data foundations | Planned | Roadmap and ADR baseline | Planned child keeps DW-3 active. |
| DW-3.3 | DW-3 | Phase 3 auth/setup/RBAC foundations | Planned | Roadmap and ADR baseline | Planned child keeps DW-3 active. |
| DW-4.1 | DW-4 | ADR `0002` and Phase 1 stack baseline | Archived | ADR `0002`; Engram `sdd/phase-1-project-foundation/archive-report` | Direct child archives DW-4. |
| DW-5.1 | DW-5 | Phase 6 widget UI preconditions | Planned | Roadmap requires UI design artifacts before build | Needs wireframes, screen flows, mockups, prototypes, or component-level plans. |
| DW-5.2 | DW-5 | Phase 8 dashboard UI preconditions | Planned | Roadmap requires UI design artifacts before build | Needs wireframes, screen flows, mockups, prototypes, or component-level plans. |
| DW-6.1 | DW-6 | Phase 1 development environment | Archived | Engram `sdd/phase-1-project-foundation/archive-report` | Direct child archives DW-6. |
| DW-7.1 | DW-7 | Phase 1 local/CI environment | Archived | Engram Phase 1 archive evidence | Mixed with planned children; DW-7 derives `In progress`. |
| DW-7.2 | DW-7 | Phases 12-13 staging/production readiness | Planned | Roadmap release and runbook phases | Planned child keeps DW-7 active. |
| DW-8.1 | DW-8 | Phases 7-10 feedback and quality loops | Planned | Ticketing, dashboard, gaps/evals, processor operations planned | All direct children are planned; DW-8 derives `Planned`. |
| DW-9.1 | DW-9 | Phase 1 test harness | Archived | Engram Phase 1 archive warning remains visible; historical RED evidence remains absent where not captured | Mixed with planned invariant suites; DW-9 derives `In progress`; do not make retroactive TDD compliance claims. |
| DW-9.2 | DW-9 | Cross-phase security/privacy invariant suites | Planned | Scope, visibility, RBAC, audit, processor, token, deletion, and runbook suites below | Planned child keeps DW-9 active. |

### Canonical 0-13 status map

| Canonical phase | Status | Evidence | Notes |
| --- | --- | --- | --- |
| 0. Foundation decisions | Verified | `docs/decisions/0001-0005`, commit `c8ac4a5` | Accepted planning baseline; no product behavior shipped. |
| 1. Project skeleton | Archived | Engram `sdd/phase-1-project-foundation/archive-report` | Archived with warnings; technical foundation only. |
| 2. Core data model, tenancy, and governance foundations | Planned | Roadmap and ADR baseline | Next product foundation phase. |
| 3. Auth, setup, and RBAC | Planned | Roadmap and ADR baseline | Depends on Phase 2 scope/governance foundations. |
| 4. Document ingestion | Planned | Roadmap, PRD, architecture | Depends on parser and processor gates. |
| 5. RAG answer engine | Planned | Roadmap, PRD, architecture | Depends on scoped retrieval and processor gates. |
| 6. Public widget | Planned | Roadmap, PRD, architecture | Requires UI design artifacts before build. |
| 7. Ticketing and queues | Planned | Roadmap, PRD, architecture | Establishes customer/support feedback loop. |
| 8. Admin dashboard | Planned | Roadmap, PRD, architecture | Requires UI design artifacts before build. |
| 9. Gaps, evals, and quality | Planned | Roadmap, PRD, architecture | Establishes product quality loop. |
| 10. External processor operations | Planned | Roadmap, PRD, architecture | Expands Phase 2 processor controls. |
| 11. Audit, exports, and privacy operations | Planned | Roadmap, PRD, architecture | Uses Phase 2 audit/deletion foundations. |
| 12. Backup restore and runbooks | Planned | Roadmap, PRD, architecture | Must prove deletion replay before release. |
| 13. Production release hardening | Planned | Roadmap, PRD, architecture | Blocks public traffic until release evidence is complete. |

## Phase overview

| Phase | Status | Outcome | Primary focus | Exit signal |
| --- | --- | --- | --- | --- |
| 0. Foundation decisions | Verified | Resolve release-blocking unknowns before implementation. | Stack, roles, retention, providers, thresholds. | ADRs `0001-0005` accepted. |
| 1. Project skeleton | Archived | Create the deployable application foundation. | Monorepo/app setup, Docker Compose, CI, test harness. | Clone → configure → boot → test works locally and in CI. |
| 2. Core data model, tenancy, and governance foundations | Planned | Establish safe data boundaries and pre-feature privacy/security foundations. | Scope, migrations, repositories, minimal audit, deletion ledger, processor lifecycle gating, token exceptions. | Cross-scope leakage and missing governance controls fail closed. |
| 3. Auth, setup, and RBAC | Planned | Secure internal access from day one. | Setup token, dashboard auth, backend authorization, audit emission. | Dashboard access and privileged actions are backend-authorized. |
| 4. Document ingestion | Planned | Load knowledge safely. | Uploads, parser isolation, documents, chunks, embeddings metadata gated by processor consent. | Unsafe files and denied processor sends cannot compromise ingestion. |
| 5. RAG answer engine | Planned | Answer only with eligible evidence. | Scoped retrieval, visibility filters, refusal behavior, traces. | Answers are grounded or refused/escalated. |
| 6. Public widget | Planned | Expose the customer-facing experience safely. | Widget UI, sessions, action tokens, rate limits, abuse controls. | Public endpoints are usable without treating public IDs as secrets. |
| 7. Ticketing and queues | Planned | Escalate unresolved conversations. | Ticket creation, scoped access, agent queues, manager controls. | Customers and agents can access only authorized tickets. |
| 8. Admin dashboard | Planned | Operate the system. | Documents, tickets, conversations, gaps, metrics, settings. | Managers can operate workflows without weakening backend controls. |
| 9. Gaps, evals, and quality | Planned | Improve answer quality continuously. | Gap workflow, eval datasets, quality gates, cost/latency metrics. | Quality regressions and unapproved knowledge changes are blocked. |
| 10. External processor operations | Planned | Expand processor governance operations. | Dashboards, operational visibility, review workflows, runbook evidence. | Processor lifecycle state is visible, reviewable, and auditable. |
| 11. Audit, exports, and privacy operations | Planned | Make compliance operations real. | Audit viewer, exports, deletion/anonymization workflow using Phase 2 controls. | Operators can prove accountability without leaking sensitive data. |
| 12. Backup restore and runbooks | Planned | Prove operational recovery. | Provenance-verified deletion ledger replay, restore verification, runbook evidence. | Restores cannot resurrect deleted/anonymized data. |
| 13. Production release hardening | Planned | Prepare first production activation. | Release gates, security review, docs, demo, operational checklist. | Remaining risk is explicit, owned, and gated. |

## Phase 0 — Foundation decisions

Status: Verified. The accepted decisions are in `docs/decisions/0001-0005`; this section remains as historical planning evidence and as the implementation baseline.

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

Status: Archived with warnings. Engram `sdd/phase-1-project-foundation/archive-report` archived Phase 1 as a technical foundation change only; product behavior remains out of scope.

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

If a phase is forecast to exceed the 400 changed-line review budget, split it into chained PRs before implementation. For feature-branch-chain delivery, keep the tracker branch as the integration target and make each child PR target the previous child branch or the tracker branch according to the chain plan.

## Roadmap maintenance checklist

Before merging roadmap changes, verify:

- [ ] `helpdock-roadmap.md` remains the only `*roadmap*.md` file.
- [ ] `## Global delivery workflow status` keeps `<!-- roadmap-status-schema: v1 -->` and the required parent/status/canonical-map table shape.
- [ ] Statuses use only `Not started`, `Planned`, `Ready`, `In progress`, `Verified`, `Archiving`, `Archived`, or `Blocked`.
- [ ] Leaf statuses cite evidence, and parent statuses follow the documented direct-child derivation rules.
- [ ] Any roadmap-like source content has a Preserve/Supersede row in the consolidation ledger.
- [ ] No requirement-bearing content was removed or superseded without a source link, roadmap target, evidence, and rationale.
- [ ] Public-safety and strict-TDD gates remain visible as blocking controls.
- [ ] Additions plus deletions stay within the 400 changed-line review budget or are split into chained PR slices.
- [ ] Source documents remain linked instead of duplicated wholesale.

## Phase 1 warning ledger

| Warning | Current handling | Evidence | Status |
| --- | --- | --- | --- |
| Historical RED evidence was not captured for every Phase 1 foundation change. | Preserve the warning; do not retroactively claim strict TDD compliance. | Engram `sdd/phase-1-project-foundation/archive-report` and current repository gates. | Historical evidence absent; no compliance claim. |
| Current Phase 1 gates remain executable after archive. | Keep CI, public-safety, test, coverage, docs, scope, and Compose smoke checks active. | `.github/workflows/ci.yml`, `README.md`, `scripts/*`, and package scripts. | Current gates verified by future PR checks. |
| Strict TDD scope was previously limited to central invariants. | Expand the permanent policy to all implementation-affecting changes. | `CONTRIBUTING.md`, ADR 0005, and `docs/governance/strict-tdd-evidence.md`. | Remediated for future work. |

## Follow-up governance notes

- Add a future roadmap validation script after this Markdown contract stabilizes. The script should parse the schema marker, allowed status vocabulary, parent workflow table, canonical phase map, and parent/child derivation rules.
- Create a separate SDD change for repository cleanliness and auditability. That rule is intentionally out of scope for this roadmap governance slice.

## First execution recommendation

Start Phase 2 governance/data foundations from the accepted Phase 0 ADR baseline and archived Phase 1 project foundation evidence. Do not implement later product features until Phase 2 establishes safe scope, governance, audit, deletion, processor, and token-exception foundations; otherwise later phases will be built on unverifiable ground.
