#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════
#  BizCheck — cu ce rol Postgres rulează DE FAPT backendul?
#
#      ./scripts/check-db-role.sh            # raport + avertismente (ieșire 0)
#      ./scripts/check-db-role.sh --strict   # superuser sau .env ignorat → ieșire 1
#
#  DE CE EXISTĂ
#  ------------
#  Procedura din backend/DATABASE_ROLE.md se termina cu:
#      echo "DATABASE_URL=postgresql://bizcheck_app:...@db:5432/bizzcheck" >> .env
#  ...care era un NO-OP. În docker-compose.yml, DATABASE_URL era un literal
#  calculat din ${DB_USER}/${DB_PASSWORD}, iar niciun serviciu nu are `env_file:`,
#  deci `.env` servea DOAR la substituția ${...}. Variabila scrisă în .env nu
#  ajungea niciodată în container: backendul continua să se conecteze ca
#  superuser, iar operatorul credea că a securizat baza. Compose-ul e reparat
#  acum (`${DATABASE_URL:-<valoarea calculată>}`), dar o configurație greșită
#  nu are voie să mai treacă neobservată — de aici verificarea asta, care se
#  uită la containerul VIU, nu la fișiere.
#
#  Ce verifică, în ordine:
#    1. rolul din DATABASE_URL-ul containerului backend (nu din .env!);
#    2. dacă .env cere alt rol decât cel din container → .env e IGNORAT (bug);
#    3. dacă rolul e superuser în Postgres → procedura nu e aplicată;
#    4. CONNECTION LIMIT-ul rolului vs. necesarul real al pool-ului.
#
#  Nu afișează NICIODATĂ parola: din DSN se extrage doar numele rolului.
# ════════════════════════════════════════════════════════════
set -euo pipefail
cd "$(dirname "$0")/.."   # → webdev/

STRICT=0
[ "${1:-}" = "--strict" ] && STRICT=1

info() { echo "→ $*"; }
ok()   { echo "✓ $*"; }
warn() { echo "⚠  $*"; }
die()  { echo "✗ $*" >&2; exit 1; }

fail=0
note_problem() {
  echo "✗ $*" >&2
  [ "$STRICT" = "1" ] && fail=1
  return 0
}

command -v docker >/dev/null 2>&1 || die "docker nu e instalat"
docker compose version >/dev/null 2>&1 || die "plugin-ul 'docker compose' lipsește"

DB_NAME="$(grep -E '^DB_NAME=' .env 2>/dev/null | tail -1 | cut -d= -f2- || true)"
DB_USER="$(grep -E '^DB_USER=' .env 2>/dev/null | tail -1 | cut -d= -f2- || true)"
DB_NAME="${DB_NAME:-bizzcheck}"
DB_USER="${DB_USER:-postgres}"

if [ "$DB_USER" != "postgres" ]; then
  warn "DB_USER=$DB_USER în .env. DB_USER e utilizatorul SERVICIULUI db (initdb +"
  warn "  pg_isready), nu al aplicației. Rolul aplicației se pune prin DATABASE_URL."
fi

# ── 1. Rolul cu care pornește EFECTIV backendul ─────────────
[ -n "$(docker compose ps -q backend 2>/dev/null || true)" ] \
  || die "Serviciul 'backend' nu rulează — pornește-l întâi (docker compose up -d backend)"

RUNTIME_URL="$(docker compose exec -T backend printenv DATABASE_URL 2>/dev/null | tr -d '\r' || true)"
[ -n "$RUNTIME_URL" ] \
  || die "Containerul backend nu are DATABASE_URL. Verifică docker-compose.yml (serviciul backend)."

# postgresql://ROL[:parola]@host:port/db  → doar ROL. Parola nu se atinge.
url_role() {
  local u="${1#*://}"       # taie schema
  u="${u%%@*}"              # taie tot de la @ încolo (host, port, bază)
  printf '%s' "${u%%:*}"    # taie parola
}
RUNTIME_ROLE="$(url_role "$RUNTIME_URL")"
[ -n "$RUNTIME_ROLE" ] || die "Nu pot extrage rolul din DATABASE_URL-ul containerului"
case "$RUNTIME_ROLE" in
  *[!A-Za-z0-9_]*) die "Rol cu caractere neașteptate în DSN ('$RUNTIME_ROLE') — verifică manual" ;;
esac
info "Rolul din containerul backend: $RUNTIME_ROLE"

# ── 2. Ajunge .env la backend? (bugul original) ─────────────
ENV_URL="$(grep -E '^DATABASE_URL=.+' .env 2>/dev/null | tail -1 | cut -d= -f2- || true)"
if [ -n "$ENV_URL" ]; then
  ENV_ROLE="$(url_role "$ENV_URL")"
  if [ "$ENV_ROLE" = "$RUNTIME_ROLE" ]; then
    ok ".env → container: DATABASE_URL ajunge la backend (rol '$ENV_ROLE')"
  else
    note_problem ".env CERE rolul '$ENV_ROLE', dar backendul rulează cu '$RUNTIME_ROLE'.
  DATABASE_URL din .env e IGNORAT. Cauze posibile:
    • docker-compose.yml nu mai are forma \${DATABASE_URL:-...} pe serviciul backend;
    • containerul nu a fost recreat după editarea .env →
        docker compose up -d --no-deps --force-recreate backend
  Verifică static cu: ./scripts/validate-deploy-config.py"
  fi
  case "$ENV_URL" in
    *'$'*) note_problem "DATABASE_URL din .env conține '\$' — Compose îl interpretează ca
  variabilă și TRUNCHIAZĂ parola în tăcere. Regenerează parola fără '\$'." ;;
  esac
else
  info ".env nu conține DATABASE_URL → se folosește DSN-ul calculat din DB_USER/DB_PASSWORD"
fi

# ── 3. E superuser? ─────────────────────────────────────────
[ -n "$(docker compose ps -q db 2>/dev/null || true)" ] || die "Serviciul 'db' nu rulează"

psql_q() { docker compose exec -T db psql -U "$DB_USER" -d "$DB_NAME" -tAc "$1" 2>/dev/null | tr -d '\r' || true; }

ROW="$(psql_q "SELECT rolsuper||'|'||rolcreatedb||'|'||rolcreaterole||'|'||rolreplication||'|'||rolconnlimit FROM pg_roles WHERE rolname = '${RUNTIME_ROLE}'")"
[ -n "$ROW" ] || die "Rolul '$RUNTIME_ROLE' nu există în Postgres — backendul nu se poate conecta"

IFS='|' read -r IS_SUPER IS_CREATEDB IS_CREATEROLE IS_REPL CONNLIMIT <<< "$ROW"

if [ "$IS_SUPER" = "t" ]; then
  echo ""
  echo "════════════════════════════════════════════════════════════"
  echo "⚠  BACKENDUL RULEAZĂ CA SUPERUSER POSTGRES ('$RUNTIME_ROLE')"
  echo "   Un DATABASE_URL scurs (log, docker inspect, backup de .env) sau un"
  echo "   container backend compromis dau atacatorului tot clusterul, nu doar"
  echo "   datele BizCheck: orice bază, COPY ... TO PROGRAM (execuție de comenzi),"
  echo "   CREATE EXTENSION, roluri noi. Cheia Fernet a coloanelor PII stă în"
  echo "   același container, deci nici cifrarea nu ajută."
  echo "   Repară cu procedura din backend/DATABASE_ROLE.md (rol bizcheck_app)."
  echo "════════════════════════════════════════════════════════════"
  note_problem "rol de aplicație = superuser"
else
  ok "Rol non-superuser: $RUNTIME_ROLE (createdb=$IS_CREATEDB createrole=$IS_CREATEROLE replication=$IS_REPL)"
  for pair in "createdb:$IS_CREATEDB" "createrole:$IS_CREATEROLE" "replication:$IS_REPL"; do
    if [ "${pair#*:}" = "t" ]; then
      warn "  rolul are ${pair%%:*} — rulează din nou backend/scripts/sql/create_app_role.sql"
    fi
  done
fi

# ── 4. CONNECTION LIMIT vs. necesarul real al pool-ului ─────
# gunicorn --workers 4 (backend/Dockerfile) × DB_POOL_MAX conexiuni per worker.
POOL_MAX="$(grep -E '^DB_POOL_MAX=' .env 2>/dev/null | tail -1 | cut -d= -f2- || true)"
POOL_MAX="${POOL_MAX:-10}"
WORKERS=4
case "$POOL_MAX" in ''|*[!0-9]*) POOL_MAX=10 ;; esac
case "${CONNLIMIT:-}" in ''|*[!0-9-]*) CONNLIMIT=-1 ;; esac
NEEDED=$(( WORKERS * POOL_MAX ))
# -1 = nelimitat (plafonul rămâne max_connections al serverului).
if [ "$CONNLIMIT" != "-1" ] && [ "$CONNLIMIT" -lt "$NEEDED" ]; then
  note_problem "CONNECTION LIMIT=$CONNLIMIT pentru '$RUNTIME_ROLE', dar pool-ul poate cere
  $WORKERS workeri gunicorn × DB_POOL_MAX=$POOL_MAX = $NEEDED conexiuni →
  'too many connections for role' sub încărcare. Ridică limita:
    ALTER ROLE $RUNTIME_ROLE CONNECTION LIMIT $(( NEEDED + 10 ));"
else
  ok "CONNECTION LIMIT=$CONNLIMIT ≥ necesar $NEEDED ($WORKERS workeri × DB_POOL_MAX=$POOL_MAX)"
fi

echo ""
[ "$fail" = "0" ] || die "Verificare STRICTĂ eșuată (vezi mai sus)"
ok "check-db-role: gata"
