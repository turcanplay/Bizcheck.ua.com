# Rolul Postgres al aplicației (audit INFO-4)

## Starea de acum

`webdev/docker-compose.yml` pornește Postgres cu `POSTGRES_USER=${DB_USER:-postgres}`
și, **cât timp nu pui `DATABASE_URL` în `.env`**, dă backendului același
utilizator. Adică implicit **aplicația se conectează ca superuser**.

Ce înseamnă practic: dacă `DATABASE_URL` scapă (log, `docker inspect`, backup de
`.env`) sau dacă containerul backend e compromis, atacatorul nu primește doar
datele BizCheck — primește tot clusterul: orice bază, `COPY ... TO PROGRAM`
(execuție de comenzi pe gazda Postgres), `CREATE EXTENSION`, crearea de roluri
noi, dezactivarea RLS. Cifrarea Fernet a coloanelor PII nu ajută aici: cheia stă
în aceeași variabilă de mediu, în același container.

Verifici în orice moment cu ce rol rulează backendul VIU:

```bash
./scripts/check-db-role.sh
```

> ### ⚠ Procedura asta a fost, o vreme, un no-op
>
> Pasul final era `echo "DATABASE_URL=..." >> .env`, dar în `docker-compose.yml`
> `DATABASE_URL` era un literal **calculat** din `${DB_USER}`/`${DB_PASSWORD}`,
> iar **niciun serviciu nu are `env_file:`** — `.env` e citit de Compose DOAR
> pentru substituția `${...}`. Variabila scrisă în `.env` nu ajungea niciodată
> în container: backendul se conecta mai departe ca superuser, iar cine urma
> procedura rămânea convins că a securizat baza. Asta e mai rău decât să n-o fi
> făcut deloc, pentru că elimină și suspiciunea.
>
> Reparat: valoarea din compose e acum
> `${DATABASE_URL:-postgresql://${DB_USER:-postgres}:${DB_PASSWORD:-postgres}@db:5432/${DB_NAME:-bizzcheck}}`.
> Fără `DATABASE_URL` în `.env` → exact valoarea de dinainte. Cu ea → aceea
> câștigă și devine **singura** credențială de DB din containerul backend
> (`DB_PASSWORD` nu mai e pasat backendului deloc, deci `docker inspect backend`
> nu mai arată parola superuserului).
>
> Două verificări automate țin bugul închis:
> `scripts/validate-deploy-config.py` (static, fără Docker — interpolează
> valoarea reală din compose în ambele scenarii și cade dacă `.env` nu mai
> ajunge la backend) și `scripts/check-db-role.sh` (pe containerul viu, rulat și
> din `deploy.sh` după fiecare deploy).

## Drepturile minime de care are nevoie aplicația

Nu poate fi un rol „doar SELECT/INSERT/UPDATE/DELETE”. `migrate()`
(`database/db.py`) rulează **la fiecare boot** și emite DDL:

| Ce face `migrate()` | Dreptul necesar |
| --- | --- |
| `CREATE TABLE IF NOT EXISTS` (16 tabele) | `CREATE` pe schema `public` |
| `ALTER TABLE ... ADD COLUMN IF NOT EXISTS` | proprietate asupra tabelei |
| `ALTER TABLE ... ALTER COLUMN ... TYPE/SET DEFAULT/DROP NOT NULL` | proprietate asupra tabelei |
| `ALTER TABLE ... RENAME COLUMN` (`migrate_ro_to_uk`, `migrate_ru_to_en`) | proprietate asupra tabelei |
| `CREATE INDEX IF NOT EXISTS` (inclusiv parțiale/unice) | proprietate asupra tabelei |
| `UPDATE tests/submissions/...` (backfill-urile din migrare) | `UPDATE` pe tabele |
| `SELECT ... FROM information_schema.columns` | `USAGE` pe `information_schema` **+ un drept pe tabela interogată** |
| `SELECT pg_advisory_xact_lock(1)` | niciun drept special |
| CRUD-ul normal al aplicației | `SELECT, INSERT, UPDATE, DELETE` pe tabele + `USAGE, SELECT` pe secvențe (coloane `SERIAL`) |

Un rol mai strâns de atât **blochează pornirea containerului** — de asta scriptul
face rolul *proprietar al schemei* `public` în loc să înceapă o listă fină de
GRANT-uri.

Atenție la rândul cu `information_schema`: view-ul `information_schema.columns`
arată **doar** coloanele tabelelor pe care utilizatorul curent are vreun drept.
Un rol fără acces vede zero rânduri, iar `migrate_ro_to_uk` / `migrate_ru_to_en`
sar redenumirea **în tăcere** — după care aplicația cere `name_uk` de la o tabelă
care are încă `name_ro`. Ăsta e al doilea motiv (după DDL) pentru care
transferul de proprietate din script nu e opțional.

### Ce NU poate rolul

- `SUPERUSER`, `CREATEDB`, `CREATEROLE`, `REPLICATION`, `BYPASSRLS`
- `COPY ... TO/FROM PROGRAM` și `COPY ... TO/FROM '<fișier>'` (cer superuser sau
  `pg_execute_server_program` / `pg_read_server_files`) — adică **nu mai poate
  executa comenzi pe gazda Postgres**, ceea ce era câștigul principal
- `CREATE EXTENSION`, `ALTER SYSTEM`, citirea fișierelor serverului
- `CREATE` pe *bază* (nu poate adăuga alte scheme lângă a lui)
- conectarea la altă bază din cluster (scriptul revocă și `CONNECT` de la
  `PUBLIC` pe bazele de întreținere `postgres` și `template1`, altfel afirmația
  asta ar fi falsă: `PUBLIC` are `CONNECT` implicit pe ele)

### Ce POATE, în continuare — să fim onești

Rolul e **proprietarul** tabelelor, iar un proprietar are automat toate
drepturile pe obiectele lui. Deci poate `TRUNCATE`, `DROP TABLE`, `ALTER`,
`REFERENCES` pe schema BizCheck. Cine pune mâna pe DSN **poate încă distruge sau
exfiltra datele BizCheck**. Ce nu mai poate e să iasă din baza asta: fără alte
baze, fără execuție de comenzi pe gazdă, fără roluri noi, fără extensii.
(Versiunea veche a acestui document și a scriptului susțineau că `TRUNCATE` și
`REFERENCES` sunt „închise explicit” — nu erau și nu pot fi, câtă vreme rolul e
proprietar. Backupul rămâne singura protecție împotriva ștergerii.)

## Scriptul

`webdev/backend/scripts/sql/create_app_role.sql` — idempotent, se poate rula de
câte ori vrei. Creează rolul `bizcheck_app`, îi dă schema `public` în
proprietate, transferă obiectele existente (create de `postgres`) și
re-afirmă restricțiile la fiecare rulare. Numele bazei îl ia din conexiune
(`current_database()`), deci merge și dacă ai schimbat `DB_NAME`.

`CONNECTION LIMIT` e **50**, nu 30 cum era înainte. Motivul: pool-ul e
dimensionat **per proces worker**, iar gunicorn rulează 4 (`--workers 4` în
`backend/Dockerfile`). Plafonul real e `4 × DB_POOL_MAX` (implicit 10, vezi
`database/db.py`) `= 40`, nu `DB_POOL_MAX`. Limita veche de 30 era **sub**
plafon: la primul vârf de trafic ai fi primit `too many connections for role
bizcheck_app`, adică schimbarea de rol s-ar fi manifestat ca o pană aleatorie de
producție. Dacă urci `DB_POOL_MAX`, urcă și limita rolului.
`scripts/check-db-role.sh` verifică relația asta pe clusterul viu.

## De ce NU e automatizat

Trei motive, toate cu risc de downtime dacă forțăm:

1. **Doar un superuser poate crea un rol.** Ca să fie automat, backendul ar
   trebui să se conecteze *tot ca superuser* ca să-și creeze rolul non-superuser
   — cercul se închide și superuserul rămâne în `.env`.
2. **`POSTGRES_USER` din compose nu poate fi schimbat pe un volum existent.**
   Variabila e folosită de imaginea `postgres` doar la `initdb`, adică pe un
   volum gol. Pe `pgdata` deja populat e ignorată. Schimbarea ei în compose ar
   da doar iluzia că s-a rezolvat ceva. **De aceea rolul aplicației se pune prin
   `DATABASE_URL`, nu prin `DB_USER`.**
3. **Transferul de proprietate nu e reversibil dintr-un `migrate()`.** Dacă
   `ALTER SCHEMA public OWNER` se execută la boot și eșuează pe jumătate,
   aplicația rămâne cu DDL blocat și containerul intră în crash-loop. E o
   operație de o singură dată, care vrea un om și un backup lângă ea.

## Pași manuali pe server

```bash
cd /opt/bizcheck/webdev            # sau unde e deployul

# 0. Backup. Nu sări peste el. (Rolul nou e proprietar → poate șterge tot.)
docker compose exec -T db pg_dump -U postgres bizzcheck | gzip > ~/bizzcheck-prerole.sql.gz

# 1. Generează o parolă și creează rolul.
#    tr -d '/+=' lasă doar caractere alfanumerice: fără `$` (Compose l-ar
#    interpreta ca variabilă și ar TRUNCHIA parola în tăcere) și fără `@ : /`
#    (ar rupe parsarea URL-ului). Nu înlocui generatorul cu altul „mai tare".
APP_PW=$(openssl rand -base64 32 | tr -d '/+=' | head -c 40)
docker compose exec -T db psql -v ON_ERROR_STOP=1 -U postgres -d bizzcheck \
    -v app_password="'$APP_PW'" < backend/scripts/sql/create_app_role.sql

# 2. Verifică ieșirea scriptului:
#    • rolsuper/rolcreatedb/rolcreaterole/rolreplication = f, rolconnlimit = 50
#    • a doua interogare („still_owned_by_postgres") = 0 rânduri
#    Dacă a doua întoarce ceva, NU continua: următorul migrate() ar muri cu
#    „must be owner of table ...".

# 3. Pune rolul în .env — DOAR pentru backend. NU atinge DB_USER/POSTGRES_USER,
#    care rămân `postgres` pentru serviciul `db` (vezi motivul 2 de mai sus).
echo "DATABASE_URL=postgresql://bizcheck_app:$APP_PW@db:5432/bizzcheck" >> .env
unset APP_PW

# 4. Repornește DOAR backendul și urmărește migrarea.
#    --force-recreate: schimbarea din .env schimbă configurația containerului,
#    deci compose l-ar recrea oricum; explicit e mai greu de ratat.
docker compose up -d --no-deps --force-recreate backend
docker compose logs -f backend       # migrate() trebuie să treacă fără erori de permisiune

# 5. Confirmă că schimbarea a AJUNS efectiv la backend (nu doar în .env).
./scripts/check-db-role.sh
#    Trebuie să scrie: „Rol non-superuser: bizcheck_app".
#    Dacă scrie „.env CERE rolul 'bizcheck_app', dar backendul rulează cu
#    'postgres'" → .env e ignorat; rulează ./scripts/validate-deploy-config.py.

# 6. Smoke test.
curl -fsS https://bizcheck.com.ua/api_crowe_bizcheck/health
```

### Ce NU se schimbă

- **Healthcheck-ul serviciului `db`** (`pg_isready -U ${DB_USER:-postgres}`)
  rămâne pe `postgres` și continuă să funcționeze. `pg_isready` nu se
  autentifică: serverul răspunde „accepting connections” înainte de verificarea
  parolei sau a existenței bazei. Nu-l muta pe `bizcheck_app`.
- **`deploy.sh` și `scripts/backup-db.sh`** citesc `DB_USER` din `.env` și rulează
  `pg_dump -U postgres` *în interiorul containerului `db`* (socket local). Nu au
  nevoie de rolul aplicației și nu trebuie modificate. Dumpul făcut ca superuser
  rămâne complet.
- **`DB_USER` / `DB_PASSWORD`** rămân ale serviciului `db`. Dacă pui
  `DB_USER=bizcheck_app` în `.env`, `initdb` îl ignoră (volum existent), iar
  DSN-ul implicit devine „bizcheck_app + parola superuserului” → backendul nu se
  mai conectează. `check-db-role.sh` avertizează dacă vede asta.

### Rollback

Șterge (sau comentează) linia `DATABASE_URL=...` din `.env` — o linie
`DATABASE_URL=` goală e tratată la fel ca „nesetat”, pentru că valoarea din
compose folosește `:-` — și:

```bash
docker compose up -d --no-deps --force-recreate backend
./scripts/check-db-role.sh          # trebuie să raporteze din nou `postgres`
```

Obiectele rămân în proprietatea lui `bizcheck_app`, dar `postgres` fiind
superuser poate oricum să le modifice — deci revenirea e instantanee și fără
pierdere de date. Rolul `bizcheck_app` poate fi lăsat pe loc; dacă vrei chiar
să-l ștergi, întâi mută proprietatea înapoi
(`REASSIGN OWNED BY bizcheck_app TO postgres;` apoi `DROP ROLE bizcheck_app;`).

### Rotația parolei

Rulează din nou scriptul cu alt `-v app_password=...` (face `ALTER ROLE`),
actualizează linia `DATABASE_URL` din `.env` (înlocuiește-o, nu adăuga a doua —
Compose ia ultima, dar două linii sunt o capcană), repornește backendul cu
`--force-recreate` și confirmă cu `./scripts/check-db-role.sh`.
