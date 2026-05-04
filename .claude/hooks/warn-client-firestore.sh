#!/usr/bin/env bash
# PostToolUse hook for Write|Edit. Warns (does not block) on direct Firestore
# writes from client code under src/components/** or src/app/** (excluding
# src/app/api/**).
set -uo pipefail

input="$(cat)"
file_path="$(echo "$input" | jq -r '.tool_input.file_path // empty')"

if [[ -z "$file_path" ]] || [[ ! -f "$file_path" ]]; then
  exit 0
fi

# Skip server-side API routes
case "$file_path" in
  *src/app/api/*) exit 0 ;;
esac

# Only inspect client-side source paths
case "$file_path" in
  *src/components/*|*src/app/*) ;;
  *) exit 0 ;;
esac

# Look for a Firestore Web SDK import alongside a write call
if grep -Eq "from[[:space:]]+['\"]firebase/firestore['\"]" "$file_path" 2>/dev/null; then
  if grep -Eq "(setDoc|updateDoc|deleteDoc|addDoc)[[:space:]]*\(" "$file_path" 2>/dev/null; then
    echo "WARNING: Direct Firestore write detected in client code at $file_path. Consider routing through an API route in src/app/api/ for validation, encryption, and consistency. (Not blocking — just flagging.)" 1>&2
  fi
fi

exit 0
