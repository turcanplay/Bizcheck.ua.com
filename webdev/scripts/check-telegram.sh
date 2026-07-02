#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════
#  BizCheck — verifică rapid configul Telegram din .env
#  Rulează:  ./scripts/check-telegram.sh
#  Spune: tokenul e viu? chat-ul e accesibil? e forum (topicuri)?
# ════════════════════════════════════════════════════════════
set -euo pipefail
cd "$(dirname "$0")/.."
[ -f .env ] || { echo "✗ Lipsește .env"; exit 1; }
set -a; source ./.env; set +a

hr(){ echo "──────────────────────────────────────────────"; }
me(){  # $1=eticheta  $2=token
  hr; echo "[$1]"
  if [ -z "${2:-}" ]; then echo "  (gol — sărit)"; return; fi
  curl -s --max-time 15 "https://api.telegram.org/bot$2/getMe"; echo
}

me "TELEGRAM_BOT_TOKEN (bot clienți)"        "${TELEGRAM_BOT_TOKEN:-}"
me "SALES_BOT_TOKEN (bot grup/notificări)"    "${SALES_BOT_TOKEN:-}"

if [ -n "${SALES_BOT_TOKEN:-}" ] && [ -n "${SALES_CHAT_ID:-}" ]; then
  hr; echo "[getChat SALES_CHAT_ID=${SALES_CHAT_ID}]"
  echo "  (caută  \"is_forum\":true  și  \"type\":\"supergroup\")"
  curl -s --max-time 15 "https://api.telegram.org/bot${SALES_BOT_TOKEN}/getChat?chat_id=${SALES_CHAT_ID}"; echo
fi
hr
echo "Notă: dacă getChat dă eroare sau is_forum lipsește → SALES_CHAT_ID e greșit."
