#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════════════════════
#  BizCheck — masca de pre-lansare (HTTP Basic Auth + noindex)
#
#  Cât timp site-ul nu e lansat, tot conținutul public stă în spatele unei
#  cereri de user/parolă, iar răspunsurile poartă `X-Robots-Tag: noindex`.
#  Masca e implementată în nginx (webdev/nginx.conf), NU în SPA: un ecran de
#  login în React ar servi oricum HTML-ul și bundle-ul JS, deci conținutul ar
#  rămâne descărcabil și indexabil.
#
#  Utilizare (din webdev/):
#      ./scripts/site-mask.sh status
#      ./scripts/site-mask.sh adduser <nume>     # creează/adaugă o parolă
#      ./scripts/site-mask.sh on                 # pornește masca + reload nginx
#      ./scripts/site-mask.sh off                # LANSARE: scoate masca + noindex
#      ./scripts/site-mask.sh deluser <nume>
#
#  COMUTATORUL e existența fișierului `nginx-maintenance/mask.conf`. Fișierul
#  conține ȘI `auth_basic`, ȘI `add_header X-Robots-Tag "noindex…"`, tocmai ca
#  să nu poți scoate parola și să uiți noindex-ul în producție (greșeala care
#  ține un site invizibil în Google la nesfârșit). `off` le scoate pe amândouă
#  în aceeași secundă, cu un singur `rm`.
# ════════════════════════════════════════════════════════════════════════════
set -euo pipefail
cd "$(dirname "$0")/.."          # → webdev/

MASK_DIR="nginx-maintenance"
MASK_FILE="${MASK_DIR}/mask.conf"
HTPASSWD="${MASK_DIR}/htpasswd"
REALM="${SITE_MASK_REALM:-BizCheck - site in preparation}"

info() { echo "→ $*"; }
ok()   { echo "✓ $*"; }
warn() { echo "⚠  $*"; }
die()  { echo "✗ $*" >&2; exit 1; }

# ── Conținutul măștii — SURSĂ UNICĂ ─────────────────────────────────────────
# Se scrie identic de fiecare dată. `scripts/validate-nginx.py` extrage exact
# acest text (între marcajele MASK-CONF-BEGIN/END) și validează configul nginx
# în ambele stări, iar `deploy.sh` verifică pe HTTP că starea reală corespunde.
write_mask_conf() {
  cat > "$MASK_FILE" <<EOF
# ══════════════════════════════════════════════════════════════════════════
#  GENERAT DE scripts/site-mask.sh — NU EDITA MANUAL.
#  Prezența acestui fișier = masca de pre-lansare e PORNITĂ.
#  Se scoate cu:  ./scripts/site-mask.sh off
#
#  Fișierul e inclus (glob *.conf) în locațiile de CONȚINUT din nginx.conf.
#  Rămân deliberat neprotejate: /.well-known/ (ACME — altfel expiră TLS-ul),
#  /healthz (healthcheck Docker), /api_crowe_bizcheck/health (smoke-test
#  deploy.sh) și /robots.txt (trebuie citibil ca noindex-ul să conteze).
# ══════════════════════════════════════════════════════════════════════════
# MASK-CONF-BEGIN
auth_basic           "${REALM}";
auth_basic_user_file /etc/nginx/maintenance/htpasswd;

# 'always' e OBLIGATORIU: fără el add_header se aplică doar la 2xx/3xx, adică
# exact NU la 401 — singurul răspuns pe care îl vede un crawler acum.
# noindex   → nu indexa URL-ul (semnalul care chiar dezindexează)
# nofollow  → nu urmări linkurile descoperite
# noarchive → fără copie în cache
# nosnippet, noimageindex → fără fragment / imagini în rezultate
add_header X-Robots-Tag "noindex, nofollow, noarchive, nosnippet, noimageindex" always;
# MASK-CONF-END
EOF
}

# ── Reload nginx în containerul de frontend, dacă rulează ───────────────────
reload_nginx() {
  if ! command -v docker >/dev/null 2>&1 || ! docker compose ps -q frontend >/dev/null 2>&1; then
    warn "docker indisponibil → schimbarea se aplică la următorul deploy/restart"
    return 0
  fi
  local cid
  cid="$(docker compose ps -q frontend 2>/dev/null || true)"
  if [ -z "$cid" ]; then
    warn "Containerul 'frontend' nu rulează → schimbarea se aplică la pornire"
    return 0
  fi
  info "Validez configul în container (nginx -t)…"
  docker compose exec -T frontend nginx -t \
    || die "nginx -t a picat — NU am dat reload. Verifică ${MASK_FILE} și htpasswd."
  docker compose exec -T frontend nginx -s reload \
    || die "reload eșuat — verifică 'docker compose logs frontend'"
  ok "nginx reîncărcat"
}

# ── Hash de parolă fără apache2-utils ───────────────────────────────────────
# nginx:alpine NU conține `htpasswd` (e în apache2-utils / httpd-tools), iar
# containerul e oricum read-only pentru directorul ăsta. Generăm hashul PE
# GAZDĂ. Ordinea de preferință:
#   1. htpasswd -B  (bcrypt) — dacă apache2-utils e instalat pe server
#   2. openssl passwd -apr1  — openssl e prezent pe orice Debian/Ubuntu; apr1
#      (MD5 crypt Apache) e formatul pe care nginx îl citește nativ
#   3. docker run --rm httpd:2.4-alpine htpasswd -nbB — fallback, cere pull
hash_password() {
  local user="$1" pass="$2"
  if command -v htpasswd >/dev/null 2>&1; then
    htpasswd -nbB "$user" "$pass"
  elif command -v openssl >/dev/null 2>&1; then
    printf '%s:%s\n' "$user" "$(printf '%s' "$pass" | openssl passwd -apr1 -stdin)"
  elif command -v docker >/dev/null 2>&1; then
    docker run --rm --entrypoint htpasswd httpd:2.4-alpine -nbB "$user" "$pass"
  else
    die "Nu găsesc nici htpasswd, nici openssl, nici docker — nu pot genera hashul"
  fi
}

cmd_adduser() {
  local user="${1:-}"
  [ -n "$user" ] || die "Utilizare: $0 adduser <nume>"
  case "$user" in *:*) die "Numele nu poate conține ':'";; esac
  mkdir -p "$MASK_DIR"

  local p1 p2
  # Parola se CITEȘTE, nu se dă ca argument: altfel ajunge în `history` și în
  # lista de procese (`ps aux`) a serverului.
  printf 'Parolă pentru «%s»: ' "$user" >&2; read -rs p1; echo >&2
  printf 'Repetă: ' >&2;                     read -rs p2; echo >&2
  [ "$p1" = "$p2" ] || die "Parolele nu coincid"
  [ ${#p1} -ge 12 ] || die "Minim 12 caractere (masca e singura barieră a site-ului)"

  local line
  line="$(hash_password "$user" "$p1")"
  [ -n "$line" ] || die "Generarea hashului a eșuat"

  touch "$HTPASSWD"
  # Înlocuiește intrarea existentă a utilizatorului, dacă există.
  grep -v "^${user}:" "$HTPASSWD" > "${HTPASSWD}.tmp" 2>/dev/null || true
  printf '%s\n' "$line" >> "${HTPASSWD}.tmp"
  mv "${HTPASSWD}.tmp" "$HTPASSWD"
  chmod 640 "$HTPASSWD"
  ok "Utilizator «${user}» salvat în ${HTPASSWD} ($(wc -l < "$HTPASSWD" | tr -d ' ') în total)"
  [ -f "$MASK_FILE" ] && reload_nginx || info "Masca e OPRITĂ — pornește-o cu: $0 on"
}

cmd_deluser() {
  local user="${1:-}"
  [ -n "$user" ] || die "Utilizare: $0 deluser <nume>"
  [ -f "$HTPASSWD" ] || die "Nu există $HTPASSWD"
  grep -q "^${user}:" "$HTPASSWD" || die "Utilizatorul «${user}» nu există"
  grep -v "^${user}:" "$HTPASSWD" > "${HTPASSWD}.tmp" || true
  mv "${HTPASSWD}.tmp" "$HTPASSWD"
  chmod 640 "$HTPASSWD"
  local left; left="$(wc -l < "$HTPASSWD" | tr -d ' ')"
  ok "Utilizator «${user}» șters (au rămas ${left})"
  if [ "$left" -eq 0 ] && [ -f "$MASK_FILE" ]; then
    warn "htpasswd e GOL, dar masca e pornită → nimeni nu mai poate intra pe site."
  fi
  [ -f "$MASK_FILE" ] && reload_nginx || true
}

cmd_on() {
  mkdir -p "$MASK_DIR"
  [ -s "$HTPASSWD" ] || die "Lipsește $HTPASSWD (sau e gol). Rulează întâi: $0 adduser <nume>"
  write_mask_conf
  ok "Mască PORNITĂ → ${MASK_FILE}"
  echo "  • tot conținutul public cere user/parolă (401)"
  echo "  • răspunsurile poartă X-Robots-Tag: noindex, nofollow, …"
  echo "  • rămân deschise: /.well-known/, /healthz, /api_crowe_bizcheck/health, /robots.txt"
  warn "Cât timp e pornită NU funcționează pentru publicul larg: linkurile de raport"
  warn "  din email/Telegram, previzualizările în rețele sociale, Search Console."
  reload_nginx
}

cmd_off() {
  if [ ! -f "$MASK_FILE" ]; then
    ok "Masca era deja OPRITĂ (nu există ${MASK_FILE})"
  else
    rm -f "$MASK_FILE"
    ok "Mască OPRITĂ — au dispărut SIMULTAN parola ȘI antetul noindex"
  fi
  # htpasswd rămâne pe disc intenționat: nu e activ fără mask.conf, dar te
  # scutește de regenerarea parolelor dacă repui masca (staging, hotfix).
  echo "  htpasswd rămâne la ${HTPASSWD} (inactiv fără mask.conf)"
  reload_nginx
  echo ""
  info "După lansare, verifică pe domeniul public:"
  echo "    curl -sI https://bizcheck.com.ua/ | grep -iE 'HTTP/|x-robots-tag'"
  echo "  Așteptat: 200, și NICIO linie x-robots-tag."
  echo "  Apoi retrimite sitemap.xml în Search Console (runbook §8.3)."
}

cmd_status() {
  local state="OPRITĂ"
  [ -f "$MASK_FILE" ] && state="PORNITĂ"
  echo "Mască de pre-lansare: ${state}"
  echo "  comutator : ${MASK_FILE}"
  if [ -f "$HTPASSWD" ]; then
    echo "  utilizatori: $(cut -d: -f1 "$HTPASSWD" | paste -sd, - 2>/dev/null || true)"
  else
    echo "  utilizatori: (niciunul — lipsește ${HTPASSWD})"
  fi
  if [ -f "$MASK_FILE" ]; then
    grep -q 'auth_basic_user_file' "$MASK_FILE" \
      || warn "  ${MASK_FILE} nu conține auth_basic_user_file — fișier modificat manual?"
    grep -q 'X-Robots-Tag' "$MASK_FILE" \
      || warn "  ${MASK_FILE} nu conține X-Robots-Tag — fișier modificat manual?"
    [ -s "$HTPASSWD" ] || warn "  htpasswd lipsește/e gol → nginx va răspunde 500 pe tot site-ul"
  fi
}

case "${1:-status}" in
  on)      cmd_on ;;
  off)     cmd_off ;;
  status)  cmd_status ;;
  adduser) shift; cmd_adduser "${1:-}" ;;
  deluser) shift; cmd_deluser "${1:-}" ;;
  *) echo "Utilizare: $0 {on|off|status|adduser <nume>|deluser <nume>}" >&2; exit 2 ;;
esac
