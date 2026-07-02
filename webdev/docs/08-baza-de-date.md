# 08 — Baza de date (PostgreSQL)

Sursa unică a schemei: funcția `migrate()` din `webdev/backend/database/db.py`.

## Migrări

- `migrate()` rulează la **fiecare boot** al backend-ului (apelată din `server.py`).
- Pattern **idempotent**: `CREATE TABLE IF NOT EXISTS` + `ALTER TABLE ... ADD COLUMN IF NOT EXISTS`.
- Serializat cu `pg_advisory_xact_lock(1)` — boot-urile concurente (gunicorn multi-worker / replici) nu se calcă.
- **Nu** se adaugă folder de migrări separat; totul stă în blocul `migrate()`.
- **Nu** se fac `DROP` (nu sunt idempotente între replici).

### Cum adaugi o coloană nouă

Adaugi o linie `ALTER` în blocul `migrate()`. Exemplu real (topic forum per test):

```sql
ALTER TABLE tests ADD COLUMN IF NOT EXISTS tg_topic_id BIGINT DEFAULT NULL;
```

La următorul deploy rulează automat; pe DB-urile care au deja coloana, comanda e no-op.

## Tabel `tests`

| Coloană | Tip | Note |
|---|---|---|
| `id` | SERIAL PK | |
| `slug` | VARCHAR UNIQUE | |
| `name_ro` / `name_ru` | VARCHAR | denumiri bilingve |
| `description_ro` / `description_ru` | TEXT | |
| `is_active`, `is_coming_soon` | BOOLEAN | |
| `report_type` | VARCHAR(32) | ∈ {`bizcheck`, `standard`, `premium`, `gdpr`}; default `bizcheck` |
| `order_index` | INTEGER | ordinea în catalog (mai mic = primul) |
| `scoring_zones`, `zone_recommendations` | JSONB | praguri / recomandări |
| **`tg_topic_id`** | BIGINT | **NOU** — id-ul topicului forum din grupul de vânzări per test; `NULL` până la prima notificare |

## Tabel `submissions`

| Coloană | Tip | Note |
|---|---|---|
| `id` | SERIAL PK | |
| `test_id` | INTEGER FK → tests | |
| `first_name`, `last_name`, `email`, `phone` | TEXT | **PII criptat Fernet** (ciphertext) |
| `sector`, `company_size`, `company_age`, `company_revenue` | VARCHAR | profil firmă |
| `total_score` | REAL | scor final |
| `answers_json`, `selected_answers_json`, `block_scores_json` | JSONB | răspunsuri / scoruri pe bloc |
| `status` | VARCHAR(20) | ∈ {`started`, `in_progress`, `completed`, `abandoned`} |
| `language` | VARCHAR(5) | `ro` / `ru` |
| `consent` | BOOLEAN | |
| `submission_token` | VARCHAR(64) | token opac pentru scrieri publice (vezi `09-securitate-auth.md`) |
| `pdf_data` | BYTEA | raportul PDF stocat |
| `tg_token`, `tg_token_expires`, `tg_chat_id`, `tg_username`, `tg_first_name`, `tg_last_name` | — | livrare deep-link Telegram |
| **`sales_notified`** | BOOLEAN | flag fire-once pentru notificarea de vânzări |
| **`sales_msg_id`** | BIGINT | id-ul mesajului Telegram (pentru editare in-place la update contact) |
| **`sales_msg_is_doc`** | BOOLEAN | dacă mesajul de vânzări a fost trimis ca document |

## Subsistemul Telegram — coloane cheie

- `tests.tg_topic_id` — rutează notificările fiecărui test într-un topic dedicat.
- `submissions.tg_*` — leagă o submisie de un chat Telegram.
- `submissions.sales_notified` / `sales_msg_id` / `sales_msg_is_doc` — controlează notificarea unică de vânzări și editarea ei ulterioară.
- Tabel auxiliar `tg_outreach` — feedback automat/manual (token, status, `due_at`).

## Surse

- `webdev/backend/database/db.py` (funcția `migrate()`)
- `webdev/backend/models/test.py`, `models/submission.py`
