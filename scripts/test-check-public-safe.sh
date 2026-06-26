#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
SOURCE_SCRIPT="$ROOT/scripts/check-public-safe.sh"
WORKDIR="$(mktemp -d)"

cleanup() {
  rm -rf "$WORKDIR"
}
trap cleanup EXIT

new_repo() {
  local repo
  repo="$(mktemp -d "$WORKDIR/repo.XXXXXX")"
  mkdir -p "$repo/scripts"
  cp "$SOURCE_SCRIPT" "$repo/scripts/check-public-safe.sh"
  chmod +x "$repo/scripts/check-public-safe.sh"
  git -C "$repo" init -q
  git -C "$repo" config user.email "test@example.invalid"
  git -C "$repo" config user.name "Public Safety Test"
  printf '%s\n' '# fixture' >"$repo/README.md"
  git -C "$repo" add README.md scripts/check-public-safe.sh
  git -C "$repo" commit -qm "initial fixture"
  printf '%s\n' "$repo"
}

expect_fail() {
  local name="$1"
  local repo="$2"
  if (cd "$repo" && scripts/check-public-safe.sh --staged) >/tmp/helpdock-safe-test.out 2>&1; then
    printf 'not ok - %s: expected failure\n' "$name" >&2
    cat /tmp/helpdock-safe-test.out >&2
    exit 1
  fi
  printf 'ok - %s\n' "$name"
}

expect_pass() {
  local name="$1"
  local repo="$2"
  if ! (cd "$repo" && scripts/check-public-safe.sh --staged) >/tmp/helpdock-safe-test.out 2>&1; then
    printf 'not ok - %s: expected pass\n' "$name" >&2
    cat /tmp/helpdock-safe-test.out >&2
    exit 1
  fi
  printf 'ok - %s\n' "$name"
}

repo="$(new_repo)"
printf '%s%s=%s%s\n' 'API' '_KEY' 'super' 'secretvalue' >"$repo/config.txt"
git -C "$repo" add config.txt
expect_fail 'uppercase env-style API_KEY assignment' "$repo"

repo="$(new_repo)"
mkdir -p "$repo/config"
printf '%s%s=%s%s\n' 'DATABASE' '_PASSWORD' 'another' 'secretvalue' >"$repo/config/.env.local"
git -C "$repo" add config/.env.local
expect_fail 'nested environment file path' "$repo"

for lockfile in package-lock.json npm-shrinkwrap.json yarn.lock bun.lock bun.lockb; do
  repo="$(new_repo)"
  mkdir -p "$repo/app"
  printf '%s\n' '# unsupported lockfile fixture' >"$repo/app/$lockfile"
  git -C "$repo" add "app/$lockfile"
  expect_fail "nested unsupported lockfile path: $lockfile" "$repo"
done

repo="$(new_repo)"
printf '{ "%s%s": "%s%s" }\n' 'private' '_key' 'actual' 'privatevalue' >"$repo/settings.json"
git -C "$repo" add settings.json
expect_fail 'JSON secret assignment form' "$repo"

repo="$(new_repo)"
printf '%s%s: %s%s\n' 'auth' '_token' 'real' 'tokenvalue' >"$repo/settings.yml"
git -C "$repo" add settings.yml
expect_fail 'YAML secret assignment form' "$repo"

repo="$(new_repo)"
printf '%s%s=%s\n' 'API' '_KEY' 'your-api-key' >"$repo/.env.example"
git -C "$repo" add .env.example
expect_pass 'placeholder .env.example assignment' "$repo"

repo="$(new_repo)"
printf '%s=%s\n' 'NODE_ENV' 'development' >"$repo/.env.example"
git -C "$repo" add .env.example
expect_pass 'safe NODE_ENV .env.example assignment' "$repo"

repo="$(new_repo)"
printf '%s%s=%s%s\n' 'API' '_KEY' 'staged' 'secretvalue' >"$repo/config.txt"
git -C "$repo" add config.txt
printf '%s%s=%s\n' 'API' '_KEY' 'your-api-key' >"$repo/config.txt"
expect_fail 'staged blob is scanned instead of working tree' "$repo"

rm -f /tmp/helpdock-safe-test.out
