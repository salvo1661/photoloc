#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
APP_HOST="${APP_HOST:-photoloc-lightsail}"
APP_DIR="${APP_DIR:-/home/photoloc/app}"
APP_PORT="${APP_PORT:-4173}"
DOMAIN="${DOMAIN:-photo.localtool.tech}"
ADMIN_USER="${ADMIN_USER:-ec2-user}"
ADMIN_HOST="${ADMIN_HOST:-35.175.93.255}"
KEY_PATH="${KEY_PATH:-$ROOT_DIR/LightsailDefaultKey-us-east-1.pem}"

if [[ ! -f "$KEY_PATH" ]]; then
  echo "Missing SSH key: $KEY_PATH" >&2
  exit 1
fi

chmod 600 "$KEY_PATH"

echo "[1/4] Syncing files to $APP_HOST:$APP_DIR"
rsync -az --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'dist' \
  --exclude '*.pem' \
  -e 'ssh' \
  "$ROOT_DIR"/ "$APP_HOST:$APP_DIR/"

echo "[2/4] Installing dependencies and building on server"
ssh "$APP_HOST" "cd $APP_DIR && npm ci && npm run build"

echo "[3/4] Restarting systemd service"
ssh -i "$KEY_PATH" "$ADMIN_USER@$ADMIN_HOST" \
  "sudo systemctl restart photoloc && sudo systemctl status photoloc --no-pager -l"

echo "[4/4] Verifying deployment"
ssh "$APP_HOST" "curl -I http://127.0.0.1:$APP_PORT/en"
curl -I "https://$DOMAIN/en"
