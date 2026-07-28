/**
 * Static site-wide SEO constants — single source of truth.
 *
 * Lives in `src/config/` (not next to <Seo>) on purpose: Vite fast refresh only
 * works when a module exports components exclusively, so constants and schema
 * builders must not share a file with a component. `src/components/seo/siteMeta`
 * re-exports everything here for backwards compatibility with existing imports.
 */

/** Canonical origin of the public site. Import as `SITE_URL` anywhere a full
 *  absolute URL is needed (JSON-LD, OG images, sitemap).
 *  Not build-time env: this frontend has no `args:` block in docker-compose and
 *  its VITE_* vars are never passed at build time, so a literal is the only
 *  thing that actually ships. */
export const SITE_URL = 'https://bizcheck.ua.com';

/** Public brand name. Used in <title>, og:site_name, JSON-LD alternateName. */
export const BRAND = 'Bizcheck.ua.com';

/** Languages the SPA ships. `ru` was dropped — do not re-add it to hreflang. */
export const SUPPORTED_LANGS = ['uk', 'en'] as const;
export type SupportedLang = (typeof SUPPORTED_LANGS)[number];

/** Language served at `/` and advertised as hreflang x-default. */
export const DEFAULT_LANG: SupportedLang = 'uk';

/** Target market — Ukraine. Drives areaServed / addressCountry in JSON-LD. */
export const COUNTRY_CODE = 'UA';
export const COUNTRY_NAME = 'Ukraine';

/** Default price currency for Offer nodes. */
export const CURRENCY = 'UAH';

/** Default Open Graph / Twitter card image (full URL).
 *  TODO: this is the 512x512 app icon, not a 1200x630 social card — replace
 *  once a proper OG asset exists in `public/`. */
export const DEFAULT_IMAGE = `${SITE_URL}/android-chrome-512x512.png`;
export const DEFAULT_IMAGE_WIDTH = 512;
export const DEFAULT_IMAGE_HEIGHT = 512;

export const DEFAULT_TITLE_UK = 'Оцінка ризиків бізнесу онлайн · Bizcheck.ua.com';
export const DEFAULT_TITLE_EN = 'Business Risk Assessment Online · Bizcheck.ua.com';
export const DEFAULT_DESC_UK = 'Безкоштовна онлайн-оцінка ризиків бізнесу за методологією Crowe: тест за блоками, детальний PDF-звіт і юридичні шаблони для МСБ. Пройдіть тест зараз.';
export const DEFAULT_DESC_EN = 'Free online business risk assessment based on the Crowe methodology: a block-by-block test, a detailed PDF report and legal templates for SMEs. Start now.';

/** Publisher / author entity reused across JSON-LD payloads. */
export const ORG_NAME = 'Crowe Turcan Mikhailenko';
