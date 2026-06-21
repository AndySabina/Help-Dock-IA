#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

fail() {
  printf 'PUBLIC SAFETY CHECK FAILED: %s\n' "$1" >&2
  exit 1
}

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  fail "not inside a git repository"
fi

staged_files="$(git diff --cached --name-only --diff-filter=ACMR || true)"
tracked_files="$(git ls-files)"

check_paths() {
  local files="$1"
  local label="$2"

  [ -z "$files" ] && return 0

  while IFS= read -r file; do
    [ -z "$file" ] && continue

    case "$file" in
      .env|.env.*)
        [ "$file" = ".env.example" ] || fail "$label contains environment file: $file"
        ;;
      *.pem|*.key|*.crt|*.p12|*.pfx|id_rsa*|id_ed25519*)
        fail "$label contains likely private key/certificate: $file"
        ;;
      .atl/*.cache.json|*.cache.json)
        fail "$label contains local cache file: $file"
        ;;
      */.DS_Store|.DS_Store|*.log)
        fail "$label contains local/generated file: $file"
        ;;
    esac
  done <<< "$files"
}

check_content() {
  local files="$1"
  local label="$2"
  local private_key_pattern='BEGIN (RSA |OPENSSH |EC |DSA |PRIVATE )?PRIVATE KEY'
  local aws_key_pattern='AKIA[0-9A-Z]{16}'
  local github_token_pattern="ghp"'_[A-Za-z0-9_]{30,}'
  local github_pat_pattern="github"'_pat_[A-Za-z0-9_]+'
  local openai_key_pattern="sk"'-[A-Za-z0-9]{20,}'
  local slack_token_pattern="xox"'[baprs]-[A-Za-z0-9-]{10,}'
  local assignment_pattern='password\s*=|secret\s*=|api[_-]?key\s*=|token\s*='
  local combined_pattern="${private_key_pattern}|${aws_key_pattern}|${github_token_pattern}|${github_pat_pattern}|${openai_key_pattern}|${slack_token_pattern}|${assignment_pattern}"

  [ -z "$files" ] && return 0

  while IFS= read -r file; do
    [ -z "$file" ] && continue
    [ -f "$file" ] || continue

    # This file intentionally contains secret-detection patterns. Path checks
    # still apply, but content scanning it would create self-referential false positives.
    [ "$file" = "scripts/check-public-safe.sh" ] && continue

    if grep -Iq . "$file"; then
      if grep -nE "$combined_pattern" "$file" >/tmp/helpdock-public-safe-match 2>/dev/null; then
        printf 'Potential secret pattern found in %s file: %s\n' "$label" "$file" >&2
        cat /tmp/helpdock-public-safe-match >&2
        rm -f /tmp/helpdock-public-safe-match
        fail "potential secret content detected"
      fi
    fi
  done <<< "$files"
}

check_paths "$staged_files" "staged changes"
check_paths "$tracked_files" "tracked files"
check_content "$staged_files" "staged"

printf 'Public safety check passed.\n'
