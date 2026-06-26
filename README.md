# Help-Dock-IA

Self-hosted AI support widget for websites and SaaS products, with RAG-based answers, ticket escalation, evals, observability, and privacy-first operational controls.

## Phase 1 scope

Phase 1 is a project skeleton only. It proves that a contributor can clone the repository, configure placeholder local values, run app shells, and execute the required quality gates before product behavior is added.

Out of scope for this phase: data models, authentication flows, RAG ingestion, chat behavior, tenant isolation, and external provider integrations.

## Prerequisites

| Tool    | Expected baseline                               |
| ------- | ----------------------------------------------- |
| Node.js | 22 or newer                                     |
| pnpm    | Managed by the `packageManager` field           |
| Docker  | Docker Compose v2 for local topology validation |

## Local setup

1. Install dependencies:

   ```bash
   pnpm install --frozen-lockfile
   ```

2. Create a local environment file from the public-safe template:

   ```bash
   cp .env.example .env
   ```

3. Keep `.env` local. The repository intentionally tracks only `.env.example` with placeholder values.

## Configuration readiness

Phase 1 configuration must fail closed before any shell reports readiness. The shared config package validates required local runtime values for API, admin, widget, and worker startup. Production mode also requires non-placeholder `SETUP_TOKEN` and `SESSION_SECRET` values; placeholder production secrets are rejected without printing the secret values in errors.

The `.env.example` file is intentionally valid for local development shape checks, but it is not a production configuration.

## Verification commands

Run the same gates locally before opening a Phase 1 pull request:

```bash
pnpm public-safe
bash scripts/test-check-public-safe.sh
pnpm lint
pnpm format
pnpm typecheck
pnpm test
pnpm test:coverage
pnpm ci:docs:test
pnpm phase1:scope
pnpm compose:smoke:test
pnpm compose:smoke
```

`pnpm ci:docs:test` validates that the CI workflow and this setup guide continue to document the required Phase 1 path. `pnpm phase1:scope` blocks accidental product feature leakage by enforcing the approved shell-only source tree and route surface.

## Docker Compose smoke path

`pnpm compose:smoke` validates the deterministic local Compose topology and runtime boot path for these services:

| Service  | Purpose in Phase 1                            |
| -------- | --------------------------------------------- |
| api      | Backend shell with fail-closed config loading |
| admin    | Private admin shell                           |
| widget   | Public widget shell                           |
| worker   | Background worker shell                       |
| postgres | Local relational store placeholder            |
| valkey   | Local queue/cache placeholder                 |
| qdrant   | Local vector store placeholder                |
| minio    | Local object storage placeholder              |
| mailpit  | Local email capture placeholder               |

The smoke command validates configuration shape, starts the stack, waits for services, checks that app containers stay running, verifies the API/admin/widget shell endpoints, and cleans up the stack. It does not introduce product behavior.

## Phase 1 exit traceability

| Exit criterion                                           | Evidence                                                                                       |
| -------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Clone → configure → boot → test works locally            | `pnpm install --frozen-lockfile`, `.env.example`, `pnpm test`, `pnpm compose:smoke`            |
| CI blocks broken tests, config, smoke, and safety checks | `.github/workflows/ci.yml`, `pnpm ci:docs:test`, `pnpm compose:smoke:test`, `pnpm public-safe` |
| Test harness evidence remains reviewable                 | `pnpm test`, `pnpm test:coverage`, `pnpm phase1:scope`                                         |
| No product feature behavior ships in Phase 1             | `pnpm phase1:scope` and the shell-only app/package tree                                        |

## CI expectations

The `CI` workflow runs Phase 1 gates in this order:

1. Public safety scan and regression tests.
2. Dependency installation through pnpm.
3. Lint, format, typecheck, tests, and coverage.
4. CI/docs regression test.
5. Phase 1 shell-only scope guard.
6. Compose smoke test and runtime Compose smoke validation.

The existing `Public safety` workflow remains in place as a focused guard for unsafe files, secrets, local paths, and unsupported lockfiles.
