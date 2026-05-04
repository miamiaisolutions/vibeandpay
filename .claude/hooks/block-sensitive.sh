#!/usr/bin/env bash
# PreToolUse hook for Write|Edit. Blocks writes to sensitive paths.
set -uo pipefail

input="$(cat)"
file_path="$(echo "$input" | jq -r '.tool_input.file_path // empty')"

if [[ -z "$file_path" ]]; then
  exit 0
fi

# Strip trailing slashes for cleaner matching
clean="$file_path"

block() {
  echo "Blocked: writes to $file_path are not permitted ($1). If you really need this, ask the user first." 1>&2
  exit 2
}

case "$clean" in
  # Allow committed templates (.env.example, .env.local.example, etc.)
  *.example|*.template|*.sample) ;;
  # Block real env files at any depth or root: .env, .env.local, .env.production
  *.env|*.env.*|*/.env|*/.env.*) block "secrets file" ;;
  # Firebase service account JSON
  */firebase-service-account.json|firebase-service-account.json) block "service account key" ;;
  # Anything inside .git/
  */.git/*|.git/*) block ".git internals" ;;
  # Anything inside node_modules/
  */node_modules/*|node_modules/*) block "node_modules" ;;
esac

exit 0
