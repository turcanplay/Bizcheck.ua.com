# Documentație Telegram — BizCheck

Acest folder documentează **toate cele trei suprafețe Telegram** din `webdev/`.
Fișierele sunt mici și fiecare acoperă un singur subiect — **citește doar fișierul
de care ai nevoie**.

> Suprafețele NU împart cod cu botul standalone din `src/` (aiogram, DB separată).
> Aici e vorba exclusiv de `webdev/`.

## Cuprins

| # | Fișier | Ce acoperă |
|---|---|---|
| 0 | [`00-overview.md`](00-overview.md) | Harta celor 3 boți, fluxul de date, cine cheamă pe cine, diagrama |
| 1 | [`01-bot-user.md`](01-bot-user.md) | Botul de raport pentru client (`webdev/tgbot/`): livrare PDF, email, lead, share-telefon, feedback |
| 2 | [`02-notificare-vanzari.md`](02-notificare-vanzari.md) | Notificarea echipei de vânzări (`services/sales_notify.py`): fire-once, edit-in-place, topic-uri forum |
| 3 | [`03-bot-grup-register.md`](03-bot-grup-register.md) | Botul de grup (`webdev/groupbot/`): `/register`, `/excel`, `/pdf`, `/client` |
| 4 | [`04-alerta-esec-livrare.md`](04-alerta-esec-livrare.md) | **Nou** — alerta trimisă echipei când botul NU reușește să livreze raportul |
| 5 | [`05-env-si-deploy.md`](05-env-si-deploy.md) | Variabile de mediu, precedența `SALES_CHAT_ID` ↔ `/register`, pași de deploy |
| 6 | [`06-teste.md`](06-teste.md) | Toate suitele de teste (fără DB / fără server), cum le rulezi, validare prin mutații |

## Convenții

- **Referințe la cod** în forma `fișier:linie`, ca să fie clicabile în editor.
- **Câmpuri bilingve**: sufixe `_uk` (ucraineană) / `_en` (engleză). Vezi
  [`../ukrainian-language-migration.md`](../ukrainian-language-migration.md).
- **Căi ofuscate** (intenționat, nu le „normaliza"):
  - API: `/api_crowe_bizcheck/`
  - Panou admin: `/admin_bizcheck_md_crowe/`
- **Token-urile nu intră în git** — se setează în `.env` pe server (vezi
  [`05-env-si-deploy.md`](05-env-si-deploy.md)).

## Vezi și

- [`../backend/01-routes.md`](../backend/01-routes.md) — toate endpoint-urile backend
- [`../backend/02-services.md`](../backend/02-services.md) — serviciile de business
- [`../architecture/02-auth-and-security.md`](../architecture/02-auth-and-security.md) — modelul de auth
