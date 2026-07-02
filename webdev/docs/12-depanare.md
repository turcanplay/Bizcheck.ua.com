# Depanare (simptom → cauză → fix)

| Simptom | Cauză cea mai probabilă | Fix |
|---|---|---|
| Nu vin notificări în grup | `SALES_CHAT_ID` greșit (grupul a devenit forum și a primit alt id: vechi `-52...` → nou `-100...`) | Rulează `getChat`, ia id-ul nou (`"is_forum":true`), pune-l în `.env`, redeploy. |
| Nu vin notificări în grup | Token mort | `getMe` (vezi `check-telegram.sh`); regenerează tokenul în BotFather. |
| Nu vin notificări în grup | Bot neadăugat sau ne-admin | Adaugă botul în grup ca admin cu „Manage Topics". |
| Nu vin notificări în grup | Lead incomplet (fără nume + contact) | Așteptat — notificarea pleacă doar pentru lead-uri complete. |
| Nu vin notificări în grup | `SALES_BOT_TOKEN` / `SALES_CHAT_ID` lipsă în `.env` | Completează-le și redeploy. |
| `/excel` și `/pdf` nu fac nimic | `BOT_SHARED_SECRET` lipsă/nepotrivit → backend dă **403** | Pune **același** `BOT_SHARED_SECRET` la backend și groupbot, redeploy. |
| `/excel` și `/pdf` nu fac nimic | Serviciul `groupbot` nu rulează | `docker compose ps groupbot`; pornește-l. |
| `/excel` și `/pdf` nu fac nimic | Comanda scrisă în alt chat | Scrie comanda în chat-ul `SALES_CHAT_ID`. |
| `getUpdates conflict` / „Conflict" | Două procese fac polling pe același token | Oprește polling-ul manual; lasă doar `groupbot`. |
| Topicul nu se creează | Botul nu e admin cu „Manage Topics", sau grupul nu e forum | Activează Topics + dă botului „Manage Topics"; altfel notificările cad în „General". |

## Detalii

### Notificări care nu ajung
Cauza #1 în practică: `SALES_CHAT_ID` invalid pentru că grupul a fost convertit
în forum și id-ul s-a schimbat. Verifică mereu cu `getChat` și confirmă
`"is_forum":true` înainte de a bănui altceva.

### `/excel` și `/pdf`
Endpoint-urile de export sunt **dezactivate (403)** dacă `BOT_SHARED_SECRET`
diferă între backend și groupbot. Asigură-te că valoarea e identică în ambele.

### Conflict de polling
Telegram permite un singur consumator `getUpdates` per token. Dacă rulezi un
script de test în paralel cu `groupbot`, apare eroarea „Conflict". Oprește
scriptul.

## Comenzi utile

```bash
docker compose logs --tail=50 groupbot
docker compose logs --tail=50 backend
./scripts/check-telegram.sh
```
