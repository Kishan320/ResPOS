#!/usr/bin/env bash
# =============================================================================
# Rathin POS - single entrypoint
# Starts MySQL migration/seed, FastAPI backend (8000), React UI (3000)
# Usage: ./start.sh
# =============================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$ROOT/backend"
FRONTEND="$ROOT/frontend"
LOG_DIR="$ROOT/.logs"
PID_DIR="$ROOT/.pids"

mkdir -p "$LOG_DIR" "$PID_DIR"

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
YELLOW='\033[1;33m'
NC='\033[0m'

info()  { echo -e "${CYAN}[pos]${NC} $*"; }
ok()    { echo -e "${GREEN}[pos]${NC} $*"; }
warn()  { echo -e "${YELLOW}[pos]${NC} $*"; }
fail()  { echo -e "${RED}[pos]${NC} $*"; exit 1; }

cleanup() {
  info "Stopping services..."
  if [[ -f "$PID_DIR/backend.pid" ]]; then
    kill "$(cat "$PID_DIR/backend.pid")" 2>/dev/null || true
    rm -f "$PID_DIR/backend.pid"
  fi
  if [[ -f "$PID_DIR/frontend.pid" ]]; then
    kill "$(cat "$PID_DIR/frontend.pid")" 2>/dev/null || true
    rm -f "$PID_DIR/frontend.pid"
  fi
  # Kill children of this process group if still around
  pkill -P $$ 2>/dev/null || true
  ok "Stopped."
}
trap cleanup EXIT INT TERM

# ── Backend venv & deps ──────────────────────────────────────────────────────
info "Preparing backend..."
cd "$BACKEND"
if [[ ! -d .venv ]]; then
  python3 -m venv .venv || fail "Could not create virtualenv (need python3-venv)"
fi

# Prefer venv binaries by absolute path (many systems have no system `python`, only python3)
VENV_BIN="$BACKEND/.venv/bin"
if [[ -x "$VENV_BIN/python3" ]]; then
  PY="$VENV_BIN/python3"
elif [[ -x "$VENV_BIN/python" ]]; then
  PY="$VENV_BIN/python"
else
  fail "No python in $VENV_BIN — recreate with: python3 -m venv backend/.venv"
fi
if [[ ! -e "$VENV_BIN/python" ]]; then
  ln -sf "$(basename "$PY")" "$VENV_BIN/python" 2>/dev/null || true
fi

# shellcheck disable=SC1091
source "$VENV_BIN/activate"
export PATH="$VENV_BIN:$PATH"

"$PY" -m pip install -q --upgrade pip
"$PY" -m pip install -q -r requirements.txt

# ── Database migrate & seed ──────────────────────────────────────────────────
info "Running migrations & seed (creates tables + super admin)..."
"$PY" scripts/migrate_and_seed.py

# ── Start backend ────────────────────────────────────────────────────────────
info "Starting API on http://127.0.0.1:8000 ..."
# free port if leftover
if command -v fuser >/dev/null 2>&1; then
  fuser -k 8000/tcp 2>/dev/null || true
fi
nohup "$PY" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload \
  >"$LOG_DIR/backend.log" 2>&1 &
echo $! >"$PID_DIR/backend.pid"

# Wait for health
for i in {1..40}; do
  if curl -sf http://127.0.0.1:8000/health >/dev/null 2>&1; then
    ok "Backend is healthy"
    break
  fi
  if [[ $i -eq 40 ]]; then
    warn "Backend health check timed out — see $LOG_DIR/backend.log"
    tail -n 40 "$LOG_DIR/backend.log" || true
    fail "Backend failed to start"
  fi
  sleep 0.5
done

# ── Frontend deps ────────────────────────────────────────────────────────────
info "Preparing frontend..."
cd "$FRONTEND"
if [[ ! -d node_modules ]]; then
  npm install
fi

# free port 3000 if leftover
if command -v fuser >/dev/null 2>&1; then
  fuser -k 3000/tcp 2>/dev/null || true
fi

info "Starting UI on http://127.0.0.1:3000 ..."
nohup npm run dev -- --host 0.0.0.0 --port 3000 \
  >"$LOG_DIR/frontend.log" 2>&1 &
echo $! >"$PID_DIR/frontend.pid"

# Wait for frontend
for i in {1..60}; do
  if curl -sf http://127.0.0.1:3000 >/dev/null 2>&1; then
    ok "Frontend is ready"
    break
  fi
  if [[ $i -eq 60 ]]; then
    warn "Frontend may still be compiling — see $LOG_DIR/frontend.log"
  fi
  sleep 0.5
done

echo ""
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}  Rathin POS is running${NC}"
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"
echo -e "  UI:       ${CYAN}http://localhost:3000${NC}"
echo -e "  API:      ${CYAN}http://localhost:8000${NC}"
echo -e "  API docs: ${CYAN}http://localhost:8000/docs${NC}"
echo -e "  Health:   ${CYAN}http://localhost:8000/health${NC}"
echo ""
echo -e "  Super admin: ${YELLOW}superadmin${NC} / ${YELLOW}Rathin@1290${NC}"
echo -e "  Logs:        $LOG_DIR/"
echo ""
echo -e "  Press ${YELLOW}Ctrl+C${NC} to stop both services."
echo -e "${GREEN}════════════════════════════════════════════════════════════${NC}"

# Keep process alive and stream a heartbeat; logs are in .logs/
tail -n 0 -F "$LOG_DIR/backend.log" "$LOG_DIR/frontend.log" 2>/dev/null &
wait
