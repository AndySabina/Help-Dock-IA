# HelpDock AI — Product Requirements Document

## Status and source docs

- Status: Draft PRD derived from the approved HelpDock AI product/architecture baseline.
- Source docs:
  - `/home/andyf/proyects/proyect-dev/help-dock/helpdock-ai.md`
  - `/home/andyf/proyects/proyect-dev/help-dock/helpdock-product-architecture.md`
- Architecture review baseline: Judgment Day Round 19 approved with zero blocking issues.
- PRD review baseline: Judgment Day PRD Round 3 approved with zero blocking issues.
- Artifact store: Engram, topic key `sdd/helpdock-ai/prd`.

## Product summary

HelpDock AI is a self-hosted AI support system for websites and SaaS products. Companies deploy it inside their own infrastructure, embed a public support widget from their own `PUBLIC_APP_URL`, and manage documents, tickets, gaps, evals, metrics, audit records, exports, and operational health from an internal dashboard.

The product answers customer questions using company-approved documentation, refuses or escalates when evidence is insufficient, and helps support teams convert unresolved questions into tickets and documentation improvements.

HelpDock AI is not a centralized HelpDock-hosted customer data platform. By default, customer documents, conversations, embeddings, tickets, audit records, and configuration remain inside the company-controlled installation.

## Problem statement

Teams often have product docs, FAQs, policies, and internal support knowledge, but customers do not know where to search or how to phrase questions. This creates repetitive tickets, slower support, inconsistent answers, and weak visibility into documentation gaps.

Generic LLM chat widgets are not enough because they can hallucinate, ignore data boundaries, leak restricted knowledge, or provide no operational evidence for answer quality, cost, privacy, and escalation behavior.

HelpDock AI must provide trustworthy support automation: grounded answers, clear refusal/escalation behavior, document governance, ticket workflows, auditability, evals, metrics, and release gates that protect security and privacy invariants.

## Goals and non-goals

### Goals

- Provide a self-hosted public support widget served from the customer-controlled `PUBLIC_APP_URL`.
- Answer questions using only active, scoped, visibility-eligible documentation.
- Refuse or escalate when retrieved evidence is insufficient.
- Create and manage support tickets from unresolved widget conversations.
- Identify documentation gaps and route them through an approval workflow.
- Give managers/admins visibility into conversations, tickets, quality, cost, latency, gaps, evals, audit, exports, and system health.
- Enforce RBAC, privacy-safe audit logs, explicit external processor consent, and controlled data exports.
- Treat strict TDD and release gates for central invariants as product delivery requirements.

### Non-goals

- Build a centralized HelpDock-hosted customer data store.
- Treat the public widget ID as a secret or authentication mechanism.
- Use unrestricted global retrieval followed by post-filtering.
- Allow the AI to answer from insufficient evidence or restricted documents.
- Expose system prompts, hidden guardrails, secrets, private traces, or restricted document content to end users.
- Support free-form comments on feedback in the initial product; feedback is useful/not useful only.
- Make a hosted CDN widget the default; hosted CDN is future, optional, explicit, and externally disclosed.

## Personas

| Persona | Need |
| --- | --- |
| Public visitor | Ask product/support questions from a website and receive safe answers or escalation. |
| Customer with ticket access | View and respond to their own scoped tickets from the widget experience. |
| Support agent | Review conversations, handle tickets, use scoped knowledge, and identify repeat issues. |
| Manager/admin | Configure sites, widgets, documents, processors, roles, queues, approvals, metrics, exports, and release readiness. |
| Operator/compliance reviewer | Monitor system health, audit events, deletion/restore evidence, processor lifecycle, and runbook evidence. |

## Core user journeys

1. **Install widget**: A manager deploys HelpDock AI self-hosted, configures `PUBLIC_APP_URL`, creates a site/widget, and embeds `${PUBLIC_APP_URL}/widget.js` with `data-helpdock-api` and `data-helpdock-widget-id`.
2. **Ask and answer**: A visitor opens the widget, asks a question, and receives an answer only when active scoped `public_widget` documentation provides sufficient evidence.
3. **Refuse or escalate**: If evidence is missing, restricted, stale, or low-confidence, the widget refuses to invent an answer and offers ticket creation or human escalation.
4. **Create and access ticket**: A visitor creates a ticket, provides contact details when required, receives scoped ticket access, and can view/respond only to their own ticket.
5. **Work tickets**: Agents use shared or personal queues; managers can assign, reassign, move, prioritize, and review queue performance.
6. **Close documentation gaps**: The system surfaces unresolved/repeated questions as gaps; staff draft or link documentation updates; authorized reviewers approve before the content becomes eligible for retrieval.
7. **Measure quality**: Managers review answer quality, useful/not useful feedback, cost, latency, retrieval quality, eval results, and escalations.
8. **Operate safely**: Operators use health views, runbooks, audit logs, exports, deletion ledgers, and restore verification reports to keep the installation safe.
9. **Process privacy deletion/anonymization**: An authorized manager/operator receives or creates a deletion/anonymization request, validates scope and authority, approves or rejects it, executes local and external-processor steps, records evidence, and blocks restore verification until replay state is complete.

## Functional requirements grouped by domain

### 1. Deployment and data boundary

- The product must be self-hosted by default.
- First-release deployment uses Docker Compose unless superseded by a later approved deployment decision.
- The public widget must be served from the customer-controlled `PUBLIC_APP_URL`.
- The product must not centralize customer documents, conversations, embeddings, tickets, audit logs, or settings in a HelpDock-controlled store.
- A future hosted CDN mode, if added, must be optional, explicit, documented as external, and require customer acceptance.

### 2. Public widget and conversation experience

- The widget must provide a floating launcher, chat window, conversation history, loading states, useful/not useful feedback, and escalation path.
- The widget must support public, unauthenticated use while protecting state-changing actions.
- The widget must never contain secrets.
- `public_widget_id` must be treated as public routing/binding metadata, not as authentication.
- Site/widget configuration must include allowed-domain/widget binding as defense-in-depth where browser signals allow it.
- Feedback must be binary: useful or not useful. Free-text feedback comments are out of scope for the initial product.
- The widget must provide safe maintenance or degraded-mode messaging when core services are unavailable.
- `Origin` and `Referer` must be treated as defense-in-depth signals, not authentication.
- Public widget mutations must require scoped fallback context such as widget-issued sessions/tokens, one-time action tokens, or scoped ticket links when origin is missing or unreliable.
- Sensitive mutations such as ticket creation, ticket reply, escalation, contact/email update, privacy acceptance, and abuse-sensitive feedback must use one-time action tokens by default.
- Fallback tokens must have short TTL, widget/site/action/ticket scope, replay protection, revocation, rotation, and server-side hash storage if persisted.
- Token one-time exceptions must be RBAC-protected, audited, periodically reviewed, and release-blocking by default through CI/release policy.

### 3. AI answer and RAG behavior

- AI answers must use only active knowledge documents that match the current scope and are eligible for the current surface visibility.
- Public widget answers may retrieve only `public_widget` documents and chunks.
- Retrieval must filter by scope and visibility before candidates are returned.
- The system must never perform global retrieval and filter results only afterward.
- Policy/guardrail documents may control behavior but must not be used as factual sources for end-user answers.
- If evidence is insufficient, restricted, unavailable, stale, or contradictory, the AI must refuse to answer or escalate instead of inventing.
- Internal answer traces must record enough information for review while remaining redacted by role.
- Evals, exports, answer traces, AI suggestions, documentation gaps, metrics, and dashboard views must respect scope, visibility, and the access matrix, not only public answer generation.

### 4. Documentation, uploads, and gaps workflow

- Managers/admins must be able to create, upload, update, archive, and delete documentation.
- Raw uploads are temporary by default and must not be retained after extraction unless a future explicit opt-in retention setting is added.
- The retained document artifacts are extracted text, chunks, embeddings, and metadata.
- Optional future raw-upload retention must be explicitly configured, consented to by managers, and included in deletion/restore verification.
- Document parser workers must run isolated with no network egress during parsing, CPU/memory/time limits, limited temporary filesystem, no macro execution, no external HTML resource loading, and safe cleanup after failures.
- Parser abuse fixtures must cover decompression bombs, oversized files, malformed PDFs/DOCX, external HTML resources, timeouts, and temporary cleanup.
- Documents must support at least these visibilities:
  - `public_widget`
  - `authenticated_customer`
  - `support_only`
  - `admin_only`
- Only active documents may be retrieved.
- Visibility changes to a more restricted level must take effect immediately for future retrieval.
- Documentation gaps must be created from unresolved questions, repeated escalations, failed evals, or staff input.
- Gap workflow must support review status, owner, priority, linked conversations/tickets, proposed resolution, and approval before new or changed knowledge becomes retrieval-eligible.

### 5. Ticketing and queues

- The widget must support ticket creation when AI cannot resolve a case or when the user requests human help.
- Ticket creation must capture the conversation context, contact channel when needed, and an AI-generated issue summary.
- Customers must be able to access only their own scoped tickets through secure widget/session/ticket access.
- Ticket access tokens must be scoped, expirable, revocable, rotatable, hashed in storage, and protected from replay where applicable.
- Ticket queues must support shared queues and personal queues.
- Agents must be able to view assigned tickets, respond, change status, and use conversation history.
- Managers must be able to assign/reassign tickets, move tickets between queues, manage priorities, and review queue-level performance.
- Ticket access and mutations must be audited and permissioned.

### 6. Internal dashboard, setup, and RBAC

- The dashboard must require authentication from the first release.
- Production setup must be protected by a `SETUP_TOKEN` that is single-use or disabled after first manager/admin creation.
- `SETUP_TOKEN` must be treated as secret: never logged, redacted in errors/config dumps, rate-limited on failed attempts, audited without storing clear token, and stored only as hash or equivalent if persisted.
- RBAC must be enforced by backend authorization, not only frontend visibility.
- Roles must control access to documents, gaps, tickets, evals, metrics, exports, audit records, processor settings, runbooks, privacy deletion/anonymization requests, and system health.
- The dashboard must show conversations, tickets, documentation gaps, useful/not useful feedback, cost, latency, quality metrics, eval status, processor status, audit activity, exports, and system health.

### 7. Evals, metrics, and quality

- The product must include eval datasets for expected questions and regression checks.
- Evals must measure groundedness, hallucination risk, retrieval quality, refusal behavior, latency, and cost.
- Metrics must be available by installation/workspace/site/widget where applicable.
- Managers must be able to inspect poor answers, not-useful feedback, escalation rate, unresolved topics, and documentation gaps.
- Expensive eval or AI jobs must expose visible states such as queued, running, failed, canceled, completed, and blocked by configuration.
- Release-blocking decisions such as evidence thresholds, eval pass/fail thresholds, cost caps, and hallucination regression limits must be resolved before production activation.

### 8. Audit, exports, and operational health

- Audit logs must be append-only or equivalent at the application level and privacy-safe.
- Audit logs must not store raw PII, full messages, full prompts, secrets, hidden guardrails, or dictionary-reversible hashes of predictable identifiers.
- Audit references must use internal IDs, minimized references, redaction, HMAC/keyed hashes, salted hashes, or equivalent privacy-safe identifiers.
- Exports must be permissioned, scoped, bounded, redacted according to role, escaped against CSV formula injection, and audited.
- System health must expose readiness of core dependencies, queue health, model/provider status, rate-limit store status, parser status, deletion/restore status, and runbook readiness.
- Required runbooks must cover degraded rate-limit store, stuck jobs/dead-letter queue, backup restore with deletion replay, audit hash verification when enabled, model/provider failure, parser worker failure, and secret/external credential rotation.
- Every required runbook must define symptoms, impact, fail-open/fail-closed behavior, recovery steps, and post-recovery verification.
- Runbook drills must leave durable, access-controlled evidence with owner, reviewer, scenario, result, follow-ups, and closure verification.
- Runbook evidence must include at least date, environment, executed steps, evidence link, issues found, verifier, closure date, and pre-release/periodic practice cadence.
- Canonical runbook evidence storage, retention class, schema version, export path, RBAC, and schema migration must be defined before production release.

### 9. External processors

- External processors include AI providers, embedding APIs, email services, storage providers, tracing systems, and hosted vector databases.
- Managers must explicitly consent before any configured data category is sent to an external processor.
- Processor defaults mean supported/configurable options, not auto-enabled external processing without consent.
- Processor configuration must show enabled processor, allowed data categories, credential/rotation status, consent actor/time, revocation events, historical data handling, and known provider retention/deletion behavior.
- When a processor or data category is revoked, new jobs must stop sending data to it, queued jobs must revalidate consent, and in-flight jobs must best-effort cancel or block future unsent external sends.
- Long-running or multi-step jobs must revalidate consent before each external send.
- Late external results after revocation must be accepted only if still policy-compliant, quarantined for review, or discarded.
- Late results must record consent state at send time and policy state at receipt time.
- Quarantined results must have TTL, strict access control, deletion policy, and explicit non-use before approval.
- External deletion/anonymization evidence and exceptions must be included in deletion/restore verification material.
- External deletion/anonymization evidence must track request ID, provider, data categories, capability version, request timestamp, provider response timestamp/status, evidence link or payload hash, operator, exception reason, and next review date when verifiable deletion is unsupported.

### 10. Backup restore, deletion replay, and privacy deletion workflow

- Deletion/anonymization requests must survive old backup restores.
- The product must support an end-to-end deletion/anonymization workflow with requester/source, scoped target, RBAC authorization, approval or rejection, execution, evidence capture, and closure.
- Privacy deletion/anonymization request states must include at least: submitted, needs_review, approved, rejected, executing, waiting_external_processor, completed, failed, and exception_recorded.
- The deletion ledger/tombstone mechanism must be independent from the restored backup.
- The deletion ledger must have integrity and access controls, such as append-only behavior or equivalent, signing/checksum verification, replay file provenance, and linkage to restore verification reports.
- Restore must fail closed and remain in maintenance mode if ledger or replay integrity cannot be verified.
- Restore verification must cover conversations, tickets, messages, source documents, temporary uploads, parser artifacts, job payloads, embeddings, answer traces, evals, exports, gaps, notifications, audit references, access tokens, quarantine stores/results, external processor deletion records/evidence/exceptions, and all configured storage backends.

### 11. Product delivery, TDD, and release gates

- Central security/privacy invariants must be delivered with strict failing-test-first TDD evidence.
- CI artifacts are the preferred evidence for tests that fail first and pass after implementation.
- Required invariant suites include scope isolation, visibility gates, RAG evidence/refusal, ticket access, deletion replay/restore, exports/redaction, permissions/RBAC, parser isolation, setup token lifecycle, token exception registry, external deletion replay, and runbook evidence storage.
- Release must be blocked until required gates pass or a documented exception with owner, compensating control, expiry, and explicit manual gate is approved.
- Critical open questions that affect release safety must be resolved before production activation or explicitly tracked as release-blocking decisions.

## Business rules

- Customer-controlled self-hosted deployment is the default operating model.
- No central HelpDock customer data store may be required for default operation.
- The widget public identifier is not a secret.
- Public widget retrieval is limited to active `public_widget` knowledge scoped to the current installation/workspace/site/widget context.
- `authenticated_customer`, `support_only`, and `admin_only` documents must not be used for public widget automatic answers.
- Archived or deleted documents must stop being retrievable immediately.
- Policy/guardrail documents govern behavior but are not factual answer sources for users.
- AI must refuse or escalate when evidence is insufficient.
- User feedback is useful/not useful only in the initial product.
- Ticket customers may access only tickets scoped to their secure session/token/link.
- Shared queues are team-visible according to RBAC; personal queues are agent-specific but manager-controllable.
- Documentation changes that close gaps require approval before becoming retrieval-eligible when they affect public or customer-facing answers.
- External processor consent is explicit, category-based, revocable, and lifecycle-managed.
- Backup restore cannot resume traffic until deletion/anonymization replay has been applied and verified.
- Exports and audit views must respect RBAC, scope, redaction, and privacy rules.
- Release readiness requires invariant TDD evidence, eval readiness, security/privacy gates, and operational runbook evidence.

## Security/privacy product requirements

- The product must make the data boundary understandable to managers: what stays local, what may leave through external processors, and under which consent.
- The dashboard must communicate external processor risks, including the fact that data already transmitted before revocation remains subject to the provider's policies.
- Public widget abuse controls must protect cost, mutation endpoints, ticket actions, and feedback abuse.
- The product must fail safely when expensive-call counters, processor consent, required scope context, deletion replay, or ledger integrity are unavailable.
- End users must not see hidden prompts, guardrails, internal traces, restricted documents, secrets, or private operational diagnostics.
- Audit records must preserve accountability without becoming a permanent store of personal data.
- Deletion/anonymization requests must remain effective across backup restores.
- Parser/upload handling must be isolated enough that malicious, oversized, malformed, or externally-referencing files cannot compromise product behavior or leave unsafe temporary artifacts.
- Operators must have runbooks and health signals for degraded dependencies, provider failure, parser failure, queue failure, restore verification, and secret rotation.

## Success metrics

- Reduced repetitive support tickets for documented questions.
- High grounded-answer rate on approved eval datasets.
- Low hallucination/unsupported-answer rate, with release-blocking thresholds for regressions.
- Healthy refusal/escalation behavior when evidence is insufficient.
- Improved median first-response time for customer questions.
- Useful feedback ratio improves over time without increasing unsupported answers.
- Documentation gaps are created, owned, resolved, and approved within target SLA.
- Ticket queue aging, reassignment, and resolution metrics are visible and actionable.
- External processor consent/revocation events are auditable.
- Release gates pass with CI-preferred TDD evidence for central invariants.
- Required runbooks have owner, review cadence, drill evidence, and closed follow-ups.

## Acceptance criteria

### Deployment and setup

- A manager can deploy HelpDock AI self-hosted and embed a widget from `PUBLIC_APP_URL`.
- First-release deployment uses Docker Compose unless explicitly superseded by a later approved deployment decision.
- The product works without a central HelpDock-hosted customer data store.
- Production setup uses a single-use or disabled-after-bootstrap `SETUP_TOKEN`.
- Setup token attempts are rate-limited, redacted from logs/errors, audited safely, and hash-stored if persisted.

### Public widget and ticket access

- Public widget state-changing actions are protected by scoped context, action tokens, rate limits, cost caps, and mutation safeguards.
- Site/widget configuration includes allowed-domain/widget binding as defense-in-depth while tokens remain the authority for mutations.
- Sensitive mutations use one-time tokens by default, and exceptions are RBAC-protected, audited, reviewed, and release-blocking.
- A user can mark an answer useful or not useful, with no free-text feedback comment required or collected in the initial product.
- A user can create a ticket from the widget and later access only their scoped ticket.

### RAG and documentation

- The public widget can answer from active scoped `public_widget` docs and cannot answer from `authenticated_customer`, `support_only`, or `admin_only` docs.
- The AI refuses or escalates when evidence is insufficient.
- Visibility downgrades immediately stop retrieval.
- Documentation gaps can be created from unresolved conversations and approved before new/changed knowledge becomes retrieval-eligible.
- A first-release SLA for documentation gap ownership, approval, and closure is defined before production activation.
- Raw uploads are temporary by default; retained artifacts are extracted text, chunks, embeddings, and metadata unless explicit future raw retention is configured.

### Dashboard, tickets, and RBAC

- Agents can work shared and personal queues; managers can control assignment, movement, priority, and queue visibility according to RBAC.
- Dashboard authentication, backend RBAC, privacy-safe audit logs, permissioned exports, evals, metrics, system health, and runbooks are available before production release.
- Scope and visibility apply to evals, exports, traces, AI suggestions, gaps, metrics, and dashboard views.

### External processors and restore privacy

- Managers can configure external processors only with explicit category-based consent and can revoke processors/categories with visible lifecycle effects.
- Queued, in-flight, long-running, and late-returning processor jobs follow consent, revocation, quarantine, and deletion evidence rules.
- Backup restore remains in maintenance mode until deletion/anonymization replay and verification succeed.
- Restore verification includes deletion ledger integrity, quarantine stores/results, external processor deletion records/evidence/exceptions, and all configured storage backends.
- Privacy deletion/anonymization requests move through defined RBAC-controlled states and leave durable evidence.

### Operational runbooks

- Every mandatory runbook defines symptoms, impact, fail-open/fail-closed behavior, recovery steps, and post-recovery verification.
- Runbook drill evidence uses durable access-controlled storage with owner, reviewer, date, environment, executed steps, evidence link, issues, result, follow-ups, verifier, closure date, and pre-release/periodic cadence.

### Delivery gates

- Central invariant suites demonstrate failing-test-first TDD evidence, preferably through CI artifacts.
- Release gates block production activation when central security/privacy, eval, audit/export, external processor, parser, ticket, restore, or runbook requirements are unmet.
- Release-blocking decisions are resolved before production activation: RBAC baseline, retention defaults, evidence thresholds, eval pass/fail thresholds, cost caps, hallucination regression limits, required processor defaults, and documentation gap SLA.

## Open questions / future decisions

Release-blocking before production activation:

- What exact role model should ship first beyond manager/admin/support agent/operator?
- What are the default retention windows for conversations, tickets, eval traces, answer traces, audit references, exports, quarantine results, and runbook evidence?
- What thresholds define sufficient evidence, eval pass/fail, escalation, cost caps, and hallucination regression blocking?
- Which model, embedding, email, tracing, storage, and vector database processors should be supported first?
- What is the first-release SLA for documentation gap ownership, approval, and closure?

Future/product expansion decisions:

- Should an authenticated customer portal be included in the first release or remain future scope?
- Should public answers ever show citations/sources to end users, or should sources remain internal by default?
- What notification channels are required for tickets, gaps, release gate failures, health degradation, and processor revocation?
- What export formats are required in the first release?
- Should hosted CDN delivery be offered later, and what external dependency disclosure/consent model would it require?
