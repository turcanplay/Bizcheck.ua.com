#!/usr/bin/env bash
# ════════════════════════════════════════════════════════════
#  BizCheck — raport & curățenie pentru spool-ul joburilor de export
#
#      ./scripts/export-spool.sh            raport (nu șterge nimic)
#      ./scripts/export-spool.sh --purge    șterge TOATE joburile din spool
#      ./scripts/export-spool.sh --purge --older-than 6   doar cele > 6h
#
#  DE CE EXISTĂ
#  ────────────
#  backend/services/export_jobs.py curăță singur, dar TEMPORAL: sweep() șterge
#  arhivele după EXPORT_JOB_READY_TTL (1h nedescărcate) / _DOWNLOADED_TTL (10min)
#  / _FAILED_TTL (30min). NU există nicio limită pe spațiu și nicio verificare de
#  disc liber. O arhivă are până la ~1,6 GB (500 submisii), deduplicarea e per
#  (kind, test_id), deci N teste exportate în aceeași oră = N × 1,6 GB pe disc.
#  Scriptul ăsta e plasa de siguranță manuală pentru exact situația aia.
#
#  ⚠ --purge șterge și joburile ÎN CURS de construire: adminul va vedea „export
#    failed" și va trebui să reapese. Nu pierzi date — arhivele sunt derivate
#    din `submissions.pdf_data`, se pot reconstrui oricând.
#
#  ── CRONTAB opțional (santinelă zilnică; instalare manuală) ──
#    30 4 * * * cd /home/USER/BIZZCHECK_BOT/webdev && ./scripts/export-spool.sh >> backups/export-spool.log 2>&1
# ════════════════════════════════════════════════════════════
set -euo pipefail
cd "$(dirname "$0")/.."   # → webdev/

PURGE=0
OLDER_THAN_H=""

while [ $# -gt 0 ]; do
  case "$1" in
    --purge)      PURGE=1; shift ;;
    --older-than) OLDER_THAN_H="${2:-}"; shift 2 ;;
    -h|--help)    sed -n '2,20p' "$0"; exit 0 ;;
    *)            echo "Argument necunoscut: $1" >&2; exit 2 ;;
  esac
done

if [ -n "$OLDER_THAN_H" ] && ! printf '%s' "$OLDER_THAN_H" | grep -qE '^[0-9]+$'; then
  echo "✗ --older-than vrea un număr de ore (întreg)" >&2
  exit 2
fi

# Calea de pe gazdă: aceeași sursă de adevăr ca docker-compose.yml.
SPOOL="./export_spool"
if [ -f .env ]; then
  FROM_ENV="$(grep -E '^EXPORT_SPOOL_HOST_DIR=' .env | tail -1 | cut -d= -f2- || true)"
  [ -n "$FROM_ENV" ] && SPOOL="$FROM_ENV"
fi

echo "Spool: $SPOOL"

if [ ! -d "$SPOOL" ]; then
  echo "  (nu există încă — se creează la primul export; nimic de curățat)"
  exit 0
fi

# Directorul e montat în container, unde procesul rulează ca root; fișierele
# pot fi root-only. Fără sudo raportul poate ieși parțial — spunem asta o dată.
if [ ! -r "$SPOOL" ]; then
  echo "⚠ Fără drept de citire pe $SPOOL — rulează cu sudo pentru un raport complet." >&2
fi

# ─── Raport ─────────────────────────────────────────────────
JOBS="$(find "$SPOOL" -mindepth 1 -maxdepth 1 -type d 2>/dev/null | wc -l | tr -d ' ')"
TOTAL="$(du -sh "$SPOOL" 2>/dev/null | cut -f1)"
echo "  Joburi în spool: ${JOBS}"
echo "  Ocupat total:    ${TOTAL:-?}"

# Spațiu liber pe partiția care găzduiește spool-ul — asta contează de fapt.
echo "  Disc (partiția spool-ului):"
df -h "$SPOOL" 2>/dev/null | sed 's/^/    /'

if [ "$JOBS" -gt 0 ]; then
  echo "  Cele mai mari joburi:"
  du -sh "$SPOOL"/*/ 2>/dev/null | sort -rh | head -10 | sed 's/^/    /'
fi

# Avertisment de spațiu: sub 5 GB liberi nu mai încape un export mare + tempul lui.
AVAIL_KB="$(df -Pk "$SPOOL" 2>/dev/null | awk 'NR==2 {print $4}')"
if [ -n "${AVAIL_KB:-}" ] && [ "$AVAIL_KB" -lt 5242880 ]; then
  echo "⚠ Sub 5 GB liberi. Un export de 500 de submisii cere ~1,6 GB (plus fișierul"
  echo "  temporar în timpul construirii). Curăță cu --purge sau scade"
  echo "  EXPORT_JOB_READY_TTL în .env, apoi: docker compose up -d backend"
fi

[ "$PURGE" -eq 1 ] || { echo "(raport; nimic șters — folosește --purge pentru curățenie)"; exit 0; }

# ─── Purge ──────────────────────────────────────────────────
if [ "$JOBS" -eq 0 ]; then
  echo "→ Nimic de șters."
  exit 0
fi

if [ -n "$OLDER_THAN_H" ]; then
  echo "→ Șterg joburile nemodificate de peste ${OLDER_THAN_H}h…"
  # -mmin în loc de -mtime: -mtime lucrează în zile întregi și ar ignora „6h".
  DELETED="$(find "$SPOOL" -mindepth 1 -maxdepth 1 -type d -mmin "+$((OLDER_THAN_H * 60))" \
             -print -exec rm -rf {} + 2>/dev/null | wc -l | tr -d ' ')"
else
  echo "→ Șterg TOATE joburile din spool…"
  DELETED="$(find "$SPOOL" -mindepth 1 -maxdepth 1 -type d \
             -print -exec rm -rf {} + 2>/dev/null | wc -l | tr -d ' ')"
fi

echo "✓ Șterse: ${DELETED} job(uri). Rămas ocupat: $(du -sh "$SPOOL" 2>/dev/null | cut -f1)"
echo "  Un job șters din care se descărca apare în panou ca 'unknown job' — se reface cu un click nou."
