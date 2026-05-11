#!/usr/bin/env bash
set -euo pipefail

COMMAND="${1:-}"

if echo "$COMMAND" | grep -E 'cat .env|cat .*\.pem|cat .*\.p8|cat .*\.key|printenv|security find-generic-password' >/dev/null; then
  echo "Blocked: secret access requires manual approval."
  exit 1
fi

if echo "$COMMAND" | grep -E 'npm install|pnpm add|yarn add|bun add' >/dev/null; then
  echo "Blocked: adding dependencies requires approval."
  exit 1
fi

if echo "$COMMAND" | grep -E 'wrangler deploy|gh release create|npm publish' >/dev/null; then
  echo "Blocked: release/deploy operation requires manual approval."
  exit 1
fi

if echo "$COMMAND" | grep -E 'rm -rf|git clean -fdx' >/dev/null; then
  echo "Blocked: destructive delete operation requires manual approval."
  exit 1
fi
