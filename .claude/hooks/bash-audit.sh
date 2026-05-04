#!/usr/bin/env bash
# PreToolUse hook for Bash. Appends an audit line to .claude/audit.log.
# Never blocks. Never prints to stdout.
set -uo pipefail

input="$(cat)"

log_dir="${CLAUDE_PROJECT_DIR:-$PWD}/.claude"
log_file="$log_dir/audit.log"
mkdir -p "$log_dir"

timestamp="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

echo "$input" | jq -c --arg ts "$timestamp" \
  '{timestamp: $ts, command: .tool_input.command, description: .tool_input.description}' \
  >> "$log_file" 2>/dev/null || true

exit 0
