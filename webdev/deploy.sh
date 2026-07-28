#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════
#  BizCheck — deploy complet (backend + frontend + boți)
#  Rulează pe server din ~/BIZZCHECK_BOT/webdev :  ./deploy.sh
#
#  Ce face, în ordine:
#    1. verifică .env
#    2. git pull --ff-only          (sărit cu SKIP_GIT_PULL=1)
#    3. backup DB comprimat + retenție
#    4. taguiește imaginile curente ca :previous  (plasa de rollback)
#    5. build + up pentru TOATE serviciile
#    6. așteaptă healthcheck-urile
#    7. smoke-test HTTP (/ și /api_crowe_bizcheck/health)
#    8. dacă smoke-testul pică → ROLLBACK automat pe :previous
#
#  Vechea versiune reconstruia doar `backend groupbot`, deci modificările din
#  frontend și din nginx.conf NU ajungeau niciodată pe server. De aceea aici
#  serviciile sunt enumerate explicit — nu mai adăuga/scoate din listă fără să
#  te uiți și la docker-compose.yml.
# ════════════════════════════════════════════════════════════
set -euo pipefail
cd "$(dirname "$0")"

SERVICES=(backend frontend tgbot groupbot)
HEALTH_TIMEOUT="${HEALTH_TIMEOUT:-240}"   # secunde de așteptare pentru healthy
BACKUP_DIR="backups"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"

# ─── Helperi de afișare ─────────────────────────────────────
info() { echo "→ $*"; }
ok()   { echo "✓ $*"; }
warn() { echo "⚠  $*"; }
die()  { echo "✗ $*" >&2; exit 1; }

# ════════════════════════════════════════════════════════════
# 1. Verificări preliminare
# ════════════════════════════════════════════════════════════
info "Verific unelte…"
command -v docker >/dev/null 2>&1 || die "docker nu e instalat"
docker compose version >/dev/null 2>&1 || die "plugin-ul 'docker compose' lipsește"

info "Verific .env…"
[ -f .env ] || die "Lipsește .env în $(pwd)"

# Variabile fără de care deployul e sigur greșit → oprim înainte să stricăm ceva.
REQUIRED_VARS=(DB_PASSWORD JWT_SECRET ADMIN_PASSWORD PII_ENCRYPTION_KEY)
for v in "${REQUIRED_VARS[@]}"; do
  grep -qE "^${v}=.+" .env || die "$v lipsește sau e gol în .env"
  if grep -qE "^${v}=(CHANGE_THIS|change_me)" .env; then
    die "$v e încă pe valoarea placeholder din .env.example"
  fi
done
# Variabile opționale — doar avertisment, aplicația pornește și fără ele.
for v in SALES_BOT_TOKEN SALES_CHAT_ID BOT_SHARED_SECRET ALLOWED_HOSTS PUBLIC_BASE_URL SMTP_REPLY_TO; do
  grep -q "^${v}=" .env || warn "$v lipsește din .env"
done
if grep -qE '^SMTP_REPLY_TO=.*@example\.' .env; then
  warn "SMTP_REPLY_TO e încă pe adresa placeholder (@example.*) — clienții nu pot răspunde"
fi
ok ".env verificat"

# Citim DB_NAME / DB_USER din .env pentru pg_dump (defaulturi = cele din compose).
DB_NAME="$(grep -E '^DB_NAME=' .env | tail -1 | cut -d= -f2- || true)"
DB_USER="$(grep -E '^DB_USER=' .env | tail -1 | cut -d= -f2- || true)"
DB_NAME="${DB_NAME:-bizzcheck}"
DB_USER="${DB_USER:-postgres}"
FRONTEND_PORT="$(grep -E '^FRONTEND_PORT=' .env | tail -1 | cut -d= -f2- || true)"
FRONTEND_PORT="${FRONTEND_PORT:-5173}"
BASE_URL="http://127.0.0.1:${FRONTEND_PORT}"

# ════════════════════════════════════════════════════════════
# 2. git pull
# ════════════════════════════════════════════════════════════
if [ "${SKIP_GIT_PULL:-0}" = "1" ]; then
  warn "SKIP_GIT_PULL=1 → sar peste git pull"
else
  info "Aduc ultimele modificări (git pull --ff-only)…"
  REPO_ROOT="$(git rev-parse --show-toplevel)"
  if [ -n "$(git -C "$REPO_ROOT" status --porcelain)" ]; then
    warn "Sunt modificări necomitate în repo — git pull poate eșua"
  fi
  git -C "$REPO_ROOT" pull --ff-only || die "git pull a eșuat (rezolvă manual, apoi reia)"
  ok "Cod actualizat: $(git -C "$REPO_ROOT" rev-parse --short HEAD)"
fi

# ════════════════════════════════════════════════════════════
# 3. Backup DB ÎNAINTE de orice build (migrate() rulează la boot-ul backendului)
# ════════════════════════════════════════════════════════════
info "Backup baza de date înainte de deploy…"
mkdir -p "$BACKUP_DIR"
STAMP="$(date +%Y%m%d-%H%M%S)"
BACKUP_FILE="${BACKUP_DIR}/predeploy-${DB_NAME}-${STAMP}.sql.gz"

if [ -n "$(docker compose ps -q db 2>/dev/null || true)" ]; then
  # -T: fără TTY (obligatoriu când redirecționăm stdout).
  if docker compose exec -T db pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists \
       | gzip -9 > "$BACKUP_FILE"; then
    # pg_dump poate ieși 0 și cu un fișier gol dacă ceva a mers prost în pipe.
    SIZE="$(wc -c < "$BACKUP_FILE" | tr -d ' ')"
    [ "$SIZE" -gt 1000 ] || die "Backup suspect de mic (${SIZE}B): $BACKUP_FILE — opresc deployul"
    ok "Backup: $BACKUP_FILE ($(du -h "$BACKUP_FILE" | cut -f1))"
  else
    rm -f "$BACKUP_FILE"
    die "pg_dump a eșuat — NU continui deployul fără backup"
  fi
else
  warn "Serviciul 'db' nu rulează → sar peste backup (prim deploy?)"
fi

info "Curăț backupurile mai vechi de ${BACKUP_RETENTION_DAYS} zile…"
find "$BACKUP_DIR" -name '*.sql.gz' -type f -mtime "+${BACKUP_RETENTION_DAYS}" -print -delete || true

# ════════════════════════════════════════════════════════════
# 4. Plasa de rollback — taguiesc imaginile curente ca :previous
# ════════════════════════════════════════════════════════════
info "Salvez imaginile curente ca :previous (pentru rollback)…"
declare -a ROLLBACKABLE=()
for svc in "${SERVICES[@]}"; do
  cid="$(docker compose ps -q "$svc" 2>/dev/null || true)"
  [ -n "$cid" ] || { warn "  $svc: nu rulează, fără imagine de salvat"; continue; }
  img_ref="$(docker inspect -f '{{.Config.Image}}' "$cid" 2>/dev/null || true)"
  img_id="$(docker inspect -f '{{.Image}}' "$cid" 2>/dev/null || true)"
  [ -n "$img_ref" ] && [ -n "$img_id" ] || { warn "  $svc: nu pot citi imaginea"; continue; }
  # Normalizăm „nume" → „nume:latest" ca retagul de la rollback să nimerească
  # exact referința pe care o caută compose.
  case "$img_ref" in *:*) ;; *) img_ref="${img_ref}:latest";; esac
  base="${img_ref%:*}"
  docker tag "$img_id" "${base}:previous"
  ROLLBACKABLE+=("${svc}|${base}|${img_ref}")
  echo "   ${svc} → ${base}:previous"
done
[ "${#ROLLBACKABLE[@]}" -gt 0 ] || warn "Nicio imagine de salvat → rollback automat indisponibil"

rollback() {
  echo ""
  echo "✗ Smoke-testul a picat → ROLLBACK pe imaginile :previous"
  if [ "${#ROLLBACKABLE[@]}" -eq 0 ]; then
    echo "✗ Nu există imagini :previous. Intervenție MANUALĂ necesară."
    echo "  Backupul DB e la: ${BACKUP_FILE:-<nu s-a făcut>}"
    exit 1
  fi
  local entry svc base ref
  for entry in "${ROLLBACKABLE[@]}"; do
    IFS='|' read -r svc base ref <<< "$entry"
    docker tag "${base}:previous" "$ref" && echo "   ${svc} ← ${base}:previous"
  done
  docker compose up -d --no-build "${SERVICES[@]}" || true
  echo ""
  echo "✗ Rollback executat. Verifică:  docker compose logs --tail=100"
  echo "  Backup DB pre-deploy: ${BACKUP_FILE:-<nu s-a făcut>}"
  exit 1
}

# ════════════════════════════════════════════════════════════
# 5. Build + up pentru TOATE serviciile
# ════════════════════════════════════════════════════════════
info "Build + restart: ${SERVICES[*]} (backendul rulează migrarea DB)…"
docker compose up -d --build "${SERVICES[@]}" || rollback

# ════════════════════════════════════════════════════════════
# 6. Aștept healthcheck-urile
# ════════════════════════════════════════════════════════════
info "Aștept ca serviciile să devină healthy (max ${HEALTH_TIMEOUT}s)…"
deadline=$(( $(date +%s) + HEALTH_TIMEOUT ))
while :; do
  pending=()
  for svc in "${SERVICES[@]}"; do
    cid="$(docker compose ps -q "$svc" 2>/dev/null || true)"
    if [ -z "$cid" ]; then pending+=("$svc(lipsă)"); continue; fi
    state="$(docker inspect -f '{{.State.Status}}' "$cid")"
    [ "$state" = "running" ] || { pending+=("${svc}(${state})"); continue; }
    # Serviciile fără healthcheck definit → .State.Health lipsește; „running" ajunge.
    health="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}none{{end}}' "$cid")"
    case "$health" in
      healthy|none) ;;
      *) pending+=("${svc}(${health})") ;;
    esac
  done
  [ "${#pending[@]}" -eq 0 ] && { ok "Toate serviciile sunt healthy"; break; }
  if [ "$(date +%s)" -ge "$deadline" ]; then
    echo "✗ Timeout. Încă nu sunt gata: ${pending[*]}"
    docker compose ps
    rollback
  fi
  sleep 5
done

# ════════════════════════════════════════════════════════════
# 7. Smoke-test HTTP (prin nginx-ul containerului, nu direct pe backend)
# ════════════════════════════════════════════════════════════
smoke() {
  local path="$1" expected="$2" code
  # Fără -f: vrem codul HTTP real, nu ieșire non-zero pe 4xx/5xx.
  # curl scrie singur „000" dacă nici nu apucă să se conecteze.
  code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 "${BASE_URL}${path}" 2>/dev/null | tail -1 || true)"
  code="${code:-000}"
  if [ "$code" = "$expected" ]; then
    ok "  ${path} → ${code}"
    return 0
  fi
  echo "✗ ${path} → ${code} (așteptat ${expected})"
  return 1
}

info "Smoke-test pe ${BASE_URL}…"
smoke "/api_crowe_bizcheck/health" 200 || rollback
smoke "/" 200 || rollback
# Regresie de config: /robots.txt trebuie servit ca fișier real, nu ca SPA.
smoke "/robots.txt" 200 || warn "  /robots.txt nu răspunde 200 — verifică nginx.conf"
ok "Smoke-test trecut"

# ════════════════════════════════════════════════════════════
# 8. Raport final
# ════════════════════════════════════════════════════════════
echo ""
info "Stare servicii:"
docker compose ps

echo ""
info "Ultimele log-uri (backend + groupbot):"
docker compose logs --tail=20 backend || true
docker compose logs --tail=20 groupbot || true

echo ""
ok "Deploy reușit. Backup DB: ${BACKUP_FILE:-<nu s-a făcut>}"
echo "  Testează în grup:  /excel   și   /pdf"
echo "  Rollback manual, dacă apar probleme mai târziu (numele imaginilor le vezi"
echo "  cu 'docker compose images'; prefixul e numele directorului de proiect):"
for entry in "${ROLLBACKABLE[@]:-}"; do
  [ -n "$entry" ] || continue
  IFS='|' read -r r_svc r_base r_ref <<< "$entry"
  echo "    docker tag ${r_base}:previous ${r_ref}"
done
echo "    docker compose up -d --no-build ${SERVICES[*]}"
