/**
 * Static site-wide SEO constants.
 *
 * Lives outside Seo.tsx on purpose: Vite fast refresh only works when a module
 * exports components exclusively, so constants and schema builders must not
 * share a file with the <Seo> component.
 */

/** Canonical origin of the public site. Single source of truth — import as
 *  `SITE_URL` anywhere a full absolute URL is needed (JSON-LD, OG images).
 *  Not build-time env: this frontend has no `args:` block in docker-compose and
 *  its VITE_* vars are never passed at build time, so a literal is the only
 *  thing that actually ships. */
export const SITE_URL = 'https://bizcheck.ua.com';

/** Default Open Graph / Twitter card image (full URL). */
export const DEFAULT_IMAGE = `${SITE_URL}/android-chrome-512x512.png`;

export const DEFAULT_TITLE_UK = 'Bizcheck.md · Оцінка ризиків бізнесу · Crowe';
export const DEFAULT_TITLE_EN = 'Bizcheck.md · Business Risk Assessment · Crowe';
export const DEFAULT_DESC_UK = 'Bizcheck.md — онлайн-платформа самодіагностики ризиків бізнесу за методологією Crowe. Тести за блоками, детальний звіт PDF, юридичні шаблони для МСБ.';
export const DEFAULT_DESC_EN = 'Bizcheck.md is an online platform for self-diagnosing business risks based on the Crowe methodology. Block-based tests, a detailed PDF report, and legal templates for SMEs.';

/** Publisher / author entity reused across JSON-LD payloads. */
export const ORG_NAME = 'Crowe Turcan Mikhailenko';
