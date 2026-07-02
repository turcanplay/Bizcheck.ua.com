# 09 — Securitate și autentificare

## Două căi de auth (NU sunt interschimbabile)

### 1. Admin — cookie + CSRF
- Cookie httpOnly `admin_session` (JWT) + cookie non-httpOnly `admin_csrf`.
- Serverul validează JWT-ul din cookie; pentru metode nesigure cere în plus header `X-CSRF-Token` == cookie `admin_csrf` (double-submit).
- **Fără Bearer** — autentificarea pe header Bearer e moartă, nu se readaugă.
- `localStorage` NU ține niciun token de sesiune.
- Frontend: `adminFetch()` / `adminApi.*` injectează automat header-ul CSRF.

### 2. Public submission writer — token opac
- `POST /api_crowe_bizcheck/submissions` întoarce o singură dată `submission_token`.
- `PATCH`, `POST /pdf`, `POST /send-email`, `POST /tg/link/{id}` cer `X-Submission-Token`.
- Fără token → `401`. Token greșit / id necunoscut → `403` (același status, fără enumerare).

`@submission_owner_or_admin` acceptă oricare din cele două. `@admin_required` doar perechea cookie+CSRF.

## Endpoint-uri pentru boți — `X-Bot-Secret`

Rutele apelate de boți cer header `X-Bot-Secret` == `BOT_SHARED_SECRET`.

| Grup | Comportament dacă secretul NU e setat |
|---|---|
| Feedback (`/tg/feedback/*`) | **Tolerant** — trece (pentru dev local) |
| Exporturi (`/tg/exports/*`) | **STRICT** — `403` |

`BOT_SHARED_SECRET` trebuie să fie **identic** pe `backend`, `tgbot` și `groupbot`.

### De ce exporturile sunt gated STRICT, iar feedback-ul nu

Exporturile (`/tg/exports/*`) întorc **date PII** (nume, email, telefon ale lead-urilor) — o scurgere ar expune date personale, deci lipsa secretului trebuie să blocheze hard (`403`), nu să fie tolerată.

Feedback-ul transmite doar prompturi/răspunsuri text fără PII direct expus, așa că poate rula tolerant în dev (secret nesetat) fără risc echivalent. În producție, ambele au secretul setat.

## Criptare și anti-spoofing

- PII (`first_name`, `last_name`, `email`, `phone`) criptat **Fernet** cu `PII_ENCRYPTION_KEY`; se citește mereu prin model (decriptare transparentă).
- nginx **suprascrie** `X-Forwarded-For` cu IP-ul real (nu îl adaugă), deci XFF spoofat nu poate influența cheile de rate-limit. Backend: `ProxyFix(x_for=1)`.
- Headere de securitate (CSP, HSTS, nosniff etc.) setate pentru `/api_crowe_bizcheck/*`; CSP-ul SPA stă în `nginx.conf`.

## Recomandare operațională

Tokenurile și secretele (`JWT_SECRET`, `PII_ENCRYPTION_KEY`, `BOT_SHARED_SECRET`, parole admin) stau **DOAR** în `.env` pe server — niciodată în cod, în repo sau în chat. Folosiți placeholder-e în documentație, ex.:

```env
BOT_SHARED_SECRET=<secret-aici>
PII_ENCRYPTION_KEY=<cheie-fernet-aici>
```

## Surse

- `webdev/backend/server.py`
- `webdev/backend/routes/tg_admin.py`, `routes/tg_feedback.py`
- `webdev/CLAUDE.md`
