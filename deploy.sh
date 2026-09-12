#!/usr/bin/env bash
# =============================================================================
# Rathin POS - safe production deploy
# Run on the server after git pull / rsync. Does NOT wipe .env, nginx, or MySQL.
# Usage (on server):
#   bash ~/POSProject/pos/deploy.sh
# =============================================================================
set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND="$APP_DIR/backend"
FRONTEND="$APP_DIR/frontend"

echo "[deploy] Rathin POS at $APP_DIR"

if [[ ! -f "$BACKEND/.env" ]]; then
  echo "[deploy] ERROR: backend/.env missing. Do not overwrite production env."
  exit 1
fi

echo "[deploy] Backend deps + migrate/seed (safe upserts only)..."
cd "$BACKEND"
# shellcheck disable=SC1091
source .venv/bin/activate
pip install -q -r requirements.txt
python scripts/migrate_and_seed.py

echo "[deploy] Frontend production build..."
cd "$FRONTEND"
if [[ ! -d node_modules ]]; then
  npm install
else
  npm install --prefer-offline
fi
npm run build

echo "[deploy] Restart API (zero-config systemd)..."
if systemctl is-enabled rathin-pos-api >/dev/null 2>&1; then
  sudo systemctl restart rathin-pos-api
  sleep 1
  sudo systemctl --no-pager --full status rathin-pos-api | head -12 || true
else
  echo "[deploy] WARNING: rathin-pos-api service not found"
fi

if command -v nginx >/dev/null 2>&1; then
  sudo nginx -t && sudo systemctl reload nginx
fi

echo "[deploy] Health check..."
curl -sf http://127.0.0.1:8000/health && echo
curl -sf -o /dev/null -w "ui:%{http_code}\n" http://127.0.0.1/ || true

echo "[deploy] Done. Live site updated without destroying server config."
echo "  - .env preserved"
echo "  - nginx/systemd preserved"
echo "  - database migrated + seed upserts only"
