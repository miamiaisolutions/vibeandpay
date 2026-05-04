#!/usr/bin/env bash
# PostToolUse hook for Write|Edit. Runs Prettier on supported file types.
# Suppresses output on success; exits 1 with the Prettier error on failure.
set -uo pipefail

input="$(cat)"
file_path="$(echo "$input" | jq -r '.tool_input.file_path // empty')"

if [[ -z "$file_path" ]]; then
  exit 0
fi

case "$file_path" in
  *.ts|*.tsx|*.js|*.jsx|*.json|*.css|*.md) ;;
  *) exit 0 ;;
esac

# Skip silently if pnpm or prettier aren't available yet (e.g. before install)
if ! command -v pnpm >/dev/null 2>&1; then
  exit 0
fi
if ! pnpm prettier --version >/dev/null 2>&1; then
  exit 0
fi

if err="$(pnpm prettier --write "$file_path" 2>&1 >/dev/null)"; then
  printf '{"suppressOutput": true}\n'
  exit 0
else
  echo "$err" 1>&2
  exit 1
fi
