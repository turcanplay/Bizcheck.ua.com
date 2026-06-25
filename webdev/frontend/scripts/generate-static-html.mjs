#!/usr/bin/env node
/**
 * Lightweight pseudo-prerender for Bizcheck.md.
 *
 * Vite/Rolldown does not yet have a stable prerender plugin, and Puppeteer is
 * heavy for a CI-only need. So we cheat: for each known static route we
 * duplicate the build's index.html into <route>/index.html with route-specific
 * <title>, <meta description>, <link canonical>, and OG tags injected.
 *
 * Result: when a crawler hits /confidentialitate directly (no JS execution),
 * it gets HTML with the right meta tags before the SPA boots. Real users still
 * see the SPA — nginx try_files falls back to index.html if the route file
 * isn't there, and we ship the route file so they get the meta-rich variant.
 *
 * For dynamic routes (/sablon/:slug, /test/:slug) this would require a live
 * API call — left for a future iteration once the SPA hydration is verified
 * not to break with prefilled meta.
 */
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const DIST = resolve(__dirname, '..', 'dist');
const SITE = (process.env.SITEMAP_BASE_URL || 'https://bizcheck.md').replace(/\/$/, '');

const ROUTES = [
  {
    path: '/confidentialitate',
    title: 'Politica de confidențialitate · Bizcheck.md',
    description: 'Politica de prelucrare a datelor personale, cookies și condițiile de utilizare ale platformei Bizcheck.md de la Crowe Turcan Mikhailenko.',
  },
  // /sablon/:slug and /test/:slug are dynamic — skipped here. SPA + Helmet
  // handles meta in the browser; Google's JS renderer still picks them up.
];

if (!existsSync(DIST)) {
  console.error('[prerender] dist/ does not exist — run vite build first');
  process.exit(0); // not fatal: build script will report its own failures
}

const indexHtml = readFileSync(resolve(DIST, 'index.html'), 'utf-8');

function patchHtml(html, route) {
  const url = `${SITE}${route.path}`;
  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${route.title}</title>`)
    .replace(/<meta name="description" content="[^"]*"/, `<meta name="description" content="${route.description}"`)
    .replace(/<link rel="canonical" href="[^"]*"/, `<link rel="canonical" href="${url}"`)
    .replace(/<meta property="og:url" content="[^"]*"/, `<meta property="og:url" content="${url}"`)
    .replace(/<meta property="og:title" content="[^"]*"/, `<meta property="og:title" content="${route.title}"`)
    .replace(/<meta property="og:description" content="[^"]*"/, `<meta property="og:description" content="${route.description}"`)
    .replace(/<meta name="twitter:title" content="[^"]*"/, `<meta name="twitter:title" content="${route.title}"`)
    .replace(/<meta name="twitter:description" content="[^"]*"/, `<meta name="twitter:description" content="${route.description}"`);
}

let count = 0;
for (const route of ROUTES) {
  const dir = resolve(DIST, route.path.replace(/^\//, ''));
  mkdirSync(dir, { recursive: true });
  writeFileSync(resolve(dir, 'index.html'), patchHtml(indexHtml, route), 'utf-8');
  count += 1;
}

console.log(`[prerender] wrote ${count} static route HTML file(s)`);
