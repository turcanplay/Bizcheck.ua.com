# 02 — Botul de clienți (`tgbot/`)

Fișier: `webdev/tgbot/bot.py`. Bibliotecă: **python-telegram-bot 21.7**, mod **polling**,
token `TELEGRAM_BOT_TOKEN`. Rolul: livrează raportul clientului și colectează contacte.

## Fluxul principal (livrarea raportului)

1. Clientul termină testul pe site și, pe pagina raportului, alege **„Trimite în
   Telegram"**.
2. Site-ul deschide deep-link-ul `t.me/CROWE_BIZCHECK_bot?start=<token>`.
3. Telegram afișează botul; clientul apasă **START**.
4. Botul primește `/start <token>`, cere raportul de la backend și trimite sumarul +
   PDF-ul.

`<token>` este un token de raport opac, cu durată limitată (vezi 07/09).

## Tipuri de deep-link la `/start`

- `start=<token>` → livrare raport (`_send_report`).
- `start=fb_<token>` → **feedback outreach** (`_feedback_open`): leagă `chat_id`-ul
  persoanei de un demers de feedback; răspunsul ulterior text este capturat și trimis la
  backend.
- fără argument → mesaj de bun venit (implicit în RO).

## Ce trimite botul după `/start <token>`

1. Sumar text: nume, **scor general %**, zona de risc (🟢/🟡/🟠/🔴) și lista blocurilor
   evaluate.
2. **PDF-ul** raportului (decodat din `pdf_b64` primit de la backend). Dacă PDF-ul nu e
   gata încă, afișează un mesaj „se generează".
3. Buton **„Partajează numărul meu"** (`request_contact`) — clientul trimite numărul real
   dintr-o atingere, util chiar dacă nu are `@username`.
4. Două butoane inline:
   - **„Primește raportul pe email"** (`callback_data=eml:<lang>:<token>`).
   - **„Lasă datele de contact"** — email + telefon, pentru vânzări
     (`callback_data=lead:<lang>:<token>`).

## Fluxuri inline (handler unic pe text, cu stare în `user_data`)

- `flow="email"` → cere emailul → `POST /tg/email/<token>` (trimite raportul pe email).
- `flow="lead"` → cere email, apoi telefon → `POST /tg/lead/<token>` (salvează contactul).
- butonul `request_contact` → `POST /tg/lead/<token>` doar cu `phone`.

Limba (`ro`/`ru`) și token-ul sunt codate în `callback_data`, deci nu se persistă pe
server între pași.

## Endpoint-uri backend apelate

Toate sub `http://backend:4001/api_crowe_bizcheck/tg/`:

| Rută | Rol |
|------|-----|
| `GET report/<token>` | ia datele + PDF (base64) ale raportului |
| `POST contact/<token>` | salvează `chat_id`/`username` Telegram pentru follow-up |
| `POST email/<token>` | trimite raportul pe emailul indicat |
| `POST lead/<token>` | salvează email și/sau telefon (lead vânzări) |
| `POST feedback/open` | leagă chat-ul de un demers de feedback |
| `POST feedback/reply` | salvează răspunsul text la întrebarea de feedback |

Rutele de feedback sunt protejate cu header `X-Bot-Secret: <BOT_SHARED_SECRET>`.

## Bilingv RO/RU

Toate textele sunt în dicționarul `_STRINGS` cu cheile `ro` și `ru`; funcția `_t(lang,
key)` alege limba (fallback pe `ro`). Limba vine din datele raportului.

## Robustețe

- `AIORateLimiter` respectă limitele de flood Telegram (cozează la 429 în loc să piardă
  mesaje).
- `error_handler` tratează `Conflict` (alt poller pe același token → backoff 15s) și
  erorile de rețea tranzitorii fără să cadă procesul.
- `run_polling(drop_pending_updates=True)` la pornire.
