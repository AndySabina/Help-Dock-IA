# 0002 — Data platform and provider baseline

## Status

Accepted for Phase 1 planning.

## Decision

Use a TypeScript monorepo foundation with NestJS backend, Next.js admin app, Vite React widget, pnpm/Turborepo, Docker Compose for first-release self-hosted development, and strict TDD for central invariants.

Provider defaults are baselines for supported configuration, not automatic external processing.

| Area | Approved default | Boundary |
| --- | --- | --- |
| Database | PostgreSQL with Drizzle migrations. | Customer-controlled by default. |
| Cache/rate limits/queues support | Valkey. | Customer-controlled by default. |
| Object storage | MinIO/S3-compatible storage, with local MinIO as the development default. | External S3-compatible providers require processor consent for configured data categories. |
| Vector database | Qdrant, self-hosted by default. | Hosted vector DBs require explicit consent and deletion evidence support. |
| Tracing/observability | OpenTelemetry with Prometheus, Loki, Tempo, and Grafana as the self-hosted baseline. | Hosted tracing/observability systems are external processors and require explicit consent. |
| Reference LLM for docs/examples | OpenAI `gpt-4.1-mini` via environment placeholders only. | No key is stored; not auto-enabled. Customers may choose any supported provider. |
| Embeddings | Self-hosted `intfloat/multilingual-e5-small` ONNX/CPU, 384-dimensional normalized vectors in Qdrant. | External embedding APIs require explicit processor consent and deletion evidence. |
| Email | Mailpit for development; production SMTP adapter to a customer-controlled SMTP relay. | Hosted email vendors require explicit consent for notification/ticket data categories. |

## Consequences

- Phase 1 must create the deployable skeleton and CI harness without enabling production traffic.
- All external processor integrations must route through the processor registry and outbound-send gate.
- Tracing, storage, and vector DB choices are part of the release-blocking provider baseline, not later implicit choices.
