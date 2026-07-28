/**
 * Cookie consent storage.
 *
 * Bumping CONSENT_VERSION re-triggers the banner for everyone (use when the
 * privacy policy materially changes — new vendor, new category, etc.).
 */

declare global {
  interface Window {
    // fbq e injectat de snippet-ul inline Meta Pixel din index.html.
    fbq?: (...args: unknown[]) => void;
  }
}

export const CONSENT_COOKIE = 'bizcheck_cookie_consent';
export const CONSENT_VERSION = 1;
const ONE_YEAR_DAYS = 365;

export interface CookieConsent {
  necessary: true;          // always true — locked
  analytics: boolean;
  marketing: boolean;
  version: number;
  ts: string;               // ISO timestamp of the user's choice
}

export const DEFAULT_CONSENT: CookieConsent = {
  necessary: true,
  analytics: false,
  marketing: false,
  version: CONSENT_VERSION,
  ts: '',
};

function setCookie(name: string, value: string, days: number) {
  const expires = new Date(Date.now() + days * 86400_000).toUTCString();
  // SameSite=Lax so the cookie survives normal navigation but isn't sent on
  // cross-site POSTs. Secure when served over HTTPS (browser drops Secure on
  // localhost http:, which is the desired dev behavior).
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${name}=${encodeURIComponent(value)}; expires=${expires}; path=/; SameSite=Lax${secure}`;
}

function readCookie(name: string): string | null {
  const prefix = `${name}=`;
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) return decodeURIComponent(trimmed.slice(prefix.length));
  }
  return null;
}

export function loadConsent(): CookieConsent | null {
  const raw = readCookie(CONSENT_COOKIE);
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as Partial<CookieConsent>;
    if (parsed.version !== CONSENT_VERSION) return null;   // stale → re-ask
    return {
      necessary: true,
      analytics: !!parsed.analytics,
      marketing: !!parsed.marketing,
      version: CONSENT_VERSION,
      ts: typeof parsed.ts === 'string' ? parsed.ts : '',
    };
  } catch {
    return null;
  }
}

/**
 * Comută consimțământul Meta Pixel după alegerea de marketing. Nu face nimic dacă fbq
 * nu e încărcat. Pixelul pornește în 'revoke' din index.html; aici îl actualizăm.
 */
export function applyMarketingConsent(granted: boolean) {
  window.fbq?.('consent', granted ? 'grant' : 'revoke');
}

let analyticsGranted = false;

/**
 * Aplică consimțământul „Statistici" (analytics).
 *
 * Yandex Metrica a fost eliminată la lansarea pe piața din Ucraina: `mc.yandex.ru`
 * este blocat acolo, deci scriptul nu s-ar încărca oricum. Categoria „analytics"
 * rămâne în banner pentru că politica de confidențialitate o descrie și pentru că
 * următorul furnizor (Google Analytics 4) se conectează exact aici — momentan nu
 * se mai injectează niciun tag, doar se reține alegerea.
 */
export function applyAnalyticsConsent(granted: boolean) {
  analyticsGranted = granted;
}

/** Ultima alegere „Statistici" aplicată în sesiunea curentă. Punctul de verificare
 *  pentru orice furnizor de analytics adăugat ulterior (ex. GA4). */
export function isAnalyticsGranted(): boolean {
  return analyticsGranted;
}

export function saveConsent(consent: Omit<CookieConsent, 'necessary' | 'version' | 'ts'>) {
  const full: CookieConsent = {
    necessary: true,
    analytics: consent.analytics,
    marketing: consent.marketing,
    version: CONSENT_VERSION,
    ts: new Date().toISOString(),
  };
  setCookie(CONSENT_COOKIE, JSON.stringify(full), ONE_YEAR_DAYS);
  applyMarketingConsent(full.marketing);   // marketing → Meta Pixel
  applyAnalyticsConsent(full.analytics);   // statistici → (niciun furnizor conectat)
  return full;
}

export function clearConsent() {
  // Set expired so the banner shows again on next mount.
  setCookie(CONSENT_COOKIE, '', -1);
}