# HelpDock AI — Product Architecture

HelpDock AI is a self-hosted AI support system for websites and SaaS products. Companies install it inside their own infrastructure, embed a public widget from their own `PUBLIC_APP_URL`, and operate a private admin dashboard for documents, tickets, gaps, evals, metrics, and operational governance.

This document is the approved architecture baseline. It incorporates the Judgment Day review outcomes through Round 19, with zero blocking issues remaining.

## Quick path

1. Deploy HelpDock AI self-hosted with Docker Compose and `PUBLIC_APP_URL`.
2. Create the first manager through protected one-time setup.
3. Configure model/external processors with explicit consent.
4. Add scoped and visibility-eligible knowledge/policy documents.
5. Activate the widget only after release gates pass.
6. Build implementation with strict failing-test-first TDD for central invariants.

## Core decisions

| Area | Decision |
| --- | --- |
| Deployment | Self-hosted by default; customer data stays inside the company-controlled installation. |
| Widget | Served from `${PUBLIC_APP_URL}/widget.js`; hosted CDN is future, explicit, optional, and externally disclosed. |
| Data boundary | HelpDock AI does not centralize customer documents, conversations, embeddings, tickets, audit logs, or settings. |
| External processors | AI, embeddings, email, storage, tracing, and hosted vector DBs require explicit manager consent by data category. |
| RAG | Answers require active, scoped, visibility-eligible knowledge documents and sufficient evidence. |
| Policy docs | Policy/guardrail documents control behavior but are not factual answer sources. |
| Tickets | Public widget access uses scoped secure tokens/action tokens; sensitive mutations default to one-time tokens. |
| Dashboard | Auth from first release; backend-enforced RBAC; setup protected by `SETUP_TOKEN`. |
| Audit | Application-layer append-only and privacy-safe; no raw PII/full prompts/full messages in audit records. |
| Restore privacy | Backup restore must replay independent deletion ledger/tombstones before traffic resumes. |
| TDD | Central invariants require failing tests first and CI-preferred evidence. |

## Canonical widget snippet

```html
<script
  src="${PUBLIC_APP_URL}/widget.js"
  data-helpdock-api="${PUBLIC_APP_URL}/api"
  data-helpdock-widget-id="public_widget_id"
></script>
```

`public_widget_id` is public and is not a secret. It is a routing and binding identifier, paired with allowed-origin/domain checks, widget/site binding, action tokens, rate limits, cost caps, and abuse monitoring.

## External processor lifecycle

External processors include AI providers, external embedding APIs, email services, storage providers, tracing systems, and hosted vector databases.

The system must record:

- enabled processor,
- allowed data categories,
- credential rotation history,
- consent actor and timestamp,
- revocation events,
- historical data handling,
- known provider retention/deletion behavior.

If a processor or data category is revoked:

- new jobs cannot send data to it,
- queued jobs must revalidate consent before execution,
- non-compliant queued jobs must cancel, fail safely, or wait for new configuration,
- in-flight jobs must best-effort cancel and block future unsent external sends,
- long or multi-step jobs must revalidate consent before each external send.

Late results from external processors after revocation must follow an explicit policy:

- accept only if the send happened under valid consent and the result is still allowed,
- quarantine for review,
- or discard.

Late results must record the consent state at send time and the policy state at receipt time.

Quarantined results require TTL, strict access control, deletion policy, and explicit non-use before review. They cannot feed answers, embeddings, evals, metrics, or suggestions until approved by an authorized user.

If data was already transmitted before revocation, the UI and runbooks must explain that the transmitted data remains subject to the external provider's policies.

External deletion/anonymization evidence must use a consistent schema:

- `request_id`,
- `provider`,
- `data_categories`,
- `capability_version`,
- `requested_at`,
- `provider_response_at`,
- `provider_response_status`,
- `evidence_link_or_payload_hash`,
- `operator`,
- `exception_reason` when applicable,
- `next_review_at` when verifiable deletion is unsupported.

External deletion records, evidence, and exceptions must be part of the deletion ledger or restore replay bundle independent from backups.

## Public widget security

Public widget APIs must include:

- IP/session/site rate limits,
- cost/model circuit breakers,
- fail-closed behavior for expensive calls when counters are unavailable,
- allowed-origin/domain binding where the browser allows it,
- widget/site binding,
- action tokens for mutations,
- abuse monitoring.

`Origin` and `Referer` are defense-in-depth signals, not authentication. If they are missing or unreliable, the backend must require an alternative proof of context such as a widget-issued session/token for that `public_widget_id`, a one-time action token, or a scoped ticket link. If context cannot be verified, mutation must be rejected or degraded safely.

Fallback widget tokens must have:

- short TTL,
- widget/site/action/ticket scope as applicable,
- replay protection,
- revocation,
- rotation,
- server-side hash storage if persisted.

Sensitive mutations use one-time tokens by default, including ticket replies, contact/email updates, privacy acceptance, escalation requests, ticket creation, and abuse-sensitive feedback mutations.

Exceptions require an exception registry with:

- affected action,
- reason,
- risk,
- compensating control,
- owner,
- review date,
- expiration or renewal criteria.

The exception registry must be RBAC-protected, audited, periodically reviewed, and release-blocking by default through CI/release policy. If automation is not viable, a documented exception must include reason, compensating control, owner, expiration, and explicit manual release gate.

## RAG scope and visibility isolation

Vector search must be isolated by the effective scope tuple required by the surface, such as:

- `installation_id`,
- `workspace_id`,
- `site_id`,
- `public_widget_id`.

The system must never perform global retrieval and filter only after returning candidates. Scope and visibility filters must be applied before vector candidates are returned.

Minimum document visibility values:

- `public_widget`: usable by the public widget,
- `authenticated_customer`: usable only by authenticated customer experiences if they exist,
- `support_only`: usable by support staff, not public automatic answers,
- `admin_only`: usable only by administration/internal configuration.

The public widget can retrieve only `public_widget` documents and chunks.

Conceptual query shape:

```sql
WHERE installation_id = current_installation_id
AND workspace_id = current_workspace_id
AND site_id = current_site_id
AND public_widget_id = current_public_widget_id
AND document_status = 'active'
AND document_type = 'knowledge'
AND document_visibility = 'public_widget'
```

If a document changes from `public_widget` to a more restricted visibility, it must stop being retrievable immediately. The implementation must update or invalidate chunk metadata, embeddings, vector indexes, and caches, or query against current document visibility.

Access matrix:

| Surface | public_widget | authenticated_customer | support_only | admin_only |
| --- | --- | --- | --- | --- |
| Public widget | Yes | No | No | No |
| Future authenticated customer portal | Configurable | Yes | No | No |
| Support dashboard | By permission | By permission | Yes | No by default |
| Manager/admin dashboard | Yes | Yes | Yes | Yes |
| Evals | By scope and eval target | By scope and eval target | By permission | By permission |
| Exports | By permission/redaction | By permission/redaction | By permission/redaction | Privileged only |
| Answer traces | Redacted summary | Redacted summary | By permission | Privileged diagnostic |

Database/data access must reinforce isolation with composite foreign keys where applicable, immutable site/widget bindings, scoped query builders, deny-by-default tenant context, and migration checks for missing or inconsistent scopes.

## Document ingestion and parser isolation

Uploaded files are temporary by default. HelpDock AI stores extracted text, chunks, embeddings, and metadata, not raw uploads unless a future explicit configuration enables retention.

Parsers must run isolated:

- no network egress during parsing,
- CPU/memory/time limits,
- limited temporary filesystem,
- safe temporary cleanup,
- no macro execution,
- no external resource loading for HTML.

CI/release tests and runbooks must cover:

- decompression bombs,
- oversized files,
- malformed PDFs/DOCX,
- HTML external resources,
- timeouts,
- temporary cleanup after failures.

The parser suite is not ready unless tests fail first and then pass with isolation active.

## Dashboard setup and RBAC

The dashboard requires authentication from the first release.

Production setup requires `SETUP_TOKEN`:

- single-use or disabled after first manager/admin creation,
- treated as a secret,
- never logged,
- redacted in errors/config dumps,
- rate-limited on failed attempts,
- failed setup attempts audited without clear token,
- stored as hash or equivalent if persisted.

RBAC must be enforced in the backend. Frontend restrictions are UX only.

## Ticket access

End-user ticket access must use scoped secure tokens:

- hashed in DB,
- expirable,
- revocable,
- rotatable,
- scoped to customer/session/ticket as appropriate.

Widget ticket mutations require CSRF/origin/action-token protection depending on session mode.

## Backup restore and deletion replay

Deletion/anonymization requests must survive old backup restores.

The system must maintain deletion ledger/tombstones independently from restored backups, using a durable ledger, restore bundle, secure tombstone archive, or operator replay file.

After restoring a backup, service cannot resume traffic until:

1. backup timestamp is determined,
2. deletion ledger/tombstones newer than the backup are loaded,
3. deletion/anonymization actions are replayed,
4. verification confirms deleted data does not reappear,
5. restore verification report is produced.

Verification must cover:

- conversations,
- tickets,
- messages,
- source documents,
- temporary uploads,
- parser artifacts,
- job payloads,
- embeddings,
- answer traces,
- evals,
- exports,
- gaps,
- notifications,
- audit references,
- access tokens,
- quarantine stores/results,
- any configured storage backend,
- optional future source uploads or retained artifacts.

If verification fails, the system remains in maintenance mode and public widget functionality stays disabled except for safe maintenance messaging.

Deletion ledger records must minimize sensitive data and must not contain full messages, prompts, unnecessary PII, or complete ticket/conversation text.

The ledger must have integrity and access controls: append-only or equivalent, signed or checksum-verifiable, replay file provenance, and linkage to restore verification reports. If ledger/replay integrity cannot be verified, restore fails closed.

## Privacy-safe audit logs

Audit logs must not become permanent PII stores.

They must avoid raw PII, full messages, and full prompts. They should use internal IDs, HMAC/keyed hashes, salted hashes, minimized references, redaction, or equivalent. Simple dictionary-reversible hashes must not be used for emails, names, phones, or predictable identifiers.

## Strict TDD and central invariant checklist

HelpDock AI must be built with strict TDD for central security/privacy invariants.

Central invariant suites require failing tests first, then passing implementation. Evidence must prefer CI links/artifacts showing:

- failing test,
- passing change,
- affected suite.

PR notes/checklists may supplement CI evidence or justify exceptions only when automation is not viable.

Minimum central invariant suites:

- scope isolation,
- visibility gates,
- RAG evidence/refusal,
- ticket access,
- deletion replay/restore,
- exports/redaction,
- permissions/RBAC,
- parser isolation.

## Runbooks and operational evidence

Required runbooks:

- degraded/unavailable rate-limit store,
- stuck jobs / dead-letter queue,
- backup restore with deletion replay,
- audit hash verification when tamper-evident mode is enabled,
- model/provider failure,
- parser worker failure,
- secret and external credential rotation.

Each runbook must define symptoms, impact, fail-open/fail-closed behavior, recovery steps, and verification.

Each runbook needs owner, last review date, and drill/review cadence. At minimum, restore with deletion replay, rate-limit store degraded, DLQ/stuck jobs, provider outage, and parser failure must be practiced or reviewed before release and periodically.

Each drill must leave durable, access-controlled evidence:

- `runbook_id`,
- owner,
- reviewer,
- date,
- environment,
- scenario,
- executed steps,
- result,
- evidence/link,
- issues,
- follow-ups,
- responsible owner,
- verifier,
- closure date.

Implementation acceptance criteria must define canonical evidence storage, retention class, schema version, export path, RBAC, and schema migration procedure.

## Release gates

- Production setup token is single-use/disabled after bootstrap.
- Public widget uses `${PUBLIC_APP_URL}` and `public_widget_id`.
- External processors require explicit consent and lifecycle controls.
- Public endpoints have rate limits, cost caps, and mutation protections.
- RAG queries filter by scope and visibility before candidates return.
- Visibility downgrades immediately stop retrieval.
- Backup restore replays independent deletion ledger before traffic resumes.
- Quarantine stores/results are included in deletion/restore verification.
- Audit logs are privacy-safe.
- Exports are permissioned, bounded, escaped, redacted, and audited.
- Token exception registry has automated release blocking by default.
- Parser abuse fixtures pass only with isolation active.
- Central invariant TDD evidence is present, preferably from CI artifacts.
- Runbook drill evidence has canonical durable storage.

## Judgment Day status

Final approved review: Judgment Day Round 19.

Result: APPROVED, zero blocking issues.
