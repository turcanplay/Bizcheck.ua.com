#!/usr/bin/env bash
#
# Schimbă tokenurile celor doi boți Telegram ai acestui stack.
#
# De ce un script și nu un `sed` scris de mână: tokenul nu trebuie să ajungă
# nici în istoricul shell-ului, nici în lista de procese (`ps` vede argumentele
# oricărei comenzi). Aici se citește de la tastatură cu `read -rs`, deci nu se
# afișează și nu se salvează nicăieri în afară de `.env`.
#
# Cei doi boți sunt DIFERIȚI și nu se pot amesteca:
#   TELEGRAM_BOT_TOKEN — botul de chat cu clientul (serviciul `tgbot`)
#   SALES_BOT_TOKEN    — botul de notificări din grupul de vânzări
#                        (serviciul `groupbot` + `services/sales_notify.py`)
#
# Rulare, din directorul `webdev/` de pe server:
#   ./scripts/set-bot-tokens.sh
#
set -euo pipefail

cd "$(dirname "$0")/.."
ENV_FILE=".env"

info() { printf '\033[36m→\033[0m %s\n' "$*"; }
ok()   { printf '\033[32m✓\033[0m %s\n' "$*"; }
die()  { printf '\033[31m✗ %s\033[0m\n' "$*" >&2; exit 1; }

[ -f "$ENV_FILE" ] || die "Nu găsesc $ENV_FILE. Rulează scriptul din directorul webdev/."

# Nu lăsa urme în istoric nici dacă shell-ul e interactiv.
set +o history 2>/dev/null || true

read_token() {
  # $1 = eticheta arătată utilizatorului; tokenul se întoarce prin variabila $2
  local __label="$1" __out="$2" __val=""
  printf '%s: ' "$__label" >&2
  read -rs __val
  printf '\n' >&2
  [ -n "$__val" ] || die "Token gol — am oprit, nu s-a schimbat nimic."
  # Forma unui token Telegram: <id numeric>:<secret>. Verificarea prinde
  # greșelile de copiere (spații, ghilimele lipite), nu validitatea reală —
  # aia o confirmă getMe mai jos.
  [[ "$__val" =~ ^[0-9]{6,12}:[A-Za-z0-9_-]{30,}$ ]] \
    || die "Tokenul nu arată a token Telegram (aștept <id>:<secret>). Nimic schimbat."
  printf -v "$__out" '%s' "$__val"
}

# Întoarce username-ul botului, sau iese cu eroare dacă tokenul e respins.
check_token() {
  local __tok="$1" __who="$2" resp uname_
  resp="$(curl -sS --max-time 15 "https://api.telegram.org/bot${__tok}/getMe")" \
    || die "Nu am putut contacta api.telegram.org pentru $__who."
  case "$resp" in
    *'"ok":true'*) : ;;
    *) die "Telegram a respins tokenul pentru $__who. Nimic schimbat." ;;
  esac
  uname_="$(printf '%s' "$resp" | sed -n 's/.*"username":"\([^"]*\)".*/\1/p')"
  [ -n "$uname_" ] || die "Nu am putut citi username-ul botului pentru $__who."
  printf '%s' "$uname_"
}

# `sed` primește tokenul prin argument, deci ar fi vizibil în `ps`. Folosim
# python, care îl primește din mediu — mediul unui proces nu e citibil de alți
# utilizatori pe un kernel modern.
set_var() {
  VAR_NAME="$1" VAR_VALUE="$2" ENV_PATH="$ENV_FILE" python3 - <<'PY'
import os, re
name, value, path = os.environ["VAR_NAME"], os.environ["VAR_VALUE"], os.environ["ENV_PATH"]
with open(path, encoding="utf-8") as f:
    lines = f.readlines()
pat = re.compile(rf"^{re.escape(name)}=")
found = False
for i, line in enumerate(lines):
    if pat.match(line):
        lines[i] = f"{name}={value}\n"
        found = True
        break
if not found:
    if lines and not lines[-1].endswith("\n"):
        lines[-1] += "\n"
    lines.append(f"{name}={value}\n")
with open(path, "w", encoding="utf-8") as f:
    f.writelines(lines)
PY
}

echo
info "Tokenurile nu se afișează în timp ce le lipești. Enter după fiecare."
echo

read_token "Token bot CHAT cu clientul (TELEGRAM_BOT_TOKEN)" CHAT_TOKEN
read_token "Token bot NOTIFICĂRI în grup (SALES_BOT_TOKEN)"  SALES_TOKEN

[ "$CHAT_TOKEN" != "$SALES_TOKEN" ] \
  || die "Ai introdus același token de două ori. Cei doi boți trebuie să fie diferiți — altfel primesc 409 la getUpdates."

info "Verific tokenurile la Telegram…"
CHAT_USERNAME="$(check_token "$CHAT_TOKEN" "botul de chat")"
SALES_USERNAME="$(check_token "$SALES_TOKEN" "botul de notificări")"
ok "Bot chat:        @${CHAT_USERNAME}"
ok "Bot notificări:  @${SALES_USERNAME}"

BACKUP="${ENV_FILE}.bak-$(date +%Y%m%d-%H%M%S)"
cp -p "$ENV_FILE" "$BACKUP"
chmod 600 "$BACKUP"
ok "Copie de siguranță: ${BACKUP}"

set_var TELEGRAM_BOT_TOKEN "$CHAT_TOKEN"
set_var SALES_BOT_TOKEN    "$SALES_TOKEN"
# Backendul construiește linkul t.me/<handle>?start=… din variabila asta. Dacă
# rămâne handle-ul botului vechi, clientul e trimis la botul greșit.
set_var TELEGRAM_BOT_USERNAME "$CHAT_USERNAME"
ok "Actualizat .env (token chat, token notificări, handle bot)"

unset CHAT_TOKEN SALES_TOKEN
set -o history 2>/dev/null || true

info "Repornesc serviciile care citesc tokenurile…"
docker compose up -d --no-deps --force-recreate backend tgbot groupbot >/dev/null
sleep 12

echo
info "Verificare — 409 înseamnă că altcineva mai interoghează același token:"
if docker compose logs --since 60s tgbot groupbot 2>/dev/null | grep -q "409"; then
  printf '\033[31m✗ Încă apare 409. Verifică dacă alt stack folosește aceleași tokenuri.\033[0m\n'
  docker compose logs --since 60s tgbot groupbot | grep -i "409\|conflict" | tail -5
  exit 1
fi
ok "Niciun 409 în ultimele 60 de secunde."
docker compose ps --format '{{.Name}}\t{{.Status}}' | grep -E 'tgbot|groupbot|backend'
echo
ok "Gata. Testează în grup: /excel și /pdf"
