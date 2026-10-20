#!/usr/bin/env bash

set -Eeuo pipefail
set -m

ROOT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PID_FILE="$ROOT_DIR/.dev-server.pids"
BACKEND_PID=""
FRONTEND_PID=""

cleanup() {
  local exit_code=$?
  local recorded_backend_pid=""
  local recorded_frontend_pid=""
  trap - EXIT INT TERM

  for pid in "$BACKEND_PID" "$FRONTEND_PID"; do
    if [[ -n "$pid" ]] && kill -0 "$pid" 2>/dev/null; then
      kill -TERM -- "-$pid" 2>/dev/null || true
    fi
  done

  wait 2>/dev/null || true
  if [[ -f "$PID_FILE" ]]; then
    read -r recorded_backend_pid recorded_frontend_pid < "$PID_FILE" || true
    if [[ "$recorded_backend_pid" == "$BACKEND_PID" && "$recorded_frontend_pid" == "$FRONTEND_PID" ]]; then
      rm -f "$PID_FILE"
    fi
  fi
  exit "$exit_code"
}

trap cleanup EXIT
trap 'exit 130' INT TERM

if [[ ! -x "$ROOT_DIR/backend/.venv/bin/uvicorn" ]]; then
  printf 'Backend uvicorn not found. Create the virtual environment and install backend requirements first.\n' >&2
  exit 1
fi

if ! command -v npm >/dev/null 2>&1; then
  printf 'npm was not found on PATH. Install Node.js and npm first.\n' >&2
  exit 1
fi

if [[ -f "$PID_FILE" ]]; then
  existing_backend_pid=""
  existing_frontend_pid=""
  read -r existing_backend_pid existing_frontend_pid < "$PID_FILE" || true
  if kill -0 "${existing_backend_pid:-}" 2>/dev/null || kill -0 "${existing_frontend_pid:-}" 2>/dev/null; then
    printf 'Development servers appear to be running already. Use ./stop-dev.sh first.\n' >&2
    exit 1
  fi
  rm -f "$PID_FILE"
fi

(
  cd "$ROOT_DIR/backend"
  exec .venv/bin/uvicorn app.main:app --reload --port 8000
) &
BACKEND_PID=$!

(
  cd "$ROOT_DIR/frontend"
  exec npm run dev
) &
FRONTEND_PID=$!

printf '%s %s\n' "$BACKEND_PID" "$FRONTEND_PID" > "$PID_FILE"

printf 'Backend and frontend started. Press Ctrl+C to stop both.\n'

set +e
wait -n "$BACKEND_PID" "$FRONTEND_PID"
EXIT_CODE=$?
set -e

printf 'A development server stopped; shutting down the other server.\n' >&2
exit "$EXIT_CODE"
