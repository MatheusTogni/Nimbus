#!/usr/bin/env bash
# Updates a running Nimbus installation on the VPS.
# Usage: bash /opt/nimbus/deploy/deploy.sh
set -euo pipefail

APP_DIR="${APP_DIR:-/opt/nimbus}"
cd "$APP_DIR"

echo "==> Pulling latest code"
git pull --ff-only

echo "==> API: install, migrate, build"
cd "$APP_DIR/back"
npm ci
npx prisma migrate deploy
npm run build

echo "==> Web: install, build"
cd "$APP_DIR/front"
npm ci
npm run build-only

echo "==> Reloading API"
pm2 reload nimbus-api --update-env

echo "==> Health check"
sleep 2
curl -fsS http://127.0.0.1:3005/api/health && echo
echo "Deploy finished."
