/**
 * Yandex Metrica (counter 113890760).
 *
 * Not in index.html on purpose: the counter has no consent mode like Meta's
 * `fbq('consent', …)`, so the only GDPR-safe switch is to not load tag.js at
 * all until the visitor accepts „Статистика" in the cookie banner. The loader
 * below is the official snippet, run from applyAnalyticsConsent().
 *
 * Never on the admin panel: Webvisor records the DOM, and the admin pages show
 * decrypted lead PII.
 *
 * CSP for mc.yandex.ru / mc.yandex.com / yastatic.net lives in webdev/nginx.conf.
 */

declare global {
  interface Window {
    ym?: (...args: unknown[]) => void;
  }
}

export const METRICA_ID = 113890760;
const TAG_SRC = `https://mc.yandex.ru/metrika/tag.js?id=${METRICA_ID}`;
const ADMIN_PREFIX = '/admin_bizcheck_md_crowe';

let started = false;
let lastUrl = '';

function isAdminPath(pathname: string): boolean {
  return pathname.startsWith(ADMIN_PREFIX);
}

/** Loads tag.js and initialises the counter. Idempotent; no-op on the admin panel. */
export function startMetrica(): void {
  if (started || typeof window === 'undefined') return;
  if (isAdminPath(window.location.pathname)) return;
  started = true;
  lastUrl = window.location.href;

  /* eslint-disable */
  // Official Yandex.Metrika snippet. Only change besides typing: fall back to
  // <head> when the page has no <script> to insert before (jsdom in tests).
  (function (m: any, e: Document, t: string, r: string, i: string, k?: any, a?: any) {
    m[i] = m[i] || function () { (m[i].a = m[i].a || []).push(arguments); };
    m[i].l = 1 * (new Date() as any);
    for (let j = 0; j < document.scripts.length; j++) { if (document.scripts[j].src === r) { return; } }
    k = e.createElement(t), a = e.getElementsByTagName(t)[0], k.async = 1, k.src = r;
    if (a && a.parentNode) a.parentNode.insertBefore(k, a); else e.head.appendChild(k);
  })(window, document, 'script', TAG_SRC, 'ym');
  /* eslint-enable */

  window.ym?.(METRICA_ID, 'init', {
    ssr: true,
    webvisor: true,
    clickmap: true,
    ecommerce: 'dataLayer',
    referrer: document.referrer,
    url: location.href,
    accurateTrackBounce: true,
    trackLinks: true,
  });
}

/** Page view for an SPA navigation (the first view is counted by `init`). */
export function trackMetricaHit(url: string): void {
  if (!started || url === lastUrl) return;
  try {
    if (isAdminPath(new URL(url).pathname)) return;
  } catch {
    return;
  }
  window.ym?.(METRICA_ID, 'hit', url, { referer: lastUrl });
  lastUrl = url;
}
