#!/usr/bin/env bash
set -euo pipefail

echo "Running quality gate..."

echo ""
echo "=== Typecheck ==="
npm run typecheck

echo ""
echo "=== Lint ==="
npm run lint

echo ""
echo "=== Unit Tests ==="
npm run test

echo ""
echo "=== E2E Tests ==="
npm run test:e2e

echo ""
echo "=== Build ==="
npm run build

echo ""
echo "=== Agent Guard ==="
bash scripts/agent-guard.sh

echo ""
echo "Quality gate passed."
