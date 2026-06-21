#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

mkdir -p .git/hooks

cat > .git/hooks/pre-commit <<'HOOK'
#!/usr/bin/env bash
set -euo pipefail
scripts/check-public-safe.sh
HOOK

cat > .git/hooks/pre-push <<'HOOK'
#!/usr/bin/env bash
set -euo pipefail
scripts/check-public-safe.sh
HOOK

chmod +x .git/hooks/pre-commit .git/hooks/pre-push

printf 'Installed public safety hooks: pre-commit, pre-push\n'
