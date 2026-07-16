# Language migration — deploy & handoff

**What this is:** the web app (`webdev/`) language set was migrated **twice**, in two commits:

1. **RO → UK** — Romanian replaced by Ukrainian.
2. **RU → EN** — Russian replaced by English.

**End state: the app is bilingual Ukrainian + English (`uk` / `en`), default `uk`.** Romanian and Russian are both gone. Ukrainian is untouched by the second migration.

**TL;DR for deploy:** pull `main`, then `docker compose up -d --build backend frontend tgbot groupbot`. **Two** DB migrations run automatically at backend boot, in order — do **not** run SQL by hand. Then do the [verification](#5-verify-after-deploy) checks.

> If you are deploying both migrations in a single pull (the DB has never seen either), the boot runs `migrate_ro_to_uk` then `migrate_ru_to_en` — `_ro`→`_uk` and `_ru`→`_en` — ending at `_uk` + `_en` columns. Both are idempotent, so a DB already partway through is fine.

---

## 1. What changed

| Layer | Change |
|---|---|
| **Frontend UI** | `i18n/translations.ts` is UK+EN. `Lang = 'uk' \| 'en'`. Default **UK**. Language switcher shows **UA / EN**. |
| **Report prose** | `blockExplanations.ts`, `gdprExplanations.ts` — Ukrainian + English. |
| **Privacy policy** | `privacyContent.ts` is bilingual UK+EN; the page renders per language. |
| **Admin panel** | All `Admin*.tsx` editors: chrome in Ukrainian, per-item fields are **(UA)** + **(EN)**. |
| **SEO / meta** | `index.html`, `Seo.tsx`, `sitemap.xml` → `uk` + `en` (hreflang, `og:locale` `uk_UA` / `en_US`). |
| **Backend services** | email, feedback prompts, report email, sales notification, Excel/PDF export → UK/EN. Validators whitelist is `('uk','en')`. |
| **Database** | Bilingual columns are `*_uk` + `*_en`. Two idempotent boot migrations do the renames (see §3). |
| **Telegram** | `webdev/tgbot/` (client bot) and `groupbot/` (team bot) → UK/EN. |
| **PDF covers** | `preview_ru.pdf`/`outro_ru.pdf` renamed to `*_en.pdf`. EN users get them directly; UK falls back to `preview_en.pdf` until `preview_uk.pdf` is designed. |
| **Tests** | Suite on the UK/EN contract; migration idempotency covered for **both** renames. Frontend build + **259 backend tests** green. No Romanian or Russian text remains. |

The standalone `src/` bot (own DB, own language) is **not** affected.

---

## 2. Deploy steps

From `~/BIZZCHECK_BOT/webdev` (adjust to your server path):

```bash
git pull origin main

# Rebuild everything that changed (db container is untouched).
# NOTE: broader than ./deploy.sh (which only does backend + groupbot) —
# frontend and tgbot changed too.
docker compose up -d --build backend frontend tgbot groupbot

# Watch the backend boot — both migrations log here.
docker compose logs -f backend
```

No manual SQL, no separate migration command. `migrate()` runs at every boot from `webdev/backend/database/db.py`.

---

## 3. The database migrations (what they do, why they're safe)

Both live in `webdev/backend/database/db.py` and are called in order from `migrate()` under `pg_advisory_xact_lock(1)` (serializes concurrent boots / gunicorn workers):

```python
migrate_ro_to_uk(cur)   # *_ro -> *_uk, stored 'ro' -> 'uk'
migrate_ru_to_en(cur)   # *_ru -> *_en, stored 'ru' -> 'en'
```

Each one:

1. **Renames columns** on every bilingual table (tests, blocks, questions, answers, templates, testimonials, faq_items). Before each rename it checks `information_schema.columns` and only renames when the old column exists **and** the new one does not. So a fresh DB (created with `_uk`/`_en` directly) matches nothing, a re-boot matches nothing, and a stale old column sitting next to a real new one is left alone. Both functions reuse the same `RO_TO_UK_COLUMNS` table/column list.
2. **Relabels stored values**: `submissions.language`, `testimonials.lang`, `tg_outreach.lang`, and the `site_settings` feedback-prompt key (`feedback_prompt_ro→_uk`, `feedback_prompt_ru→_en`).

**Idempotent** — safe on every boot and across replicas. Unit-tested in `webdev/backend/tests/test_unit_migration.py` (both `TestRoToUkMigration` and `TestRuToEnMigration`: legacy DB renames all, second run is a no-op, half-migrated left alone, missing table skipped, stored values relabeled, prompt key renamed).

> ⚠️ **Not yet exercised against a live Postgres** (developed with Docker down). The first real boot on the production DB is the true proof — watch the backend logs (§5). The design is defensive, but confirm the first boot is clean before assuming done.

**Rollback note:** the migrations only **rename** columns and **relabel** rows — no data is dropped. Rolling back the code would require renaming columns back and relabeling values; prefer rolling forward.

---

## 4. Still pending (needs the team)

1. **PDF cover assets** — drop `preview_uk.pdf` and `outro_uk.pdf` into `webdev/frontend/public/pdf/`. Until then UK reports fall back to the `*_en.pdf` covers (the old designed covers, renamed) — nothing breaks. Picked up by filename, no code change needed.
2. **Quiz content** (the test blocks/questions/answers rows in Postgres) is **not** translated — deliberately scoped out. Those rows keep their text under the renamed `*_uk` / `*_en` columns. A separate content pass (admin panel or seed) handles them.

---

## 5. Verify after deploy

1. **Backend boot log**: no error from `migrate_ro_to_uk` or `migrate_ru_to_en` (no `column "..._ro"/"..._ru" does not exist`). A second `docker compose restart backend` should log nothing new from either migration.
2. **DB spot-check** (optional):
   ```sql
   -- expect *_uk and *_en columns, and zero *_ro / *_ru
   SELECT column_name FROM information_schema.columns
   WHERE table_name = 'blocks' AND column_name LIKE 'title\_%';
   -- stored language values should be only uk / en
   SELECT DISTINCT language FROM submissions;
   ```
3. **Public site** (`https://bizcheck.md`): loads in Ukrainian by default; the **UA / EN** switch works; report, privacy policy (`/confidentialitate`) and quiz show no Romanian or Russian.
4. **Admin panel** (`/admin_bizcheck_md_crowe/`): UI is Ukrainian; per-item field markers read **(UA)** / **(EN)**.
5. **Telegram**: client bot and the group bot (`/excel`, `/pdf`) reply in Ukrainian.

---

## 6. Notes / caveats

- **Romanian code comments** (developer-facing, not user-facing) were intentionally left in place. Cosmetic; can be a follow-up.
- `TemplatesShowcase` (marketplace section) renders **Ukrainian only** by design.
- Adding a language later means the DB carries **two** bilingual slots by design (`_uk` + `_en`); a third would need new columns and 3-way frontend logic.
- CSP lives in `webdev/nginx.conf` (not Flask), unchanged by these migrations.
