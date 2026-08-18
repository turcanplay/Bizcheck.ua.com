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

# ── Variabile OBLIGATORII ───────────────────────────────────
# Fără ele deployul e sigur greșit → oprim înainte să stricăm ceva.
#
# Criteriul de intrare în listă e unul singur: „serviciul MOARE la boot fără ea",
# adică restart-loop → healthcheck-ul nu devine verde → rollback la timeout, fără
# nicio cauză vizibilă în ieșirea scriptului. Sursele, verificate una câte una:
#   backend/server.py  `_required_env`            → JWT_SECRET, JWT_REFRESH_SECRET
#                      (+ NODE_ENV=production)    → PII_ENCRYPTION_KEY, ADMIN_USERNAME,
#                                                   ADMIN_PASSWORD
#   tgbot/bot.py:94    `raise RuntimeError`       → TELEGRAM_BOT_TOKEN
#   groupbot/bot.py:718 `raise RuntimeError`      → SALES_BOT_TOKEN
#   docker-compose.yml DATABASE_URL               → DB_PASSWORD
#   docker-compose.yml `:?`                     → TELEGRAM_BOT_USERNAME (compose
#                                                 refuză să pornească fără ea; fără
#                                                 handle, linkul din raport ar duce
#                                                 clientul în alt bot, tăcut)
#
# Baseline-ul de mai jos NU e sursa de adevăr — e doar punctul de plecare. Lista
# se completează programatic din backend/server.py imediat sub el, ca cele două
# să nu mai poată diverge (exact bugul care lăsa JWT_REFRESH_SECRET neverificat).
REQUIRED_VARS=(
  DB_PASSWORD
  JWT_SECRET
  JWT_REFRESH_SECRET
  ADMIN_USERNAME
  ADMIN_PASSWORD
  PII_ENCRYPTION_KEY
  TELEGRAM_BOT_TOKEN
  TELEGRAM_BOT_USERNAME
  SALES_BOT_TOKEN
)

# Citește lista reală cerută de backend la boot direct din sursă: liniile
# `_required_env = [...]` și `_required_env += [...]` din backend/server.py.
# Extragem doar literalii MAJUSCULE dintre ghilimele.
backend_required_env() {
  [ -f backend/server.py ] || return 0
  awk '/_required_env[[:space:]]*\+?=/ { inlist = 1 }
       inlist                          { print; if (/\]/) inlist = 0 }' backend/server.py \
    | grep -oE '"[A-Z][A-Z0-9_]+"' | tr -d '"' | sort -u
}

drifted=""
while IFS= read -r v; do
  [ -n "$v" ] || continue
  case " ${REQUIRED_VARS[*]} " in
    *" $v "*) ;;                                   # deja în listă
    *) REQUIRED_VARS+=("$v"); drifted="$drifted $v" ;;
  esac
done < <(backend_required_env)
if [ -n "$drifted" ]; then
  warn "backend/server.py cere variabile care lipseau din REQUIRED_VARS:${drifted}"
  warn "  Le verific oricum, dar adaugă-le și în baseline-ul din deploy.sh."
fi

for v in "${REQUIRED_VARS[@]}"; do
  grep -qE "^${v}=.+" .env || die "$v lipsește sau e gol în .env"
  # Placeholderele livrate în .env.example: CHANGE_THIS_* / change_me* / YOUR_*.
  if grep -qE "^${v}=(CHANGE_THIS|change_me|YOUR_)" .env; then
    die "$v e încă pe valoarea placeholder din .env.example"
  fi
done

# ── Variabile OPȚIONALE — doar avertisment ──────────────────
# Aplicația pornește și fără ele; lipsa lor dezactivează o funcție, nu serviciul.
for v in SALES_CHAT_ID BOT_SHARED_SECRET ALLOWED_HOSTS PUBLIC_BASE_URL SMTP_REPLY_TO; do
  grep -q "^${v}=" .env || warn "$v lipsește din .env"
done
# ── Placeholderele de adresă: avertisment SAU blocant, după context ─────────
# Regula de intrare în REQUIRED_VARS e „serviciul MOARE la boot fără ea", iar
# SMTP_REPLY_TO nu omoară nimic — deci nu are ce căuta acolo. Dar cât timp
# trimiterea de emailuri e PORNITĂ, o adresă @example.* nu e o scăpare de
# configurare, e o eroare care ajunge la client: răspunsul lui la raport pleacă
# spre un domeniu rezervat de IANA și se pierde definitiv, fără bounce util.
# De aceea verificarea e CONDIȚIONATĂ de SMTP_PASSWORD (singurul comutator real
# al funcției — services/email_service.py._smtp_configured):
#   * email dezactivat (SMTP_PASSWORD gol) → doar avertisment. Un deploy de
#     staging sau un rollback de urgență nu trebuie oprit de un câmp cosmetic.
#   * email activat → die. Riscul asumat: un redeploy urgent al unui site care
#     deja rulează în starea asta greșită e BLOCAT până se corectează .env.
#     Fixul e o linie în .env, fără rebuild; iar pentru cazul în care chiar nu
#     poți repara acum, există supapa explicită de mai jos.
smtp_enabled() { grep -qE '^SMTP_PASSWORD=.+' .env; }
for v in SMTP_REPLY_TO SMTP_USER; do
  grep -qE "^${v}=.*@example\." .env || continue
  if smtp_enabled && [ "${ALLOW_PLACEHOLDER_EMAIL:-0}" != "1" ]; then
    die "$v e pe adresa placeholder (@example.*) dar trimiterea de emailuri e ACTIVĂ
  (SMTP_PASSWORD e setat) → emailurile pleacă de la / trimit răspunsurile către un
  domeniu inexistent. Pune adresa reală în .env și reia deployul.
  Supapă pentru un rollback urgent:  ALLOW_PLACEHOLDER_EMAIL=1 ./deploy.sh"
  fi
  warn "$v e încă pe adresa placeholder (@example.*) — clienții nu pot răspunde"
done

# ── Identitatea de piață rămasă pe defaultul MOLDOVENESC ────────────────────
# Variabilele astea sunt acum pasate prin docker-compose.yml, dar defaulturile
# din sursă (tgbot/config.py, backend/services/email_templates.py) sunt încă
# .md / crowe-tm.md / @CROWE_TM. Goale în .env = defaultul acela ajunge la
# client. Nu blocăm — nu există încă un contact UA cu care să le înlocuiești —
# dar nu mai lăsăm situația să treacă tăcut.
md_defaults=""
for v in CONTACT_EMAIL EMAIL_REPLY_TO EMAIL_SITE_URL EMAIL_TELEGRAM_URL EMAIL_TELEGRAM_HANDLE; do
  grep -qE "^${v}=.+" .env || md_defaults="$md_defaults $v"
done
if [ -n "$md_defaults" ]; then
  warn "identitate de contact pe defaultul moldovenesc din cod (.md / crowe-tm.md /"
  warn "  @CROWE_TM) pentru:${md_defaults}"
  warn "  Completează-le în .env de îndată ce există contactele pentru piața UA."
fi
# Opțională, dar goală = pierdere de trafic long-tail: sitemap.xml și HTML-ul
# pre-randat rămân doar cu rutele statice (frontend/scripts/generate-sitemap.mjs,
# generate-static-html.mjs). Buildul NU cade — de aceea e warning, nu die.
if ! grep -qE '^SITEMAP_API_URL=.+' .env; then
  warn "SITEMAP_API_URL e gol → paginile de test și de șablon LIPSESC din sitemap.xml"
  warn "  și nu sunt pre-randate. Pentru producție, în .env:"
  warn "  SITEMAP_API_URL=https://bizcheck.com.ua/api_crowe_bizcheck"
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

# Spool-ul exporturilor (bind mount în serviciul backend). Îl creăm NOI, cu 0700:
# dacă îl lasă Docker să-l creeze, iese 0755, iar înăuntru ajung arhive cu PDF-uri
# de client. Directoarele per job sunt oricum 0700, dar rădăcina merită la fel.
SPOOL_DIR="$(grep -E '^EXPORT_SPOOL_HOST_DIR=' .env | tail -1 | cut -d= -f2- || true)"
SPOOL_DIR="${SPOOL_DIR:-./export_spool}"
mkdir -p "$SPOOL_DIR" && chmod 700 "$SPOOL_DIR" 2>/dev/null || \
  warn "Nu pot pregăti spool-ul de export ($SPOOL_DIR) — îl creează Docker la pornire"
# Curățenia normală o face sweep() din backend (TTL-uri), dar nu există limită de
# SPAȚIU. Semnalăm din timp dacă partiția e strâmtă pentru un export de ~1,6 GB.
SPOOL_AVAIL_KB="$(df -Pk "$SPOOL_DIR" 2>/dev/null | awk 'NR==2 {print $4}')"
if [ -n "${SPOOL_AVAIL_KB:-}" ] && [ "$SPOOL_AVAIL_KB" -lt 5242880 ]; then
  warn "Sub 5 GB liberi pe partiția spool-ului ($SPOOL_DIR) — un export mare cere ~1,6 GB."
  warn "  Curăță cu: ./scripts/export-spool.sh --purge"
fi

# ── Masca de pre-lansare: Basic Auth + noindex ──────────────
# Comutatorul e existența lui nginx-maintenance/mask.conf (bind mount în
# serviciul `frontend`). Vezi scripts/site-mask.sh. Îl citim ACUM ca să știm
# ce coduri HTTP trebuie să aștepte smoke-testul de la pasul 7 — altfel un
# deploy cu masca pornită ar vedea 401 pe `/`, l-ar lua drept eșec și ar face
# rollback la fiecare rulare.
MASK_DIR="nginx-maintenance"
MASK_FILE="${MASK_DIR}/mask.conf"
MASK_HTPASSWD="${MASK_DIR}/htpasswd"
mkdir -p "$MASK_DIR" 2>/dev/null || true
if [ -f "$MASK_FILE" ]; then
  MASK_ON=1
  warn "MASCA DE PRE-LANSARE E PORNITĂ — site-ul cere user/parolă și trimite noindex."
  # Fără fișierul de parole, nginx răspunde 500 pe TOT site-ul (nu 401).
  [ -s "$MASK_HTPASSWD" ] || die "Masca e pornită dar $MASK_HTPASSWD lipsește/e gol →
  nginx ar răspunde 500 pe tot site-ul. Rulează: ./scripts/site-mask.sh adduser <nume>"
  # Fișierul e generat de site-mask.sh; dacă a fost editat manual și i-a rămas
  # doar una dintre cele două directive, „un singur comutator" nu mai e adevărat.
  grep -q 'auth_basic_user_file' "$MASK_FILE" \
    || die "$MASK_FILE nu conține auth_basic_user_file (editat manual?). Regenerează: ./scripts/site-mask.sh on"
  grep -q 'X-Robots-Tag' "$MASK_FILE" \
    || die "$MASK_FILE nu conține X-Robots-Tag (editat manual?). Regenerează: ./scripts/site-mask.sh on"
  ok "Mască: PORNITĂ ($(cut -d: -f1 "$MASK_HTPASSWD" | paste -sd, - 2>/dev/null) — utilizatori)"
else
  MASK_ON=0
  ok "Mască: OPRITĂ (site public)"
fi

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
# Sitemapul și HTML-ul pre-randat se generează în interiorul imaginii de frontend,
# din conținutul citit prin SITEMAP_API_URL. Dacă s-a schimbat doar CONȚINUTUL din
# admin (teste/șabloane noi), fișierele din frontend/ sunt identice → stratul
# `RUN npm run build` vine din cache și sitemapul rămâne vechi. Atunci:
#     FRONTEND_NO_CACHE=1 ./deploy.sh
if [ "${FRONTEND_NO_CACHE:-0}" = "1" ]; then
  info "FRONTEND_NO_CACHE=1 → rebuild fără cache pentru frontend (regenerez sitemapul)…"
  docker compose build --no-cache frontend || rollback
fi

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
smoke "/healthz" 200 || rollback     # ținta healthcheck-ului Docker al frontendului
if [ "$MASK_ON" = "1" ]; then
  smoke "/" 401 || rollback          # masca pornită → conținutul e închis
else
  smoke "/" 200 || rollback
fi
# Regresie de config: /robots.txt trebuie servit ca fișier real, nu ca SPA.
# Rămâne 200 în AMBELE stări — cu masca pornită trebuie să fie citibil, altfel
# crawlerul nu are de unde vedea semnalul de noindex de pe 401-uri.
smoke "/robots.txt" 200 || warn "  /robots.txt nu răspunde 200 — verifică nginx.conf"
# ACME: challenge-ul inexistent trebuie să dea 404, NU 401. Dacă dă 401, masca
# a scăpat peste /.well-known/ → `certbot renew` va eșua în tăcere și
# certificatul expiră peste ≤90 de zile, luând tot site-ul cu el.
acme_code="$(curl -sS -o /dev/null -w '%{http_code}' --max-time 15 \
  "${BASE_URL}/.well-known/acme-challenge/deploy-probe" 2>/dev/null | tail -1 || true)"
case "${acme_code:-000}" in
  404) ok "  /.well-known/acme-challenge/ → 404 (deschis, cum trebuie)" ;;
  401|403) die "/.well-known/acme-challenge/ răspunde ${acme_code} → ACME BLOCAT.
  Reînnoirea certificatului TLS va eșua și site-ul pică la expirare.
  Scoate include-ul măștii din locația /.well-known/ din nginx.conf." ;;
  *) warn "  /.well-known/acme-challenge/ → ${acme_code} (așteptat 404)" ;;
esac
ok "Smoke-test trecut"

# ════════════════════════════════════════════════════════════
# 7b. Coerența măștii: comutator ⇄ răspuns HTTP real
# ════════════════════════════════════════════════════════════
# Basic Auth și `noindex` stau în ACELAȘI fișier (mask.conf), deci nu pot
# diverge prin uitare. Verificarea de aici prinde cazul rămas: cineva a editat
# fișierul de mână, sau imaginea de frontend e veche și încă nu are include-ul.
# Cea mai scumpă greșeală pe care o prinde: `noindex` uitat în producție DUPĂ
# lansare — site invizibil în Google la nesfârșit, fără niciun simptom vizibil.
info "Verific coerența măștii pe răspunsul HTTP…"
mask_hdrs="$(curl -sS -D - -o /dev/null --max-time 15 "${BASE_URL}/" 2>/dev/null || true)"
if printf '%s\n' "$mask_hdrs" | grep -qiE '^x-robots-tag:.*noindex'; then
  has_noindex=1
else
  has_noindex=0
fi
if [ "$MASK_ON" = "1" ]; then
  [ "$has_noindex" = "1" ] || die "Masca e PORNITĂ, dar răspunsul nu poartă X-Robots-Tag: noindex.
  Cel mai probabil imaginea de frontend e mai veche decât nginx.conf →
  reconstruiește: docker compose build --no-cache frontend && ./deploy.sh"
  ok "  401 + X-Robots-Tag: noindex — coerent"
else
  if [ "$has_noindex" = "1" ]; then
    echo ""
    echo "════════════════════════════════════════════════════════════"
    echo "✗  NOINDEX RĂMAS ÎN PRODUCȚIE, FĂRĂ MASCĂ"
    echo "   Site-ul e public (200), dar trimite încă X-Robots-Tag: noindex."
    echo "   Google îl va scoate din index și nu-l va mai reindexa — fără"
    echo "   niciun simptom vizibil în browser. Asta e greșeala clasică."
    echo "   Repară:  ./scripts/site-mask.sh off   (apoi redeploy dacă persistă)"
    echo "════════════════════════════════════════════════════════════"
    die "Opresc aici — nu raportez un deploy reușit cu noindex agățat."
  fi
  ok "  200, fără X-Robots-Tag — site indexabil"
fi

# ════════════════════════════════════════════════════════════
# 7c. Rolul Postgres cu care rulează EFECTIV backendul
# ════════════════════════════════════════════════════════════
# Nu e fatal (deployul e valid și pe superuser), dar trebuie SPUS la fiecare
# rulare. Verificarea prinde două lucruri pe containerul viu, nu pe fișiere:
#   • DATABASE_URL scris în .env chiar ajunge în containerul backend — pasul
#     final al procedurii din backend/DATABASE_ROLE.md a fost multă vreme un
#     no-op silențios, iar operatorul rămânea convins că a scos superuserul;
#   • rolul folosit chiar e non-superuser, cu CONNECTION LIMIT peste necesarul
#     pool-ului (4 workeri gunicorn × DB_POOL_MAX).
info "Verific rolul Postgres al backendului…"
if [ -x scripts/check-db-role.sh ]; then
  scripts/check-db-role.sh || warn "check-db-role.sh a semnalat probleme (vezi mai sus)"
else
  warn "scripts/check-db-role.sh lipsește sau nu e executabil — sar peste verificare"
fi

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

if [ "$MASK_ON" = "1" ]; then
  echo ""
  echo "════════════════════════════════════════════════════════════"
  echo "⚠  MASCA DE PRE-LANSARE E ACTIVĂ"
  echo "   Site-ul cere user/parolă și NU e indexabil (X-Robots-Tag: noindex)."
  echo "   Nu funcționează public, cât timp e pornită:"
  echo "     • linkurile de raport din email și din Telegram (PUBLIC_BASE_URL)"
  echo "     • previzualizările în rețele sociale / Telegram / Facebook"
  echo "     • Search Console, sitemap.xml (401), orice crawler"
  echo "   LA LANSARE, un singur pas — scoate ȘI parola, ȘI noindex-ul:"
  echo "       ./scripts/site-mask.sh off"
  echo "════════════════════════════════════════════════════════════"
fi

echo ""
ok "Deploy reușit. Backup DB: ${BACKUP_FILE:-<nu s-a făcut>}"
echo "  Testează în grup:  /excel   și   /pdf"
echo "  Spool exporturi:   ./scripts/export-spool.sh   (ocupare disc + curățenie)"
echo "  Rollback manual, dacă apar probleme mai târziu (numele imaginilor le vezi"
echo "  cu 'docker compose images'; prefixul e numele directorului de proiect):"
for entry in "${ROLLBACKABLE[@]:-}"; do
  [ -n "$entry" ] || continue
  IFS='|' read -r r_svc r_base r_ref <<< "$entry"
  echo "    docker tag ${r_base}:previous ${r_ref}"
done
echo "    docker compose up -d --no-build ${SERVICES[*]}"
