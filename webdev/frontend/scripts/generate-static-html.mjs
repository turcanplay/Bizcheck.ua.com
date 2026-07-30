#!/usr/bin/env node
/**
 * Lightweight pseudo-prerender for Bizcheck.com.ua.
 *
 * Vite/Rolldown does not yet have a stable prerender plugin, and Puppeteer is
 * heavy for a CI-only need. So we cheat: for each known route × language we
 * duplicate the build's index.html into <route>/index.html with route-specific
 * <html lang>, <title>, description, canonical, hreflang and OG tags injected.
 *
 * Result: a crawler hitting /en/privacy directly (no JS execution) already gets
 * English HTML with an English canonical and a correct alternate pointing at
 * /uk/privacy. Real users still get the SPA — nginx `try_files $uri $uri/
 * /index.html` serves the prerendered file when it exists and the SPA shell
 * otherwise, and React Helmet re-applies the same tags after hydration.
 *
 * Dynamic routes (tests, templates) are included when SITEMAP_API_URL is set;
 * without it they are skipped, exactly like the sitemap.
 *
 * Runs after `vite build` (see package.json).
 *   $ node scripts/generate-static-html.mjs
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import {
  SITE_URL as DEFAULT_SITE,
  BRAND,
  SUPPORTED_LANGS,
  fetchDynamicBasePaths,
  localizePath,
  alternateLinks,
} from './lib/routing.mjs';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(__dirname, '..', 'dist');
const SITE = (process.env.SITEMAP_BASE_URL || DEFAULT_SITE).replace(/\/$/, '');
const API  = (process.env.SITEMAP_API_URL  || '').replace(/\/$/, '');

/**
 * Static routes, keyed by language-neutral base path.
 *
 * Copy is per language and only per language — no Romanian anywhere; this site
 * ships Ukrainian and English. Keep in sync with the <Seo> props on the
 * matching page component so the prerendered head and the hydrated head agree
 * (a mismatch is not fatal, but it wastes crawl budget on a re-render).
 */
const STATIC_ROUTES = [
  {
    path: '/',
    uk: {
      title: 'Оцінка ризиків бізнесу онлайн · Bizcheck.com.ua',
      description: 'Безкоштовна онлайн-оцінка ризиків бізнесу за методологією Crowe: тест за блоками, детальний PDF-звіт і юридичні шаблони для МСБ. Пройдіть тест зараз.',
    },
    en: {
      title: 'Business Risk Assessment Online · Bizcheck.com.ua',
      description: 'Free online business risk assessment based on the Crowe methodology: a block-by-block test, a detailed PDF report and legal templates for SMEs. Start now.',
    },
  },
  {
    path: '/privacy',
    uk: {
      title: 'Політика конфіденційності · Bizcheck.com.ua',
      description: 'Політика обробки персональних даних, cookies та умови використання платформи Bizcheck.com.ua від Crowe Turcan Mikhailenko.',
    },
    en: {
      title: 'Privacy Policy · Bizcheck.com.ua',
      description: 'Personal data processing policy, cookies and terms of use of the Bizcheck.com.ua platform by Crowe Turcan Mikhailenko.',
    },
  },
];

const OG_LOCALE = { uk: 'uk_UA', en: 'en_US' };

if (!existsSync(DIST)) {
  console.error('[prerender] dist/ does not exist — run vite build first');
  process.exit(0); // not fatal: build script will report its own failures
}

const indexHtml = readFileSync(resolve(DIST, 'index.html'), 'utf-8');

/** HTML-attribute-safe. Titles come from the DB for dynamic routes. */
function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const missing = new Set();

/** Replace once; remember (don't spam) when the anchor is gone from index.html. */
function sub(html, re, replacement, label) {
  if (!re.test(html)) {
    missing.add(label);
    return html;
  }
  return html.replace(re, replacement);
}

function patchHtml(html, basePath, lang, meta) {
  const url = `${SITE}${localizePath(basePath, lang)}`;
  const title = esc(meta.title);
  const description = esc(meta.description);
  const other = SUPPORTED_LANGS.find(l => l !== lang) ?? lang;

  const hreflangs = alternateLinks(basePath)
    .map(a => `    <link rel="alternate" hreflang="${a.hrefLang}" href="${a.href.replace(DEFAULT_SITE, SITE)}" />`)
    .join('\n');

  let out = html;
  out = sub(out, /<html lang="[^"]*"/, `<html lang="${lang}"`, '<html lang>');
  out = sub(out, /<title>[^<]*<\/title>/, `<title>${title}</title>`, '<title>');
  out = sub(out, /<meta name="description" content="[^"]*"/, `<meta name="description" content="${description}"`, 'description');
  out = sub(out, /<link rel="canonical" href="[^"]*"/, `<link rel="canonical" href="${url}"`, 'canonical');

  // Collapse the whole run of alternates in the template into this page's set.
  out = sub(
    out,
    /(?:[ \t]*<link rel="alternate" hreflang="[^"]*" href="[^"]*"[^>]*>\s*)+/,
    `${hreflangs}\n\n    `,
    'hreflang block',
  );

  out = sub(out, /<meta property="og:url" content="[^"]*"/, `<meta property="og:url" content="${url}"`, 'og:url');
  out = sub(out, /<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${title}"`, 'og:title');
  out = sub(out, /<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${description}"`, 'og:description');
  out = sub(out, /<meta property="og:site_name" content="[^"]*"/, `<meta property="og:site_name" content="${esc(BRAND)}"`, 'og:site_name');
  out = sub(out, /<meta property="og:locale" content="[^"]*"/, `<meta property="og:locale" content="${OG_LOCALE[lang]}"`, 'og:locale');
  out = sub(out, /<meta property="og:locale:alternate" content="[^"]*"/, `<meta property="og:locale:alternate" content="${OG_LOCALE[other]}"`, 'og:locale:alternate');
  out = sub(out, /<meta name="twitter:title" content="[^"]*"/, `<meta name="twitter:title" content="${title}"`, 'twitter:title');
  out = sub(out, /<meta name="twitter:description" content="[^"]*"/, `<meta name="twitter:description" content="${description}"`, 'twitter:description');
  return out;
}

function write(basePath, lang, meta) {
  // `/` → dist/uk/index.html ; `/privacy` → dist/uk/privacy/index.html
  const dir = resolve(DIST, localizePath(basePath, lang).replace(/^\//, '').replace(/\/$/, ''));
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'index.html'), patchHtml(indexHtml, basePath, lang, meta), 'utf-8');
}

/** Per-language meta for a test / template pulled from the public API. */
function dynamicMeta(item, kind, lang) {
  const name = lang === 'en'
    ? (item.name_en || item.title_en || item.name_uk || item.title_uk)
    : (item.name_uk || item.title_uk);
  const desc = lang === 'en'
    ? (item.description_en || item.description_uk)
    : (item.description_uk || item.description_en);

  const fallback = kind === 'test'
    ? (lang === 'en'
        ? `Take the "${name}" test on ${BRAND} and get a detailed report on your business risks.`
        : `Пройдіть тест «${name}» на ${BRAND} і отримайте детальний звіт про ризики вашого бізнесу.`)
    : (lang === 'en'
        ? `Legal template "${name}" by Crowe Turcan Mikhailenko on the ${BRAND} platform.`
        : `Юридичний шаблон «${name}» від Crowe Turcan Mikhailenko на платформі ${BRAND}.`);

  return {
    title: `${name} · ${BRAND} · Crowe`,
    description: (desc || '').trim().slice(0, 160) || fallback,
  };
}

/** Fetch the raw public lists so titles/descriptions come along too. */
async function fetchDynamicRoutes() {
  if (!API) return [];
  const paths = await fetchDynamicBasePaths(API);
  if (paths.length === 0) return [];

  const get = async (url) => {
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
      return res.ok ? await res.json() : null;
    } catch { return null; }
  };

  const [tests, templates] = await Promise.all([get(`${API}/tests`), get(`${API}/templates`)]);
  const bySlug = new Map();
  for (const t of tests?.tests ?? []) bySlug.set(`/test/${t.slug}`, { item: t, kind: 'test' });
  for (const t of templates?.templates ?? []) bySlug.set(`/templates/${t.slug}`, { item: t, kind: 'template' });

  return paths
    .filter(p => bySlug.has(p.path))
    .map(p => {
      const { item, kind } = bySlug.get(p.path);
      const route = { path: p.path };
      for (const lang of SUPPORTED_LANGS) route[lang] = dynamicMeta(item, kind, lang);
      return route;
    });
}

(async () => {
  const dynamicRoutes = await fetchDynamicRoutes();
  const routes = [...STATIC_ROUTES, ...dynamicRoutes];

  let count = 0;
  for (const route of routes) {
    for (const lang of SUPPORTED_LANGS) {
      const meta = route[lang];
      if (!meta) continue;
      write(route.path, lang, meta);
      count += 1;
    }
  }

  console.log(
    `[prerender] wrote ${count} static route HTML file(s) — `
    + `${STATIC_ROUTES.length} static + ${dynamicRoutes.length} dynamic page(s) × ${SUPPORTED_LANGS.length} languages`,
  );
  if (missing.size) {
    console.warn(
      `[prerender] index.html no longer contains: ${[...missing].join(', ')} — `
      + 'those tags were NOT patched. Update the regexes in this script.',
    );
  }
  if (!API) {
    console.warn(
      '[prerender] SITEMAP_API_URL not set → test and template pages were not prerendered. '
      + 'They still work (Helmet fills the head client-side), but crawlers see the generic shell.',
    );
  }
})();
