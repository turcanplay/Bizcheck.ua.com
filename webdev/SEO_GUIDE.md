# SEO Bizcheck.ua.com — ghid de operare (piața Ucraina)

Acest document conține pașii **off-page** pe care codul NU îi poate face automat.
Trebuie executați manual, o singură dată, după deploy. Restul SEO-ului se
regenerează la fiecare build.

Piața țintă: **Ucraina**. Domeniu: `https://bizcheck.ua.com`. Limbi: **uk** (default) + **en**.
Toate semnalele de geo/limbă din cod au fost mutate de pe Moldova pe Ucraina.

---

## ✅ Ce e deja făcut în cod

- `<title>`, `<meta description>`, `<meta keywords>`, `<link canonical>` per pagină
- Open Graph (Facebook, LinkedIn) + Twitter Card meta
- Hreflang **uk / en / x-default**, cu prefixe de limbă în URL (`/uk/…`, `/en/…`, x-default → `/uk/`)
- Favicon real (16/32/180/192/512 px) + `site.webmanifest` (text în ucraineană, `lang: uk`)
- `/robots.txt` — permite indexarea publică, blochează `/admin_bizcheck_md_crowe/` și `/api_crowe_bizcheck/`
- `/sitemap.xml` — generat la build; listează landing + privacy + toate șabloanele + testele active (din DB live)
- Schema.org JSON-LD: `Organization`, `WebSite`, `Service` (global, în `index.html`), plus per-pagină
  `Product` (șabloane), `BreadcrumbList` și **`FAQPage`** (emis din secțiunea FAQ a landing-ului, în limba curentă)
- Semnale geo: `areaServed: "UA"`, `Country: "Ukraine"`, `inLanguage: ["uk","en"]`, `priceCurrency: "UAH"`
- Pre-render HTML static pentru rutele fără JS (crawlerii primesc meta complete)
- Code-splitting Vite (admin + pdf-vendor lazy) → bundle inițial mai mic, LCP mai bun

### ⚠️ Yandex Metrica a fost ELIMINATĂ

`mc.yandex.ru` este blocat în Ucraina, deci scriptul nici nu s-ar fi încărcat.
S-a scos: loaderul din `frontend/src/utils/cookieConsent.ts`, constanta `YANDEX_METRIKA_ID`,
declarația globală `window.ym` și comentariile din `CookieConsentContext.tsx`.

Categoria „Statistici" din bannerul de cookies **rămâne** (o descrie politica de
confidențialitate), dar în acest moment nu mai injectează niciun tag. Google Analytics 4
se va conecta exact în `applyAnalyticsConsent()`. Meta Pixel (marketing) nu a fost atins.

**De făcut în infra:** scoate `https://mc.yandex.ru` și `wss://mc.yandex.ru` din
`script-src` și `connect-src` în `webdev/nginx.conf` — sunt acum permisiuni CSP moarte.

---

## 🛠️ Pașii manuali (one-time, ~30–60 min)

### 1. Google Search Console — înregistrarea proprietății

1. <https://search.google.com/search-console>
2. Login cu contul Google al firmei
3. „Add property" → **Domain property** → `bizcheck.ua.com`
4. Adaugă în DNS TXT-ul de verificare (`google-site-verification=…`). Propagarea durează 5–30 min.
5. „Verify"
6. **Sitemaps** → adaugă `sitemap.xml` → devine `https://bizcheck.ua.com/sitemap.xml`
7. Verifică raportul de **hreflang** că perechea uk↔en e reciprocă.
8. Rezultatele în „Pages" / „Performance" apar în 24–72h.

Notă: nu există un Search Console separat „pentru google.com.ua" — Google are un singur
Search Console global, iar country targeting manual nu mai există pentru domenii generice.
Semnalul de geo vine din hreflang + limba conținutului + backlinks locali.
`google.com.ua` e doar interfața locală de căutare, utilă pentru verificat manual poziții
(`site:bizcheck.ua.com` pe <https://www.google.com.ua>).

### 2. Google Analytics 4

1. <https://analytics.google.com> → „Create property" → „Bizcheck.ua.com"
2. Property type **Web**, URL `https://bizcheck.ua.com`, fus orar Europe/Kyiv, monedă UAH
3. Primești `G-XXXXXXXXXX`
4. Trimite-l → se conectează în `applyAnalyticsConsent()` (gated pe consimțământul „Statistici")
   și se adaugă `https://www.googletagmanager.com` în CSP din `nginx.conf`

### 3. Bing Webmaster Tools — bonus rapid

1. <https://www.bing.com/webmasters>
2. Add site `https://bizcheck.ua.com` → **Import from Google Search Console** (un click)
3. Submit sitemap

Bing are cotă mică în UA, dar e gratis și alimentează și DuckDuckGo.

### 4. Google Business Profile

Se poate revendica **doar dacă firma are o prezență reală în Ucraina** (adresă fizică sau
zonă de servicii declarată). Dacă nu există încă entitate ucraineană, **sari peste pasul
ăsta** — o fișă cu adresă din Moldova nu ajută la ranking pe interogări ucrainene și riscă
suspendarea.

Din același motiv, `PostalAddress` a fost **scos** din JSON-LD-ul `Organization` din
`index.html`: nu inventăm o adresă. Se adaugă înapoi când există adresa reală UA.

### 5. Directoare și platforme ucrainene (backlinks)

Nu am validat live niciunul dintre acestea — tratează lista ca punct de plecare și
**verifică fiecare** înainte să investești timp (unele directoare vechi sunt moarte sau
au devenit spam și fac mai mult rău decât bine).

| Platformă | Ce e | Prioritate | Status |
|---|---|---|---|
| **LinkedIn Company Page** | nu e „director", dar e cel mai puternic semnal B2B în UA | **mare** | sigur util |
| **Clutch.co** (filtru Ukraine) | director internațional de firme de consultanță/audit, autoritate mare | **mare** | recomandat dacă există profil de firmă |
| **Facebook Business Page** | trafic mixt B2C/B2B; Meta Pixel e deja instalat | mare | sigur util |
| **Ua-region.com.ua** | catalog de firme după ЄДРПОУ | medie | **de verificat** — necesită entitate juridică UA |
| **Prom.ua / Zakupka** | marketplace B2B mare în UA | medie | **de verificat** dacă acceptă servicii de consultanță |
| **Camere de comerț / asociații de business locale** | backlinks de autoritate | medie | **de verificat** — depinde de statutul legal al firmei în UA |

Regula pentru fiecare înregistrare:
- URL-ul principal = `https://bizcheck.ua.com` (NU `crowe-tm.md` — vrem autoritate pe domeniul nou)
- Categorie: „аудит", „бізнес-консалтинг", „юридичні послуги" sau cea mai apropiată
- Descriere 100–200 cuvinte **în ucraineană**, cu keywords integrate natural

### 6. Keyword research (ucraineană)

Instrumente:
- **Google Trends, geo=UA**: <https://trends.google.com/trends/explore?geo=UA>
- **Google Keyword Planner** (gratuit cu cont Google Ads) — locația Ucraina, limba ucraineană
- **Serpstat** (companie ucraineană, date bune pe piața locală) sau **Ubersuggest**

Cuvinte cheie de testat pentru nișa noastră — **ipoteze, validează volumele înainte** de a
scrie conținut pe ele:

| Keyword (uk) | Intenție | Notă |
|---|---|---|
| `оцінка ризиків бізнесу` | informațională/comercială | keyword-ul principal, deja în `<title>` |
| `бізнес-аудит онлайн` | comercială | tail scurt, competiție medie |
| `due diligence для МСБ` | comercială | volum mic, lead-uri de calitate |
| `аудит відповідності компанії` | comercială | compliance |
| `юридичний аудит підприємства` | comercială | potrivit pentru pagina de șabloane |
| `податкові ризики підприємства` | informațională | potrivit pentru articol/blog |
| `чек-лист перевірки бізнесу` | informațională | intent aproape perfect pentru testul gratuit |
| `перевірка контрагента` | informațională | volum **mare** în UA, dar altă intenție (verificarea unui terț, nu autodiagnostic) — nu forța dacă produsul nu face asta |

Termeni în rusă: o parte din publicul de business din UA caută încă în rusă. **Nu adăuga
înapoi o versiune `ru` a site-ului** — a fost scoasă intenționat. Dacă vrei totuși traficul,
soluția e conținut ucrainean care menționează natural termenii, nu o a treia limbă.

Trimite 3–5 keywords validate → se ajustează copywriting-ul pe landing + 3–4 pagini de conținut.

---

## 📊 Cum măsurăm progresul

La 2–4 săptămâni după deploy + Search Console verificat:

1. **Search Console → Performance** — clicks, impressions, CTR, poziție medie per keyword.
   Filtrează pe „Country: Ukraine" ca să vezi doar piața relevantă.
2. **Search Console → Pages** — indexate vs descoperite-neindexate
3. **PageSpeed Insights** <https://pagespeed.web.dev/?url=https%3A%2F%2Fbizcheck.ua.com> —
   lunar; țintă LCP < 2.5s, CLS < 0.1, INP < 200ms
4. `site:bizcheck.ua.com` pe <https://www.google.com.ua>
5. **Rich Results Test** <https://search.google.com/test/rich-results> — verifică pe landing
   că `FAQPage` e valid (e emis dinamic, deci depinde de ce FAQ e activ în DB)

---

## 🚀 Deploy

```bash
# Local
git add -A
git commit -m "seo: rebrand + semnale geo pentru piața UA"
git push

# Pe server: rebuild frontend (sitemap se regenerează din DB live)
cd ~/BIZZCHECK_BOT/webdev
git pull
docker compose build --no-cache frontend
docker compose up -d frontend

# Verificare
curl -s https://bizcheck.ua.com/robots.txt
curl -s https://bizcheck.ua.com/sitemap.xml | head -20
curl -s https://bizcheck.ua.com/ | grep -E '<title>|hreflang|"areaServed"|"priceCurrency"'
```

---

## ⚠️ Note și restanțe

- **`og:image` e încă pătrat (512×512).** Trebuie creat un card social real **1200×630**
  (`frontend/public/og-image-1200x630.png`), apoi actualizate `og:image` + `og:image:width/height`
  și `twitter:image` în `frontend/index.html`, plus `DEFAULT_IMAGE` /
  `DEFAULT_IMAGE_WIDTH` / `DEFAULT_IMAGE_HEIGHT` din `frontend/src/config/siteMeta.ts`.
  Până atunci `summary_large_image` va fi degradat de Facebook/X la un card mic.
- **Datele de contact sunt încă moldovenești.** `frontend/src/config/contact.ts` centralizează
  `office@bizcheck.md`, `+373 79 027 317` și `crowe-tm.md`. Un email/telefon `+373` pe un site
  `.ua.com` e un semnal de neîncredere pentru utilizatorii ucraineni și pentru E-E-A-T.
  **Prioritate mare:** obține un email `@bizcheck.ua.com` și un număr `+380`, apoi schimbă
  doar acel fișier — restul aplicației importă din el.
- **`crowe-tm.md` a fost păstrat** — e site-ul real al firmei membre Crowe, deci un link
  legitim. Dacă apare un site ucrainean al grupului, schimbă `COMPANY_WEBSITE` în `contact.ts`.
- **Conținutul legal e încă pe legislația Moldovei.** `frontend/src/data/blockExplanations.ts`
  citează Codul Civil / Fiscal / al Muncii al Republicii Moldova, iar
  `frontend/src/pages/privacyContent.ts` se referă la CNPDCP și la legislația moldovenească.
  Pentru piața UA trebuie înlocuite cu echivalentele ucrainene (Цивільний кодекс України,
  Податковий кодекс України, ЗУ «Про захист персональних даних») — **decizie juridică, nu
  tehnică**, necesită revizuire de la Crowe. E și cel mai mare risc SEO rămas: conținutul
  principal vorbește despre altă jurisdicție decât cea a publicului țintă.
- **JSON-LD în `index.html`** descrie organizația și apare pe orice pagină. JSON-LD din
  `Seo.tsx` / `FAQ.tsx` se **adaugă** la el pentru pagini specifice.
- **Sitemap-ul se generează la `npm run build`**, unde `SITEMAP_API_URL` nu e setat implicit —
  fără el URL-urile dinamice lipsesc. Setează `SITEMAP_API_URL=http://backend:4001/api_crowe_bizcheck`
  la build sau rulează scriptul prin cron pe server.
