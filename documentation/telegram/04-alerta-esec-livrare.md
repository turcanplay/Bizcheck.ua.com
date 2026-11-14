# 04 — Alertă la eșec de livrare

> Când botul user NU reușește să livreze raportul, echipa de vânzări
> e anunțată în grup, ca leadul să nu se piardă tăcut.

## Cuprins

- [Problema](#problema)
- [Fluxul](#fluxul)
- [Endpoint-ul backend](#endpoint-ul-backend)
- [Ce vede echipa](#ce-vede-echipa)
- [Decizii de securitate](#decizii-de-securitate)
- [Fișiere atinse](#fișiere-atinse)

---

## Problema

Un client vine de pe site cu un link de raport, apasă START, dar livrarea eșuează — cel mai des
pentru că **linkul a expirat** (TTL 24h), sau backend-ul a dat o eroare. Înainte, clientul vedea
doar un mesaj de eroare, iar echipa **nu afla niciodată** — leadul se pierdea în tăcere.

Acum, dacă botul nu poate livra, backend-ul primește un semnal și postează o **alertă** în grupul
de vânzări, cu identitatea Telegram a clientului, ca echipa să-l contacteze manual.

## Fluxul

```
CLIENT ── START <token expirat> ──► tgbot
                                     │ POST /tg/report/{token}  → 404
                                     │ (arată mesaj de eroare clientului)
                                     ▼
                              _alert_delivery_failed()          handlers.py
                                     │ POST /tg/report/{token}/failed
                                     ▼
                                 BACKEND                        telegram.py
                                     │ caută submisia după token (chiar expirat)
                                     │ notify_delivery_issue()  sales_notify.py
                                     ▼
                              coada worker  ("alert", info)
                                     │ _process_alert()         sales_notify.py
                                     ▼
                              GRUP VÂNZĂRI  ⚠️ alertă cu butoane
```

Ramurile de eșec din `_send_report` (`handlers.py`) care declanșează alerta:

| Situație | `reason` trimis | De ce |
|---|---|---|
| `POST /tg/report` → **403 / 404** | `"expired"` | Link expirat/invalid — clientul nu se poate auto-servi |
| `POST /tg/report` → **alt non-200** | `"server_fail"` | Eroare de backend la obținerea raportului |

> **Backend complet căzut** (`httpx.RequestError`) **NU** declanșează alertă: botul nu poate
> ajunge la backend ca să trimită semnalul. Doar loghează. La fel, cazul „PDF încă în lucru"
> (`pdf_pending`) nu e un eșec — clientul a primit deja sumarul.

## Endpoint-ul backend

`POST /api_crowe_bizcheck/tg/report/{token}/failed` (`routes/telegram.py`).

- **Motivele sunt un enum fix** (`_FAIL_REASONS`, `telegram.py`) → etichete uk. Botul nu
  poate injecta text arbitrar în grup.
- Caută submisia după token **chiar dacă e expirat** — asta e tot rostul: recuperarea lead-urilor
  cu link expirat.
- Cere `X-Bot-Secret` valid și `X-Telegram-Chat-ID` pozitiv. Secret absent/greșit → 403;
  chat absent/invalid → 400. `tg_username` trece prin `clean_optional`; identitatea chatului
  provine din antet, nu din câmpul JSON declarat de apelant.
- Tokenul trebuie să fie nelegat sau legat aceluiași chat; un alt chat nu declanșează alerta.
- Cheamă `notify_delivery_issue(reason_label, sub, tg_username, tg_chat_id)`.
- **După gate-ul de autentificare și validare**, răspunde 200 identic pentru token
  cunoscut/necunoscut sau legat altui chat. Tokenurile cu format invalid sunt respinse cu 404.

Motivele acceptate:

| `reason` | Eticheta uk |
|---|---|
| `expired` | Термін дії посилання минув (>24 год) |
| `server_error` | Бекенд недоступний / помилка сервера |
| `server_fail` | Помилка отримання звіту з бекенду |
| `no_pdf` | PDF ще не готовий на момент відкриття |

## Ce vede echipa

Mesajul (`_build_alert`, `sales_notify.py`) intră în **același topic** ca leadul normal
(per-test, sau General), cu butoane inline ca echipa să acționeze imediat:

```
⚠️ Не вдалося надіслати звіт у Telegram

👤 Ion Popescu
✈️ @ionpopescu

🧪 Тест: BizCheck
❗ Причина: Термін дії посилання минув (>24 год)

➖➖➖➖➖➖➖➖➖➖
📄 Деталі → панель адміністратора
🔔 Зв'яжіться з клієнтом вручну, щоб не втратити лід.

[💬 Написати в Telegram]  [✉️ Написати email]
```

Merge prin **același worker serializat** ca notificările normale (retry 429, fallback din topic
șters). Spre deosebire de leadul normal, alerta **NU e fire-once** — un eșec de livrare merită
semnalat de fiecare dată când se întâmplă.

## Decizii de securitate

- **Anti-spam / anti-enumerare:** alerta apare doar dacă tokenul corespunde unei submisii reale.
  Un apel fără secret nu ajunge la căutare. După gate, un token URL-safe necunoscut
  primește același 200 ca unul cunoscut; un token legat altui chat nu generează notificare.
- **Fără injecție:** motivul e enum fix, iar numele/username-ul trec prin `_esc` (HTML escape) în
  `_build_alert`.
- **Best-effort:** `_alert_delivery_failed` nu aruncă niciodată excepții — clientul a văzut deja
  eroarea, alerta e un canal lateral pentru echipă.

## Fișiere atinse

| Fișier | Modificare |
|---|---|
| `webdev/tgbot/handlers.py` | `_alert_delivery_failed()` + apel în ramurile 403/404 și alte non-200 |
| `webdev/tgbot/backend.py` | `report_failed(token, reason, payload, chat_id=...)` — client best-effort |
| `webdev/backend/routes/telegram.py` | `_FAIL_REASONS` + ruta `report_delivery_failed` |
| `webdev/backend/services/sales_notify.py` | `_build_alert()`, `_process_alert()`, job `"alert"`, `notify_delivery_issue()` |
| `webdev/backend/tests/test_sales_notify.py` | `TestBuildAlert` + `TestNotifyDeliveryIssue` (8 teste) |
