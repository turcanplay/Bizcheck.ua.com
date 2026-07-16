# Ukrainian language migration — deploy & handoff

**What this is:** the web app (`webdev/`) language set changed from **Romanian + Russian (RO/RU)** to **Ukrainian + Russian (UK/RU)**. Romanian is gone from the app; Ukrainian is the new default.

**Commit:** `i18n(webdev): replace Romanian with Ukrainian across the web app` (branch `main`).

**TL;DR for deploy:** pull `main`, then `docker compose up -d --build backend frontend tgbot groupbot`. The DB migration runs **automatically** at backend boot — do **not** run SQL by hand. Then do the [verification](#5-verify-after-deploy) checks.

---

## 1. What changed

| Layer | Change |
|---|---|
| **Frontend UI** | `i18n/translations.ts` is now UK+RU. `Lang = 'uk' \| 'ru'`. Default language is **UK** (was RU). |
| **Report prose** | `blockExplanations.ts`, `gdprExplanations.ts` translated to real Ukrainian. |
| **Privacy policy** | `privacyContent.ts` restructured from RO-only to **bilingual UK+RU**; the page renders per selected language. |
| **Admin panel** | All 19 `Admin*.tsx` screens translated RO → UK. |
| **SEO / meta** | `index.html`, `Seo.tsx`, `sitemap.xml`, hreflang/OG locale → Ukrainian. |
| **Backend services** | email templates, feedback prompts, report email, sales notification, Excel/PDF export → UK. Validators/whitelists/defaults now `'uk'`. |
| **Database** | Every bilingual `*_ro` column renamed to `*_uk`; stored `'ro'` language values relabeled to `'uk'`. Done by an **idempotent boot migration** (see §3). |
| **Telegram** | `webdev/tgbot/` (client bot) and `groupbot/` (team bot) strings → UK. |
| **Tests** | Suite updated to the UK contract; new `test_unit_migration.py` covers rename idempotency. Frontend build + **251 backend tests green** at commit time. |

The two standalone codebases are **not** affected: `src/` (original standalone bot) has its own DB and language and was left untouched.

---

## 2. Deploy steps

All commands from `~/BIZZCHECK_BOT/webdev` (adjust to your server path).

```bash
# 1. Get the code
git pull origin main

# 2. Rebuild the services that changed (db is untouched).
#    NOTE: this is broader than ./deploy.sh — that script only rebuilds
#    backend + groupbot, but frontend and tgbot ALSO changed this time.
docker compose up -d --build backend frontend tgbot groupbot

# 3. Watch the backend come up — the migration logs here.
docker compose logs -f backend
```

The backend runs `migrate()` at every boot (`webdev/backend/database/db.py`), which calls `migrate_ro_to_uk()`. No manual SQL, no separate migration command.

---

## 3. The database migration (what it does, why it's safe)

Function: `migrate_ro_to_uk(cur)` in `webdev/backend/database/db.py`, called from `migrate()` under `pg_advisory_xact_lock(1)` (serializes concurrent boots / multiple gunicorn workers).

It does two things:

1. **Renames columns** `*_ro → *_uk** on every bilingual table (tests, blocks, questions, answers, templates, content, etc.). Before each rename it checks `information_schema.columns`: it only renames when `*_ro` exists **and** `*_uk` does not. So:
   - First boot on the old DB → renames everything.
   - Any later boot → sees `*_uk` already there → does nothing.
   - Half-migrated / stale `*_ro` lingering next to a real `*_uk` → left alone (never renames twice).
2. **Relabels stored values** from `'ro'` to `'uk'`: `submissions.language`, `testimonials.lang`, `tg_outreach.lang`, and the `site_settings` feedback-prompt key `feedback_prompt_ro → feedback_prompt_uk`.

**Idempotent** — safe to run on every boot and across replicas. This is unit-tested (`test_unit_migration.py`: legacy DB renames all, second run is a no-op, half-migrated is left alone, missing table is skipped, stored values relabeled, prompt key renamed).

> ⚠️ **Not yet exercised against a live Postgres** — it was developed with Docker down, so the first real boot on the production DB is the true proof. Watch the backend logs on first deploy (§5). The design is defensive (guarded, idempotent), but confirm the first boot is clean before assuming done.

**Rollback note:** the migration only **renames** columns and **relabels** rows — it never drops data. If you must roll back the code, the old code expects `*_ro` columns; you'd rename them back (`ALTER TABLE ... RENAME COLUMN <col>_uk TO <col>_ro`) and relabel `'uk' → 'ro'`. Prefer rolling forward.

---

## 4. Still pending (needs the team)

1. **PDF cover assets** — drop two designed files into `webdev/frontend/public/pdf/`:
   - `preview_uk.pdf` (2-page cover)
   - `outro_uk.pdf` (closing page)

   Until they exist, the report PDF **falls back to the Russian covers** (`pdfGenerator.ts`) — nothing breaks, the report just shows the RU cover art. No code change needed when the files land; they're picked up by filename.
2. **Quiz content** (the actual test blocks/questions/answers stored in Postgres) is **not** translated — this was deliberately scoped out. Those rows still hold their original text under the renamed `*_uk` columns. Translating them is a separate content pass (best done via the admin panel or a seed update).

---

## 5. Verify after deploy

1. **Backend boot log** shows no error from `migrate_ro_to_uk` (no `column "..._ro" does not exist`, no rename exception). A clean second `docker compose restart backend` should log nothing new from the migration.
2. **DB spot-check** (optional):
   ```sql
   -- should return the *_uk columns, and zero *_ro columns
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'blocks' AND column_name LIKE 'title\_%';
   -- no rows should remain tagged 'ro'
   SELECT DISTINCT language FROM submissions;
   ```
3. **Public site** (`https://bizcheck.md`): loads in Ukrainian by default; the RU/UK switch works; the report, the privacy policy (`/confidentialitate`), and the quiz render with no Romanian.
4. **Admin panel** (`/admin_bizcheck_md_crowe/`): UI is Ukrainian; the field-language markers read `(UA)` / `(RU)`.
5. **Telegram**: client bot messages and the group bot (`/excel`, `/pdf`) reply in Ukrainian.

---

## 6. Notes / caveats

- **Romanian code comments** were intentionally left in place (developer-facing only, ~30 spots). They don't affect users. Cleaning them is cosmetic and can be a follow-up.
- `TemplatesShowcase` (marketplace section) is a placeholder feature and renders **Ukrainian only** by design (no RU branch yet) — unchanged behavior, just no longer Romanian.
- If a new external domain is ever added, remember the CSP lives in `webdev/nginx.conf`, not Flask (unchanged by this migration).
