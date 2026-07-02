# 06 — Export Excel / PDF pentru un test

Surse: `backend/services/export_service.py` + `backend/routes/tg_admin.py`

Echipa cere, direct din Telegram: **Excel pe perioadă** pentru un test, sau
**PDF-ul unei singure persoane**. Arhiva PDF în masă NU mai trece prin Telegram
(risc de OOM) — se descarcă din panoul admin.

## Fluxul de ansamblu

```
comandă în Telegram  →  groupbot  →  endpoint backend  →  export_service  →  fișier înapoi în topic
   (/excel, /client)   (X-Bot-Secret)   (tg_exports_bp)     (openpyxl/pdf)
```

1. `/excel` → alegi testul → alegi **perioada** (Azi / 7 zile / 30 zile / luna / Tot).
2. `/client` → alegi testul → alegi/cauți persoana → primești DOAR PDF-ul ei.
3. `/pdf` → botul răspunde cu **link spre panoul admin** (nu construiește nimic).

## Builder-e (`export_service.py`)

- **`build_test_combined_workbook(test_id, date_from=None, date_to=None)`** →
  workbook Excel multi-foaie, filtrat opțional pe interval de date:
  - **„Sumar"** — toți participanții (din perioadă), cu răspunsuri la întrebări.
  - **„Finalizați"** — doar `status == completed`.
  - **„În proces"** — nefinalizații, DOAR contact + companie + scor total.
  - plus **o foaie per user finalizat**, plafonat la `MAX_USER_SHEETS = 300`
    (anti-OOM/timeout; restul rămâne în foile sumar + panoul admin).
- **`build_pdfs_zip_for_test(test_id, max_bytes=None)`** → scrie arhiva pe DISC
  (`tempfile`) și întoarce **calea** (streaming, nu RAM). Folosit DOAR de panoul
  admin acum; `max_bytes=None` = fără plafon (stream din disc → fără OOM).
- **`workbook_to_bytes(wb)`** → serializează workbook-ul în `bytes`.

## Endpoint-uri bot (`routes/tg_admin.py`)

Blueprint `tg_exports_bp`, prefix `/api_crowe_bizcheck/tg/exports`:

| Metodă & rută | Răspuns |
|---------------|---------|
| `GET /tests` | listă `{id, name}` pentru butoanele inline |
| `GET /excel/<test_id>?period=<today\|7d\|30d\|month\|all>` | `.xlsx` filtrat pe perioadă |
| `GET /submissions/<test_id>?q=<opt>` | listă `{id, label}` (max 20) pentru `/client` |
| `GET /pdf/<submission_id>` | PDF-ul unei persoane (404 dacă lipsește) |

> Arhiva PDF în masă a fost **scoasă** din bot (era cel mai mare risc de OOM).
> Pentru toate PDF-urile unui test → panoul admin.

## Gating STRICT pe `BOT_SHARED_SECRET`

Aceste endpoint-uri întorc **PII** (nume, email, telefon, rapoarte complete).
De aceea protecția e mai strictă decât la feedback:

- `before_request` → `_authorized()` cere ca `BOT_SHARED_SECRET` să fie setat
  ȘI ca header-ul `X-Bot-Secret` să coincidă.
- **Dacă secretul NU e setat → 403** (feature dezactivat).

Spre deosebire de endpoint-urile de feedback, care tolerează lipsa secretului,
aici lipsa lui închide complet exportul. Motivul: nu vrem PII expuse accidental
când configurarea e incompletă.

> Placeholder env: `BOT_SHARED_SECRET=<secret-lung-aleator>`. groupbot trimite
> exact aceeași valoare în header-ul `X-Bot-Secret`.
