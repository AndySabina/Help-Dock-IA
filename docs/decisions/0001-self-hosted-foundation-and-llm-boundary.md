# 0001 — Self-hosted foundation and external LLM boundary

## Status

Accepted for Phase 1 planning.

## Decision

HelpDock AI is self-hosted by default. Customer documents, conversations, embeddings, tickets, audit records, and settings stay inside the customer-controlled installation unless an authorized manager explicitly configures an external processor for specific data categories.

Phase 1 supports external LLM providers through a consent-gated adapter boundary: OpenAI, Anthropic, Google Gemini, Azure OpenAI, Mistral, MiniMax, OpenRouter, and DeepSeek. Local LLM execution is out of scope for Phase 1.

## Consequences

- The public widget is served from the customer-controlled `PUBLIC_APP_URL`.
- The repo must not contain secrets, customer data, machine-local caches, or real processor credentials.
- External LLM calls require active processor configuration, category consent, valid credential status, budget checks, and outbound-send authorization.
- No model-only fallback is allowed when scoped evidence is insufficient.
