# 07 — Depanare (simptom → cauză → fix)

Conținut preluat din vechiul `webdev/docs/12-depanare.md` și **corectat** față de codul
actual (acel fișier fusese scris înainte de `/register` și înainte ca auth-ul pe
`/tg/*` să devină fail-closed).

Context necesar înainte de a depana:

- **`BOT_SHARED_SECRET` este obligatoriu.** Toate rutele `/tg/exports/*`, `/tg/group/*`
  și `/tg/feedback/*` sunt gated **strict**: dacă variabila nu e setată pe backend,
  endpoint-urile sunt **dezactivate (403)**, nu deschise
  (`backend/routes/tg_admin.py:34`, `tg_group.py:32`, `tg_feedback.py:91`).
- **Destinația notificărilor** se rezolvă în ordinea: env `SALES_CHAT_ID` (câștigă
  oricând e setat) → grupul înregistrat prin `/register`
  (`backend/services/sales_notify.py:57`). Dacă niciuna nu e disponibilă,
  `_configured()` e fals și notificarea se sare în tăcere (`sales_notify.py:84`).
- **`groupbot` fail-closed**: fără `SALES_CHAT_ID` și fără grup înregistrat, comenzile
  nu răspund deloc (`groupbot/bot.py:180-194`).

## Tabel

| Simptom | Cauză cea mai probabilă | Fix |
|---|---|---|
| Nu vin notificări în grup | Nici `SALES_CHAT_ID`, nici `/register` — backendul nu are unde trimite | Rulează `/register` în grup (doar owner-ul grupului) **sau** setează `SALES_CHAT_ID` |
| `/register` răspunde cu eroare / nu se salvează | `BOT_SHARED_SECRET` lipsă sau diferit între backend și `groupbot` → backend dă **403** | Aceeași valoare în ambele servicii, apoi redeploy |
| Nu vin notificări în grup | `SALES_CHAT_ID` setat, dar greșit — grupul a devenit forum și a primit alt id (vechi `-52…` → nou `-100…`); env-ul câștigă și blochează `/register` | `getChat` pentru id-ul nou (`"is_forum":true`); sau golește `SALES_CHAT_ID` și folosește `/register` |
| Nu vin notificări în grup | `SALES_BOT_TOKEN` lipsă sau token mort | `getMe` (vezi `scripts/check-telegram.sh`); regenerează în BotFather |
| Nu vin notificări în grup | Botul nu e în grup / nu e admin | Adaugă-l ca admin, cu „Manage Topics" |
| Nu vin notificări în grup | Lead incomplet | Așteptat: notificarea pleacă doar când există **nume + cel puțin un canal de contact** (`sales_notify.py:565-613`) |
| Nu vin notificări în grup | Lead-ul a fost deja anunțat | Fire-once: claim atomic pe `submissions.sales_notified`. Update-urile ulterioare editează mesajul existent, nu trimit unul nou |
| `/excel` sau `/client` nu fac nimic | `BOT_SHARED_SECRET` lipsă/nepotrivit → backend dă **403** | Aceeași valoare la backend și `groupbot`, redeploy |
| `/excel` sau `/client` nu fac nimic | Comanda scrisă în alt chat decât cel permis | Scrie în grupul din `SALES_CHAT_ID` / cel înregistrat |
| `/excel` sau `/client` nu fac nimic | Serviciul `groupbot` nu rulează | `docker compose ps groupbot` |
| `/pdf` „nu descarcă nimic" | **Comportament corect.** `/pdf` returnează un link către panoul de admin — arhiva completă depășește limita de 50 MB a Telegram (`groupbot/bot.py:385-393`) | Descarcă din panou; pentru o singură persoană folosește `/client` |
| `/client` răspunde `413` | PDF-ul unei persoane depășește limita de upload | Backendul întoarce un `admin_url` în răspuns — descarcă din panou |
| `getUpdates conflict` / „Conflict" | Două procese fac polling pe același token | Un singur consumator per token. `groupbot` face polling; backendul doar **trimite**, deci nu intră în conflict. Oprește scripturile de test |
| Topicul nu se creează în forum | Botul nu e admin cu „Manage Topics", sau grupul nu e forum | Activează Topics + dă permisiunea; altfel notificările cad în „General" |
| Toate notificările ajung în același topic | `SALES_TOPIC_ID` e setat și suprascrie topicul per test (`sales_notify.py:245`) | Golește variabila dacă vrei un topic per test |
| Exportul ZIP de PDF-uri rămâne „queued" | Job asincron cu spool pe disc; jobul e marcat `failed` dacă nu dă heartbeat (`EXPORT_JOB_STALE_AFTER`, implicit 900 s) | Verifică logurile backend și volumul `EXPORT_SPOOL_DIR` |

## Comenzi utile

```bash
docker compose logs --tail=50 groupbot
docker compose logs --tail=50 backend
docker compose logs --tail=50 tgbot
./scripts/check-telegram.sh
```

## Vezi și

- [`03-bot-grup-register.md`](03-bot-grup-register.md) — `/register` și endpoint-urile de export
- [`05-env-si-deploy.md`](05-env-si-deploy.md) — precedența `SALES_CHAT_ID` ↔ `/register`
- [`02-notificare-vanzari.md`](02-notificare-vanzari.md) — fire-once, edit-in-place, topicuri
