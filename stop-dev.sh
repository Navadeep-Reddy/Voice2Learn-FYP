#!/usr/bin/env bash

set -Eeuo pipefail

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$ROOT_DIR/.dev-server.pids"

if [[ ! -f "$PID_FILE" ]]; then
  printf 'No development servers started by ./start-dev.sh are recorded.\n'
  exit 0
fi

BACKEND_PID=""
FRONTEND_PID=""
read -r BACKEND_PID FRONTEND_PID < "$PID_FILE" || true
STOPPED=false

for pid in "${BACKEND_PID:-}" "${FRONTEND_PID:-}"; do
  if [[ "$pid" =~ ^[0-9]+$ ]] && kill -0 "$pid" 2>/dev/null; then
    kill -TERM -- "-$pid" 2>/dev/null || true
    STOPPED=true
  fi
done

rm -f "$PID_FILE"

if [[ "$STOPPED" == true ]]; then
  printf 'Backend and frontend stopped.\n'
else
  printf 'No running development servers were found; removed the stale PID file.\n'
fi
