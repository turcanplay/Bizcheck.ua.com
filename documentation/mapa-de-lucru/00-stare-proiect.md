# Starea proiectului — 18 august 2026

Fotografie făcută prin explorarea codului, nu prin citirea documentației. Unde cele două
nu coincid, aici e ce spune codul.

## Ce e produsul

Platformă bilingvă **ucraineană (`uk`, implicit) + engleză (`en`)** la
`https://bizcheck.com.ua`: un quiz de audit juridico-financiar de business care produce un
raport PDF, plus livrarea lui prin download, Telegram sau email. O singură bază de cod, în
`webdev/`.

**Faza actuală: pre-lansare.** Există un deploy real pe server, ținut în spatele unei măști
nginx cu parolă. Munca nu mai e pe features, ci pe: conținut final al clientului, curățenia
de branding după mutarea de pe piața moldovenească, hardening operațional și parcurgerea
runbook-ului de lansare.

## Cele cinci servicii

| Serviciu | Ce e | Expunere |
|---|---|---|
| `db` | Postgres 16 | **niciun port publicat** |
| `backend` | Flask + gunicorn (4 workeri × 2 thread-uri) | doar `expose: 4001`, intern |
| `frontend` | build Vite servit de nginx | `127.0.0.1:${FRONTEND_PORT:-5173}` — singura legătură cu gazda |
| `tgbot` | botul Telegram al clientului (long-polling) | niciunul |
| `groupbot` | botul intern din grupul de vânzări | niciunul |

TLS se termină într-un nginx **extern** stack-ului (`webdev/nginx-proxy.conf.example`).
nginx-ul din compose e singurul proxy din fața backendului și **suprascrie**
`X-Forwarded-For` cu `$remote_addr`, ca un XFF falsificat să nu poată influența cheile de
rate-limit. Flask are încredere în exact un hop (`ProxyFix(x_for=1)`).

## Invarianții pe care nu-i încalci

1. **Două căi de auth, neinterschimbabile.** Admin = cookie httpOnly `admin_session` (JWT) +
   cookie `admin_csrf` cu double-submit prin headerul `X-CSRF-Token`. Scriitor public de
   submisie = token opac `X-Submission-Token`, emis o singură dată la creare. Fără fallback
   pe header `Authorization` pentru admin.
2. **Sanitizare obligatorie** pe orice text liber de la utilizator, prin
   `utils/validators.clean_text` / `clean_optional`. React escapează la randare, dar PDF-ul,
   Excel-ul și mesajele Telegram nu.
3. **PII criptat Fernet la repaus** pe `submissions`: `first_name`, `last_name`, `email`,
   `phone`. Criptarea/decriptarea trăiește **exclusiv** în `models/submission.py`; SQL brut
   ocolește `decrypt_row`.
4. **Fără `ro` / `ru`** nicăieri — coloane, `hreflang`, whitelist de limbi, texte de bot.
5. **Fără seed din `migrate()`.** O instalare nouă pornește goală; conținutul se introduce
   din panoul de admin.
6. **Căile ofuscate rămân ofuscate**: `/api_crowe_bizcheck/` și `/admin_bizcheck_md_crowe/`.

## Unde se află lucrurile

**Backend** (`webdev/backend/`) — 20 de blueprint-uri, prefix `/api_crowe_bizcheck/`, cu o
singură excepție: `/api/health`. `migrate()` rulează la fiecare boot din `database/db.py`,
serializat cu `pg_advisory_xact_lock(1)`; creează 15 tabele, aplică 31 de `ALTER` idempotente
și 26 de indici. PDF-ul **nu** se generează în backend — vine încărcat de client și se
stochează în `submissions.pdf_data`.

**Frontend** (`webdev/frontend/`) — React 19 + Vite, rutare cu un singur segment `:lang`
(`/uk/…`, `/en/…`) tocmai ca schimbarea limbii să re-randeze în loc să remonteze, deci
quiz-ul în curs supraviețuiește. Rutele vechi sunt redirecționate 301 în `nginx.conf`, cu
oglindă client-side în router — cele două trebuie ținute sincron.

**Raportul** — `tests.report_type` ∈ {`bizcheck`, `standard`, `premium`, `gdpr`} alege arborele
de componente, într-un IIFE inline în `src/pages/CtaPage.tsx`. Setul canonic e impus în
`services/test_service.py`, nu de o constrângere în DB.

**Telegram** — trei suprafețe, două tokenuri:
`TELEGRAM_BOT_TOKEN` alimentează serviciul `tgbot` **și** `backend/services/telegram_send.py`
(trebuie să fie același bot: răspunsurile ajung la cel care face polling).
`SALES_BOT_TOKEN` alimentează `groupbot` **și** `backend/services/sales_notify.py`.
Cele două tokenuri trebuie să fie ale unor boți **diferiți**, altfel apare 409 la `getUpdates`.

## Ce e slab

- **Nu există CI.** `.github/` conține doar `dependabot.yml`. Suitele de teste ale boților și
  cele două validatoare (`scripts/validate-nginx.py`, `scripts/validate-deploy-config.py`)
  există exact ca să prindă drift — și nimic nu le declanșează.
- **Rate-limiting în memorie**, deci per worker gunicorn: plafonul real e ~4× cel nominal.
- **`.env` nu ajunge în containere.** Niciun serviciu nu are `env_file:`; `.env` servește doar
  la substituția `${...}` în compose. O variabilă citită de cod dar neenumerată în
  `environment:` rulează **tăcut** pe valoarea implicită din sursă. Asta a fost sursa mai
  multor scăpări de identitate moldovenească — vezi [`03-registru-buguri.md`](03-registru-buguri.md).
- **`CtaPage.tsx` are 885 de linii** și șase responsabilități. Nu e stricat, dar e locul unde
  se vor naște bug-urile următoare.
