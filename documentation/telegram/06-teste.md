# 06 — Teste

Toate suitele Telegram rulează **fără DB, fără server și fără să atingă Telegram real**
(Flask test client + monkeypatch, sau un API Telegram fals).

## Cuprins

- [Suitele](#suitele)
- [Cum le rulezi](#cum-le-rulezi)
- [Validare prin mutații](#validare-prin-mutații)

---

## Suitele

| Suită | Ce acoperă |
|---|---|
| `tgbot/tests/test_bot.py` | UI exclusiv uk, raport/PDF, chat privat, token URL-safe, identitate contact, secret/chat headers, retry și redactarea URL-urilor din erori |
| `tgbot/tests/test_profile_guard.py` | Profil din cod, lipsa override-urilor runtime, restaurarea avatarului/descrierilor/meniului, erori parțiale, verificarea identității și startup |
| `tgbot/tests/test_zones.py` | Praguri backend, fallback, limite și procentaj minim fără schimbarea zonei |
| `backend/tests/test_unit_tg_recipient_security.py` | Secret fail-closed, claim atomic al tokenului pe chat, identitate pozitivă și acțiuni refuzate altui chat |
| `backend/tests/test_unit_tg_group.py` | Poarta de secret (inclusiv „secret nesetat pe server"), `chat_id` invalid, sanitizarea titlului, precedența env ↔ `/register` |
| `backend/tests/test_unit_tg_feedback_auth.py` | Regresia fail-open pe `/tg/feedback/*` |
| `backend/tests/test_unit_sales_flow.py` | Lanțul complet cu un API Telegram fals: `/register` → topic per test → trimitere → refolosire topic → dedup → editare |
| `backend/tests/test_sales_notify.py` | Helper-ele pure (zonă, escape, contact-line, keyboard, `_build_alert`), controlul din `maybe_notify_sales` și **`notify_delivery_issue`** (alerta de eșec) |
| `groupbot/tests/test_register.py` | Gating pe proprietar, `_allowed()` fail-closed, cache-ul TTL |
| `frontend/src/components/report/CallToAction.test.tsx` | `pdf_ready`, căile de eroare, absența username-ului hardcodat |

> Testele pentru alerta de eșec livrare ([`04`](04-alerta-esec-livrare.md)) sunt în
> `test_sales_notify.py`: `TestBuildAlert` (conținut + escape HTML) și `TestNotifyDeliveryIssue`
> (enqueue job `"alert"`, override identitate TG, funcționare fără submisie).

## Cum le rulezi

Bot user (venv cu `tgbot/requirements.txt` și `requirements-dev.txt`):

```bash
cd webdev/tgbot
python -m pytest -q
```

Backend (fără DB, fără server):

```bash
cd webdev/backend
venv/bin/python -m pytest tests/test_unit_tg_recipient_security.py \
                          tests/test_unit_tg_deeplink.py \
                          tests/test_unit_tg_report_zones.py \
                          tests/test_unit_tg_group.py \
                          tests/test_unit_tg_feedback_auth.py \
                          tests/test_unit_sales_flow.py \
                          tests/test_sales_notify.py -q
```

Groupbot (venv propriu — venv-ul backend n-are `telegram`/`httpx`):

```bash
cd webdev/groupbot
venv/bin/python -m pytest -q
```

Frontend (Vitest + Testing Library):

```bash
cd webdev/frontend
PATH=/usr/local/bin:$PATH npm run test:run
```

Verificare locală la 2026-11-12:

- Bot user: **173 teste trecute**.
- Backend, întreaga suită fără server/DB: **1018 teste trecute**.
- Validator nginx: **82 teste trecute**; validator deploy: **168 teste trecute**.

Aceste rezultate folosesc fakes/monkeypatch și nu dovedesc starea botului public, a
Postgres-ului de producție sau trimiterea reală Telegram. Nu s-a executat deploy; `.env`
cu acreditările botului UA nu este prezent în workspace. Backend + tgbot trebuie livrate împreună.

## Validare prin mutații

Istoric: testele de grup/vânzări au fost validate **prin mutații**: codul a fost stricat intenționat
(fail-open readus, administrator acceptat ca proprietar, cache de topic ignorat, precedență
inversată ș.a.) și testele au picat. Acest istoric nu înseamnă că s-au repetat mutațiile
pentru toate cazurile noi de profil sau autorizare din 2026-11-12.
