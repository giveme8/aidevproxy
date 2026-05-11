#!/usr/bin/env bash
set -euo pipefail

BASE_REF=""
MODE="local"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --base)
      BASE_REF="${2:-}"
      if [[ -z "$BASE_REF" ]]; then
        echo "Error: --base requires a git ref, e.g. --base origin/main"
        exit 1
      fi
      MODE="base"
      shift 2
      ;;
    --help|-h)
      cat <<'EOF'
Usage:
  bash scripts/agent-guard.sh
  bash scripts/agent-guard.sh --base origin/main

Modes:
  local:
    Checks local working tree diff and staged changes.

  --base <ref>:
    Checks changes from merge-base(<ref>, HEAD) to HEAD.
    Use this mode in CI / PR checks.

Examples:
  bash scripts/agent-guard.sh
  bash scripts/agent-guard.sh --base origin/main
EOF
      exit 0
      ;;
    *)
      echo "Unknown argument: $1"
      exit 1
      ;;
  esac
done

echo "Running agent guard..."

if [[ "$MODE" == "base" ]]; then
  if ! git rev-parse --verify "$BASE_REF" >/dev/null 2>&1; then
    echo "Error: base ref not found: $BASE_REF"
    echo "Tip: run 'git fetch origin main' before this command in CI."
    exit 1
  fi

  MERGE_BASE="$(git merge-base "$BASE_REF" HEAD)"
  DIFF_RANGE="$MERGE_BASE..HEAD"

  changed_files() {
    git diff --name-only "$DIFF_RANGE"
  }

  changed_status() {
    git diff --name-status "$DIFF_RANGE"
  }

  diff_content() {
    git diff "$DIFF_RANGE"
  }

  echo "Mode: base diff"
  echo "Base ref: $BASE_REF"
  echo "Merge base: $MERGE_BASE"
else
  changed_files() {
    {
      git diff --name-only
      git diff --name-only --cached
    } | sort -u
  }

  changed_status() {
    {
      git diff --name-status
      git diff --name-status --cached
    } | sort -u
  }

  diff_content() {
    {
      git diff
      git diff --cached
    }
  }

  echo "Mode: local working tree diff"
fi

FILES="$(changed_files || true)"
STATUS="$(changed_status || true)"
DIFF="$(diff_content || true)"

if [[ -z "$FILES" && -z "$STATUS" && -z "$DIFF" ]]; then
  echo "No changes detected."
  echo "Agent guard passed."
  exit 0
fi

# Block secret-like file changes
if echo "$FILES" | grep -E '(^|/)\.env($|\.|/)|\.pem$|\.p8$|\.key$|id_rsa|id_ed25519' >/dev/null; then
  echo "Blocked: secret-like files changed."
  echo "$FILES" | grep -E '(^|/)\.env($|\.|/)|\.pem$|\.p8$|\.key$|id_rsa|id_ed25519' || true
  exit 1
fi

# Block skipped tests
if echo "$DIFF" | grep -E 'it\.skip|test\.skip|describe\.skip|xit\(|xdescribe\(' >/dev/null; then
  echo "Blocked: skipped tests detected."
  exit 1
fi

# Block deletion of tests
if echo "$STATUS" | grep -E '^D\s+.*(tests?|__tests__)/.*\.(test|spec)\.(ts|tsx|js|jsx)$' >/dev/null; then
  echo "Blocked: deleted test files detected."
  echo "$STATUS" | grep -E '^D\s+.*(tests?|__tests__)/.*\.(test|spec)\.(ts|tsx|js|jsx)$' || true
  exit 1
fi

# Block deletion of e2e tests
if echo "$STATUS" | grep -E '^D\s+.*e2e/.*\.(test|spec)\.(ts|tsx|js|jsx)$' >/dev/null; then
  echo "Blocked: deleted e2e test files detected."
  echo "$STATUS" | grep -E '^D\s+.*e2e/.*\.(test|spec)\.(ts|tsx|js|jsx)$' || true
  exit 1
fi

# Warn on dependency changes
if echo "$FILES" | grep -E '(^|/)package\.json$|package-lock\.json$|pnpm-lock\.yaml$|yarn\.lock$' >/dev/null; then
  echo "Warning: dependency files changed. Approval required."
  echo "$FILES" | grep -E '(^|/)package\.json$|package-lock\.json$|pnpm-lock\.yaml$|yarn\.lock$' || true
  exit 2
fi

# Warn on sensitive engineering files
if echo "$FILES" | grep -E '^\.github/workflows/|src-tauri/|tauri\.conf\.json|website/wrangler\.toml' >/dev/null; then
  echo "Warning: sensitive engineering/deployment files changed. Approval required."
  echo "$FILES" | grep -E '^\.github/workflows/|src-tauri/|tauri\.conf\.json|website/wrangler\.toml' || true
  exit 2
fi

echo "Agent guard passed."
