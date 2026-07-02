# Variabile de mediu (`webdev/.env`)

Toate serviciile (`db`, `backend`, `frontend`, `tgbot`, `groupbot`) citesc din
acest singur fișier `.env`. Copiază `webdev/.env.example` în `webdev/.env` și
completează valorile înainte de `docker compose up`.

## Telegram (cele mai importante la deploy)

| Variabilă | Folosită de | Rol | Obligatorie |
|---|---|---|---|
| `TELEGRAM_BOT_TOKEN` | `tgbot` + `backend` (feedback) | Botul de **clienți** (livrează raportul, întrebarea de feedback). | Da, pentru botul de clienți |
| `TELEGRAM_BOT_USERNAME` | `tgbot` + `backend` | Username-ul botului de clienți; folosit la construirea deep-link-urilor. | Da |
| `SALES_BOT_TOKEN` | `backend` (notificări) + `groupbot` (polling) | Botul de **grup** al echipei. **Același token** e folosit de 2 procese: backend doar *trimite* notificări, groupbot *ascultă* `/excel` și `/pdf`. | Da, pentru grup |
| `SALES_CHAT_ID` | `backend` + `groupbot` | Grupul echipei. **Trebuie să fie id de SUPERGRUP-FORUM** (formă `-100xxxxxxxxxx`), **NU** id de grup simplu. | Da, pentru grup |
| `BOT_SHARED_SECRET` | `backend` + `tgbot` + `groupbot` | Secret comun backend↔boți. **OBLIGATORIU** ca `/excel` și `/pdf` să meargă — fără el backend dă **403**. | Da (pentru exporturi) |
| `BACKEND_URL` | `tgbot` + `groupbot` | URL intern al backend-ului: `http://backend:4001`. Setat fix în compose. | Da (intern) |

> Notă: `SALES_BOT_TOKEN` și `SALES_CHAT_ID` apar pe **două** servicii în
> `docker-compose.yml` (backend trimite, groupbot ascultă). Pune-le o singură
> dată în `.env` — compose le injectează în ambele.

### Generare `BOT_SHARED_SECRET`

```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"
```

## Restul (secrete backend — NU le expune)

Acestea sunt secrete de infrastructură. Folosește valori puternice, nu le
publica și nu le pune în git.

| Variabilă | Rol pe scurt |
|---|---|
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | Credențiale Postgres (portul DB nu e expus public). |
| `JWT_SECRET` / `JWT_REFRESH_SECRET` | Semnarea sesiunilor admin (cookie JWT). |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | Cont admin pentru panoul de administrare. |
| `PII_ENCRYPTION_KEY` | Cheie Fernet — criptarea PII (nume, email, telefon) la rest. **Obligatorie în producție.** |
| `CORS_ORIGIN` / `ALLOWED_HOSTS` / `PUBLIC_BASE_URL` | Origini și host-uri permise; URL public pentru link-urile din email. |
| `SMTP_*` (`SMTP_USER`, `SMTP_PASSWORD`, …) | Livrare email rapoarte (Office 365). Gol = email dezactivat, fără crash. |
| `EMAIL_LOGO_URL` | Logo în template-ul HTML de email. |
| `FRONTEND_PORT` | Port intern frontend (legat doar la `127.0.0.1`). |

Generare cheie Fernet pentru `PII_ENCRYPTION_KEY`:

```bash
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
```

> Placeholder-e folosite în acest doc: `<TOKEN>`, `-100xxxxxxxxxx`, `<SECRET>`.
> Nu pune niciodată tokenuri sau parole reale în documentație.
