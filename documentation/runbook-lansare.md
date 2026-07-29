# Runbook de lansare — bizcheck.ua.com

Documentul se urmează **de sus în jos**, o singură dată, la prima punere în producție,
pe un server **gol**. Fiecare pas are o comandă concretă și o linie „**Verifici**" — nu
treci mai departe până nu trece verificarea.

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

**Convenții**

- Toate comenzile de deploy se dau din directorul **`webdev/`** al clonei de pe server.
  `deploy.sh`, `scripts/backup-db.sh`, `scripts/export-spool.sh` și `scripts/site-mask.sh`
  se repoziționează singure în `webdev/`, dar `cron` și `docker compose` nu — de aceea
  `cd` e mereu explicit.
- În exemple clona e la `~/BIZZCHECK_BOT` (calea folosită și în exemplele de crontab din
  antetele scripturilor). Notat `<repo>` acolo unde poate fi orice cale.
- Referințele la cod sunt **fără numere de linie**, intenționat: se învechesc la fiecare
  commit. Se referă la fișier + blocul numit (ex. „blocul `location /` din `nginx.conf`").
- Ce nu am putut confirma în cod e marcat explicit **de confirmat**.

---

## 0. Rezumat: ordinea pașilor

1. [Pregătirea serverului + DNS](#1-pregătirea-serverului--dns) — pachete, firewall, clona repo-ului, înregistrări DNS
2. [TLS pe proxy-ul din față](#2-tls-pe-proxy-ul-din-față)
   — inclusiv [2.5 masca de pre-lansare](#25-masca-de-pre-lansare--referință): ce e, ce lasă
   deschis, ce se rupe cât e activă *(referință; se pornește la 3.7)*
3. [`.env`](#3-env) — inclusiv [3.7 pornirea măștii](#37-pornește-masca-de-pre-lansare--înainte-de-primul-deploy), **înainte** de primul deploy
4. [Primul deploy](#4-primul-deploy)
5. [Rolul Postgres ne-superuser](#5-rolul-postgres-ne-superuser-opțional-dar-recomandat) *(opțional)*
6. [Configurarea boților Telegram](#6-configurarea-boților-telegram)
7. [Conținut în panoul de admin](#7-conținut-în-panoul-de-admin)
8. [Lansarea și după lansare](#8-lansarea-și-după-lansare-mască-cron-sitemap-search-console) — [oprirea măștii](#80-lansarea--oprește-masca-fă-asta-prima), cron, sitemap, Search Console
9. [Verificare finală](#9-verificare-finală)
10. [Capcane cunoscute](#10-capcane-cunoscute--citește-înainte-să-te-panichezi)

> **Ordinea măștii de pre-lansare, pe scurt.** Site-ul nu trebuie să fie public nici o
> secundă înainte să aibă conținut. De aceea masca se **scrie pe disc la 3.7** (înainte de
> primul deploy, ca primul container pornit să fie deja închis), se **verifică pe HTTP la
> 4.4** (abia atunci există un container care să răspundă) și se **scoate la 8.0**, la
> lansare. §2.5 e doar partea de explicații.

---

## 1. Pregătirea serverului + DNS

Presupune un server proaspăt, Debian 12 / Ubuntu 22.04+, cu acces `sudo`. Pe alt sistem,
echivalentele sunt evidente, dar comenzile de mai jos nu se aplică literal.

### 1.1 Pachete

`deploy.sh` moare pe loc dacă lipsesc `docker` sau pluginul `docker compose`. Restul
uneltelor sunt cerute de scripturi (`curl`, `git`, `openssl`) sau de pasul TLS (`nginx`,
`certbot`).

```bash
sudo apt update
sudo apt install -y ca-certificates curl git nginx certbot openssl gzip

# Docker Engine + pluginul `docker compose` (scriptul oficial Docker).
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker "$USER"      # apoi DECONECTEAZĂ-TE și reintră, ca grupul să conteze
```

**Verifici** (toate trebuie să răspundă, iar `docker` fără `sudo`):
```bash
docker --version
docker compose version          # pluginul, nu `docker-compose` v1
nginx -v
certbot --version
git --version
curl --version | head -1
openssl version
```

Dacă `docker compose version` dă „is not a docker command", ai `docker-compose` v1, care
**nu** e acceptat — `deploy.sh` iese cu *„plugin-ul 'docker compose' lipsește"*.

### 1.2 Firewall

Din tot stack-ul, singurul lucru care trebuie să fie accesibil din exterior sunt porturile
`80` și `443` ale nginx-ului de pe gazdă. Confirmat în cod:

- `backend` are doar `expose: 4001` în `docker-compose.yml` (nu `ports:`) → nu e publicat pe gazdă;
- `db` nu are nici `expose`, nici `ports`;
- `frontend` e publicat pe `127.0.0.1:${FRONTEND_PORT:-5173}` — **loopback**, nu `0.0.0.0`.

```bash
sudo ufw allow OpenSSH
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp
sudo ufw --force enable
sudo ufw status verbose
```

⚠ **Nu** deschide `4001` (backend), `5432` (Postgres) sau `5173` (frontend). Dacă vreunul e
accesibil din afară, ceva a fost modificat greșit în compose — vezi §10.8.

**Verifici** (de pe altă mașină):
```bash
nc -vz bizcheck.ua.com 443     # deschis
nc -vz bizcheck.ua.com 4001    # trebuie să dea „refused"/timeout
nc -vz bizcheck.ua.com 5432    # trebuie să dea „refused"/timeout
nc -vz bizcheck.ua.com 5173    # trebuie să dea „refused"/timeout
```

### 1.3 Clona repo-ului

`deploy.sh` face `git pull --ff-only`, **nu clonează** — clona trebuie să existe înainte.

```bash
cd ~
git clone https://github.com/turcanplay/Bizcheck.ua.com.git BIZZCHECK_BOT
cd ~/BIZZCHECK_BOT/webdev
```

Dacă repo-ul e privat, configurează întâi accesul (cheie SSH pe server + URL `git@github…`,
sau un token). `git pull --ff-only` din `deploy.sh` trebuie să meargă **neinteractiv**,
altfel deployul se blochează la cerere de parolă.

**Verifici:**
```bash
git -C ~/BIZZCHECK_BOT rev-parse --short HEAD
ls ~/BIZZCHECK_BOT/webdev/deploy.sh          # trebuie să existe și să fie executabil
```

### 1.4 Înregistrări DNS

Numele de gazdă pe care le folosește aplicația sunt fixate în cod, nu sunt configurabile
din `.env`:

| Nume | Unde apare | Obligatoriu |
|---|---|---|
| `bizcheck.ua.com` | `server_name` în `webdev/nginx.conf` și în `nginx-proxy.conf.example`, `frontend/public/robots.txt` | **da** |
| `www.bizcheck.ua.com` | `server_name` în ambele fișiere — redirect 301 spre non-www | **da** (altfel redirectul n-are ce rezolva) |

```
A     bizcheck.ua.com       → <IP_PUBLIC_SERVER>
A     www.bizcheck.ua.com   → <IP_PUBLIC_SERVER>
```

`<IP_PUBLIC_SERVER>` — **de confirmat**: IP-ul nu apare nicăieri în repo.

Dacă serverul are IPv6, adaugă și `AAAA` pentru ambele nume — proxy-ul din față ascultă
deja pe `[::]:80` și `[::]:443` (`nginx-proxy.conf.example`).

**Verifici:**
```bash
dig +short bizcheck.ua.com A
dig +short www.bizcheck.ua.com A
```
Ambele trebuie să întoarcă exact IP-ul serverului. Propagarea poate dura; nu trece la §2
înainte, altfel `certbot` eșuează.

### 1.5 DNS pentru email (dacă vei porni livrarea pe email)

`.env.example` cere explicit ca `SMTP_USER` (adresa expeditor) să fie **pe același domeniu
cu site-ul**, ca SPF/DKIM/DMARC și domeniul din `Message-ID` să se alinieze. Fără asta
emailurile de raport ajung în spam.

Înregistrările SPF/DKIM/DMARC concrete depind de furnizorul cutiei poștale (Office 365 în
configurația implicită, `SMTP_HOST=smtp.office365.com`) — **de confirmat** cu
administratorul de tenant. În repo nu există valori.

> Livrarea pe email e **oprită implicit** în aplicație (vezi
> [pasul 7.4](#74-activează-sau-lasă-oprită-livrarea-pe-email)), deci poți lansa fără să ai
> DNS-ul de email gata.

### 1.6 Spațiu pe disc — citește, e capcana cea mai scumpă

Exportul de PDF-uri din panoul de admin scrie pe disc, nu în RAM. Dimensiunile măsurate pe
corpusul real (documentate în `.env.example`):

| Submisii exportate | Arhivă |
|---|---|
| 100 | 323 MB |
| 250 | 807 MB |
| 500 | ~1,6 GB |

Curățenia automată (`sweep()`) e **pur temporală** — șterge după expirarea TTL-urilor, nu
când discul se apropie de plin. Deduplicarea e per `(kind, test_id)`, deci N teste
exportate în aceeași oră = N × 1,6 GB simultan pe disc. Regula de degetul mare din
`.env.example`: **ține liber cel puțin 3 × dimensiunea celui mai mare export.**

Atât `deploy.sh` cât și `scripts/export-spool.sh` avertizează sub **5 GB** liberi pe
partiția spool-ului (avertisment, nu oprire).

```bash
df -h /
```

Dacă partiția cu Docker e mică, mută spoolul pe alt disc din `.env`
(`EXPORT_SPOOL_HOST_DIR=/mnt/data/bizcheck_exports`) — bind mountul din `docker-compose.yml`
e făcut special ca asta să nu ceară atingerea compose-ului.

### 1.7 Unelte de validare (pe stația de lucru sau pe server)

Cele două scripturi de validare rulează **fără Docker** și **fără `.env`**, dar au fiecare
câte o dependență Python care **nu** e instalată implicit:

| Script | Dependență | Ce iese fără ea |
|---|---|---|
| `scripts/validate-deploy-config.py` | **PyYAML** | `FAIL: PyYAML nu e instalat.  pip install pyyaml`, exit 1 |
| `scripts/validate-nginx.py` | **crossplane** | `FAIL: crossplane nu e instalat.  pip3 install crossplane`, exit 2 |

```bash
python3 -m venv ~/.venvs/bizcheck-tools
~/.venvs/bizcheck-tools/bin/pip install crossplane pyyaml
```

(Pe Debian 12+ / Ubuntu 24.04 un `pip3 install` direct în sistem e blocat de PEP 668 —
de aceea venvul de mai sus. Alternativa: `pip3 install --user --break-system-packages …`.)

**Verifici:**
```bash
cd <repo>/webdev
~/.venvs/bizcheck-tools/bin/python scripts/validate-deploy-config.py   # → "OK  N verificări trecute"
~/.venvs/bizcheck-tools/bin/python scripts/validate-nginx.py           # → "OK  N verificări trecute (ambele stări ale măștii)"
```

Ambele trebuie să iasă cu cod 0. Le poți rula oricând, inclusiv înainte de a avea `.env`.

---

## 2. TLS pe proxy-ul din față

TLS-ul **nu** se termină în containerul de frontend: `webdev/nginx.conf` nu are `listen 443
ssl` deloc. În față stă un nginx separat, pe gazdă, al cărui config e versionat ca
documentație în `webdev/nginx-proxy.conf.example`.

Containerul de frontend e legat pe `127.0.0.1:${FRONTEND_PORT:-5173}` — **singura legătură
pe gazdă din tot stack-ul**. Proxy-ul din față îl ia de acolo (`upstream bizcheck_app` din
`nginx-proxy.conf.example`).

### 2.1 Instalează configul de proxy

Fișierul livrat conține trei blocuri `server`: `:80` (ACME + redirect), `:443` pentru
`www` (redirect spre non-www) și `:443` pentru domeniul canonic. Ultimele două referă
certificate care **încă nu există**, deci `nginx -t` ar eșua. Se pornește doar cu `:80`:

```bash
cd <repo>/webdev
sudo cp nginx-proxy.conf.example /etc/nginx/sites-available/bizcheck.ua.com
sudo ln -s /etc/nginx/sites-available/bizcheck.ua.com /etc/nginx/sites-enabled/

# Comentează TEMPORAR cele două blocuri `server { listen 443 ssl; … }`
# (secțiunile 2 și 3 din fișier). Lasă intact blocul `:80`.
sudo nano /etc/nginx/sites-available/bizcheck.ua.com

# OBLIGATORIU după comentare — fără reload, nginx rulează încă vechiul config
# și certbot nu are cum să servească challenge-ul din /var/www/certbot.
sudo nginx -t && sudo systemctl reload nginx
```

**Verifici** (înainte de asta, `nginx -t` trebuie să treacă — dacă nu, n-ai comentat tot):
```bash
sudo nginx -t                                        # „syntax is ok" + „test is successful"
sudo mkdir -p /var/www/certbot
echo probe | sudo tee /var/www/certbot/.well-known/acme-challenge/probe >/dev/null 2>&1 || \
  { sudo mkdir -p /var/www/certbot/.well-known/acme-challenge && \
    echo probe | sudo tee /var/www/certbot/.well-known/acme-challenge/probe >/dev/null; }
curl -s http://bizcheck.ua.com/.well-known/acme-challenge/probe        # → „probe"
sudo rm -f /var/www/certbot/.well-known/acme-challenge/probe
```

Dacă în loc de `probe` primești un `301`, blocul `location ^~ /.well-known/acme-challenge/`
nu e **înaintea** lui `return 301 https://…` în blocul `:80` — repară asta acum, altfel
`certbot` va eșua la 2.2.

### 2.2 Certificatul Let's Encrypt

Comanda e cea din antetul fișierului `nginx-proxy.conf.example`:

```bash
sudo mkdir -p /var/www/certbot
sudo certbot certonly --webroot -w /var/www/certbot \
     -d bizcheck.ua.com -d www.bizcheck.ua.com
```

**De ce contează `/.well-known/`** — două locuri, două motive:

1. **În proxy-ul din față**: blocul `location ^~ /.well-known/acme-challenge/` trebuie să
   stea **înaintea** `return 301 https://…`. Prefixul `^~` bate orice regex, deci
   challenge-ul HTTP-01 ajunge la fișierul de pe disc în loc să fie redirecționat. Fără
   el, `certbot` primește 301 și emiterea eșuează.
2. **În containerul din spate** (`nginx.conf`): mai jos în același fișier există
   `location ~ /\. { deny all; }`, care ar da 403 pe orice cale ce începe cu punct. Blocul
   `^~ /.well-known/` de deasupra îl scoate din regulă. Fără el pică nu doar ACME, ci și
   `security.txt`, verificările de proprietate Google/Meta și `apple-app-site-association`.
   **Nu modifica regexul `~ /\.`** — excepțiile se adaugă ca blocuri `^~` deasupra lui.

După emitere, **decomentează** cele două blocuri `443` și abia apoi:

```bash
sudo nano /etc/nginx/sites-available/bizcheck.ua.com   # scoate comentariile
sudo nginx -t && sudo systemctl reload nginx
```

**Verifici:**
```bash
curl -sI http://bizcheck.ua.com/ | head -1          # → 301
curl -sI https://www.bizcheck.ua.com/ | grep -i location   # → https://bizcheck.ua.com/
echo | openssl s_client -connect bizcheck.ua.com:443 -servername bizcheck.ua.com 2>/dev/null \
  | openssl x509 -noout -dates -subject
curl -sI https://bizcheck.ua.com/ | head -1         # → 502 (vezi mai jos)
```

⚠ **Un `502 Bad Gateway` aici e rezultatul CORECT.** TLS-ul funcționează (n-ai primit
eroare de certificat), dar `upstream bizcheck_app` (`127.0.0.1:5173`) încă nu are ce să
proxyeze — containerul de frontend nu există până la §4. Primul cod HTTP „real" pe `/`
apare abia după primul deploy: **401** dacă masca de pre-lansare e pornită (cazul normal,
§3.7), **200** dacă nu.

### 2.3 Reînnoirea automată

`certbot` instalat din pachet aduce propriul timer systemd.

**Verifici:**
```bash
systemctl list-timers | grep -i certbot
sudo certbot renew --dry-run
```
Reînnoirea lovește `:80`, unde blocul `acme-challenge` rămâne permanent (nu-l șterge).

### 2.4 Dacă adaugi Cloudflare sau alt proxy în față

**Nu o face fără să reconfigurezi ambele niveluri.** Backendul citește exact un hop
(`ProxyFix(x_for=1)`), iar `X-Forwarded-For` e **suprascris** cu `$remote_addr`, nu adăugat,
în ambele nginx-uri — exact ca să nu se poată falsifica cheia de rate-limit. Un proxy în
plus rupe presupunerea.

### 2.5 Masca de pre-lansare — referință

> **Aceasta e secțiunea de explicații.** Pașii de executat sunt:
> pornirea la [3.7](#37-pornește-masca-de-pre-lansare--înainte-de-primul-deploy),
> verificarea pe HTTP la [4.4](#44-verificări-după-primul-deploy),
> oprirea la lansare la [8.0](#80-lansarea--oprește-masca-fă-asta-prima).

Cât timp introduci conținut în panoul de admin, site-ul **nu trebuie** să fie nici
vizitabil, nici indexabil. Masca se aplică în **nginx**, nu în SPA: un ecran de login făcut
în React ar servi oricum `index.html` și tot bundle-ul JS, deci conținutul ar rămâne
descărcabil și indexabil. Basic Auth taie cererea la margine, înainte de orice byte de
conținut.

**Comutatorul e un singur fișier:** `webdev/nginx-maintenance/mask.conf`. Există → mască
pornită. Lipsește → mască oprită. Directorul e bind mount `:ro` în serviciul `frontend`
(`docker-compose.yml`), iar `nginx.conf` îl trage cu `include /etc/nginx/maintenance/*.conf;`
în fiecare locație de conținut. Glob-ul fără potriviri e valid în nginx, deci configul merge
și cu directorul gol sau lipsă.

Fișierul conține **și** `auth_basic`, **și** `add_header X-Robots-Tag "noindex, …" always`.
Intenționat: la lansare un singur `rm` le scoate pe amândouă, deci nu poți scoate parola și
uita `noindex`-ul (§10.9).

#### Ce e sub mască și ce rămâne deschis

Locațiile din `nginx.conf` care **includ** masca: `location /` (SPA-ul, inclusiv
`/admin_bizcheck_md_crowe/*`), `location /api_crowe_bizcheck/`, `location ^~ /pdf/`,
fișierele statice (regexul de asset-uri) și `location = /sitemap.xml`.

Locațiile care **NU** o includ, și de ce:

| Cale | De ce nu are voie să fie blocată |
|---|---|
| `/.well-known/` | ACME http-01. Blocat → `certbot renew` eșuează, certificatul expiră în ≤90 de zile și **tot site-ul pică**. Cel mai grav punct. `deploy.sh` verifică asta la fiecare rulare. |
| `/api_crowe_bizcheck/health` | Smoke-testul din `deploy.sh`. Blocat → 401 în loc de 200 → **rollback automat la fiecare deploy**. E o locație `=` (exact match), deci nu moștenește nimic de la prefixul `/api_crowe_bizcheck/`. |
| `/healthz` | Healthcheck-ul Docker al containerului `frontend`. Blocat → container `unhealthy` → tot rollback. Servește tot `index.html`, deci verifică în continuare că build-ul SPA-ului e prezent. |
| `/robots.txt` | Trebuie să rămână citibil — vezi §10.9. |

**Certbot nu e afectat deloc** în setupul actual: challenge-ul e servit de proxy-ul din
față, din `/var/www/certbot`, deci nici nu ajunge la containerul mascat. Locația
`/.well-known/` a rămas totuși deschisă și în container, ca plasă de siguranță dacă
webroot-ul se mută vreodată. `deploy.sh` sondează ruta **direct pe container**
(`http://127.0.0.1:$FRONTEND_PORT/.well-known/acme-challenge/deploy-probe`) și cere **404,
nu 401**; pe 401/403 oprește deployul cu eroare.

> ⚠ O sondă pe `https://bizcheck.ua.com/.well-known/…` **nu** verifică acest lucru: cererea
> e servită de blocul `location ^~ /.well-known/` al proxy-ului din față, din
> `/var/www/certbot`, și nu atinge niciodată containerul. Ca să testezi containerul,
> lovește-l pe `127.0.0.1:5173` (vezi §9.1).

**Boții Telegram nu trec prin nginx** — vorbesc direct cu `http://backend:4001` în rețeaua
Docker (`BACKEND_URL` în `docker-compose.yml`). Livrarea raportului în Telegram, `/excel`,
`/pdf`, `/client` și notificările „Lead nou" funcționează normal cu masca pornită.

#### CE SE RUPE cât timp masca e activă

- **Linkul de descărcare a raportului din email**
  (`{PUBLIC_BASE_URL}/api_crowe_bizcheck/submissions/<id>/report.pdf?t=…`, construit în
  `services/report_email.py`) — clientul primește 401.
- **Linkul spre panoul de admin din mesajele de grup** (`services/sales_notify.py`) — cere
  parola Basic înainte de login-ul normal.
- **Previzualizările** în Telegram / Facebook / LinkedIn (crawlerele lor primesc 401).
- **`sitemap.xml`** răspunde 401 (deliberat — e o listă de URL-uri gata de indexat), deci
  Search Console raportează „couldn't fetch" până la lansare.
- **Panoul de admin** e sub Basic Auth (dublă autentificare). E o alegere, nu o scăpare:
  a-l scuti ar cere un `location` paralel care duplică CSP-ul și restul headerelor, n-ar
  ajuta oricum (panoul cheamă `/api_crowe_bizcheck/`, care e sub mască), iar așa pagina de
  login nici nu e accesibilă public, nici atacabilă prin forță brută. Browserul cere parola
  Basic o singură dată pe sesiune.

#### Administrarea utilizatorilor

```bash
cd <repo>/webdev
./scripts/site-mask.sh adduser coleg     # adaugă (sau schimbă parola unuia existent)
./scripts/site-mask.sh deluser coleg
./scripts/site-mask.sh status
```

Parola se cere **interactiv** (nu ajunge în `history` / `ps aux`), se cere de două ori și
trebuie să aibă **minimum 12 caractere** — scriptul refuză altfel.

Cum se generează hashul, dacă vrei să o faci manual: imaginea `nginx:alpine` **nu** conține
`htpasswd` (e în `apache2-utils`/`httpd-tools`), iar directorul e montat `:ro`. Hashul se
face **pe gazdă**, iar `site-mask.sh` alege prima variantă disponibilă, **în această
ordine**:

```bash
# 1. htpasswd (bcrypt) — dacă apache2-utils / httpd-tools e instalat. Prima alegere.
htpasswd -nbB crowe 'PAROLA' >> nginx-maintenance/htpasswd

# 2. openssl passwd -apr1 — fallbackul care merge pe orice Debian/Ubuntu fără pachete
#    în plus. apr1 (MD5 crypt Apache) e formatul pe care nginx îl citește nativ.
printf '%s:%s\n' crowe "$(printf '%s' 'PAROLA' | openssl passwd -apr1 -stdin)" \
  >> nginx-maintenance/htpasswd

# 3. Docker (bcrypt, fără să instalezi nimic pe gazdă) — ultima variantă, cere un pull.
docker run --rm --entrypoint htpasswd httpd:2.4-alpine -nbB crowe 'PAROLA' \
  >> nginx-maintenance/htpasswd
```

⚠ Folosește `>>` (adaugă), nu `htpasswd -c` — `-c` **trunchiază** fișierul și șterge
ceilalți utilizatori. O intrare duplicată pentru același nume e ambiguă; `site-mask.sh
adduser` o înlocuiește corect, de aceea e varianta recomandată.

`nginx-maintenance/htpasswd` și `mask.conf` sunt în `.gitignore` (și în `.dockerignore`, ca
să nu ajungă într-un strat de imagine). Doar `.gitkeep` e urmărit, ca bind mountul să nu
fie creat de Docker cu proprietar `root`.

#### Validare fără Docker (pe stația de lucru)

```bash
cd <repo>/webdev
~/.venvs/bizcheck-tools/bin/python scripts/validate-nginx.py         # necesită crossplane (§1.7)
~/.venvs/bizcheck-tools/bin/python scripts/validate-deploy-config.py # necesită PyYAML (§1.7)
```

`validate-nginx.py` folosește `crossplane`, parserul oficial NGINX, și verifică pe arborele
parsat, **în ambele stări ale măștii**: că `/.well-known/`, `/healthz`,
`/api_crowe_bizcheck/health` și `/robots.txt` **nu** au `auth_basic`, că locațiile de
conținut îl au când masca e pornită, că `X-Robots-Tag` apare exact acolo unde apare
`auth_basic` și că are `always` (fără el nu s-ar aplica pe 401 — adică exact pe singurul
răspuns pe care îl vede un crawler).

---

## 3. `.env`

```bash
cd <repo>/webdev
cp .env.example .env
chmod 600 .env
```

Un singur fișier alimentează toate serviciile.

### 3.1 Generarea cheilor

Cele trei comenzi sunt cele documentate în repo:

```bash
# PII_ENCRYPTION_KEY — Fernet (comentariul din .env.example)
python3 -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"

# BOT_SHARED_SECRET (.env.example, telegram/05-env-si-deploy.md)
python3 -c "import secrets; print(secrets.token_urlsafe(32))"

# Parole / secrete JWT (aceeași formă ca în DATABASE_ROLE.md)
openssl rand -base64 32 | tr -d '/+=' | head -c 40; echo
```

Dacă pe gazdă nu e instalat `python3` cu pachetul `cryptography`, rulează primele două
într-un container efemer:

```bash
docker run --rm python:3.12-slim sh -c \
  "pip install -q cryptography && python -c \"from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())\""
docker run --rm python:3.12-slim python -c "import secrets; print(secrets.token_urlsafe(32))"
```

> `backend/utils/crypto.py` acceptă și o frază oarecare drept `PII_ENCRYPTION_KEY` (derivă
> o cheie prin SHA-256), dar **folosește o cheie Fernet reală** — o cheie derivată nu e mai
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
| `JWT_SECRET` | `backend/server.py` → `_required_env` | `deploy.sh` refuză; altfel backendul face `sys.exit(1)` la boot |
| `JWT_REFRESH_SECRET` | `backend/server.py` → `_required_env` | `deploy.sh` refuză. **Aici era gaura:** compose are default `change_me_in_production`, deci backendul NU murea — pornea cu un secret de refresh public, ghicibil |
| `ADMIN_USERNAME` | `backend/server.py`, cu `NODE_ENV=production` | `deploy.sh` refuză |
| `ADMIN_PASSWORD` | `backend/server.py`, cu `NODE_ENV=production` | `deploy.sh` refuză |
| `PII_ENCRYPTION_KEY` | `backend/server.py`, cu `NODE_ENV=production` | `deploy.sh` refuză |
| `TELEGRAM_BOT_TOKEN` | `tgbot/bot.py` → `raise RuntimeError` | `deploy.sh` refuză; altfel `tgbot` intră în restart-loop → **rollback la timeout** |
| `SALES_BOT_TOKEN` | `groupbot/bot.py` → `raise RuntimeError` | `deploy.sh` refuză; altfel `groupbot` intră în restart-loop → **rollback la timeout** |

> Lista din `deploy.sh` nu mai poate rămâne în urmă față de cod: la fiecare rulare scriptul
> **extrage** `_required_env` direct din `backend/server.py` și îl adaugă la listă. Dacă
> cineva introduce acolo o variabilă nouă și uită scriptul, deployul o verifică oricum și
> afișează: *„backend/server.py cere variabile care lipseau din REQUIRED_VARS: …"*.
>
> Aceeași consistență se poate verifica **înainte** de deploy, fără Docker:
> ```bash
> cd <repo>/webdev && ~/.venvs/bizcheck-tools/bin/python scripts/validate-deploy-config.py
> ```
> Scriptul compară `REQUIRED_VARS` cu `_required_env` din backend și cu tokenurile fără de
> care boții mor la pornire, validează `docker-compose.yml` și verifică lanțul de build-time
> al frontendului. Cod de ieșire 0 = totul e consistent.

### 3.3 Variabile cu PLACEHOLDER care TREBUIE schimbate

Astea vin din `.env.example` cu valori care nu funcționează în producție. Coloana „semnal"
spune **exact** ce face `deploy.sh` — mai multe dintre ele trec în tăcere, deci nu te baza
pe script ca să le prindă:

| Variabilă | Valoare livrată | Semnal la deploy | Ce se întâmplă dacă o lași |
|---|---|---|---|
| `DB_PASSWORD` | `CHANGE_THIS_STRONG_DB_PASSWORD` | **oprire** | deployul moare |
| `JWT_SECRET` | `CHANGE_THIS_STRONG_JWT_SECRET` | **oprire** | deployul moare |
| `JWT_REFRESH_SECRET` | `CHANGE_THIS_STRONG_REFRESH_SECRET` | **oprire** | deployul moare (prinsă de la remedierea din iul. 2026; înainte trecea) |
| `ADMIN_PASSWORD` | `CHANGE_THIS_STRONG_ADMIN_PASSWORD` | **oprire** | deployul moare |
| `PII_ENCRYPTION_KEY` | `CHANGE_THIS_FERNET_KEY` | **oprire** | deployul moare |
| `TELEGRAM_BOT_TOKEN` | `YOUR_BOT_TOKEN_FROM_BOTFATHER` | **oprire** | deployul moare (prefixul `YOUR_` e tratat ca placeholder) |
| `SALES_BOT_TOKEN` | `YOUR_GROUP_BOT_TOKEN_FROM_BOTFATHER` | **oprire** | deployul moare; altfel `groupbot` intră în restart-loop |
| `SMTP_REPLY_TO` | `office@example.ua` | avertisment | răspunsurile clienților se pierd (regula: valoare care conține `@example.`) |
| `SITEMAP_API_URL` | *(livrată deja corect)* | avertisment **doar dacă e goală** | sitemap fără rutele dinamice — vezi 3.5b |
| `TELEGRAM_BOT_USERNAME` | `YOUR_BOT_USERNAME` | **tăcere** | deep-linkul `t.me/<username>?start=<token>` duce nicăieri. Nimeni nu te avertizează |
| `SMTP_USER` | `office@example.ua` | **tăcere** | emailurile pleacă de la un domeniu inexistent → spam. Nimeni nu te avertizează |
| `BOT_SHARED_SECRET` | *(gol, dar linia există)* | **tăcere** | `/register`, feedbackul, `/excel` și `/client` dau **403** (fail-closed, intenționat) |
| `SMTP_PASSWORD` | *(gol)* | **tăcere** | livrarea pe email e dezactivată silențios (fără crash) |

⚠ **De ce „tăcere" pentru `BOT_SHARED_SECRET`:** avertismentul din `deploy.sh` pentru
variabilele opționale se declanșează când **lipsește linia** din `.env`, nu când valoarea e
goală. `.env.example` livrează `BOT_SHARED_SECRET=` (linie prezentă, valoare goală), deci un
`.env` copiat direct nu produce niciun avertisment. Același lucru pentru `SALES_CHAT_ID`,
`ALLOWED_HOSTS`, `PUBLIC_BASE_URL` și `SMTP_REPLY_TO`.

`SMTP_USER` / `SMTP_REPLY_TO` sunt marcate cu `TODO` chiar în sursă (`.env.example`,
`docker-compose.yml`): vechile adrese `@bizcheck.md` nu mai sunt valabile pentru piața
Ucraina. **Adresa reală UA — de confirmat.**

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
  îl folosesc `tgbot`/`groupbot`. Lista goală = verificarea de Host e dezactivată;
  `backend/server.py` avertizează zgomotos în producție.
- `FRONTEND_PORT` trebuie să coincidă cu `upstream bizcheck_app` din configul de proxy
  (`127.0.0.1:5173` în `nginx-proxy.conf.example`). Dacă îl schimbi, schimbă-l în **ambele**
  locuri, altfel proxy-ul dă 502 — iar smoke-testul din `deploy.sh` trece, pentru că el
  citește `FRONTEND_PORT` din `.env` și lovește portul corect.
- `EMAIL_LOGO_URL` — fișierul există la `webdev/frontend/public/logo_email.png`, deci URL-ul
  e valid imediat ce site-ul e sus (dar întoarce 401 cât timp masca e pornită).

### 3.5 Variabile care se lasă GOALE intenționat

```
#DATABASE_URL=      # COMENTATĂ → DSN-ul calculat din DB_USER/DB_PASSWORD (superuser).
                    # Se decomentează DOAR la pasul 5, după ce ai creat rolul dedicat.
SALES_CHAT_ID=      # gol → /register din grup decide ținta
SALES_TOPIC_ID=     # gol → topic separat per test (altfel toate într-unul singur)
SITEMAP_BASE_URL=   # gol → https://bizcheck.ua.com; se setează doar pe staging
VITE_API_URL=       # gol → calea relativă /api_crowe_bizcheck prin același nginx
```

`DB_USER` trebuie să rămână `postgres` — e superuserul **serviciului `db`** (`initdb` +
`pg_isready`), nu utilizatorul aplicației. Rolul aplicației se pune prin `DATABASE_URL`
(pasul 5), niciodată prin `DB_USER`.

> `SITEMAP_API_URL` **nu** face parte din această categorie — `.env.example` o livrează
> deja completată cu valoarea de producție. Vezi 3.5b.

`SALES_CHAT_ID` setat **bate** `/register` și nu poate fi suprascris din Telegram — e butonul
de urgență al operatorului, nu configurația normală (`.env.example`,
`telegram/03-bot-grup-register.md`).

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
2. **La primul deploy site-ul încă nu răspunde** pe acel URL — iar cu masca pornită
   răspunde **401**, ceea ce pentru generator e la fel de inutil ca un timeout. În ambele
   cazuri buildul reușește și sitemapul iese fără rutele dinamice. E normal — se
   regenerează la pasul 8.2, **după** ce ai oprit masca și ai introdus conținutul.

Fără slash final: scripturile cer `${SITEMAP_API_URL}/tests` și `/templates`.

### 3.6 Spool de export

```
EXPORT_SPOOL_HOST_DIR=./export_spool
```

⚠ Calea **trebuie** să înceapă cu `./`, `/` sau `~`. Un nume simplu (`export_spool`) e
interpretat de Docker ca volum numit nedeclarat și `docker compose up` cade cu
*„service 'backend' refers to undefined volume"*.

TTL-urile (`EXPORT_JOB_READY_TTL` etc.) se lasă pe defaulturi — sunt comentate pe larg în
`.env.example`. Directorul îl creează `deploy.sh` cu `chmod 700`; nu trebuie să-l faci tu.

**Verifici `.env`-ul înainte de deploy:**
```bash
cd <repo>/webdev

# 1. Consistența configului (fără Docker, fără .env): REQUIRED_VARS vs. ce cer
#    efectiv backendul și boții la boot + lanțul de build-time al frontendului.
~/.venvs/bizcheck-tools/bin/python scripts/validate-deploy-config.py   # → "OK  N verificări trecute", exit 0

# 2. Niciun placeholder rămas în variabilele obligatorii → trebuie să dea 0
grep -cE '^(DB_PASSWORD|JWT_SECRET|JWT_REFRESH_SECRET|ADMIN_USERNAME|ADMIN_PASSWORD|PII_ENCRYPTION_KEY|TELEGRAM_BOT_TOKEN|SALES_BOT_TOKEN)=(CHANGE_THIS|change_me|YOUR_)' .env

# 3. Niciuna dintre ele goală → trebuie să dea 8
grep -cE '^(DB_PASSWORD|JWT_SECRET|JWT_REFRESH_SECRET|ADMIN_USERNAME|ADMIN_PASSWORD|PII_ENCRYPTION_KEY|TELEGRAM_BOT_TOKEN|SALES_BOT_TOKEN)=.+' .env

# 4. Cele pe care deploy.sh NU le verifică — uită-te cu ochii la ele
grep -E '^(SMTP_USER|SMTP_REPLY_TO)=' .env       # → nu trebuie să conțină @example.
grep -E '^TELEGRAM_BOT_USERNAME=.+' .env         # → username real, fără `@`, nu YOUR_…
grep -E '^BOT_SHARED_SECRET=.+' .env             # → trebuie să întoarcă o linie
grep -E '^SITEMAP_API_URL=.+' .env               # → https://bizcheck.ua.com/api_crowe_bizcheck
```

Dacă `deploy.sh` moare aici, mesajul spune exact ce variabilă e de vină — nu mai există
cazul „deployul trece de verificări și abia apoi cade la healthcheck".

### 3.7 Pornește masca de pre-lansare — ÎNAINTE de primul deploy

**Se face acum**, nu după §4: containerul `frontend` citește `nginx-maintenance/` printr-un
bind mount **la pornire**, deci dacă fișierul e deja pe disc, primul container pornit e
închis din prima secundă. Dacă amâni pasul, site-ul e public între deploy și momentul în
care îți amintești.

Ce înțelege §2.5 în detaliu, aici pe scurt: masca e Basic Auth + `X-Robots-Tag: noindex`,
comutate de existența unui singur fișier.

```bash
cd <repo>/webdev

# 1. Parola. Se cere INTERACTIV — nu o da ca argument (ar ajunge în `history` și în
#    `ps aux`). Minimum 12 caractere. NU inventa o parolă în repo: nici htpasswd,
#    nici mask.conf nu au voie să fie versionate (sunt în .gitignore/.dockerignore).
./scripts/site-mask.sh adduser crowe

# 2. Pornește masca (scrie nginx-maintenance/mask.conf).
./scripts/site-mask.sh on
```

⚠ La pasul 2 scriptul va afișa **`⚠ Containerul 'frontend' nu rulează → schimbarea se
aplică la pornire`**. **Asta e corect și e de așteptat** pe un server proaspăt — nu există
încă niciun container căruia să-i dea `nginx -s reload`. Fișierul e scris pe disc și va fi
citit de containerul creat la §4.

**Verifici** (doar pe disc; verificarea pe HTTP vine la 4.4):
```bash
./scripts/site-mask.sh status
# → „Mască de pre-lansare: PORNITĂ", comutatorul nginx-maintenance/mask.conf,
#   „utilizatori: crowe". Fără avertismente.

ls -l nginx-maintenance/            # mask.conf + htpasswd (htpasswd cu drepturi 640)
git status --porcelain nginx-maintenance/   # NU trebuie să listeze mask.conf/htpasswd
```

Dacă `git status` le listează, `.gitignore` a fost modificat — oprește-te și repară, altfel
o parolă ajunge în repo.

---

## 4. Primul deploy

```bash
cd <repo>/webdev
./deploy.sh
```

(Directorul `backups/` nu trebuie creat manual — `deploy.sh` îl creează singur, la fel ca
spoolul de export.)

### 4.1 Ce face `deploy.sh`, în ordine

| # | Etapă | Note pentru **primul** rulaj |
|---|---|---|
| 1 | verifică `docker` + `docker compose`, existența lui `.env`, variabilele obligatorii (lista se completează singură din `backend/server.py`), placeholderele | vezi 3.2 / 3.3 |
| 2 | avertismente pentru variabilele opționale **absente** din `.env` + `SMTP_REPLY_TO` pe `@example.` + `SITEMAP_API_URL` goală | vezi nota din 3.3 |
| 3 | creează spoolul de export cu `chmod 700`; avertizează sub 5 GB liberi | |
| 4 | citește starea măștii din `nginx-maintenance/mask.conf`; dacă e pornită, cere ca `htpasswd` să fie nevid și ca `mask.conf` să conțină ȘI `auth_basic_user_file`, ȘI `X-Robots-Tag` | cu 3.7 făcut, afișează *„Mască: PORNITĂ (crowe — utilizatori)"* |
| 5 | `git pull --ff-only` (sări cu `SKIP_GIT_PULL=1`) | repo-ul trebuie deja clonat — §1.3 |
| 6 | backup DB comprimat + retenție 14 zile | **sărit** — *„Serviciul 'db' nu rulează → sar peste backup (prim deploy?)"* |
| 7 | taguiește imaginile curente ca `:previous` | **nimic de tagat** → vezi 4.2 |
| 8 | (doar cu `FRONTEND_NO_CACHE=1`) `docker compose build --no-cache frontend` | nu e nevoie la primul rulaj |
| 9 | `docker compose up -d --build backend frontend tgbot groupbot` | `db` pornește automat prin `depends_on`; `SITEMAP_API_URL` din `.env` ajunge la buildul SPA-ului prin `frontend.build.args` |
| 10 | așteaptă healthcheck-urile (max `HEALTH_TIMEOUT`, implicit 240 s) | migrarea DB rulează aici |
| 11 | smoke-test HTTP pe `http://127.0.0.1:$FRONTEND_PORT` | tabelul de la 4.3 |
| 12 | verifică **coerența măștii** pe headerul HTTP real | vezi 4.3 |
| 13 | rulează `scripts/check-db-role.sh` — cu ce rol Postgres rulează **efectiv** backendul | la primul deploy raportează superuser `postgres`; **e normal**, e doar avertisment. Pasul 5 îl schimbă |
| 14 | raport final + comenzile de rollback manual | |
| — | rollback automat pe `:previous` dacă smoke-testul pică | **indisponibil la primul rulaj** |

### 4.2 ⚠ La primul deploy NU există rollback automat

Pasul 7 nu găsește niciun container care rulează, deci nu poate tagua nimic. `deploy.sh`
scrie explicit *„Nicio imagine de salvat → rollback automat indisponibil"*, iar dacă
smoke-testul cade, funcția de rollback afișează *„Nu există imagini `:previous`. Intervenție
MANUALĂ necesară."* și iese cu 1.

Ce faci dacă pică primul deploy — **nu e o catastrofă**, baza e goală oricum:

```bash
cd <repo>/webdev
docker compose logs --tail=200 backend
docker compose ps
# repari .env / configul, apoi:
./deploy.sh
```

De la **al doilea** deploy încolo plasa de siguranță e activă și se face și backup înainte
de build (pipe-ul `pg_dump | gzip` moare intenționat dacă backupul iese sub 1 KB).

### 4.3 Ce verifică efectiv smoke-testul

Toate cererile pleacă spre `http://127.0.0.1:$FRONTEND_PORT` — adică **direct în container**,
prin nginx-ul din imagine, ocolind proxy-ul de pe gazdă.

| Cerere | Așteptat | Dacă nu |
|---|---|---|
| `/api_crowe_bizcheck/health` | `200` | **rollback** |
| `/healthz` | `200` | **rollback** |
| `/` | `401` cu masca pornită, `200` cu masca oprită | **rollback** |
| `/robots.txt` | `200` (în ambele stări) | doar avertisment |
| `/.well-known/acme-challenge/deploy-probe` | `404` | `401`/`403` → **oprire cu eroare** („ACME BLOCAT"); orice altceva → avertisment |
| headerul `X-Robots-Tag: noindex` pe `/` | **prezent** dacă masca e pornită, **absent** dacă e oprită | **oprire cu eroare în ambele sensuri** (§10.9) |

Cele două cazuri de eroare de la ultima linie merită citite acum, nu în producție:

- masca **pornită**, dar `noindex` lipsește → cel mai probabil imaginea de frontend e mai
  veche decât `nginx.conf`; scriptul îți spune să faci
  `docker compose build --no-cache frontend && ./deploy.sh`;
- masca **oprită**, dar `noindex` a rămas → scriptul refuză să raporteze un deploy reușit și
  te trimite la `./scripts/site-mask.sh off`.

### 4.4 Verificări după primul deploy

```bash
cd <repo>/webdev
docker compose ps                       # 5 servicii (db, backend, frontend, tgbot, groupbot): Up (healthy)
docker compose logs --tail=50 backend   # fără traceback, fără "FATAL:"

# Backendul e viu și vede baza (health face un SELECT 1 real; 503 dacă Postgres tace)
curl -fsS http://127.0.0.1:5173/api_crowe_bizcheck/health      # → {"status":"ok"}
curl -fsS https://bizcheck.ua.com/api_crowe_bizcheck/health    # → idem, prin proxy + TLS

# Masca — ABIA ACUM are sens, containerul există:
./scripts/site-mask.sh status                                  # „PORNITĂ", fără avertismente
curl -sI https://bizcheck.ua.com/ | head -1                    # → 401
curl -sI https://bizcheck.ua.com/ | grep -i x-robots-tag       # → noindex, nofollow, …
curl -sI -u crowe:<parola> https://bizcheck.ua.com/ | head -1  # → 200
curl -sI https://bizcheck.ua.com/robots.txt | head -1          # → 200 (rămâne citibil)
curl -sI https://bizcheck.ua.com/sitemap.xml | head -1         # → 401 (deliberat, §2.5)
curl -sI https://bizcheck.ua.com/healthz | head -1             # → 200

# ACME pe CONTAINER (nu prin proxy — vezi avertismentul din §2.5):
curl -sI http://127.0.0.1:5173/.well-known/acme-challenge/probe | head -1   # → 404, NU 401
```

Test suplimentar, din container — 23 de verificări (health, schemă DB, variabile de mediu,
headere de securitate, quiz, submisie, cifrare PII, PDF dus-întors, login admin, CSRF,
puntea către boți, logout):

```bash
docker compose exec backend python scripts/e2e_check.py
```

Cu baza goală (cazul de acum), verificările care au nevoie de un test existent se raportează
ca **skipped** — normal. Rulează-l din nou după §7, când ai conținut; cu `--strict` un skip
devine eșec.

### 4.5 Ce se întâmplă la primul boot al backendului

`migrate()` din `backend/database/db.py` rulează la **fiecare** pornire. La primul boot:

- ia `pg_advisory_xact_lock(1)`, ca două replici pornite simultan să nu se calce;
- creează cele **15** tabele cu `CREATE TABLE IF NOT EXISTS`: `users`, `tests`, `blocks`,
  `questions`, `answers`, `results`, `submissions`, `templates`, `template_files`,
  `testimonials`, `faq_items`, `site_settings`, `tg_outreach`, `admin_revoked_tokens`,
  `admin_session_epoch`;
- **nu inserează niciun rând**. Baza pornește goală, intenționat (CLAUDE.md, „Don'ts").
  Conținutul se introduce din panoul de admin — pasul 7.

De aceea `healthcheck`-ul backendului are `start_period: 45s` în `docker-compose.yml`:
acoperă migrarea.

---

## 5. Rolul Postgres ne-superuser (opțional, dar recomandat)

**Se face DUPĂ primul deploy reușit, nu înainte.** Implicit backendul se conectează la
Postgres **ca superuser**: `docker-compose.yml` construiește `DATABASE_URL` din `DB_USER`
(implicit `postgres`), `DB_PASSWORD` și `DB_NAME`.

**Nu se poate automatiza** — trei motive, detaliate în
[`../webdev/backend/DATABASE_ROLE.md`](../webdev/backend/DATABASE_ROLE.md):

1. doar un superuser poate crea un rol, deci automatizarea ar cere tot un superuser în `.env`;
2. `POSTGRES_USER` din compose e citit de imaginea `postgres` **doar la `initdb`**, adică pe
   un volum gol — pe `pgdata` deja populat e ignorat, iar schimbarea ar sparge și
   healthcheck-ul `pg_isready -U …`;
3. transferul de proprietate eșuat la jumătate într-un `migrate()` de boot ar lăsa
   containerul în crash-loop.

### 5.0 De ce pasul ăsta era, până de curând, un no-op

Merită citit, ca să înțelegi ce verifici mai jos. **Niciun serviciu din `docker-compose.yml`
nu are `env_file:`** — `.env` e folosit exclusiv pentru substituția `${…}` la parsarea
compose-ului. Cât timp `DATABASE_URL` era calculat ca literal din `${DB_USER}`/`${DB_PASSWORD}`,
un `echo "DATABASE_URL=…" >> .env` **nu ajungea niciodată în container**: backendul continua
să se conecteze ca superuser, iar operatorul rămânea convins că a securizat baza.

Compose e reparat: linia e acum
`DATABASE_URL: ${DATABASE_URL:-postgresql://${DB_USER:-postgres}:${DB_PASSWORD:-postgres}@db:5432/${DB_NAME:-bizzcheck}}`
— fără variabilă în `.env` comportamentul e **identic** cu cel de dinainte; cu variabilă, ea
câștigă și devine singura credențială de DB din containerul backend.

Confirmă înainte să începi:

```bash
cd <repo>/webdev
grep -n 'DATABASE_URL:' docker-compose.yml         # trebuie să conțină ${DATABASE_URL:-…}
~/.venvs/bizcheck-tools/bin/python scripts/validate-deploy-config.py   # verifică forma automat
```

Dacă `grep` **nu** arată `${DATABASE_URL:-…}`, oprește-te: ai o versiune veche a repo-ului.
`git pull` și reia.

### 5.1 Procedura manuală

Reprodusă aici ca să n-o cauți; sursa e `DATABASE_ROLE.md`.

```bash
cd <repo>/webdev

# 0. Backup. Nu sări peste el. (Rolul nou e proprietar → poate șterge tot.)
docker compose exec -T db pg_dump -U postgres bizzcheck | gzip > ~/bizzcheck-prerole.sql.gz

# 1. Generează parola și creează rolul (scriptul e idempotent).
#    `tr -d '/+='` lasă doar alfanumerice — OBLIGATORIU: un `$` în parolă e
#    interpretat de Compose ca variabilă și TRUNCHIAZĂ parola în tăcere, iar
#    `@ : / #` ar rupe parsarea URL-ului. Nu înlocui generatorul.
APP_PW=$(openssl rand -base64 32 | tr -d '/+=' | head -c 40)
docker compose exec -T db psql -v ON_ERROR_STOP=1 -U postgres -d bizzcheck \
    -v app_password="'$APP_PW'" < backend/scripts/sql/create_app_role.sql

# 2. Citește ieșirea scriptului:
#    • rolsuper / rolcreatedb / rolcreaterole / rolreplication = f, rolconnlimit = 50
#    • a doua interogare („still_owned_by_postgres") = 0 rânduri
#    Dacă a doua întoarce ceva, NU continua: următorul migrate() moare cu
#    „must be owner of table …".

# 3. Pune rolul în .env — DOAR pentru backend.
#    NU atinge DB_USER / POSTGRES_USER: rămân `postgres` pentru serviciul `db`.
echo "DATABASE_URL=postgresql://bizcheck_app:$APP_PW@db:5432/bizzcheck" >> .env
unset APP_PW

# 4. Repornește DOAR backendul și urmărește migrarea.
#    --force-recreate: schimbarea din .env schimbă configurația containerului.
docker compose up -d --no-deps --force-recreate backend
docker compose logs -f backend      # migrate() trebuie să treacă fără erori de permisiune

# 5. Confirmă că schimbarea a AJUNS la backend (nu doar în .env).
./scripts/check-db-role.sh
#    → „Rol non-superuser: bizcheck_app". Dacă scrie „.env CERE rolul
#      'bizcheck_app', dar backendul rulează cu 'postgres'" → .env e ignorat.

# 6. Smoke test.
curl -fsS https://bizcheck.ua.com/api_crowe_bizcheck/health
```

**Rollback** (instantaneu, fără pierdere de date): șterge sau comentează linia
`DATABASE_URL=` din `.env` (o linie goală `DATABASE_URL=` e tratată la fel ca „nesetat",
pentru că valoarea din compose folosește `:-`) și:

```bash
docker compose up -d --no-deps --force-recreate backend
./scripts/check-db-role.sh          # trebuie să raporteze din nou `postgres`
```

### 5.2 Ce NU se schimbă

- **Healthcheck-ul serviciului `db`** (`pg_isready -U ${DB_USER:-postgres}`) rămâne pe
  `postgres`. Nu-l muta pe `bizcheck_app`.
- **`deploy.sh` și `scripts/backup-db.sh`** rulează `pg_dump -U postgres` *în interiorul*
  containerului `db` (socket local) — nu au nevoie de rolul aplicației.
- **`DB_USER` / `DB_PASSWORD`** rămân ale serviciului `db`. Un `DB_USER=bizcheck_app` în
  `.env` ar da „bizcheck_app + parola superuserului" și backendul nu s-ar mai conecta;
  `check-db-role.sh` avertizează dacă vede asta.

⚠ `CONNECTION LIMIT` din `create_app_role.sql` e **50**, nu 30 cum era înainte: pool-ul e
dimensionat **per proces worker**, iar gunicorn rulează 4 (`--workers 4` în
`backend/Dockerfile`). Plafonul real e `4 × DB_POOL_MAX` (implicit **10**, în
`backend/database/db.py`) `= 40`. Dacă urci `DB_POOL_MAX`, urcă și limita rolului —
`scripts/check-db-role.sh` verifică relația pe clusterul viu, la fiecare deploy.

---

## 6. Configurarea boților Telegram

Sunt **trei** suprafețe Telegram, dar **două** tokenuri:

| Serviciu | Token | Rol |
|---|---|---|
| `tgbot` (container) | `TELEGRAM_BOT_TOKEN` | bot de client: `/start <token>`, `/help`, trimite PDF-ul |
| `groupbot` (container) | `SALES_BOT_TOKEN` | bot intern de grup: `/register`, `/unregister`, `/excel`, `/pdf`, `/client`, `/help` |
| `services/sales_notify.py` (backend) | `SALES_BOT_TOKEN` — **același** | doar *trimite* notificări de lead |

Partajarea tokenului e intenționată: backendul doar trimite, `groupbot` doar face polling →
fără conflict pe `getUpdates` (`telegram/05-env-si-deploy.md`).

### 6.1 REVOCĂ tokenul vechi — obligatoriu, înainte de lansare

Un token de bot Telegram viu a fost commis în repo — inițial în `tgbot/.env.example`, apoi
citat în clar în `SECURITY_AUDIT_REPORT.md` (finding **CRITICAL-1**). La HEAD ambele fișiere
sunt curate (tokenul e mascat ca `872461****:AAF***…`, bot id `8724617416`), dar valoarea
completă **rămâne în istoricul git** — oricine clonează repo-ul o poate extrage cu
`git log -p`. Auditul o marchează `ACTION REQUIRED` și notează explicit că *„only revocation
actually retires it"*.

Verifici în câte commituri mai e (fără să-l afișezi):
```bash
cd <repo>
git rev-list --all | while read c; do
  git grep -qlE '[0-9]{8,10}:AA[A-Za-z0-9_-]{30,}' "$c" -- 2>/dev/null && echo "$c"
done | wc -l
```
La momentul scrierii: **50**. Orice număr > 0 înseamnă că revocarea e obligatorie.

```
@BotFather → /mybots → <bot> → API Token → Revoke current token
```

Pune tokenul nou în `.env` și **nu-l scrie în niciun fișier versionat**
(`telegram/05-env-si-deploy.md`).

> Curățarea propriu-zisă a istoricului (`git filter-repo` / BFG) e o operație distructivă
> care rescrie toate hash-urile și cere force-push + reclonare pe server — **de confirmat**
> dacă se face. Revocarea tokenului e obligatorie oricum și e suficientă ca să închizi riscul.

### 6.2 Creează / configurează boții în BotFather

1. Doi boți separați (`.env.example`): unul de client, unul de grup.
2. Pune tokenurile în `.env`: `TELEGRAM_BOT_TOKEN`, `TELEGRAM_BOT_USERNAME` (fără `@`),
   `SALES_BOT_TOKEN`.
3. `TELEGRAM_BOT_USERNAME` e citit de **backend**, nu de `tgbot` — construiește deep-linkul
   `t.me/<username>?start=<token>`. Nimic nu te avertizează dacă a rămas pe `YOUR_BOT_USERNAME`
   (vezi 3.3): butonul „Telegram" din raport pur și simplu duce nicăieri.

### 6.3 Grupul de vânzări + Topics

1. Creează un grup **privat**.
2. Activează **Topics** (grupul devine forum). Fără asta totul cade pe General.
3. Adaugă botul de grup ca **administrator** cu dreptul **„Manage Topics"** — altfel nu poate
   crea topicul per test (`telegram/05-env-si-deploy.md`).
4. Lasă `SALES_CHAT_ID=` și `SALES_TOPIC_ID=` **goale** în `.env`.

### 6.4 Cutover pe `X-Bot-Secret`

Toate endpointurile `/tg/exports/*`, `/tg/group/*` și `/tg/feedback/*` sunt gated **strict**
pe headerul `X-Bot-Secret`. Comportamentul e **fail-closed**: un `BOT_SHARED_SECRET` nesetat
**dezactivează** funcția (403), nu o deschide (CLAUDE.md; `telegram/03-bot-grup-register.md`).

Aceeași valoare trebuie să ajungă la **trei** servicii: `backend`, `tgbot`, `groupbot` — dar
e o **singură** variabilă în `.env`, pe care compose o injectează în toate trei.

```bash
cd <repo>/webdev
python3 -c "import secrets; print(secrets.token_urlsafe(32))"
# → BOT_SHARED_SECRET=... în .env
docker compose up -d --build backend tgbot groupbot
```

**Verifici** că a ajuns la toate trei:
```bash
for s in backend tgbot groupbot; do
  printf '%-9s ' "$s"
  docker compose exec -T "$s" printenv BOT_SHARED_SECRET | cut -c1-8
done
# → aceleași 8 caractere pe toate trei rândurile
```

**Simptomul lipsei secretului:** `/register` răspunde
`„BOT_SHARED_SECRET не налаштований"`, iar `/excel` și `/client` par „stricate".

### 6.5 `/register`

Proprietarul grupului (nu un simplu admin — verificarea e `status == "creator"`,
`telegram/03-bot-grup-register.md`) dă în grup:

```
/register
```

Botul trimite `chat.id`, `chat.title` și cine a înregistrat la
`POST /api_crowe_bizcheck/tg/group/register`; ținta se salvează în `site_settings` (cheile
`sales_chat_id`, `sales_chat_title`, `sales_chat_registered_by`). Nicio migrare, niciun
tabel nou.

**Verifici:**
```bash
cd <repo>/webdev
./scripts/check-telegram.sh
```
Scriptul face `getMe` pe ambele tokenuri și — dacă `SALES_CHAT_ID` e setat — `getChat`.
Caută `"is_forum":true` și `"type":"supergroup"`.

Verificarea funcțională (după ce ai conținut, pasul 7): completează un test pe site →
notificarea trebuie să apară într-un **topic nou**, denumit după test; al doilea test
completat intră în **același** topic.

> Cu masca pornită, ca să completezi un test din browser trebuie să treci întâi de Basic
> Auth (user/parola de la 3.7). Boții și notificările nu sunt afectate — nu trec prin nginx.

---

## 7. Conținut în panoul de admin

**Baza pornește goală.** `migrate()` creează doar tabele; nu există niciun script de seed.
Fără conținut, site-ul se ridică și e navigabil, dar fiecare secțiune arată o stare goală și
**niciun test nu poate fi început**.

Panoul: `https://bizcheck.ua.com/admin_bizcheck_md_crowe/`

⚠ Cât timp masca e pornită, browserul cere **întâi** parola Basic (3.7), apoi urmează
login-ul normal de admin. E dublă autentificare intenționată (§2.5).

### 7.1 Login

Nu există „primul utilizator" de creat. Autentificarea de admin compară direct cu
`ADMIN_USERNAME` / `ADMIN_PASSWORD` din mediu (`backend/services/auth_service.py`) — **fără
nicio interogare în baza de date**. Tabelul `users` e un sistem de auth separat, azi
neutilizat de SPA; poate rămâne gol permanent.

### 7.2 Lanțul minim ca UN test să fie jucabil

**test → ≥1 bloc → ≥1 întrebare → ≥2 răspunsuri.** Atât.

| Nivel | Unde | Câmpuri obligatorii |
|---|---|---|
| **Test** | 🧪 Тести → „+ Додати тест" | `name_uk` (UI-ul îl cere); `slug` se derivă automat din nume dacă îl lași gol, dar trebuie **unic**; `is_active` = Активний; `report_type` (implicit `bizcheck`); `scoring_zones` — implicit 80/70/65/0, validarea de pe server cere strict `safe > developing > warn >= risk` (`services/scoring.py`, `validate_zones`) |
| **Bloc** | test → tab „Запитання та блоки" → „+ Додати блок" | cel puțin unul dintre `title_uk` / `title_en` |
| **Întrebare** | „+ Додати питання" | cel puțin unul dintre `text_uk` / `text_en`; `order_index` de forma `1`, `2` (nivel principal) sau `1.1` (sub-întrebare — **nu** contează la numărătoarea de întrebări jucabile) |
| **Răspunsuri** | în modalul întrebării | **minimum 2**; fiecare cu `text_uk` sau `text_en` și un `score` |

Nu trebuie create rânduri de raport: raportul se randează în client din răspunsuri +
`scoring_zones`. Tabelul `results` **nu** e „intervale de scor" — e un rest dintr-un flux
autentificat vechi; alimentează doar contoarele din Dashboard, iar zero rânduri acolo nu
strică nimic.

⚠ **`report_type` — capcană de conținut.** Valorile canonice sunt `bizcheck`, `standard`,
`premium`, `gdpr` (`services/test_service.py`, `CANONICAL_REPORT_TYPES`). Pentru `bizcheck`
și `gdpr`, paginile de detaliu per bloc / per întrebare vin dintr-un fișier **hardcodat în
frontend** (`frontend/src/data/blockExplanations.ts`, respectiv `gdprExplanations.ts`),
indexate după poziția blocului / numărul întrebării. Un test nou, cu altă structură de
blocuri, va randa **zero** pagini de detaliu, în tăcere. Pentru conținut complet nou
folosește `standard` sau `premium` — sunt integral bazate pe date.

### 7.3 Țintele butoanelor CTA

⚙️ „Налаштування сторінки" → patru selectoare, fiecare primind un **slug de test**:

| Cheie | Butonul |
|---|---|
| `cta_hero_test` | butonul mare din Hero |
| `cta_about_test` | secțiunea „Про платформу" |
| `cta_final_test` | CTA-ul final, înainte de footer |
| `cta_catalog_test` | butonul roșu din antetul catalogului |

Gol = butonul derulează la catalog (comportamentul vechi). La salvare, serverul cere doar ca
slugul să **existe** (`Test.find_by_slug`); frontendul (`hooks/useCtaTarget.ts`) cere în plus
ca testul să fie **`is_active`**, altfel butonul cade pe fallback fără niciun mesaj. Scrierea
e all-or-nothing: un slug invalid → 400 și nu se salvează nimic
(`backend/routes/site_settings.py`).

### 7.4 Activează (sau lasă oprită) livrarea pe email

Tot în „Налаштування сторінки": flagul `email_delivery_enabled`, stocat ca `"1"`/`"0"`.

**Implicit e OPRIT** — `_FLAG_DEFAULTS = {"email_delivery_enabled": "0"}` în
`backend/routes/site_settings.py`, pentru că livrabilitatea/DNS-ul încă se configurează.
Cu flagul oprit, pe ecranul de livrare de după test cardul „email" apare dezactivat, cu
badge-ul **„Незабаром"**; Telegram rămâne complet funcțional.

Lasă-l OFF până ai SPF/DKIM/DMARC verificate (pasul 1.5) și un test de email reușit:

```bash
cd <repo>/webdev
docker compose exec backend python -m scripts.send_test_email --to tu@exemplu.com --lang uk
```

Trimite spre 2–3 furnizori diferiți (Gmail, Outlook, o adresă corporate) și verifică folderul
Spam la fiecare — asta îți spune plasarea reală.

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

**Verifici** (rulează din nou suita completă, acum că există conținut):
```bash
cd <repo>/webdev
docker compose exec backend python scripts/e2e_check.py --strict
```

---

## 8. Lansarea și după lansare: mască, cron, sitemap, Search Console

### 8.0 LANSAREA — oprește masca (fă asta PRIMA)

Ordinea contează: sitemapul se regenerează (8.2) citind API-ul **public**, iar cât timp
masca e pornită acesta răspunde 401 — deci un sitemap regenerat înainte de acest pas iese
tot fără rutele dinamice.

```bash
cd <repo>/webdev
./scripts/site-mask.sh off     # scoate SIMULTAN parola și antetul noindex
```

**Verifici** (toate trei, nu doar prima):

```bash
./scripts/site-mask.sh status                               # „OPRITĂ"
curl -sI https://bizcheck.ua.com/ | head -1                 # 200
curl -sI https://bizcheck.ua.com/ | grep -i x-robots-tag    # NICIO linie
curl -sI https://bizcheck.ua.com/sitemap.xml | head -1      # 200
```

Dacă `x-robots-tag` încă apare, imaginea de frontend e mai veche decât `nginx.conf` sau
`nginx -s reload` nu a apucat să ruleze (scriptul îți spune dacă containerul nu rula). Rulează
`./deploy.sh` — la pasul 12 se oprește singur cu eroare dacă `noindex` a rămas agățat, deci
nu poți raporta din greșeală un deploy reușit cu site-ul invizibil în Google (§10.9).

`nginx-maintenance/htpasswd` rămâne pe disc intenționat: inactiv fără `mask.conf`, dar te
scutește de regenerarea parolelor dacă vrei să repui masca (staging, hotfix).

### 8.1 Cron

Ambele linii sunt cele documentate în antetele scripturilor. Înlocuiește
`/home/USER/BIZZCHECK_BOT` cu calea reală a clonei.

```bash
crontab -e
```

```cron
# Backup DB zilnic la 03:15
15 3 * * * cd /home/USER/BIZZCHECK_BOT/webdev && ./scripts/backup-db.sh >> backups/backup.log 2>&1

# Santinelă zilnică pe spoolul de export, 04:30
30 4 * * * cd /home/USER/BIZZCHECK_BOT/webdev && ./scripts/export-spool.sh >> backups/export-spool.log 2>&1
```

Directorul `backups/` există deja — l-a creat `deploy.sh` la §4. (Dacă din vreun motiv rulezi
cron-ul pe o clonă pe care nu s-a făcut niciodată deploy, creează-l întâi: redirectarea `>>`
din cron **nu** creează directorul.)

Ce fac:

- **`backup-db.sh`** — `pg_dump --clean --if-exists | gzip -9`, scriere **atomică**
  (`.part` → redenumire abia după `gzip -t`), `chmod 600`, retenție implicită 14 zile
  (`BACKUP_RETENTION_DAYS`). Moare dacă dumpul iese sub 1 KB.
  ⚠ Fișierele conțin date de clienți: coloanele PII sunt cifrate Fernet, dar `tg_username`,
  `tg_chat_id`, sectorul și scorurile **nu** sunt.
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

**Restaurare:**
```bash
cd <repo>/webdev
gunzip -c backups/bizcheck-YYYYmmdd-HHMMSS.sql.gz \
  | docker compose exec -T db psql -U postgres -d bizzcheck
```
(Dumpul e făcut cu `--clean --if-exists`, deci se poate reaplica peste o bază existentă.)

### 8.2 Regenerează sitemap-ul DUPĂ ce ai oprit masca și ai introdus conținut

`sitemap.xml` se generează la **build-time** (`frontend/package.json` → `prebuild`), citind
testele și șabloanele din API-ul live. Rutele dinamice apar numai dacă `SITEMAP_API_URL` e
setată în momentul buildului **și** API-ul răspunde `200` atunci (`scripts/generate-sitemap.mjs`,
`lib/routing.mjs`). Același lucru e valabil pentru pre-randarea HTML
(`generate-static-html.mjs`), care produce `<route>/index.html` cu `<title>`, `description`,
`canonical` și `hreflang` pentru crawlere.

Variabila ajunge în build prin `frontend.build.args` → `ARG`/`ENV` (vezi 3.5b), deci nu mai e
nimic de făcut manual — trebuie doar **reconstruit** frontendul.

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

**Verifici:**
```bash
curl -s https://bizcheck.ua.com/robots.txt
curl -s https://bizcheck.ua.com/sitemap.xml | head -20
curl -s https://bizcheck.ua.com/ | grep -E '<title>|hreflang'
```
În `sitemap.xml` trebuie să apară un `<loc>` pentru fiecare `/uk/test/<slug>` și
`/en/test/<slug>` activ.

### 8.3 Google Search Console

Pașii compleți (sursa: `SEO_GUIDE.md`, secțiunea 1):

1. <https://search.google.com/search-console>
2. „Add property" → **Domain property** → `bizcheck.ua.com`
3. Adaugă în DNS TXT-ul de verificare (`google-site-verification=…`). Propagare 5–30 min.
4. „Verify"
5. **Sitemaps** → adaugă `sitemap.xml` → devine `https://bizcheck.ua.com/sitemap.xml`
6. Verifică raportul **hreflang** că perechea `uk` ↔ `en` e reciprocă
7. Rezultatele în „Pages" / „Performance" apar în 24–72 h

⚠ Trimite sitemapul **după** 8.0. Cât timp masca era pornită, `sitemap.xml` răspundea 401 și
Search Console raporta „couldn't fetch"; dacă l-ai adăugat mai devreme, retrimite-l acum.

Nu există un Search Console separat „pentru google.com.ua" — semnalul geo vine din hreflang +
limba conținutului + backlinkuri locale.

Opțional, tot din `SEO_GUIDE.md`: GA4 (secțiunea 2 — necesită adăugarea
`https://www.googletagmanager.com` în CSP din `nginx.conf`, **nu** în Flask) și Bing Webmaster
Tools (secțiunea 3, import cu un click din GSC).

---

## 9. Verificare finală

Se rulează **după** §8.0 (masca oprită). Cât timp masca e pornită, `/` și `/sitemap.xml`
răspund `401` — vezi 4.4 pentru varianta de verificare de dinainte de lansare.

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
curl -sI https://bizcheck.ua.com/healthz | head -1                   # 200

# Masca de pre-lansare — rulează ASTA înainte să anunți lansarea (§8.0, §10.9)
./scripts/site-mask.sh status                                        # „OPRITĂ"
curl -sI https://bizcheck.ua.com/ | grep -i x-robots-tag             # NICIO linie

# ACME — DOUĂ sonde diferite, pentru două straturi diferite:
#  a) proxy-ul din față, care servește challenge-ul real din /var/www/certbot
curl -sI https://bizcheck.ua.com/.well-known/acme-challenge/probe | head -1   # 404
#  b) containerul de frontend — singurul loc unde masca ar putea bloca ACME.
#     Sonda (a) NU atinge containerul, deci nu verifică asta.
curl -sI http://127.0.0.1:5173/.well-known/acme-challenge/probe | head -1     # 404, NU 401

# Redirecturile 301 pentru rutele vechi (blocurile `location` din nginx.conf)
for p in /confidentialitate /termeni /test/x /sablon/x /plata/test/x; do
  printf '%-22s ' "$p"; curl -sI "https://bizcheck.ua.com$p" | awk '/^[Ll]ocation/{print $2}'
done
# așteptat: /uk/privacy, /uk/privacy, /uk/test/x, /uk/templates/x, /uk/checkout/test/x

# Headere de securitate
curl -sI https://bizcheck.ua.com/ | grep -iE 'strict-transport|content-security|x-content-type|referrer-policy'

# Nimic în afară de 80/443 nu trebuie să fie accesibil din exterior (§1.2)
curl -s --max-time 5 http://<IP_PUBLIC_SERVER>:4001/api/health   # trebuie să eșueze
curl -s --max-time 5 http://<IP_PUBLIC_SERVER>:5173/            # trebuie să eșueze
nc -vz <IP_PUBLIC_SERVER> 5432                                   # trebuie să eșueze
```

### 9.2 În browser

- [ ] `https://bizcheck.ua.com/` se încarcă **fără să ceară user/parolă**, lacătul e verde,
      se redirectează la `/uk/`
- [ ] Comutatorul **UA / EN** schimbă limba și URL-ul (`/uk/…` ↔ `/en/…`)
- [ ] Catalogul afișează testul creat la pasul 7
- [ ] Butonul din Hero duce la testul setat ca `cta_hero_test` (pasul 7.3)
- [ ] Testul se poate parcurge de la cap la coadă și raportul se randează
- [ ] Pe ecranul de livrare: cardul **Telegram** e activ; cardul **email** e „Незабаром" dacă
      ai lăsat flagul OFF (pasul 7.4)
- [ ] `/uk/privacy` se deschide
- [ ] Bannerul de cookie apare și consimțământul se reține
- [ ] `https://bizcheck.ua.com/admin_bizcheck_md_crowe/` cere login (o **singură** dată, cel de
      admin) și acceptă `ADMIN_USERNAME` / `ADMIN_PASSWORD`
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
- [ ] Liniile de cron există în `crontab -l`
- [ ] `sudo certbot renew --dry-run` trece (§2.3)
- [ ] `./scripts/check-db-role.sh` raportează `bizcheck_app` dacă ai făcut pasul 5
      (dacă l-ai sărit, va raporta `postgres` + avertismentul de superuser — acceptabil,
      dar e o restanță de securitate cunoscută)

---

## 10. Capcane cunoscute — citește înainte să te panichezi

### 10.1 `nginx.conf` și frontendul se deployează ÎMPREUNĂ

`Dockerfile.frontend` copiază `nginx.conf` **în imaginea de frontend**
(`COPY nginx.conf /etc/nginx/conf.d/default.conf`). Nu e bind mount. Deci:

- o modificare în `nginx.conf` ajunge pe server **numai** printr-un rebuild al serviciului
  `frontend`;
- redirecturile 301 din `nginx.conf` țintesc rutele localizate `/uk/*`, care există doar în
  build-ul nou al SPA-ului. Dacă deployezi doar `nginx.conf` (imposibil, dar dacă cineva
  „scurtează" rebuildul), redirecturile trimit spre rute inexistente.

Singura excepție e directorul `nginx-maintenance/`, care e bind mount tocmai ca masca să se
poată comuta cu `nginx -s reload`, fără redeploy (§2.5).

`deploy.sh` rebuildează explicit **toate** cele patru servicii (`backend frontend tgbot
groupbot`) tocmai pentru că o versiune veche a scriptului rebuilda doar `backend groupbot`,
iar schimbările de frontend și nginx nu ajungeau niciodată pe server. **Nu scoate `frontend`
din listă.**

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
- **Masca falsifică rezultatul.** Cu masca pornită, API-ul public răspunde 401, deci
  generatorul primește tot „zero rute dinamice". De aceea 8.2 vine **după** 8.0.
- **Primul deploy iese oricum incomplet**, pentru că site-ul încă nu răspunde. Nu e o eroare.
- **Eșecul e mereu tăcut.** `fetchDynamicBasePaths` prinde orice excepție și întoarce `[]`, ca
  un build offline să producă totuși un sitemap valid. Singurul semn e avertismentul din logul
  buildului — dacă sitemapul pare scurt, citește-l acolo, nu ghici.

Consistența lanțului se verifică fără Docker:

```bash
cd <repo>/webdev && ~/.venvs/bizcheck-tools/bin/python scripts/validate-deploy-config.py
```

### 10.3 Fără `BOT_SHARED_SECRET` funcțiile de bot par „stricate", nu deschise

Fail-closed intenționat: 403 pe `/tg/exports/*`, `/tg/group/*`, `/tg/feedback/*`. `/register`
răspunde `„BOT_SHARED_SECRET не налаштований"`. **Nu „relaxa pentru dev".**

Și ține minte că `deploy.sh` **nu** te avertizează dacă variabila e prezentă-dar-goală (3.3).

### 10.4 `SALES_CHAT_ID` setat anulează `/register`

Envul bate Telegramul, mereu (`services/sales_notify.py`). E butonul de urgență pentru un
`/register` greșit sau ostil. Ca `/register` să conteze, lasă variabila **goală**.

### 10.5 Rolul Postgres cere pași manuali — și `.env` nu ajunge singur nicăieri

Regula generală, valabilă pentru **orice** variabilă: niciun serviciu din
`docker-compose.yml` nu are `env_file:`, deci `.env` e folosit **doar** pentru substituția
`${…}` la parsarea compose-ului. Ca o cheie din `.env` să ajungă într-un container, compose
trebuie s-o refere explicit în `environment:` (sau în `build.args`). Pentru o cheie pe care
compose o calculează ca literal, o linie în `.env` **nu face nimic și nimeni nu te
avertizează**. Exact așa a fost `DATABASE_URL` până în iul. 2026, iar pasul 5 părea aplicat
fără să fie.

Azi `DATABASE_URL` are forma `${DATABASE_URL:-<valoarea calculată>}` (vezi 5.0), iar
`scripts/check-db-role.sh` — rulat automat la fiecare `./deploy.sh` — verifică pe
**containerul viu** că rolul cerut în `.env` e chiar cel folosit. Dacă adaugi o variabilă
nouă, verifică întâi că e cablată în `docker-compose.yml`.

Nu încerca să muți crearea rolului în `migrate()` — motivele sunt în `DATABASE_ROLE.md`.
`POSTGRES_USER` din compose e ignorat pe un volum `pgdata` deja populat.

### 10.6 Tokenul Telegram din istoricul git

Vezi pasul 6.1. Revocarea e obligatorie înainte de lansare.

### 10.7 Rollback manual, dacă apare o problemă mai târziu

`deploy.sh` afișează comenzile exacte la finalul fiecărui deploy reușit. Forma generală
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

### 10.9 `noindex` uitat în producție — greșeala cea mai scumpă

Un `X-Robots-Tag: noindex` rămas după lansare **nu are niciun simptom vizibil**: site-ul
arată perfect în browser, se încarcă rapid, nimeni nu primește nicio eroare. Doar Google îl
scoate din index și nu-l mai reindexează, iar descoperi luni mai târziu, când te întrebi de
ce nu vine trafic organic. Recuperarea poate dura săptămâni.

Ce s-a făcut ca să nu se poată întâmpla:

1. **Un singur comutator.** `auth_basic` și `add_header X-Robots-Tag` stau în **același
   fișier** (`nginx-maintenance/mask.conf`). `./scripts/site-mask.sh off` le șterge pe
   amândouă cu un `rm`. Nu există stare „fără parolă, dar cu noindex" la care să ajungi
   prin uitare.
2. **`deploy.sh` verifică pe răspunsul HTTP real**, la fiecare deploy: dacă masca e oprită
   dar `/` încă trimite `noindex`, scriptul **oprește deployul cu eroare**, nu cu un
   warning pe care l-ai scrola. Simetric, dacă masca e pornită dar `noindex` lipsește,
   te trimite să reconstruiești imaginea de frontend.
3. **`scripts/validate-nginx.py`** (crossplane, fără Docker) refuză configul în care
   `X-Robots-Tag` apare într-o locație fără `auth_basic`.

Și capcana-soră, cu semnul invers: **nu pune `Disallow: /` în `robots.txt`** ca „încă un
strat" de protecție. `Disallow` înseamnă „nu descărca", nu „nu indexa": un URL descoperit
dintr-un backlink poate ajunge tot în index, fără descriere. Mai rău, blochează exact
cererea prin care Googlebot ar fi citit `noindex`-ul — deci **slăbește** protecția în loc
s-o întărească. De aceea `robots.txt` rămâne `Allow: /` și accesibil chiar și cu masca
pornită (comentariul e scris și în `webdev/frontend/public/robots.txt`, ca să nu fie
„reparat" de cineva).
