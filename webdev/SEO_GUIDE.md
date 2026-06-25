# SEO Bizcheck.md — ghid de operare

Acest document conține pașii **off-page** pe care eu (codul) NU îi pot face automat.
Tu trebuie să-i execuți manual o singură dată după primul deploy. După asta,
restul SEO-ului merge automat la fiecare build.

---

## ✅ Ce e deja făcut în cod (faza 1+2+3+4)

- `<title>`, `<meta description>`, `<meta keywords>`, `<link canonical>` per pagină
- Open Graph (Facebook, LinkedIn) + Twitter Card meta
- Hreflang RO/RU + x-default
- Favicon real (16/32/180/192/512 px) + `site.webmanifest`
- `/robots.txt` (permite indexare publică, blochează `/admin_*` și `/api_*`)
- `/sitemap.xml` — generat la build, listează landing + privacy + toate șabloanele + toate testele active (din DB live)
- Schema.org JSON-LD: `Organization`, `WebSite`, `Service`, plus per-pagină
  `Product` (șabloane) + `BreadcrumbList` + `FAQPage` (când vom integra FAQ)
- Pre-render HTML static pentru `/confidentialitate` (crawlerii primesc HTML cu meta complete fără să aștepte JS)
- Code-splitting Vite (admin chunks lazy, pdf-vendor lazy) → bundle inițial mai mic, LCP mai bun

---

## 🛠️ Pașii pe care **TU** trebuie să-i faci (one-time, ~30-60 min)

### 1. Google Search Console — ÎNREGISTRARE PROPRIETATE

Aici Google îți confirmă că deții site-ul, după care vede sitemap-ul și începe să indexeze rapid.

1. Mergi la <https://search.google.com/search-console>
2. Login cu un cont Google (ideal cont Crowe oficial, ex. `office.gmail@crowe-tm.md` sau cont admin)
3. „Add property" → alege **„Domain property"** și introdu `bizcheck.md`
4. Google îți cere să adaugi un **TXT record DNS** la registratorul tău (probabil aceeași zonă DNS unde e bizcheck.md)
   - Exemplu: TXT `@` valoare `google-site-verification=ABC123XYZ...`
   - DNS-ul poate dura 5-30 min să propagheze
5. Click „Verify" — Google validează, apoi proprietatea apare ca verificată
6. În stânga: **Sitemaps** → adăugă `sitemap.xml` (URL relativ, devine `https://bizcheck.md/sitemap.xml`)
7. Aștepți 24-72h, vezi în „Coverage" / „Pages" cât a indexat

**Beneficiu:** primești emailuri când apare orice problemă (404, robots blocking, schema invalid, slow page) + vezi statisticile reale de search.

---

### 2. Google Analytics 4 (opțional dar puternic recomandat)

Vezi cine vine pe site, de unde, ce caută:

1. <https://analytics.google.com> → cont Crowe → „Create property" → „Bizcheck.md"
2. Property type: **Web** → URL `https://bizcheck.md`
3. Primești un cod de tracking (`G-XXXXXXXXXX`)
4. Trimite-mi codul → adaug `<script>` în `index.html` (1 linie)
5. Sau folosesc Google Tag Manager (varianta avansată — recomandat dacă vrei să adaugi mai multe scripturi în viitor)

---

### 3. Google My Business — pentru căutări locale

Pentru ca atunci când cineva caută „Crowe Chișinău" sau „audit Moldova" să apari pe Google Maps și pe partea dreaptă a căutării:

1. <https://www.google.com/business/> → login cont Crowe
2. „Add your business" → numele „Crowe Turcan Mikhailenko" (există deja? poate trebuie revendicat)
3. Adaugă adresa fizică Chișinău, telefon, ore program
4. Adaugă website: `https://bizcheck.md` (nu `crowe-tm.md` — vrem boost pe Bizcheck.md)
5. Verificare: Google îți trimite un cod prin **poștă fizică** sau telefon. Durează 1-2 săptămâni
6. După verificare: adaugă poze, descriere completă, servicii (Audit, Consultanță, Risc Management)

**Beneficiu:** apariție pe Maps + Knowledge Panel pe Google.

---

### 4. Bing Webmaster Tools — bonus rapid

Bing are ~5% market share dar e gratis și nu cere efort:

1. <https://www.bing.com/webmasters> → login Microsoft (cont `office@crowe-tm.md` merge)
2. Add site: `https://bizcheck.md`
3. **Importă din Google Search Console** (un click) — preia toate setările
4. Submit sitemap: `https://bizcheck.md/sitemap.xml`

---

### 5. Directoare locale Moldova (backlinks gratuite)

Înscrie Bizcheck.md / Crowe pe directoarele MD relevante:

| Director | URL | Cost | Prioritate |
|---|---|---|---|
| **Pagina de aur** | <https://www.pagina-de-aur.md> | gratuit | mare (autoritate MD) |
| **AllMoldova** | <https://www.allmoldova.com/ro/business> | gratuit | medie |
| **Yellow Pages MD** | <https://yp.md> | gratuit | medie |
| **999.md (servicii)** | <https://999.md> | gratuit | mică (e marketplace, nu director SEO pur) |
| **Lovis Catalog** | <https://www.lovis.md> | gratuit | mică |

Pentru fiecare:
- Adaugă numele firmei + URL `https://bizcheck.md` (NU `crowe-tm.md`)
- Categorie: „Audit, consultanță, juridic" sau cea mai apropiată
- Descriere de 100-200 cuvinte cu **„audit risc afacere", „consultanță IMM Moldova", „evaluare conformitate"** integrate natural

**Beneficiu:** 5-10 backlinks din directoare locale → boost autoritate domeniu (DA) → indexare mai rapidă, ranking mai bun pe căutări locale.

---

### 6. Schema.org keyword research (planificare conținut)

Pentru a găsi cuvintele cheie pe care le caută utilizatorii MD:

- **Google Trends MD**: <https://trends.google.com/trends/?geo=MD>
  - Caută „audit afacere", „consultanță juridică", „risc business" — vezi volumele
- **Ubersuggest** (free 3 căutări/zi): <https://neilpatel.com/ubersuggest>
- **Google Keyword Planner** (gratuit cu cont Google Ads): <https://ads.google.com/keywordplanner>

Cele mai promițătoare cuvinte cheie pentru Bizcheck.md (presupunere bazată pe context):
- „audit risc afacere Moldova"
- „evaluare conformitate firmă Chișinău"
- „consultanță juridică IMM Moldova"
- „test audit HR online"
- „diagnostic afacere gratis"
- „Crowe Moldova audit"

Trimite-mi 3-5 cuvinte cheie validate de tine (după ce le verifici în Trends) și adaug copywriting orientat pe ele în landing + creez 3-4 articole landing dedicate.

---

## 📊 Cum măsurăm progres

După ~2-4 săptămâni de la deploy + Search Console verificat:

1. **Search Console → Performance**: vezi câte clicks, impressions, CTR, average position pentru fiecare cuvânt cheie
2. **Search Console → Coverage**: câte pagini sunt indexate vs descoperite
3. **PageSpeed Insights** (<https://pagespeed.web.dev/?url=https%3A%2F%2Fbizcheck.md>): rulează lunar — țintă LCP < 2.5s, CLS < 0.1, INP < 200ms
4. **Google search „site:bizcheck.md"** — vezi ce pagini sunt deja indexate

---

## 🚀 Sumar deploy

```bash
# Local: commit & push tot ce am făcut acum
cd c:/Depozit/gitProjects/BIZZCHECK_BOT/webdev
git add -A
git commit -m "seo: phase 1+2+3+4 — meta, OG, Twitter, hreflang, sitemap, schema, prerender static routes"
git push

# Pe server: rebuild frontend (sitemap se regenerează automat din DB live)
cd ~/BIZZCHECK_BOT/webdev
git pull
docker compose build --no-cache frontend
docker compose up -d frontend

# Verifică:
curl -s https://bizcheck.md/robots.txt | head -5
curl -s https://bizcheck.md/sitemap.xml | head -10
curl -sI https://bizcheck.md/ | head -10
curl -s https://bizcheck.md/ | grep -E '<title>|"@type"' | head -5
```

Apoi mergi la **Google Search Console** (pasul 1 de mai sus) și începe procesul de indexare.

---

## ⚠️ Note importante

- **Sitemap-ul e generat în Docker la `npm run build`** — acolo `SITEMAP_API_URL` nu e setat, deci dynamic URLs nu sunt incluse. Poți seta `SITEMAP_API_URL=http://backend:4001/api_crowe_bizcheck` în docker-compose.yml dacă vrei ca build-time să apeleze API-ul intern. Recomand să-l rulezi MAI BINE prin cron pe server: `0 3 * * * cd ~/BIZZCHECK_BOT/webdev && SITEMAP_API_URL=http://localhost:5174/api ... node frontend/scripts/generate-sitemap.mjs` și după aia `docker cp` în container — overhead minim.
- **Pre-render static** acum acoperă doar `/confidentialitate`. Când dai green-light, extind la rute dinamice (necesită API call la build, similar cu sitemap).
- **JSON-LD în index.html** descrie organizația — apare pe orice pagină. JSON-LD din `Seo.tsx` se ADAUGĂ pentru pagini specifice (ex. Product pe șabloane).
- **Hreflang pe SPA**: ambele limbi servesc aceeași URL, deci hreflang pointează spre același `loc`. Google folosește `<html lang>` dinamic (Helmet îl schimbă la switch limbă) ca să decidă.
