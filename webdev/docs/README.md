# `webdev/docs/` — retras (2026-07-28)

Acest folder a fost un al doilea set de documentație, scris în iunie 2026, care
acoperea același subiect ca `documentation/`: subsistemul Telegram, backendul, baza
de date, securitatea, env-ul și deploy-ul.

Cele două seturi divergiseră. Setul de aici rămăsese în urmă cu două schimbări mari și
descria greșit lucruri sensibile:

- limba: vorbea de câmpuri `name_ro` / `name_ru` și texte RO/RU, când aplicația e de
  mult pe `_uk` / `_en`;
- auth: descria `/tg/feedback/*` ca **fail-open** („tolerant, pentru dev local") și
  `groupbot` ca nefiind blocat când `SALES_CHAT_ID` e gol. **Ambele sunt fail-closed**
  în cod;
- nu menționa deloc `/register`, `/unregister`, alerta la eșec de livrare, sau
  exportul ZIP ca job asincron;
- indexul lui trimitea la șase fișiere care nu existau pe disc.

Ca să nu existe două surse de adevăr, fișierele au fost șterse (rămân în istoricul
git). **Sursa unică de adevăr este [`../../documentation/`](../../documentation/README.md).**

## Unde a plecat fiecare fișier

| Fișier vechi | Citește în loc |
|---|---|
| `01-arhitectura-generala.md` | [`documentation/telegram/00-overview.md`](../../documentation/telegram/00-overview.md), [`documentation/architecture/01-system-architecture.md`](../../documentation/architecture/01-system-architecture.md) |
| `02-bot-client.md` | [`documentation/telegram/01-bot-user.md`](../../documentation/telegram/01-bot-user.md) |
| `03-bot-grup.md` | [`documentation/telegram/03-bot-grup-register.md`](../../documentation/telegram/03-bot-grup-register.md) |
| `04-notificari-vanzari.md` | [`documentation/telegram/02-notificare-vanzari.md`](../../documentation/telegram/02-notificare-vanzari.md) |
| `05-topicuri-forum.md` | [`documentation/telegram/02-notificare-vanzari.md`](../../documentation/telegram/02-notificare-vanzari.md) (secțiunea despre topicuri) |
| `06-export-excel-pdf.md` | [`documentation/backend/02-services.md`](../../documentation/backend/02-services.md), [`documentation/telegram/03-bot-grup-register.md`](../../documentation/telegram/03-bot-grup-register.md) |
| `07-backend.md` | [`documentation/backend/00-backend-overview.md`](../../documentation/backend/00-backend-overview.md), [`documentation/backend/01-routes.md`](../../documentation/backend/01-routes.md) |
| `08-baza-de-date.md` | [`documentation/architecture/03-data-model.md`](../../documentation/architecture/03-data-model.md) |
| `09-securitate-auth.md` | [`documentation/architecture/02-auth-and-security.md`](../../documentation/architecture/02-auth-and-security.md) |
| `10-variabile-env.md` | [`documentation/telegram/05-env-si-deploy.md`](../../documentation/telegram/05-env-si-deploy.md), [`documentation/deployment.md`](../../documentation/deployment.md) |
| `11-deploy.md` | [`documentation/deployment.md`](../../documentation/deployment.md), [`documentation/telegram/05-env-si-deploy.md`](../../documentation/telegram/05-env-si-deploy.md) |
| `12-depanare.md` | [`documentation/telegram/07-depanare.md`](../../documentation/telegram/07-depanare.md) — conținut preluat și corectat |

> Nu adăuga fișiere noi aici. Documentația nouă merge în `documentation/`.
