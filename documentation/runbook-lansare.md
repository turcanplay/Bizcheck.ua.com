# Runbook de lansare — bizcheck.ua.com

Documentul se urmează **de sus în jos**, o singură dată, la prima punere în producție.
Fiecare pas are o comandă concretă și o linie „**Verifici**" — nu treci mai departe până
nu trece verificarea.

Ce **nu** e aici (linkuri, nu copii):

| Subiect | Fișier |
|---|---|
| Topologia containerelor, fluxul unei cereri | [`architecture/01-system-architecture.md`](architecture/01-system-architecture.md) |
| Tabelul complet de variabile de mediu, Dockerfile-uri, scripturi | [`deployment.md`](deployment.md) |
| Cele 3 suprafețe Telegram, în detaliu | [`telegram/README.md`](telegram/README.md) |
| Depanare boți | [`telegram/07-depanare.md`](telegram/07-depanare.md) |
| Rolul Postgres ne-superuser (motivație + rollback) | [`../webdev/backend/DATABASE_ROLE.md`](../webdev/backend/DATABASE_ROLE.md) |
| SEO off-page, Search Console, GA4, Bing | [`../webdev/SEO_GUIDE.md`](../webdev/SEO_GUIDE.md) |
| Restanțe de securitate din auditul mar–apr 2026 | [`../webdev/SECURITY_AUDIT_REPORT.md`](../webdev/SECURITY_AUDIT_REPORT.md) |

Convenție: toate comenzile de deploy se dau din directorul **`webdev/`** al clonei de pe
server. `deploy.sh`, `scripts/backup-db.sh` și `scripts/export-spool.sh` se repoziționează
singure în `webdev/`, dar cron-ul și `docker compose` nu — de aceea `cd` e mereu explicit.

---

## 0. Rezumat: ordinea pașilor

1. [DNS + cerințe de server](#1-dns--cerințe-de-server)
2. [TLS pe proxy-ul din față](#2-tls-pe-proxy-ul-din-față)
3. [`.env`](#3-env)
4. [Primul deploy](#4-primul-deploy)
5. [Rolul Postgres ne-superuser](#5-rolul-postgres-ne-superuser-opțional-dar-recomandat) *(opțional)*
6. [Configurarea boților Telegram](#6-configurarea-boților-telegram)
7. [Conținut în panoul de admin](#7-conținut-în-panoul-de-admin)
8. [După lansare: cron, sitemap, Search Console](#8-după-lansare-cron-sitemap-search-console)
9. [Verificare finală](#9-verificare-finală)
10. [Capcane cunoscute](#10-capcane-cunoscute--citește-înainte-să-te-panichezi)

---

## 1. DNS + cerințe de server

### 1.1 Înregistrări DNS

Numele de gazdă pe care le folosește aplicația sunt fixate în cod, nu sunt configurabile:

| Nume | Unde apare | Obligatoriu |
|---|---|---|
| `bizcheck.ua.com` | `webdev/nginx.conf:20`, `nginx-proxy.conf.example:38,78`, `frontend/public/robots.txt` | **da** |
| `www.bizcheck.ua.com` | `webdev/nginx.conf:20,48` — redirect 301 spre non-www | **da** (altfel redirectul n-are ce rezolva) |

```
A     bizcheck.ua.com       → <IP_PUBLIC_SERVER>
A     www.bizcheck.ua.com   → <IP_PUBLIC_SERVER>
```

`<IP_PUBLIC_SERVER>` — **de confirmat**: IP-ul nu apare nicăieri în repo.

Dacă serverul are IPv6, adaugă și `AAAA` pentru ambele nume — proxy-ul din față ascultă deja
pe `[::]:80` și `[::]:443` (`nginx-proxy.conf.example:36–37,56–57,75–76`).

**Verifici:**
```bash
dig +short bizcheck.ua.com A
dig +short www.bizcheck.ua.com A
```
Ambele trebuie să întoarcă exact IP-ul serverului.

### 1.2 DNS pentru email (dacă vei porni livrarea pe email)

`.env.example:115–117` cere explicit ca `SMTP_USER` (adresa expeditor) să fie **pe același
domeniu cu site-ul**, ca SPF/DKIM/DMARC și domeniul din `Message-ID` să se alinieze. Fără
asta emailurile de raport ajung în spam.

Înregistrările SPF/DKIM/DMARC concrete depind de furnizorul cutiei poștale (Office 365 în
configurația implicită, `SMTP_HOST=smtp.office365.com`) — **de confirmat** cu administratorul
de tenant. În repo nu există valori.

> Livrarea pe email e **oprită implicit** în aplicație (vezi [pasul 7.4](#74-activează-sau-lasă-oprită-livrarea-pe-email)),
> deci poți lansa fără să ai DNS-ul de email gata.

### 1.3 Cerințe de server

| Cerință | De ce | Verificare |
|---|---|---|
| `docker` + pluginul `docker compose` | `deploy.sh:39–40` moare dacă lipsesc | `docker compose version` |
| `git`, clona repo-ului deja pe server | `deploy.sh:92–98` face `git pull --ff-only`, nu clonează | `git -C <repo> rev-parse --short HEAD` |
| `curl` | smoke-testul din `deploy.sh:210` | `curl --version` |
| nginx pe gazdă (sau un container de proxy) | termină TLS-ul; vezi pasul 2 | `nginx -v` |
| **≥ 5 GB liberi** pe partiția spool-ului, ideal mult mai mult | `deploy.sh:81–84` și `scripts/export-spool.sh:82–86` avertizează sub 5 GB | `df -h` |

**Despre spațiu — citește, e capcana cea mai scumpă.** Exportul de PDF-uri din panoul de
admin scrie pe disc, nu în RAM. Dimensiunile măsurate pe corpusul real (`.env.example:32–34`):

| Submisii exportate | Arhivă |
|---|---|
| 100 | 323 MB |
| 250 | 807 MB |
| 500 | ~1,6 GB |

Curățenia automată (`sweep()`) e **pur temporală** — șterge după expirarea TTL-urilor, nu
când discul se apropie de plin (`.env.example:44–48`). Deduplicarea e per `(kind, test_id)`,
deci N teste exportate în aceeași oră = N × 1,6 GB simultan pe disc. Regula de degetul mare
din `.env.example:51`: **ține liber cel puțin 3 × dimensiunea celui mai mare export.**

Dacă partiția cu Docker e mică, mută spoolul pe alt disc din `.env`
(`EXPORT_SPOOL_HOST_DIR=/mnt/data/bizcheck_exports`) — bind mountul din
`docker-compose.yml:108` e făcut special ca asta să nu ceară atingerea compose-ului.

---

## 2. TLS pe proxy-ul din față

TLS-ul **nu** se termină în containerul de frontend. `webdev/nginx.conf:10` nu are
`listen 443 ssl` deloc. În față stă un nginx separat, al cărui config e versionat ca
documentație în `webdev/nginx-proxy.conf.example`.

Containerul de frontend e legat pe `127.0.0.1:${FRONTEND_PORT:-5173}`
(`docker-compose.yml:133`) — **singura legătură pe gazdă din tot stack-ul**. Proxy-ul din
față îl ia de acolo (`nginx-proxy.conf.example:30`).

### 2.1 Instalează configul de proxy

```bash
cd <repo>/webdev
sudo cp nginx-proxy.conf.example /etc/nginx/sites-available/bizcheck.ua.com
sudo ln -s /etc/nginx/sites-available/bizcheck.ua.com /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

`nginx -t` va **eșua** acum, pentru că certificatele din blocurile `443` nu există încă.
Asta e normal — soluția e la 2.2. Dacă vrei să pornești curat: comentează temporar
blocurile `server { listen 443 ... }` (secțiunile 2 și 3 din fișier), lasă doar blocul
`:80`, apoi le decomentezi după ce ai certificatul.

### 2.2 Certificatul Let's Encrypt

Comanda e cea din antetul fișierului (`nginx-proxy.conf.example:15–16`):

```bash
sudo mkdir -p /var/www/certbot
sudo certbot certonly --webroot -w /var/www/certbot \
     -d bizcheck.ua.com -d www.bizcheck.ua.com
```

**De ce contează `/.well-known/`** — două locuri, două motive:

1. **În proxy-ul din față** (`nginx-proxy.conf.example:43–47`): blocul
   `location ^~ /.well-known/acme-challenge/` trebuie să stea **înaintea**
   `return 301 https://…`. Prefixul `^~` bate orice regex, deci challenge-ul HTTP-01 ajunge
   la fișierul de pe disc în loc să fie redirecționat. Fără el, `certbot` primește 301 și
   emiterea eșuează.
2. **În containerul din spate** (`webdev/nginx.conf:64–77`): mai jos în același fișier există
   `location ~ /\. { deny all; }` (`nginx.conf:191–193`), care ar da 403 pe orice cale ce
   începe cu punct. Blocul `^~ /.well-known/` de deasupra îl scoate din regulă. Fără el pică
   nu doar ACME, ci și `security.txt`, verificările de proprietate Google/Meta și
   `apple-app-site-association`. **Nu modifica regexul `~ /\.`** — excepțiile se adaugă ca
   blocuri `^~` deasupra lui.

După emitere, decomentează blocurile `443` și:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

**Verifici:**
```bash
curl -sI http://bizcheck.ua.com/ | head -1          # → 301
curl -sI https://bizcheck.ua.com/ | head -1          # → 200 (după pasul 4)
curl -sI https://www.bizcheck.ua.com/ | grep -i location   # → https://bizcheck.ua.com/
echo | openssl s_client -connect bizcheck.ua.com:443 -servername bizcheck.ua.com 2>/dev/null \
  | openssl x509 -noout -dates
```

### 2.3 Reînnoirea automată

`certbot` instalat din pachet aduce propriul timer systemd. **Verifici:**
```bash
systemctl list-timers | grep -i certbot
sudo certbot renew --dry-run
```
Reînnoirea lovește `:80`, unde blocul `acme-challenge` rămâne permanent (nu-l șterge).

### 2.4 Dacă adaugi Cloudflare sau alt proxy în față

**Nu o face fără să reconfigurezi ambele niveluri.** Backendul citește exact un hop
(`ProxyFix(x_for=1)`), iar `X-Forwarded-For` e **suprascris**, nu adăugat, în ambele
nginx-uri (`nginx.conf:147`, `nginx-proxy.conf.example:119`) — exact ca să nu se poată
falsifica cheia de rate-limit. Un proxy în plus rupe presupunerea.

---

## 3. `.env`

```bash
cd <repo>/webdev
cp .env.example .env
chmod 600 .env
```

Un singur fișier alimentează toate serviciile (`.env.example:3`).

### 3.1 Generarea cheilor

Cele trei comenzi sunt cele documentate în repo:

```bash
# PII_ENCRYPTION_KEY — Fernet (.env.example:16)
python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# BOT_SHARED_SECRET (.env.example:102, telegram/05-env-si-deploy.md:37)
python -c "import secrets; print(secrets.token_urlsafe(32))"

# Parole / secrete JWT (aceeași formă ca în DATABASE_ROLE.md:79)
openssl rand -base64 32 | tr -d '/+=' | head -c 40; echo
```

Dacă pe gazdă nu e instalat `python3` cu pachetul `cryptography`, rulează primele două
într-un container efemer:

```bash
docker run --rm python:3.12-slim sh -c \
  "pip install -q cryptography && python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
docker run --rm python:3.12-slim python -c "import secrets; print(secrets.token_urlsafe(32))"
```

> `utils/crypto.py:30–42` acceptă și o frază oarecare drept `PII_ENCRYPTION_KEY` (derivă o
> cheie prin SHA-256), dar **folosește o cheie Fernet reală** — o cheie derivată nu e mai
> slabă doar dacă fraza are entropie mare, iar nimeni nu verifică asta.

### 3.2 Variabile OBLIGATORII — deployul se oprește fără ele

`deploy.sh` (secțiunea „Variabile OBLIGATORII") verifică lista de mai jos și **moare** dacă
lipsesc, dacă sunt goale sau dacă au încă un prefix de placeholder
(`CHANGE_THIS` / `change_me` / `YOUR_`).

Criteriul de intrare în listă e unul singur: **serviciul moare la boot fără ea** → container
în restart-loop → healthcheck-ul nu devine niciodată verde → `deploy.sh` face rollback la
timeout, fără cauză vizibilă. De aceea lista acoperă și boții, nu doar backendul.

| Variabilă | Sursa cerinței | Ce se întâmplă dacă lipsește |
|---|---|---|
| `DB_PASSWORD` | `docker-compose.yml` → `DATABASE_URL` | `deploy.sh` refuză să pornească |
| `JWT_SECRET` | `server.py` → `_required_env` | `deploy.sh` refuză; altfel backendul face `sys.exit(1)` la boot |
| `JWT_REFRESH_SECRET` | `server.py` → `_required_env` | `deploy.sh` refuză. **Aici era gaura:** compose are default `change_me_in_production`, deci backendul NU murea — pornea cu un secret de refresh public, ghicibil |
| `ADMIN_USERNAME` | `server.py`, cu `NODE_ENV=production` | `deploy.sh` refuză |
| `ADMIN_PASSWORD` | `server.py`, cu `NODE_ENV=production` | `deploy.sh` refuză |
| `PII_ENCRYPTION_KEY` | `server.py`, cu `NODE_ENV=production` | `deploy.sh` refuză |
| `TELEGRAM_BOT_TOKEN` | `tgbot/bot.py` → `raise RuntimeError` | `deploy.sh` refuză; altfel `tgbot` intră în restart-loop → **rollback la timeout** |
| `SALES_BOT_TOKEN` | `groupbot/bot.py` → `raise RuntimeError` | `deploy.sh` refuză; altfel `groupbot` intră în restart-loop → **rollback la timeout** |

> Lista din `deploy.sh` nu mai poate rămâne în urmă față de cod: la fiecare rulare scriptul
> **extrage** `_required_env` direct din `backend/server.py` și îl adaugă la listă. Dacă
> cineva introduce acolo o variabilă nouă și uită scriptul, deployul o verifică oricum și
> afișează: *„backend/server.py cere variabile care lipseau din REQUIRED_VARS: …"*.
>
> Aceeași consistență se poate verifica **înainte** de deploy, fără Docker:
> ```bash
> cd <repo>/webdev && python3 scripts/validate-deploy-config.py
> ```
> Scriptul compară `REQUIRED_VARS` cu `_required_env` din backend și cu tokenurile fără de
> care boții mor la pornire, validează `docker-compose.yml` și verifică lanțul de build-time
> al frontendului. Cod de ieșire 0 = totul e consistent.

### 3.3 Variabile cu PLACEHOLDER care TREBUIE schimbate

Astea vin din `.env.example` cu valori care nu funcționează în producție:

| Variabilă | Valoare livrată | Ce se întâmplă dacă o lași |
|---|---|---|
| `DB_PASSWORD` | `CHANGE_THIS_STRONG_DB_PASSWORD` | `deploy.sh` moare |
| `JWT_SECRET` | `CHANGE_THIS_STRONG_JWT_SECRET` | `deploy.sh` moare |
| `JWT_REFRESH_SECRET` | `CHANGE_THIS_STRONG_REFRESH_SECRET` | `deploy.sh` moare (**prinsă de la remedierea din iul. 2026**; înainte trecea) |
| `ADMIN_PASSWORD` | `CHANGE_THIS_STRONG_ADMIN_PASSWORD` | `deploy.sh` moare |
| `PII_ENCRYPTION_KEY` | `CHANGE_THIS_FERNET_KEY` | `deploy.sh` moare |
| `TELEGRAM_BOT_TOKEN` | `YOUR_BOT_TOKEN_FROM_BOTFATHER` | `deploy.sh` moare (prefixul `YOUR_` e tratat ca placeholder) |
| `TELEGRAM_BOT_USERNAME` | `YOUR_BOT_USERNAME` | deep-linkul `t.me/<username>?start=<token>` duce nicăieri; **doar** avertisment |
| `SALES_BOT_TOKEN` | `YOUR_GROUP_BOT_TOKEN_FROM_BOTFATHER` | `deploy.sh` moare; altfel `groupbot` intră în restart-loop |
| **`SMTP_USER`** | **`office@example.ua`** | adresă inventată → emailurile pleacă de la un domeniu inexistent |
| **`SMTP_REPLY_TO`** | **`office@example.ua`** | răspunsurile clienților se pierd; `deploy.sh:57–59` doar **avertizează**, nu oprește |
| `BOT_SHARED_SECRET` | **gol** | `/register`, feedbackul și `/excel`/`/client` dau **403** (fail-closed, intenționat) |
| `SMTP_PASSWORD` | gol | livrarea pe email e dezactivată silențios (fără crash) |

`SMTP_USER` / `SMTP_REPLY_TO` sunt marcate cu `TODO` chiar în sursă
(`.env.example:120–126`, `docker-compose.yml:50–54`): vechile adrese `@bizcheck.md` nu mai
sunt valabile pentru piața Ucraina. **Adresa reală UA — de confirmat.**

### 3.4 Variabile care trebuie doar confirmate (defaulturile sunt deja `.ua.com`)

Verifică, nu schimba fără motiv:

```
CORS_ORIGIN=https://bizcheck.ua.com
ALLOWED_HOSTS=bizcheck.ua.com,www.bizcheck.ua.com,backend,localhost,127.0.0.1
PUBLIC_BASE_URL=https://bizcheck.ua.com
ADMIN_PANEL_URL=https://bizcheck.ua.com/admin_bizcheck_md_crowe/
EMAIL_LOGO_URL=https://bizcheck.ua.com/logo_email.png
NODE_ENV=production
FRONTEND_PORT=5173
```

- `backend` **trebuie** să rămână în `ALLOWED_HOSTS` — e numele intern de serviciu pe care
  îl folosesc `tgbot`/`groupbot` (`.env.example:22–23`). Lista goală = verificarea de Host e
  dezactivată; `server.py:122–126` avertizează zgomotos în producție.
- `FRONTEND_PORT` trebuie să coincidă cu `upstream bizcheck_app` din configul de proxy
  (`nginx-proxy.conf.example:30` — `127.0.0.1:5173`). Dacă îl schimbi, schimbă-l în ambele
  locuri, altfel proxy-ul dă 502 (iar smoke-testul din `deploy.sh:69` merge, pentru că el
  citește `FRONTEND_PORT` din `.env`).
- `EMAIL_LOGO_URL` — fișierul există la `webdev/frontend/public/logo_email.png`, deci URL-ul
  e valid imediat ce site-ul e sus.

### 3.5 Variabile care se lasă GOALE intenționat

```
SALES_CHAT_ID=      # gol → /register din grup decide ținta
SALES_TOPIC_ID=     # gol → topic separat per test (altfel toate într-unul singur)
SITEMAP_BASE_URL=   # gol → https://bizcheck.ua.com; se setează doar pe staging
VITE_API_URL=       # gol → calea relativă /api_crowe_bizcheck prin același nginx
```

> `SITEMAP_API_URL` **nu** mai face parte din această categorie — vezi 3.5b.

`SALES_CHAT_ID` setat **bate** `/register` și nu poate fi suprascris din Telegram — e butonul
de urgență al operatorului, nu configurația normală (`.env.example:87–92`,
`telegram/03-bot-grup-register.md:79–86`).

### 3.5b Variabile de BUILD ale frontendului

Trei variabile nu sunt citite de niciun container la rulare, ci de `npm run build` **în
timpul construirii imaginii de frontend**. Lanțul lor e:

```
.env  →  docker-compose.yml (frontend.build.args)  →  ARG + ENV în Dockerfile.frontend  →  npm run build
```

Toate sunt opționale: dacă lipsesc, buildul reușește și doar loghează un avertisment.

| Variabilă | Valoarea de producție | Efectul dacă e goală |
|---|---|---|
| `SITEMAP_API_URL` | `https://bizcheck.ua.com/api_crowe_bizcheck` | `sitemap.xml` conține doar rutele statice, iar `/uk/test/<slug>` și `/uk/templates/<slug>` nu sunt pre-randate → crawlerele fără JS văd shellul generic |
| `SITEMAP_BASE_URL` | *(gol)* | se folosește domeniul canonic din `frontend/scripts/lib/routing.mjs` |
| `VITE_API_URL` | *(gol)* | SPA-ul cheamă `/api_crowe_bizcheck`, calea relativă servită de același nginx — corect în producție |

⚠ Două capcane la `SITEMAP_API_URL`:

1. **Trebuie să fie URL-ul PUBLIC.** Containerul de build nu e pe rețeaua compose:
   `http://backend:4001/...` nu se rezolvă, iar `http://127.0.0.1:5173/...` ar fi containerul
   de build însuși. Buildul are internet (rulează `npm ci`), deci URL-ul public funcționează.
2. **La primul deploy site-ul încă nu răspunde** pe acel URL. Fetchul dă timeout (8 s),
   buildul reușește, sitemapul iese fără rutele dinamice. E normal — se regenerează la pasul
   8.2, după ce ai introdus conținutul.

Fără slash final: scripturile cer `${SITEMAP_API_URL}/tests` și `/templates`.

### 3.6 Spool de export

```
EXPORT_SPOOL_HOST_DIR=./export_spool
```

⚠ Calea **trebuie** să înceapă cu `./`, `/` sau `~`. Un nume simplu (`export_spool`) e
interpretat de Docker ca volum numit nedeclarat și `docker compose up` cade cu
*„service 'backend' refers to undefined volume"* (`.env.example:37–39`).

TTL-urile (`EXPORT_JOB_READY_TTL` etc.) se lasă pe defaulturi — sunt comentate pe larg în
`.env.example:53–67`.

**Verifici `.env`-ul înainte de deploy:**
```bash
cd <repo>/webdev
# 1. Consistența configului (fără Docker, fără .env): REQUIRED_VARS vs. ce cer
#    efectiv backendul și boții la boot + lanțul de build-time al frontendului.
python3 scripts/validate-deploy-config.py      # → "OK  N verificări trecute", exit 0

# 2. Niciun placeholder rămas în variabilele obligatorii → trebuie să dea 0
grep -cE '^(DB_PASSWORD|JWT_SECRET|JWT_REFRESH_SECRET|ADMIN_USERNAME|ADMIN_PASSWORD|PII_ENCRYPTION_KEY|TELEGRAM_BOT_TOKEN|SALES_BOT_TOKEN)=(CHANGE_THIS|change_me|YOUR_)' .env

# 3. Niciuna dintre ele goală → trebuie să dea 8
grep -cE '^(DB_PASSWORD|JWT_SECRET|JWT_REFRESH_SECRET|ADMIN_USERNAME|ADMIN_PASSWORD|PII_ENCRYPTION_KEY|TELEGRAM_BOT_TOKEN|SALES_BOT_TOKEN)=.+' .env

grep -E '^(SMTP_USER|SMTP_REPLY_TO)=' .env     # → nu trebuie să conțină @example.
grep -E '^BOT_SHARED_SECRET=.+' .env           # → trebuie să întoarcă o linie
grep -E '^SITEMAP_API_URL=.+' .env             # → https://bizcheck.ua.com/api_crowe_bizcheck
```

Dacă `deploy.sh` moare aici, mesajul spune exact ce variabilă e de vină — nu mai există
cazul „deployul trece de verificări și abia apoi cade la healthcheck".

---

## 4. Primul deploy

```bash
cd <repo>/webdev
mkdir -p backups            # cron-ul de la pasul 8 scrie loguri aici
./deploy.sh
```

### Ce face `deploy.sh`, în ordine (`deploy.sh:6–14`)

| # | Etapă | Note pentru **primul** rulaj |
|---|---|---|
| 1 | verifică `docker`, `.env`, variabilele obligatorii (lista se completează singură din `backend/server.py`) | vezi 3.2 |
| — | creează spoolul cu `chmod 700` și avertizează sub 5 GB liberi (`:71–84`) | |
| 2 | `git pull --ff-only` (sări cu `SKIP_GIT_PULL=1`) | repo-ul trebuie deja clonat |
| 3 | backup DB comprimat + retenție 14 zile | **sărit** — „Serviciul 'db' nu rulează → sar peste backup (prim deploy?)" (`:122`) |
| 4 | taguiește imaginile curente ca `:previous` | **nimic de tagat** → vezi avertismentul de mai jos |
| 5 | `docker compose up -d --build backend frontend tgbot groupbot` | `db` pornește automat prin `depends_on`; `SITEMAP_API_URL` din `.env` ajunge la buildul SPA-ului prin `frontend.build.args` |
| 6 | așteaptă healthcheck-urile (max `HEALTH_TIMEOUT`, implicit 240s) | migrarea DB rulează aici |
| 7 | smoke-test pe `http://127.0.0.1:$FRONTEND_PORT` | `/api_crowe_bizcheck/health` → 200, `/` → 200, `/robots.txt` → 200 (doar warning) |
| 8 | rollback automat pe `:previous` dacă smoke-testul pică | **indisponibil la primul rulaj** |

### ⚠ La primul deploy NU există rollback automat

Pasul 4 nu găsește niciun container care rulează, deci nu poate tagua nimic. `deploy.sh:147`
scrie explicit *„Nicio imagine de salvat → rollback automat indisponibil"*, iar dacă
smoke-testul cade, funcția `rollback()` afișează *„Nu există imagini `:previous`.
Intervenție MANUALĂ necesară."* (`:153`) și iese cu 1.

Ce faci dacă pică primul deploy — **nu e o catastrofă**, baza e goală oricum:

```bash
docker compose logs --tail=200 backend
docker compose ps
# repari .env / configul, apoi:
./deploy.sh
```

De la **al doilea** deploy încolo plasa de siguranță e activă și se face și backup înainte
de build (`deploy.sh:102–123` — pipe-ul `pg_dump | gzip` moare intenționat dacă backupul iese
sub 1 KB).

### Ce se întâmplă la primul boot al backendului

`migrate()` din `backend/database/db.py:242` rulează la **fiecare** pornire. La primul boot:

- ia `pg_advisory_xact_lock(1)` (`db.py:257`), ca două replici pornite simultan să nu se
  calce;
- creează cele 14 tabele cu `CREATE TABLE IF NOT EXISTS`: `users`, `tests`, `blocks`,
  `questions`, `answers`, `results`, `submissions`, `templates`, `template_files`,
  `testimonials`, `faq_items`, `site_settings`, `tg_outreach`, `admin_revoked_tokens`,
  `admin_session_epoch`;
- **nu inserează niciun rând**. Baza pornește goală, intenționat (CLAUDE.md, „Don'ts").
  Conținutul se introduce din panoul de admin — pasul 7.

De aceea `healthcheck`-ul backendului are `start_period: 45s` (`docker-compose.yml:122`):
acoperă migrarea.

**Verifici:**
```bash
docker compose ps                       # toate: Up (healthy)
docker compose logs --tail=50 backend   # fără traceback, fără "FATAL:"
curl -fsS http://127.0.0.1:5173/api_crowe_bizcheck/health   # → {"status":"ok"}
curl -fsS https://bizcheck.ua.com/api_crowe_bizcheck/health
```

Health-ul face un `SELECT 1` real și întoarce 503 dacă Postgres nu răspunde
(`docker-compose.yml:112–115`) — deci un 200 confirmă și baza, nu doar Flask.

Test suplimentar, din container (9 verificări: health, listă teste, slug, submisie, cifrare PII):

```bash
docker compose exec backend python scripts/e2e_check.py
```

---

## 5. Rolul Postgres ne-superuser (opțional, dar recomandat)

**Se face DUPĂ primul deploy reușit, nu înainte.** Implicit backendul se conectează la
Postgres **ca superuser** (`DATABASE_URL` construit din `DB_USER`, implicit `postgres` —
`docker-compose.yml:28`).

**Nu se poate automatiza** — trei motive, detaliate în
[`../webdev/backend/DATABASE_ROLE.md`](../webdev/backend/DATABASE_ROLE.md):

1. doar un superuser poate crea un rol, deci automatizarea ar cere tot un superuser în `.env`;
2. `POSTGRES_USER` din compose e citit de imaginea `postgres` **doar la `initdb`**, adică pe
   un volum gol — pe `pgdata` deja populat e ignorată, iar schimbarea ar sparge și
   healthcheck-ul `pg_isready -U ...`;
3. transferul de proprietate eșuat la jumătate într-un `migrate()` de boot ar lăsa
   containerul în crash-loop.

Procedura manuală (`DATABASE_ROLE.md:70–97`), reprodusă aici ca să n-o cauți:

```bash
cd <repo>/webdev

# 0. Backup. Nu sări peste el.
docker compose exec -T db pg_dump -U postgres bizzcheck | gzip > ~/bizzcheck-prerole.sql.gz

# 1. Generează parola și creează rolul (scriptul e idempotent).
APP_PW=$(openssl rand -base64 32 | tr -d '/+=' | head -c 40)
docker compose exec -T db psql -v ON_ERROR_STOP=1 -U postgres -d bizzcheck \
    -v app_password="'$APP_PW'" < backend/scripts/sql/create_app_role.sql

# 2. Verifică: rolsuper / rolcreatedb / rolcreaterole / rolreplication = f
#    (scriptul le afișează singur la final).

# 3. Pune rolul în .env — DOAR pentru backend.
#    NU atinge DB_USER / POSTGRES_USER: rămân `postgres` pentru serviciul `db`.
echo "DATABASE_URL=postgresql://bizcheck_app:$APP_PW@db:5432/bizzcheck" >> .env
unset APP_PW

# 4. Repornește DOAR backendul și urmărește migrarea.
docker compose up -d --no-deps backend
docker compose logs -f backend      # migrate() trebuie să treacă fără erori de permisiune

# 5. Smoke test.
curl -fsS https://bizcheck.ua.com/api_crowe_bizcheck/health
```

**Rollback** (instantaneu, fără pierdere de date): scoate linia `DATABASE_URL=` din `.env` și
`docker compose up -d --no-deps backend`.

⚠ `CONNECTION LIMIT 30` din script trebuie să rămână peste `DB_POOL_MAX` (implicit 20,
`database/db.py:15`), altfel pool-ul rămâne fără conexiuni.

---

## 6. Configurarea boților Telegram

Sunt **trei** suprafețe Telegram, dar **două** tokenuri:

| Serviciu | Token | Rol |
|---|---|---|
| `tgbot` (container) | `TELEGRAM_BOT_TOKEN` | bot de client: `/start <token>`, `/help`, trimite PDF-ul |
| `groupbot` (container) | `SALES_BOT_TOKEN` | bot intern de grup: `/register`, `/unregister`, `/excel`, `/pdf`, `/client`, `/help` |
| `services/sales_notify.py` (backend) | `SALES_BOT_TOKEN` — **același** | doar *trimite* notificări de lead |

Partajarea tokenului e intenționată: backendul doar trimite, `groupbot` doar face polling →
fără conflict pe `getUpdates` (`telegram/05-env-si-deploy.md:19`).

### 6.1 REVOCĂ tokenul vechi — obligatoriu, înainte de lansare

Un token de bot Telegram viu a fost commis în repo — inițial în `tgbot/.env.example`, apoi
citat în clar în `SECURITY_AUDIT_REPORT.md` (finding **CRITICAL-1**,
`SECURITY_AUDIT_REPORT.md:47–56`). La HEAD ambele fișiere sunt curate (tokenul e mascat ca
`872461****:AAF***…`, bot id `8724617416`), dar valoarea completă **rămâne în istoricul git în
50 de commituri** — oricine clonează repo-ul o poate extrage cu `git log -p`. Auditul o
marchează `ACTION REQUIRED` și notează explicit că *„only revocation actually retires it"*.

Verifici că mai e acolo (fără să-l afișezi):
```bash
cd <repo>
for c in $(git rev-list --all); do git grep -qlE '[0-9]{8,10}:AA[A-Za-z0-9_-]{30,}' $c -- 2>/dev/null && echo $c; done | wc -l
```

```
@BotFather → /mybots → <bot> → API Token → Revoke current token
```

Pune tokenul nou în `.env` și **nu-l scrie în niciun fișier versionat**
(`telegram/05-env-si-deploy.md:13`).

> Curățarea propriu-zisă a istoricului (`git filter-repo` / BFG) e o operație distructivă
> care rescrie toate hash-urile și cere force-push + reclonare pe server — **de confirmat**
> dacă se face. Revocarea tokenului e obligatorie oricum și e suficientă ca să închizi riscul.

### 6.2 Creează / configurează boții în BotFather

1. Doi boți separați (`.env.example:83–86`): unul de client, unul de grup.
2. Pune tokenurile în `.env`: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` (fără `@`),
   `SALES_BOT_TOKEN`.
3. `TELEGRAM_BOT_USERNAME` e citit de **backend**, nu de `tgbot` — construiește deep-linkul
   `t.me/<username>?start=<token>` (`telegram/05-env-si-deploy.md:18`, `tgbot/bot.py:7`).

### 6.3 Grupul de vânzări + Topics

1. Creează un grup **privat**.
2. Activează **Topics** (grupul devine forum). Fără asta totul cade pe General.
3. Adaugă botul de grup ca **administrator** cu dreptul **„Manage Topics"** — altfel nu poate
   crea topicul per test (`telegram/05-env-si-deploy.md:48–50`).
4. Lasă `SALES_CHAT_ID=` și `SALES_TOPIC_ID=` **goale** în `.env`.

### 6.4 Cutover pe `X-Bot-Secret`

Toate endpointurile `/tg/exports/*`, `/tg/group/*` și `/tg/feedback/*` sunt gated **strict**
pe headerul `X-Bot-Secret`. Comportamentul e **fail-closed**: un `BOT_SHARED_SECRET` nesetat
**dezactivează** funcția (403), nu o deschide (CLAUDE.md; `telegram/03-bot-grup-register.md:56`).

Aceeași valoare trebuie să fie pe **trei** servicii: `backend`, `tgbot`, `groupbot`
(`docker-compose.yml:68,171,192`).

```bash
cd <repo>/webdev
# generează o dată, aceeași valoare pentru toate trei — e o singură variabilă în .env
python -c "import secrets; print(secrets.token_urlsafe(32))"
# → BOT_SHARED_SECRET=... în .env
docker compose up -d --build backend tgbot groupbot
```

**Simptomul lipsei secretului:** `/register` răspunde
`„BOT_SHARED_SECRET не налаштований"` (`telegram/05-env-si-deploy.md:59`), iar `/excel` și
`/client` par „stricate".

### 6.5 `/register`

Proprietarul grupului (nu un simplu admin — verificarea e `status == "creator"`,
`telegram/03-bot-grup-register.md:44–45`) dă în grup:

```
/register
```

Botul trimite `chat.id`, `chat.title` și cine a înregistrat la
`POST /api_crowe_bizcheck/tg/group/register`; ținta se salvează în `site_settings`
(cheile `sales_chat_id`, `sales_chat_title`, `sales_chat_registered_by`). Nicio migrare, niciun
tabel nou.

**Verifici:**
```bash
cd <repo>/webdev
./scripts/check-telegram.sh
```
Scriptul face `getMe` pe ambele tokenuri și — dacă `SALES_CHAT_ID` e setat — `getChat`.
Caută `"is_forum":true` și `"type":"supergroup"` (`scripts/check-telegram.sh:24`).

Verificarea funcțională (după ce ai conținut, pasul 7): completează un test pe site →
notificarea trebuie să apară într-un **topic nou**, denumit după test; al doilea test
completat intră în **același** topic (`telegram/05-env-si-deploy.md:55–56`).

---

## 7. Conținut în panoul de admin

**Baza pornește goală.** `migrate()` creează doar tabele; nu există niciun script de seed
(`documentation/deployment.md:92`). Fără conținut, site-ul se ridică și e navigabil, dar
fiecare secțiune arată o stare goală și **niciun test nu poate fi început**.

Panoul: `https://bizcheck.ua.com/admin_bizcheck_md_crowe/`

### 7.1 Login

Nu există „primul utilizator" de creat. Autentificarea de admin compară direct cu
`ADMIN_USERNAME` / `ADMIN_PASSWORD` din mediu (`services/auth_service.py:176–202`) —
**fără nicio interogare în baza de date**. Tabelul `users` e un sistem de auth separat, azi
neutilizat de SPA; poate rămâne gol permanent.

### 7.2 Lanțul minim ca UN test să fie jucabil

**test → ≥1 bloc → ≥1 întrebare → ≥2 răspunsuri.** Atât.

| Nivel | Unde | Câmpuri obligatorii |
|---|---|---|
| **Test** | 🧪 Тести → „+ Додати тест" | `name_uk` (UI-ul îl cere); `slug` se derivă automat din nume dacă îl lași gol, dar trebuie **unic**; `is_active` = Активний; `report_type` (implicit `bizcheck`); `scoring_zones` — implicit 80/70/65/0, validarea cere strict `safe > developing > warn >= risk` |
| **Bloc** | test → tab „Запитання та блоки" → „+ Додати блок" | cel puțin unul dintre `title_uk` / `title_en` |
| **Întrebare** | „+ Додати питання" | cel puțin unul dintre `text_uk` / `text_en`; `order_index` de forma `1`, `2` (nivel principal) sau `1.1` (sub-întrebare — **nu** contează la numărătoarea de întrebări jucabile) |
| **Răspunsuri** | în modalul întrebării | **minimum 2**; fiecare cu `text_uk` sau `text_en` și un `score` |

Nu trebuie create rânduri de raport: raportul se randează în client din răspunsuri +
`scoring_zones`. Tabelul `results` **nu** e „intervale de scor" — e un rest dintr-un flux
autentificat vechi; alimentează doar contoarele din Dashboard, iar zero rânduri acolo nu
strică nimic.

⚠ **`report_type` — capcană de conținut.** Pentru `bizcheck` și `gdpr`, paginile de detaliu
per bloc / per întrebare vin dintr-un fișier **hardcodat în frontend**
(`frontend/src/data/blockExplanations.ts`, respectiv `gdprExplanations.ts`), indexate după
poziția blocului (1…8) / numărul întrebării. Un test nou, cu altă structură de blocuri, va
randa **zero** pagini de detaliu, în tăcere. Pentru conținut complet nou folosește
`standard` sau `premium` — sunt integral bazate pe date.

### 7.3 Țintele butoanelor CTA

⚙️ „Налаштування сторінки" → patru selectoare, fiecare primind un **slug de test**:

| Cheie | Butonul |
|---|---|
| `cta_hero_test` | butonul mare din Hero |
| `cta_about_test` | secțiunea „Про платформу" |
| `cta_final_test` | CTA-ul final, înainte de footer |
| `cta_catalog_test` | butonul roșu din antetul catalogului |

Gol = butonul derulează la catalog (comportamentul vechi). Slugul trebuie să existe
(`Test.find_by_slug`) **și** testul să fie `is_active`, altfel butonul cade pe fallback.
Scrierea e all-or-nothing: un slug invalid → 400 și nu se salvează nimic
(`routes/site_settings.py:66–87`).

### 7.4 Activează (sau lasă oprită) livrarea pe email

Tot în „Налаштування сторінки": flagul `email_delivery_enabled`, stocat ca `"1"`/`"0"`.

**Implicit e OPRIT** — `_FLAG_DEFAULTS = {"email_delivery_enabled": "0"}`
(`routes/site_settings.py:32`), pentru că livrabilitatea/DNS-ul încă se configurează.
Cu flagul oprit, pe ecranul de livrare de după test cardul „email" apare dezactivat, cu
badge-ul **„Незабаром"**; Telegram rămâne complet funcțional.

Lasă-l OFF până ai SPF/DKIM/DMARC verificate (pasul 1.2) și un test de email reușit:

```bash
cd <repo>/webdev
docker compose exec backend python -m scripts.send_test_email --to tu@exemplu.com --lang uk
```

### 7.5 Opțional — doar ca să dispară stările goale

Nimic din lanțul testului nu depinde de ele; site-ul funcționează fără:

- **📄 Шаблони** — `title_uk` sau `title_en`; slug auto/unic; `price` obligatoriu doar dacă
  `is_paid`. Fișierele PDF se încarcă din pagina de detaliu a șablonului.
- **💬 Відгуки** — doar `name` e obligatoriu. Vizitatorii pot lăsa singuri recenzii, care
  apar imediat.
- **❓ FAQ** — `question_uk` sau `question_en`. Fără FAQ, schema JSON-LD de FAQ nu se emite.

Fără conținut, landingul arată: catalog gol („Нічого не знайдено за обраними фільтрами."),
recenzii goale („Поки що немає відгуків."), FAQ gol („Поки що немає запитань."), iar
`/uk/test/<slug>` fără întrebări afișează „Наразі запитання недоступні." și **refuză** să
pornească testul.

---

## 8. După lansare: cron, sitemap, Search Console

### 8.1 Cron

Ambele linii sunt cele documentate în antetul scripturilor. Înlocuiește `/home/USER/BIZZCHECK_BOT`
cu calea reală a clonei.

```bash
mkdir -p <repo>/webdev/backups     # necesar: redirectarea `>>` din cron NU creează directorul
crontab -e
```

```cron
# Backup DB zilnic la 03:15 (scripts/backup-db.sh:12)
15 3 * * * cd /home/USER/BIZZCHECK_BOT/webdev && ./scripts/backup-db.sh >> backups/backup.log 2>&1

# Santinelă zilnică pe spoolul de export, 04:30 (scripts/export-spool.sh:23)
30 4 * * * cd /home/USER/BIZZCHECK_BOT/webdev && ./scripts/export-spool.sh >> backups/export-spool.log 2>&1
```

Ce fac:

- **`backup-db.sh`** — `pg_dump --clean --if-exists | gzip -9`, scriere **atomică**
  (`.part` → redenumire abia după `gzip -t`), `chmod 600`, retenție implicită 14 zile
  (`BACKUP_RETENTION_DAYS`). Moare dacă dumpul iese sub 1 KB.
  ⚠ Fișierele conțin date de clienți: coloanele PII sunt cifrate Fernet, dar `tg_username`,
  `tg_chat_id`, sectorul și scorurile **nu** sunt (`backup-db.sh:22–24`).
- **`export-spool.sh`** — fără argumente e doar **raport** (joburi, ocupare, `df` pe partiție,
  top 10 joburi), nu șterge nimic. Avertizează sub 5 GB liberi. Curățenia manuală:
  `./scripts/export-spool.sh --purge` sau `--purge --older-than 6`.
  ⚠ `--purge` șterge și joburile **în curs** — adminul vede „export failed" și reapasă. Nu se
  pierd date: arhivele sunt derivate din `submissions.pdf_data`.

**Verifici a doua zi:**
```bash
tail -20 <repo>/webdev/backups/backup.log
ls -lh <repo>/webdev/backups/
```

**Restaurare** (`backup-db.sh:16–20`):
```bash
gunzip -c backups/bizcheck-YYYYmmdd-HHMMSS.sql.gz \
  | docker compose exec -T db psql -U postgres -d bizzcheck
```

### 8.2 Regenerează sitemap-ul DUPĂ ce ai introdus conținut

`sitemap.xml` se generează la **build-time** (`frontend/package.json` — `prebuild`), citind
testele și șabloanele din API-ul live. Rutele dinamice apar numai dacă `SITEMAP_API_URL` e
setată în momentul buildului (`scripts/generate-sitemap.mjs`, `lib/routing.mjs`).
Același lucru e valabil pentru pre-randarea HTML (`generate-static-html.mjs`), care
produce `<route>/index.html` cu `<title>`, `description`, `canonical` și `hreflang` pentru
crawlere.

Variabila ajunge acum în build prin `frontend.build.args` → `ARG`/`ENV` (vezi 3.5b), deci nu
mai e nimic de făcut manual — trebuie doar **reconstruit** frontendul după ce ai introdus
conținutul.

⚠ Un `./deploy.sh` obișnuit **nu ajunge** dacă s-a schimbat doar conținutul din admin:
fișierele din `frontend/` sunt identice, deci stratul `RUN npm run build` vine din cache și
sitemapul rămâne cel vechi. Forțează rebuildul:

```bash
cd <repo>/webdev
FRONTEND_NO_CACHE=1 ./deploy.sh
```

(`deploy.sh` rulează atunci `docker compose build --no-cache frontend` înainte de `up`.
Repetă comanda ori de câte ori activezi/dezactivezi un test sau un șablon.)

Dacă vrei doar să confirmi ce a citit generatorul, uită-te în logul buildului: absența
rutelor dinamice e anunțată explicit („*dynamic routes omitted*" / „*0 dynamic routes
returned by …*").

Verificarea, indiferent de metodă (`SEO_GUIDE.md:164–167`):
```bash
curl -s https://bizcheck.ua.com/robots.txt
curl -s https://bizcheck.ua.com/sitemap.xml | head -20
curl -s https://bizcheck.ua.com/ | grep -E '<title>|hreflang'
```
În `sitemap.xml` trebuie să apară un `<loc>` pentru fiecare `/uk/test/<slug>` și
`/en/test/<slug>` activ.

### 8.3 Google Search Console

Pașii complet (`SEO_GUIDE.md:43–57`):

1. <https://search.google.com/search-console>
2. „Add property" → **Domain property** → `bizcheck.ua.com`
3. Adaugă în DNS TXT-ul de verificare (`google-site-verification=…`). Propagare 5–30 min.
4. „Verify"
5. **Sitemaps** → adaugă `sitemap.xml` → devine `https://bizcheck.ua.com/sitemap.xml`
6. Verifică raportul **hreflang** că perechea `uk` ↔ `en` e reciprocă
7. Rezultatele în „Pages" / „Performance" apar în 24–72h

Nu există un Search Console separat „pentru google.com.ua" — semnalul geo vine din hreflang +
limba conținutului + backlinkuri locale.

Opțional, tot din `SEO_GUIDE.md`: GA4 (secțiunea 2 — necesită adăugarea
`https://www.googletagmanager.com` în CSP din `nginx.conf`, **nu** în Flask) și Bing Webmaster
Tools (secțiunea 3, import cu un click din GSC).

---

## 9. Verificare finală

### 9.1 Din terminal

```bash
cd <repo>/webdev
docker compose ps                       # 5 servicii, toate healthy
curl -sI https://bizcheck.ua.com/ | head -1                          # 200
curl -sI http://bizcheck.ua.com/ | head -1                           # 301
curl -sI https://www.bizcheck.ua.com/ | grep -i location             # → https://bizcheck.ua.com/
curl -fsS https://bizcheck.ua.com/api_crowe_bizcheck/health          # {"status":"ok"}
curl -sI https://bizcheck.ua.com/robots.txt | head -1                # 200
curl -sI https://bizcheck.ua.com/sitemap.xml | head -1               # 200

# Redirecturile 301 pentru rutele vechi (nginx.conf:87–101)
for p in /confidentialitate /termeni /test/x /sablon/x /plata/test/x; do
  printf '%-22s ' "$p"; curl -sI "https://bizcheck.ua.com$p" | awk '/^[Ll]ocation/{print $2}'
done
# așteptat: /uk/privacy, /uk/privacy, /uk/test/x, /uk/templates/x, /uk/checkout/test/x

# Headere de securitate
curl -sI https://bizcheck.ua.com/ | grep -iE 'strict-transport|content-security|x-content-type|referrer-policy'

# Backendul NU trebuie să fie accesibil direct
curl -s --max-time 5 http://<IP_PUBLIC_SERVER>:4001/api/health   # trebuie să eșueze
```

### 9.2 În browser

- [ ] `https://bizcheck.ua.com/` se încarcă, lacătul e verde, se redirectează la `/uk/`
- [ ] Comutatorul **UA / EN** schimbă limba și URL-ul (`/uk/…` ↔ `/en/…`)
- [ ] Catalogul afișează testul creat la pasul 7
- [ ] Butonul din Hero duce la testul setat ca `cta_hero_test` (pasul 7.3)
- [ ] Testul se poate parcurge de la cap la coadă și raportul se randează
- [ ] Pe ecranul de livrare: cardul **Telegram** e activ; cardul **email** e „Незабаром" dacă
      ai lăsat flagul OFF (pasul 7.4)
- [ ] `/uk/privacy` se deschide
- [ ] Bannerul de cookie apare și consimțământul se reține
- [ ] `https://bizcheck.ua.com/admin_bizcheck_md_crowe/` cere login și acceptă
      `ADMIN_USERNAME` / `ADMIN_PASSWORD`
- [ ] În DevTools → Application → Cookies: există `admin_session` (httpOnly) și `admin_csrf`;
      în `localStorage` **nu** există niciun token de sesiune
- [ ] Console fără erori de CSP

### 9.3 În Telegram

- [ ] Butonul „Telegram" din raport deschide `t.me/<TELEGRAM_BOT_USERNAME>?start=<token>`
- [ ] `/start` cu tokenul livrează PDF-ul
- [ ] `/help` la botul de client răspunde
- [ ] În grupul de vânzări apare notificarea „Lead nou", **într-un topic denumit după test**
- [ ] Al doilea test completat intră în **același** topic
- [ ] `/excel` în grup întoarce fișierul (dacă dă 403 → `BOT_SHARED_SECRET`, pasul 6.4)
- [ ] `/pdf` întoarce PDF-ul unei submisii, `/client` găsește clientul
- [ ] Un link de raport **expirat** produce alerta ⚠️ de eșec livrare în grup
      ([`telegram/04-alerta-esec-livrare.md`](telegram/04-alerta-esec-livrare.md))

### 9.4 Backup

- [ ] `./scripts/backup-db.sh` rulat manual o dată produce un `.sql.gz` > 1 KB în `backups/`
- [ ] Linia de cron există în `crontab -l`

---

## 10. Capcane cunoscute — citește înainte să te panichezi

### 10.1 `nginx.conf` și frontendul se deployează ÎMPREUNĂ

`Dockerfile.frontend` copiază `nginx.conf` **în imaginea de frontend**
(`COPY nginx.conf /etc/nginx/conf.d/default.conf`). Nu e bind mount. Deci:

- o modificare în `nginx.conf` ajunge pe server **numai** printr-un rebuild al serviciului
  `frontend`;
- redirecturile 301 din `nginx.conf:87–101` țintesc rutele localizate `/uk/*`, care există
  doar în build-ul nou al SPA-ului. Dacă deployezi doar `nginx.conf` (imposibil, dar dacă
  cineva „scurtează" rebuildul), redirecturile trimit spre rute inexistente.

`deploy.sh:24` rebuildează explicit **toate** cele patru servicii (`backend frontend tgbot
groupbot`) tocmai pentru că o versiune veche a scriptului rebuilda doar `backend groupbot`,
iar schimbările de frontend și nginx nu ajungeau niciodată pe server (`deploy.sh:16–19`).
**Nu scoate `frontend` din listă.**

### 10.2 `SITEMAP_API_URL` — REZOLVATĂ, dar cache-ul de build te poate păcăli

**Istoric (iul. 2026).** `generate-sitemap.mjs` și `generate-static-html.mjs` citesc
`process.env.SITEMAP_API_URL`, dar `Dockerfile.frontend` nu avea niciun `ARG`/`ENV` și
`frontend.build` din compose nu avea `args:` — deci valoarea din `.env` **nu avea cum** să
ajungă la `npm run build`. Orice `docker compose build frontend` producea un sitemap doar cu
rutele statice. Lanțul e acum complet (vezi 3.5b): `.env` → `build.args` → `ARG` + `ENV` →
`npm run build`. Odată cu el au fost cablate și `SITEMAP_BASE_URL` și `VITE_API_URL`, care
sufereau de exact aceeași problemă.

Ce **rămâne** de știut:

- **Cache-ul de build.** Sitemapul depinde de conținutul din DB, nu de fișierele sursă. Dacă
  activezi un test nou și rulezi `./deploy.sh`, Docker refolosește stratul `RUN npm run build`
  și sitemapul rămâne vechi. Soluția e la 8.2: `FRONTEND_NO_CACHE=1 ./deploy.sh`.
- **URL public, obligatoriu.** Containerul de build nu e pe rețeaua compose. `backend:4001`
  și `127.0.0.1:5173` nu funcționează de acolo — vezi capcana 1 din 3.5b.
- **Primul deploy iese oricum incomplet**, pentru că site-ul încă nu răspunde. Nu e o eroare;
  se repară la 8.2.
- **Eșecul e mereu tăcut.** `fetchDynamicBasePaths` prinde orice excepție și întoarce `[]`, ca
  un build offline să producă totuși un sitemap valid. Singurul semn e avertismentul din logul
  buildului — dacă sitemapul pare scurt, citește-l acolo, nu ghici.

Consistența lanțului se verifică fără Docker:

```bash
cd <repo>/webdev && python3 scripts/validate-deploy-config.py
```

### 10.3 Fără `BOT_SHARED_SECRET` funcțiile de bot par „stricate", nu deschise

Fail-closed intenționat: 403 pe `/tg/exports/*`, `/tg/group/*`, `/tg/feedback/*`. `/register`
răspunde `„BOT_SHARED_SECRET не налаштований"`. **Nu „relaxa pentru dev".**

### 10.4 `SALES_CHAT_ID` setat anulează `/register`

Envul bate Telegramul, mereu (`sales_notify._sales_chat_id`). E butonul de urgență pentru un
`/register` greșit sau ostil. Ca `/register` să conteze, lasă variabila **goală**.

### 10.5 Rolul Postgres cere pași manuali

Vezi pasul 5. Nu încerca să-l muți în `migrate()` — motivele sunt în `DATABASE_ROLE.md:53–68`.
`POSTGRES_USER` din compose e ignorat pe un volum `pgdata` deja populat.

### 10.6 Tokenul Telegram din istoricul git

Vezi pasul 6.1. Revocarea e obligatorie înainte de lansare.

### 10.7 Rollback manual, dacă apare o problemă mai târziu

`deploy.sh:243–250` afișează comenzile la finalul fiecărui deploy reușit. Forma generală
(numele imaginilor se văd cu `docker compose images`; prefixul e numele directorului de
proiect):

```bash
cd <repo>/webdev
docker compose images
docker tag <imagine>:previous <imagine>:latest        # pentru fiecare serviciu
docker compose up -d --no-build backend frontend tgbot groupbot
docker compose logs --tail=100
```

Restaurarea bazei se face din backupul pre-deploy afișat de script
(`backups/predeploy-<db>-<stamp>.sql.gz`), cu comanda de la 8.1.

### 10.8 Nu porni `docker compose up` pe stația locală după modificări

Regula proiectului (CLAUDE.md, „Don'ts"): se deployează pe server și se testează acolo.
Și: nu adăuga `ports:` la `backend` sau `db` în niciun compose, și ține `frontend` legat pe
`127.0.0.1`.
