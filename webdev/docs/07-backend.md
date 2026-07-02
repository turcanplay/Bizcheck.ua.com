# 07 — Backend (Flask)

Backend-ul aplicației web BizCheck (`webdev/backend/`). Punct de intrare: `server.py`.

## Rol și rețea

- Rulează ca serviciu `backend:4001` în `webdev/docker-compose.yml`.
- **NU este expus public** — doar `expose: 4001`, fără mapare `ports:`. nginx este singurul proxy în față.
- Un singur hop de încredere: `ProxyFix(app.wsgi_app, x_for=1, ...)`. nginx suprascrie `X-Forwarded-For`, deci IP-ul real nu poate fi spoofat (cheia de rate-limit e sigură).
- Boții (`tgbot`, `groupbot`) cheamă backend-ul intern via `http://backend:4001` — niciodată prin Internet.

## Blueprint-uri înregistrate

`server.py` montează blueprint-urile importate din `routes/`:

| Domeniu | Blueprint(uri) |
|---|---|
| Auth admin | `auth_bp` |
| Conținut test | `blocks_bp`, `questions_bp`, `results_bp` |
| Admin general | `admin_bp` |
| Submisii | `submissions_bp` |
| Telegram (flux web) | `tg_bp` |
| Teste | `tests_bp`, `admin_tests_bp` |
| Template-uri | `templates_bp`, `admin_templates_bp` |
| Conținut public | `content_bp`, `admin_content_bp` |
| Setări site | `site_settings_bp`, `admin_site_settings_bp` |
| Feedback Telegram | `tg_feedback_bp`, `admin_feedback_bp` |
| **Exporturi Telegram (NOU)** | `tg_exports_bp` din `routes/tg_admin.py` |

Piesa nouă `tg_exports_bp` adaugă exporturi PII pentru bot (vezi rutele de mai jos) și este înregistrată ultima.

## Rute Telegram

Prefix comun: `/api_crowe_bizcheck/tg/*`

- `tg_bp` — `report`, `contact`, `email`, `lead`, `link`.
- `tg_feedback_bp` — `/tg/feedback/*` (outreach + capturarea răspunsurilor).
- **NOU** `tg_exports_bp` — `/api_crowe_bizcheck/tg/exports/*` (exporturi pentru groupbot).

## Sanitizare și PII

- Orice câmp text liber de la utilizator pe o cale de scriere trece prin `utils/validators.clean_text` / `clean_optional` (strip bleach + curățare control-chars + limită de lungime). Slug-urile: `clean_slug`.
- Câmpurile PII (`first_name`, `last_name`, `email`, `phone`) sunt criptate Fernet la rest. Se citesc **mereu prin model** (`Submission`), care decriptează transparent; SQL brut ocolește `decrypt_row` și returnează ciphertext.

## Pornire

La import: validare variabile de mediu obligatorii (`JWT_SECRET`, `JWT_REFRESH_SECRET`; în producție și `PII_ENCRYPTION_KEY`, `ADMIN_USERNAME`, `ADMIN_PASSWORD`), apoi `migrate()` (vezi `08-baza-de-date.md`) și pornirea scheduler-ului de feedback.

## Surse

- `webdev/backend/server.py`
- `webdev/backend/routes/tg_admin.py`, `routes/telegram.py`, `routes/tg_feedback.py`
