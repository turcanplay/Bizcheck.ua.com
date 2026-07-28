/**
 * Build-time twin of `src/i18n/routing.ts` + the language bits of
 * `src/config/siteMeta.ts`.
 *
 * The Node scripts (`generate-sitemap.mjs`, `generate-static-html.mjs`) run
 * before/after Vite and cannot import TypeScript, so the handful of URL rules
 * they need is mirrored here. Keep in sync with the TS versions — if you add a
 * language or move a route, both files change.
 */

export const SITE_URL = 'https://bizcheck.ua.com';
export const BRAND = 'Bizcheck.ua.com';
export const SUPPORTED_LANGS = ['uk', 'en'];
export const DEFAULT_LANG = 'uk';

export function isLang(value) {
  return SUPPORTED_LANGS.includes(value);
}

function normalize(path) {
  const p = `/${String(path ?? '').replace(/^\/+/, '')}`;
  if (p === '/') return '/';
  return p.replace(/\/+$/, '') || '/';
}

/** Drop a leading `/uk` or `/en`. Idempotent. */
export function stripLangPrefix(pathname) {
  const segments = normalize(pathname).split('/');
  if (isLang(segments[1])) {
    const rest = segments.slice(2).join('/');
    return rest ? `/${rest}` : '/';
  }
  return normalize(pathname);
}

/** `('/privacy', 'en')` → `/en/privacy`; `('/', 'uk')` → `/uk/`. */
export function localizePath(path, lang) {
  const base = stripLangPrefix(path);
  return base === '/' ? `/${lang}/` : `/${lang}${base}`;
}

export function localizedUrl(basePath, lang) {
  return `${SITE_URL}${localizePath(basePath, lang)}`;
}

/** Full hreflang set for one page: every language + x-default → DEFAULT_LANG. */
export function alternateLinks(basePath) {
  const base = stripLangPrefix(basePath);
  return [
    ...SUPPORTED_LANGS.map(l => ({ hrefLang: l, href: localizedUrl(base, l) })),
    { hrefLang: 'x-default', href: localizedUrl(base, DEFAULT_LANG) },
  ];
}

/**
 * Language-neutral base paths that always exist, regardless of what the API
 * says. Everything else (tests, templates) is fetched at build time.
 */
export const STATIC_BASE_PATHS = [
  { path: '/',        changefreq: 'weekly', priority: '1.0' },
  { path: '/privacy', changefreq: 'yearly', priority: '0.4' },
];

/**
 * Fetch the public test + template lists and turn them into base paths.
 * Returns `[]` (never throws) when `apiUrl` is empty or the backend is down —
 * an offline build must still produce a valid sitemap.
 */
export async function fetchDynamicBasePaths(apiUrl) {
  if (!apiUrl) return [];
  const api = apiUrl.replace(/\/$/, '');

  const fetchJson = async (url) => {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (!res.ok) return null;
      return await res.json();
    } catch {
      return null;
    }
  };

  const out = [];

  // GET /api_crowe_bizcheck/templates — public list, already filtered to active.
  const templates = await fetchJson(`${api}/templates`);
  for (const t of templates?.templates ?? []) {
    if (t?.slug) {
      out.push({ path: `/templates/${t.slug}`, changefreq: 'monthly', priority: '0.7' });
    }
  }

  // GET /api_crowe_bizcheck/tests — public list; `is_active` is echoed back.
  const tests = await fetchJson(`${api}/tests`);
  for (const t of tests?.tests ?? []) {
    if (t?.slug && t.is_active !== false) {
      out.push({ path: `/test/${t.slug}`, changefreq: 'monthly', priority: '0.8' });
    }
  }

  return out;
}
