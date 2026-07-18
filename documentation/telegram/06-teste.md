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

Backend (fără DB, fără server):

```bash
cd webdev/backend
venv/bin/python -m pytest tests/test_unit_tg_group.py \
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

> Stare la ultima verificare: **135 passed** pe suitele tg + sales + groupbot (103 backend + 32 groupbot).

## Validare prin mutații

Testele au fost validate **prin mutații**, nu doar rulate: codul a fost stricat intenționat
(fail-open readus, administrator acceptat ca proprietar, cache de topic ignorat, precedență
inversată ș.a.) și de fiecare dată testele au picat. Deci prind regresiile real.
