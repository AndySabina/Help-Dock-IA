#!/usr/bin/env bash
set -euo pipefail

ROOT="$(git rev-parse --show-toplevel 2>/dev/null || pwd)"
cd "$ROOT"

MODE="${1:---staged}"
case "$MODE" in
  --staged|--all|--tracked)
    ;;
  *)
    printf 'Usage: %s [--staged|--all|--tracked]\n' "$0" >&2
    exit 2
    ;;
esac

fail() {
  printf 'PUBLIC SAFETY CHECK FAILED: %s\n' "$1" >&2
  exit 1
}

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  fail "not inside a git repository"
fi

tracked_files="$(git ls-files)"
all_files="$(git ls-files --cached --others --exclude-standard)"
staged_files="$(git diff --cached --name-only --diff-filter=ACMR || true)"

case "$MODE" in
  --staged)
    scan_files="$staged_files"
    scan_label="staged changes"
    ;;
  --tracked)
    scan_files="$tracked_files"
    scan_label="tracked files"
    ;;
  --all)
    scan_files="$all_files"
    scan_label="tracked and untracked files"
    ;;
esac

check_paths() {
  local files="$1"
  local label="$2"
  local filename

  [ -z "$files" ] && return 0

  while IFS= read -r file; do
    [ -z "$file" ] && continue
    filename="${file##*/}"

    case "$file" in
      .env|.env.*|*/.env|*/.env.*)
        [ "$file" = ".env.example" ] || fail "$label contains environment file: $file"
        ;;
      *.pem|*.key|*.crt|*.p12|*.pfx|id_rsa*|id_ed25519*)
        fail "$label contains likely private key/certificate: $file"
        ;;
      *.dump|*.sql|*.sqlite|*.sqlite3|*.db|*.bak|*.backup|*.tar|*.tar.gz|*.tgz|*.zip|*.7z|*.rar)
        fail "$label contains dump/backup/archive artifact: $file"
        ;;
      .atl/*.cache.json|*.cache.json|.idea/*|.vscode/*|*.code-workspace)
        fail "$label contains local metadata/cache file: $file"
        ;;
      */.DS_Store|.DS_Store|Thumbs.db|*.log)
        fail "$label contains local/generated file: $file"
        ;;
    esac

    case "$filename" in
      package-lock.json|npm-shrinkwrap.json|yarn.lock|bun.lock|bun.lockb)
        fail "$label contains unsupported package-manager lockfile: $file"
        ;;
    esac
  done <<< "$files"
}

looks_like_placeholder_value() {
  local value="$1"

  value="${value%%#*}"
  value="${value%%,*}"
  value="${value%$'\r'}"
  value="${value#\"}"
  value="${value%\"}"
  value="${value#\'}"
  value="${value%\'}"

  case "$value" in
    ''|'""'|"''"|\<*\>|*example*|*Example*|*EXAMPLE*|*placeholder*|*PLACEHOLDER*|*changeme*|*CHANGE_ME*|*dummy*|*DUMMY*|*todo*|*TODO*|*your-*|*YOUR_*|localhost|127.0.0.1)
      return 0
      ;;
  esac

  return 1
}

check_env_example_values() {
  local files="$1"
  local label="$2"
  local tmpcontent

  [ -z "$files" ] && return 0
  tmpcontent="$(mktemp)"
  trap 'rm -f "$tmpcontent"' EXIT

  while IFS= read -r file; do
    [ "$file" = ".env.example" ] || continue

    if [ "$MODE" = "--staged" ]; then
      if ! git cat-file -e ":$file" 2>/dev/null; then
        continue
      fi
      git show ":$file" >"$tmpcontent"
    else
      [ -f "$file" ] || continue
      cp "$file" "$tmpcontent"
    fi

    while IFS= read -r line; do
      case "$line" in
        ''|'#'*) continue ;;
      esac

      case "$line" in
        *=*)
          value="${line#*=}"
          value="${value%%#*}"
          value="${value%$'\r'}"
          if ! looks_like_placeholder_value "$value"; then
            fail "$label contains .env.example value that does not look like a placeholder: $file"
          fi
          ;;
      esac
    done < "$tmpcontent"
  done <<< "$files"

  rm -f "$tmpcontent"
  trap - EXIT
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
  local assignment_pattern='^[[:space:]]*[{,]?[[:space:]]*(export[[:space:]]+)?[^[:space:]:=]*(password|secret|api[_-]?key|token|private[_-]?key|access[_-]?key|auth[_-]?token)[^[:space:]:=]*[[:space:]]*[:=][[:space:]]*[^[:space:]<][^[:space:]]{7,}'
  local local_path_pattern='(^|[^[:alnum:]_./-])(/Users|/home)/[^[:space:]]+'
  local combined_pattern="${private_key_pattern}|${aws_key_pattern}|${github_token_pattern}|${github_pat_pattern}|${openai_key_pattern}|${slack_token_pattern}|${local_path_pattern}"
  local tmpfile
  local tmpcontent
  local assignment_matches
  local line
  local line_body
  local value

  [ -z "$files" ] && return 0
  tmpfile="$(mktemp)"
  tmpcontent="$(mktemp)"
  assignment_matches="$(mktemp)"
  trap 'rm -f "$tmpfile" "$tmpcontent" "$assignment_matches"' EXIT

  while IFS= read -r file; do
    [ -z "$file" ] && continue

    # This file intentionally contains detection patterns. Path checks still apply,
    # but content scanning it would create self-referential false positives.
    [ "$file" = "scripts/check-public-safe.sh" ] && continue

    if [ "$MODE" = "--staged" ]; then
      if ! git cat-file -e ":$file" 2>/dev/null; then
        continue
      fi
      git show ":$file" >"$tmpcontent"
    else
      [ -f "$file" ] || continue
      cp "$file" "$tmpcontent"
    fi

    if grep -Iq . "$tmpcontent"; then
      if grep -nEi "$combined_pattern" "$tmpcontent" >"$tmpfile" 2>/dev/null; then
        printf 'Potential public-safety pattern found in %s file: %s\n' "$label" "$file" >&2
        sed 's/^/  /' "$tmpfile" >&2
        fail "potential secret, sensitive value, or local absolute path detected"
      fi

      if grep -nEi "$assignment_pattern" "$tmpcontent" >"$assignment_matches" 2>/dev/null; then
        : >"$tmpfile"
        while IFS= read -r line; do
          line_body="${line#*:}"
          value="${line_body#*=}"
          if [ "$value" = "$line_body" ]; then
            value="${line_body#*:}"
          fi
          value="${value#${value%%[![:space:]]*}}"

          if ! looks_like_placeholder_value "$value"; then
            printf '%s\n' "$line" >>"$tmpfile"
          fi
        done <"$assignment_matches"

        if [ -s "$tmpfile" ]; then
          printf 'Potential public-safety assignment found in %s file: %s\n' "$label" "$file" >&2
          sed 's/^/  /' "$tmpfile" >&2
          fail "potential secret assignment detected"
        fi
      fi
    fi
  done <<< "$files"

  rm -f "$tmpfile" "$tmpcontent" "$assignment_matches"
  trap - EXIT
}

check_paths "$scan_files" "$scan_label"
check_env_example_values "$scan_files" "$scan_label"
check_content "$scan_files" "$scan_label"

# Always protect tracked files from unsafe filenames, even during staged-only local use.
check_paths "$tracked_files" "tracked files"

printf 'Public safety check passed (%s).\n' "$MODE"
