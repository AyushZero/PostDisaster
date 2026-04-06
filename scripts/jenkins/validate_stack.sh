#!/usr/bin/env bash
set -euo pipefail

echo "==> Validating required tools..."

for tool in terraform ansible-playbook docker; do
  if ! command -v "${tool}" >/dev/null 2>&1; then
    echo "Missing required tool: ${tool}"
    exit 1
  fi
done

echo "==> Checking optional tools..."

for opt_tool in kubectl sonar-scanner; do
  if command -v "${opt_tool}" >/dev/null 2>&1; then
    echo "  [OK] ${opt_tool} found"
  else
    echo "  [SKIP] ${opt_tool} not found (optional)"
  fi
done

echo "All required tools are installed."
