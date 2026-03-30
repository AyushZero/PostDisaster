#!/usr/bin/env bash
set -euo pipefail

for tool in terraform ansible-playbook docker; do
  if ! command -v "${tool}" >/dev/null 2>&1; then
    echo "Missing required tool: ${tool}"
    exit 1
  fi
done

echo "All required tools are installed."
