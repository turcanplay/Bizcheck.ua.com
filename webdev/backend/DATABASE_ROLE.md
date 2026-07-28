# Rolul Postgres al aplicației (audit INFO-4)

## Starea de acum

`webdev/docker-compose.yml` pornește Postgres cu `POSTGRES_USER=${DB_USER:-postgres}`
și dă backendului același utilizator prin `DATABASE_URL`. Adică **aplicația se
conectează ca superuser**.

Ce înseamnă practic: dacă `DATABASE_URL` scapă (log, `docker inspect`, backup de
`.env`) sau dacă containerul backend e compromis, atacatorul nu primește doar
datele BizCheck — primește tot clusterul: orice bază, `COPY ... TO PROGRAM`
(execuție de comenzi pe gazda Postgres), `CREATE EXTENSION`, crearea de roluri
noi, dezactivarea RLS. Cifrarea Fernet a coloanelor PII nu ajută aici: cheia stă
în aceeași variabilă de mediu, în același container.

## Drepturile minime de care are nevoie aplicația

Nu poate fi un rol „doar SELECT/INSERT/UPDATE/DELETE”. `migrate()`
(`database/db.py`) rulează **la fiecare boot** și emite DDL:

| Ce face `migrate()` | Dreptul necesar |
| --- | --- |
| `CREATE TABLE IF NOT EXISTS` (14 tabele) | `CREATE` pe schema `public` |
| `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` | proprietate asupra tabelei |
| `ALTER TABLE ... ALTER COLUMN ... TYPE/SET DEFAULT/DROP NOT NULL` | proprietate asupra tabelei |
| `ALTER TABLE ... RENAME COLUMN` (`migrate_ro_to_uk`, `migrate_ru_to_en`) | proprietate asupra tabelei |
| `CREATE INDEX IF NOT EXISTS` (inclusiv parțiale/unice) | proprietate asupra tabelei |
| `SELECT ... FROM information_schema.columns` | `USAGE` pe `information_schema` |
| `SELECT pg_advisory_xact_lock(1)` | niciun drept special |
| CRUD-ul normal al aplicației | `SELECT, INSERT, UPDATE, DELETE` pe tabele + `USAGE, SELECT` pe secvențe (coloane `SERIAL`) |

Un rol mai strâns de atât **blochează pornirea containerului** — de asta scriptul
face rolul *proprietar al schemei* `public` în loc să încerce o listă fină de
GRANT-uri.

Ce **nu** îi trebuie și se închide explicit:

- `SUPERUSER`, `CREATEDB`, `CREATEROLE`, `REPLICATION`, `BYPASSRLS`
- `CREATE` pe *bază* (nu poate adăuga alte scheme lângă a lui)
- `TRUNCATE`, `REFERENCES`
- acces la orice altă bază din cluster (doar `CONNECT` pe `bizzcheck`)

## Scriptul

`webdev/backend/scripts/sql/create_app_role.sql` — idempotent, se poate rula de
câte ori vrei. Creează rolul `bizcheck_app`, îi dă schema `public` în
proprietate, transferă obiectele existente (create de `postgres`) și
re-afirmă restricțiile la fiecare rulare.

`CONNECTION LIMIT 30` trebuie să rămână peste `DB_POOL_MAX` (implicit 20, vezi
`database/db.py`), altfel pool-ul rămâne fără conexiuni.

## De ce NU e automatizat

Trei motive, toate cu risc de downtime dacă forțăm:

1. **Doar un superuser poate crea un rol.** Ca să fie automat, backendul ar
   trebui să se conecteze *tot ca superuser* ca să-și creeze rolul non-superuser
   — cercul se închide și superuserul rămâne în `.env`.
2. **`POSTGRES_USER` din compose nu poate fi schimbat pe un volum existent.**
   Variabila e folosită de imaginea `postgres` doar la `initdb`, adică pe un
   volum gol. Pe `pgdata` deja populat e ignorată. Schimbarea ei în compose ar
   da doar iluzia că s-a rezolvat ceva, plus un healthcheck (`pg_isready -U ...`)
   care pică.
3. **Transferul de proprietate nu e reversibil dintr-un `migrate()`.** Dacă
   `ALTER SCHEMA public OWNER` se execută la boot și eșuează pe jumătate,
   aplicația rămâne cu DDL blocat și containerul intră în crash-loop. E o
   operație de o singură dată, care vrea un om și un backup lângă ea.

## Pași manuali pe server

```bash
cd /opt/bizcheck/webdev            # sau unde e deployul

# 0. Backup. Nu sări peste el.
docker compose exec -T db pg_dump -U postgres bizzcheck | gzip > ~/bizzcheck-prerole.sql.gz

# 1. Generează o parolă și creează rolul.
APP_PW=$(openssl rand -base64 32 | tr -d '/+=' | head -c 40)
docker compose exec -T db psql -v ON_ERROR_STOP=1 -U postgres -d bizzcheck \
    -v app_password="'$APP_PW'" < backend/scripts/sql/create_app_role.sql

# 2. Verifică: toate coloanele rolsuper/rolcreatedb/rolcreaterole/rolreplication = f
#    (scriptul le afișează singur la final).

# 3. Pune rolul în .env — DOAR pentru backend. NU atinge DB_USER/POSTGRES_USER,
#    care rămân `postgres` pentru serviciul `db` (vezi motivul 2 de mai sus).
echo "DATABASE_URL=postgresql://bizcheck_app:$APP_PW@db:5432/bizzcheck" >> .env
unset APP_PW

# 4. Repornește DOAR backendul și urmărește migrarea.
docker compose up -d --no-deps backend
docker compose logs -f backend       # migrate() trebuie să treacă fără erori de permisiune

# 5. Smoke test.
curl -fsS https://bizcheck.ua.com/api_crowe_bizcheck/health
```

`DATABASE_URL` are prioritate în `get_pool()` față de `DB_HOST/DB_USER/...`, deci
pasul 3 e suficient — nu trebuie modificat `docker-compose.yml`.

### Rollback

Scoate linia `DATABASE_URL=postgresql://bizcheck_app:...` din `.env` (rămâne cea
generată de compose, pe `postgres`) și `docker compose up -d --no-deps backend`.
Obiectele rămân în proprietatea lui `bizcheck_app`, dar `postgres` fiind
superuser poate oricum să le modifice — deci revenirea e instantanee și fără
pierdere de date.

### Rotația parolei

Rulează din nou scriptul cu alt `-v app_password=...` (face `ALTER ROLE`),
actualizează `DATABASE_URL` în `.env`, repornește backendul.
