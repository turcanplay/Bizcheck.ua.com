#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════
#  BizCheck — backup automat al bazei de date (pg_dump comprimat)
#
#  Rulează din orice director; se poziționează singur în webdev/.
#      ./scripts/backup-db.sh
#
#  ── CRONTAB (instalare manuală pe server — NU se face automat) ──
#  Editează cu:  crontab -e
#  Adaugă linia (backup zilnic la 03:15, log în webdev/backups/backup.log):
#
#    15 3 * * * cd /home/USER/BIZZCHECK_BOT/webdev && ./scripts/backup-db.sh >> backups/backup.log 2>&1
#
#  Verifică apoi că a mers:  tail -20 webdev/backups/backup.log
#
#  ── Restaurare ──
#    gunzip -c backups/bizcheck-YYYYmmdd-HHMMSS.sql.gz \
#      | docker compose exec -T db psql -U postgres -d bizzcheck
#  (dumpul e făcut cu --clean --if-exists, deci se poate reaplica peste o bază
#   existentă fără s-o ștergi întâi)
#
#  ⚠ Fișierele din backups/ conțin date de clienți. Coloanele PII sunt criptate
#    Fernet, dar tg_username / tg_chat_id / sector / scoruri NU sunt. Directorul
#    e în .gitignore — nu-l comita și nu-l pune pe un share public.
# ════════════════════════════════════════════════════════════
set -euo pipefail
cd "$(dirname "$0")/.."   # → webdev/

BACKUP_DIR="${BACKUP_DIR:-backups}"
RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
PREFIX="${BACKUP_PREFIX:-bizcheck}"

ts() { date '+%Y-%m-%d %H:%M:%S'; }
log()  { echo "[$(ts)] $*"; }
die()  { echo "[$(ts)] ✗ $*" >&2; exit 1; }

command -v docker >/dev/null 2>&1 || die "docker nu e instalat"
docker compose version >/dev/null 2>&1 || die "plugin-ul 'docker compose' lipsește"
[ -f .env ] || die "Lipsește .env în $(pwd)"

# Defaulturile trebuie să rămână identice cu cele din docker-compose.yml.
DB_NAME="$(grep -E '^DB_NAME=' .env | tail -1 | cut -d= -f2- || true)"
DB_USER="$(grep -E '^DB_USER=' .env | tail -1 | cut -d= -f2- || true)"
DB_NAME="${DB_NAME:-bizzcheck}"
DB_USER="${DB_USER:-postgres}"

[ -n "$(docker compose ps -q db 2>/dev/null || true)" ] || die "Serviciul 'db' nu rulează"

mkdir -p "$BACKUP_DIR"
chmod 700 "$BACKUP_DIR" 2>/dev/null || true

STAMP="$(date +%Y%m%d-%H%M%S)"
OUT="${BACKUP_DIR}/${PREFIX}-${STAMP}.sql.gz"
TMP="${OUT}.part"

log "→ pg_dump ${DB_NAME} (user ${DB_USER}) → ${OUT}"
# -T = fără TTY, obligatoriu când redirecționăm stdout.
# `set -o pipefail` (deja activ) face ca un pg_dump picat să pice tot pipe-ul.
if ! docker compose exec -T db pg_dump -U "$DB_USER" -d "$DB_NAME" --clean --if-exists \
     | gzip -9 > "$TMP"; then
  rm -f "$TMP"
  die "pg_dump a eșuat — NU s-a scris niciun backup"
fi

# Un gzip valid de dump gol are ~30-50B. Sub 1KB = aproape sigur eroare.
SIZE="$(wc -c < "$TMP" | tr -d ' ')"
[ "$SIZE" -gt 1000 ] || { rm -f "$TMP"; die "Backup suspect de mic (${SIZE}B)"; }
gzip -t "$TMP" || { rm -f "$TMP"; die "Arhiva gzip e coruptă"; }

# Scriere atomică: fișierul apare sub numele final abia după ce e complet și
# validat, deci un cron oprit la mijloc nu lasă un backup „aparent bun".
mv "$TMP" "$OUT"
chmod 600 "$OUT" 2>/dev/null || true
log "✓ Backup gata: ${OUT} ($(du -h "$OUT" | cut -f1))"

log "→ Șterg backupurile mai vechi de ${RETENTION_DAYS} zile…"
DELETED="$(find "$BACKUP_DIR" -name "${PREFIX}-*.sql.gz" -type f -mtime "+${RETENTION_DAYS}" -print -delete | wc -l | tr -d ' ')"
log "✓ Șterse: ${DELETED} fișier(e). Rămase: $(find "$BACKUP_DIR" -name '*.sql.gz' -type f | wc -l | tr -d ' ')"
