/**
 * Language-prefixed URL helpers — the single source of truth for how a path
 * maps to a language and back.
 *
 * URL scheme (see App.tsx):
 *
 *   /                       → 301-equivalent redirect to /<preferred>/
 *   /uk/                    landing (uk)          /en/
 *   /uk/test/:slug          quiz                  /en/test/:slug
 *   /uk/templates/:slug     template detail       /en/templates/:slug
 *   /uk/privacy             privacy policy        /en/privacy
 *   /uk/checkout/:kind/:slug checkout             /en/checkout/:kind/:slug
 *
 * Admin (`/admin_bizcheck_md_crowe/**`) is deliberately NOT localized — it is
 * noindex, staff-only, and its deep links are pasted around internally.
 *
 * A "base path" in this module always means the language-NEUTRAL path, i.e.
 * what is left after the `/uk` or `/en` prefix is removed. `localizePath()`
 * puts a prefix back on. Everything (LanguageContext, <Seo>, the sitemap and
 * prerender scripts) goes through these two functions so the canonical URL,
 * the hreflang alternates and the actual router all agree.
 *
 * NOTE: `scripts/lib/routing.mjs` mirrors this file for the build-time Node
 * scripts (they cannot import TypeScript). Keep the two in sync.
 */
import { SUPPORTED_LANGS, DEFAULT_LANG, SITE_URL } from '@/config/siteMeta';
import type { Lang } from '@/i18n/translations';

export { SUPPORTED_LANGS, DEFAULT_LANG, SITE_URL };
export type { Lang };

/** Route prefixes that must never receive a language segment. */
export const NON_LOCALIZED_PREFIXES = ['/admin_bizcheck_md_crowe'] as const;

/** localStorage key holding the last language the visitor actually used.
 *  Only consulted to decide where `/` redirects to — never as the truth for
 *  the currently rendered language (that is always the URL). */
export const LANG_STORAGE_KEY = 'bizcheck_lang';

export function isLang(value: unknown): value is Lang {
  return typeof value === 'string' && (SUPPORTED_LANGS as readonly string[]).includes(value);
}

/** Normalize to a single leading slash, no trailing slash (except the root). */
function normalize(path: string): string {
  const p = `/${String(path ?? '').replace(/^\/+/, '')}`;
  if (p === '/') return '/';
  return p.replace(/\/+$/, '') || '/';
}

/** `true` for paths that live outside the localized route tree (admin). */
export function isLocalizableRoute(pathname: string): boolean {
  const p = normalize(pathname);
  return !NON_LOCALIZED_PREFIXES.some(prefix => p === prefix || p.startsWith(`${prefix}/`));
}

/**
 * The language encoded in the URL, or `null` when the path carries no prefix
 * (`/`, a legacy path, an admin path, an unknown first segment).
 */
export function langFromPath(pathname: string): Lang | null {
  if (!isLocalizableRoute(pathname)) return null;
  const first = normalize(pathname).split('/')[1] ?? '';
  return isLang(first) ? first : null;
}

/** Drop a leading `/uk` or `/en`. Idempotent; always returns a rooted path. */
export function stripLangPrefix(pathname: string): string {
  const p = normalize(pathname);
  const segments = p.split('/');          // ['', 'uk', 'privacy']
  if (isLang(segments[1])) {
    const rest = segments.slice(2).join('/');
    return rest ? `/${rest}` : '/';
  }
  return p;
}

/**
 * Put `lang` in front of a base path.
 *
 * The landing keeps its trailing slash (`/uk/`) because that is the canonical
 * form we advertise and the one the prerendered `dist/uk/index.html` is served
 * at; every deeper page is slash-less (`/uk/privacy`).
 *
 * Paths outside the localized tree (admin) are returned untouched.
 */
export function localizePath(path: string, lang: Lang): string {
  if (!isLocalizableRoute(path)) return normalize(path);
  const base = stripLangPrefix(path);
  return base === '/' ? `/${lang}/` : `/${lang}${base}`;
}

/** Absolute, canonical URL for an already-localized path. */
export function absoluteUrl(path: string): string {
  return `${SITE_URL}${normalize(path) === '/' ? '/' : path}`;
}

/** Absolute URL of `basePath` in `lang`. */
export function localizedUrl(basePath: string, lang: Lang): string {
  return `${SITE_URL}${localizePath(basePath, lang)}`;
}

/**
 * The full hreflang set for one page: one entry per supported language plus
 * `x-default` pointing at the default language. Feed straight into <link>s.
 */
export function alternateLinks(basePath: string): { hrefLang: string; href: string }[] {
  const base = stripLangPrefix(basePath);
  return [
    ...SUPPORTED_LANGS.map(l => ({ hrefLang: l, href: localizedUrl(base, l) })),
    { hrefLang: 'x-default', href: localizedUrl(base, DEFAULT_LANG) },
  ];
}

/** Last language the visitor used, if we ever stored one. */
export function readStoredLang(): Lang | null {
  try {
    const saved = localStorage.getItem(LANG_STORAGE_KEY);
    return isLang(saved) ? saved : null;
  } catch {
    return null;   // private mode / storage disabled
  }
}

export function writeStoredLang(lang: Lang): void {
  try {
    localStorage.setItem(LANG_STORAGE_KEY, lang);
  } catch {
    /* non-fatal — the URL still carries the language */
  }
}
