#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════
#  BizCheck — deploy notificări Telegram + bot de grup
#  Rulează pe server din ~/BIZZCHECK_BOT/webdev :  ./deploy.sh
# ════════════════════════════════════════════════════════════
set -euo pipefail
cd "$(dirname "$0")"

echo "→ Verific .env…"
[ -f .env ] || { echo "✗ Lipsește .env în $(pwd)"; exit 1; }
grep -q '^SALES_BOT_TOKEN=' .env   || echo "⚠  SALES_BOT_TOKEN lipsește din .env"
grep -q '^SALES_CHAT_ID=' .env     || echo "⚠  SALES_CHAT_ID lipsește din .env"
grep -q '^BOT_SHARED_SECRET=' .env || echo "⚠  BOT_SHARED_SECRET lipsește din .env (exporturile /excel /pdf NU merg fără el)"

echo "→ Build + restart: backend (rulează migrarea DB) + groupbot…"
docker compose up -d --build backend groupbot

echo "→ Stare servicii:"
docker compose ps backend groupbot

echo "→ Ultimele log-uri groupbot:"
docker compose logs --tail=30 groupbot || true

echo "✅ Gata. Testează în grup:  /excel   și   /pdf"
