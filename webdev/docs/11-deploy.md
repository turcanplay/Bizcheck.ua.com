# Deploy pe server (pas cu pas)

Ghid pentru botul de grup al echipei (notificări + `/excel` + `/pdf`).
Toate comenzile se rulează din `~/BIZZCHECK_BOT/webdev`.

## 1. Creează botul de grup în BotFather

În [@BotFather](https://t.me/BotFather) creează (sau confirmă) botul de grup și
pune tokenul în `.env`:

```
SALES_BOT_TOKEN=<TOKEN>
```

Acesta e **al doilea** bot (separat de botul de clienți `TELEGRAM_BOT_TOKEN`).

## 2. Fă grupul forum și adaugă botul ca admin

1. În grupul echipei: **Edit → Topics ON** (transformă grupul în forum).
2. Adaugă botul de grup în grup ca **ADMIN**, cu permisiunea **„Manage Topics"**.
   Fără ea, botul nu poate crea topicuri și notificările cad în „General".

## 3. Află `SALES_CHAT_ID` corect

Trebuie să fie id de **supergrup-forum**, formă `-100xxxxxxxxxx`.

> Atenție: când un grup simplu devine forum, **id-ul SE SCHIMBĂ**
> (ex. vechi `-52xxxxxxx` → nou `-100xxxxxxxxxx`). Folosește mereu id-ul nou.

Verifică cu scriptul de la pasul 5 (`getChat` trebuie să arate `"is_forum":true`).

## 4. Setează `.env`

```
SALES_BOT_TOKEN=<TOKEN>
SALES_CHAT_ID=-100xxxxxxxxxx
BOT_SHARED_SECRET=<SECRET>
```

`BOT_SHARED_SECRET` se generează cu:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

## 5. Verifică configul

```bash
./scripts/check-telegram.sh
```

Rulează `getMe` (tokenul e viu?) + `getChat` (chat-ul e accesibil?).
Caută în răspuns `"is_forum":true` și `"type":"supergroup"`.

## 6. Deploy

```bash
./deploy.sh
# echivalent cu:
docker compose up -d --build backend groupbot
```

Migrarea DB (coloana `tg_topic_id`) rulează **AUTOMAT** la boot-ul backend și e
idempotentă. **Nu** rula SQL manual.

## 7. Test în grup

Scrie în grupul echipei:

```
/excel
/pdf
```

Ambele trebuie să răspundă cu fișierul corespunzător.

---

- **Nu** porni `getUpdates` manual cât timp `groupbot` face polling pe același
  token → conflict de polling.
- Botul standalone din `src/` e **separat** (alt DB, alt token) și nu e afectat
  de acest deploy.
