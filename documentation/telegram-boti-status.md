# Boții Telegram — mutat (+ arhivă istoric)

> 📁 Documentația de referință a fost restructurată într-un set pe fișiere, cu cuprins:
> **[`telegram/`](telegram/README.md)**.
>
> | Cauți… | Fișier |
> |---|---|
> | Prezentare + fluxul celor 3 boți | [`telegram/00-overview.md`](telegram/00-overview.md) |
> | Botul user (raport) | [`telegram/01-bot-user.md`](telegram/01-bot-user.md) |
> | Notificarea de vânzări | [`telegram/02-notificare-vanzari.md`](telegram/02-notificare-vanzari.md) |
> | Botul de grup & `/register` | [`telegram/03-bot-grup-register.md`](telegram/03-bot-grup-register.md) |
> | Alerta la eșec de livrare (nou) | [`telegram/04-alerta-esec-livrare.md`](telegram/04-alerta-esec-livrare.md) |
> | Env & deploy | [`telegram/05-env-si-deploy.md`](telegram/05-env-si-deploy.md) |
> | Teste | [`telegram/06-teste.md`](telegram/06-teste.md) |

Mai jos e păstrat **istoricul** (changelog-ul problemelor găsite și restanțele) — nu e material
de referință, ci un jurnal al deciziilor luate în timp.

---

## Arhivă — probleme găsite în cod, toate rezolvate

| # | Problemă | Cum a fost rezolvată |
|---|---|---|
| 1 | **Auth fail-open** pe `/tg/feedback/*`: cu `BOT_SHARED_SECRET` gol, oricine putea posta `/feedback/reply` cu un `chat_id` ghicit. | Acum fail-closed, ca `/tg/exports/*` și `/tg/group/*`. La deploy: fără secret setat, feedback-ul dă 403. |
| 2 | `tg_exports_bp` fără rate limit, deși servește export Excel cu PII. | `10/min`. |
| 3 | Default-uri `bizcheck.md` într-un deploy `.ua.com`. | Migrate peste tot: backend, groupbot, frontend (canonical, hreflang, og, JSON-LD, sitemap, robots.txt) și CSP-ul din nginx. |
| 4 | **Username de bot hardcodat în frontend** (`t.me/CROWE_BIZCHECK_bot`). | Eliminat: fără token de deep-link botul nu putea identifica userul, deci fallback-ul nu recupera nimic. |
| 5 | `pdf_ready` calculat dar ignorat de frontend. | Cablat: dacă PDF-ul nu e gata, userul e reținut cu un mesaj. |
| 6 | `_feedback_open` ignora răspunsul — un 502 lăsa userul fără niciun mesaj. | Verifică statusul și răspunde cu o eroare (cheie nouă în `strings.py`, UK+EN). |
| 7 | `FEEDBACK_SCHEDULER` citit din env dar nedeclarat nicăieri. | Documentat în `.env.example` + `docker-compose.yml`. |
| 8 | Comentarii care documentau greșit whitelist-ul de limbi (`ro/ru` vs realitatea `uk/en`). | Corectate. |
| 9 | `_bar()` cod mort în `tgbot/helpers.py`. | Șters. |

## Arhivă — bug-uri descoperite de teste

| Bug | De ce conta | Rezolvare |
|---|---|---|
| **Precedența era inversă**: codul citea DB-ul înaintea env-ului. | `SALES_CHAT_ID` arăta ca buton de urgență, dar nu făcea nimic. | Env câștigă acum (`sales_notify._sales_chat_id`). |
| **Topic șters în grup** → `tests.tg_topic_id` rămânea mort. | Fiecare lead ulterior irosea un apel condamnat, la nesfârșit. | Id-ul se curăță la fallback; următorul lead creează topic nou. |
| **`sendMessage` fără `message_id`** → nici salvat, nici eliberat. | Update-urile ulterioare de contact nu mai ajungeau în grup. | Claim-ul se păstrează (fără dublare) + warning în log. |
| **`window.open` după `await`** în `CallToAction.tsx`. | Safari/Firefox blochează popup-ul → eșec silențios. | Trecut pe `window.location.href`. |

## Arhivă — ce a rămas deschis (nu ține de cod)

1. **Coperțile PDF** `preview_uk.pdf` + `outro_uk.pdf` — au nevoie de assets de la design. Până
   atunci, rapoartele UK folosesc coperțile `*_en.pdf`.
2. **Conținutul quiz-ului** din Postgres — netradus, descopat intenționat.
3. **Migrațiile pe Postgres-ul de producție** — primul boot pe server e proba reală.
4. **Identitatea SMTP** (`office@bizcheck.md`) — lăsată intenționat neatinsă (mailbox real cu
   SPF/DKIM/DMARC). De schimbat din config când adresa nouă e pregătită.
5. **Numele de brand `Bizcheck.md`** în titluri/`og:site_name` — e branding, nu URL; decizie de marketing.

> Detalii de migrare a limbii: [`ukrainian-language-migration.md`](ukrainian-language-migration.md).
