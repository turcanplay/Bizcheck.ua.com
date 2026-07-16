import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { CookieConsentProvider, useCookieConsent } from './CookieConsentContext';
import CookieBanner from '@/components/ui/CookieBanner';
import { LanguageProvider } from '@/context/LanguageContext';
import { translations } from '@/i18n/translations';
import { CONSENT_COOKIE, CONSENT_VERSION, loadConsent } from '@/utils/cookieConsent';

/**
 * Behaviour tests for the cookie consent path.
 *
 * This is the one flow here with legal consequence, so the contract under test
 * is deliberately about *observable* behaviour, not implementation:
 *
 *   - no stored decision  -> the banner is shown
 *   - a stored decision   -> the banner stays hidden, and the stored choice is
 *                            re-applied to the third-party tags
 *   - accepting/rejecting -> persists to the cookie AND hides the banner
 *
 * Note the consent is stored in a COOKIE (`bizcheck_cookie_consent`), not in
 * localStorage — see src/utils/cookieConsent.ts. jsdom implements document.cookie
 * for real, so these tests drive the actual storage rather than a mock of it.
 */

/** Write the consent cookie exactly the way saveConsent() does. */
function seedConsentCookie(partial: Record<string, unknown>) {
  document.cookie = `${CONSENT_COOKIE}=${encodeURIComponent(JSON.stringify(partial))}; path=/`;
}

function clearAllCookies() {
  for (const part of document.cookie.split(';')) {
    const name = part.split('=')[0].trim();
    if (name) document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`;
  }
}

function renderBanner(lang: 'uk' | 'en' = 'uk') {
  localStorage.setItem('bizcheck_lang', lang);
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <CookieConsentProvider>
          <CookieBanner />
        </CookieConsentProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );
}

const banner = () => screen.queryByRole('dialog', { name: /cookie consent/i });
const btn = (key: 'cookieAcceptAll' | 'cookieRejectAll' | 'cookieCustomize' | 'cookieSave', lang: 'uk' | 'en' = 'uk') =>
  screen.getByRole('button', { name: new RegExp(translations[key][lang], 'i') });

// fbq / ym are injected by index.html in production; stub them so the
// apply*Consent calls have something to talk to and can be asserted on.
type Fbq = NonNullable<Window['fbq']>;
let fbqSpy: Mock<Fbq>;

beforeEach(() => {
  clearAllCookies();
  fbqSpy = vi.fn<Fbq>();
  window.fbq = fbqSpy;
});

afterEach(() => {
  clearAllCookies();
  localStorage.clear();
  delete window.fbq;
  vi.restoreAllMocks();
});

describe('cookie consent', () => {
  describe('banner visibility', () => {
    it('shows the banner when there is no stored consent', () => {
      renderBanner();

      expect(banner()).toBeInTheDocument();
      expect(screen.getByText(translations.cookieTitle.uk)).toBeInTheDocument();
    });

    it('hides the banner when consent was previously given', () => {
      seedConsentCookie({
        necessary: true, analytics: true, marketing: true,
        version: CONSENT_VERSION, ts: new Date().toISOString(),
      });

      renderBanner();

      expect(banner()).not.toBeInTheDocument();
    });

    it('hides the banner when the stored decision was a rejection', () => {
      // "Decided" is not the same as "accepted" — a stored reject must not re-prompt.
      seedConsentCookie({
        necessary: true, analytics: false, marketing: false,
        version: CONSENT_VERSION, ts: new Date().toISOString(),
      });

      renderBanner();

      expect(banner()).not.toBeInTheDocument();
    });

    /**
     * These two pin the actual fix: the stored decision is read during the FIRST
     * render, not in a mount effect. They fail against the old effect-based
     * provider, which rendered once with the wrong values and then re-rendered:
     *   - a user with no consent got bannerVisible false -> true (banner popped
     *     in a frame late),
     *   - a consented user got DEFAULT_CONSENT (analytics/marketing false)
     *     before the real values landed, so anything reading `consent` on the
     *     first render saw a rejection that the user never made.
     * Capturing every render's value is what makes the extra pass observable —
     * asserting only the settled state passes either way.
     */
    it('has the banner visible on the very first render when no consent is stored', () => {
      const seen: boolean[] = [];
      function Probe() {
        seen.push(useCookieConsent().bannerVisible);
        return null;
      }
      render(
        <MemoryRouter>
          <LanguageProvider>
            <CookieConsentProvider><Probe /></CookieConsentProvider>
          </LanguageProvider>
        </MemoryRouter>,
      );

      expect(seen.length).toBeGreaterThan(0);
      expect(seen[0]).toBe(true);     // no "false then true" cascade
      expect(seen).not.toContain(false);
    });

    it('never exposes the default (rejected) consent to a consented user', () => {
      seedConsentCookie({
        necessary: true, analytics: true, marketing: true,
        version: CONSENT_VERSION, ts: new Date().toISOString(),
      });

      const seen: boolean[] = [];
      function Probe() {
        seen.push(useCookieConsent().consent.analytics);
        return null;
      }
      render(
        <MemoryRouter>
          <LanguageProvider>
            <CookieConsentProvider><Probe /></CookieConsentProvider>
          </LanguageProvider>
        </MemoryRouter>,
      );

      expect(seen.length).toBeGreaterThan(0);
      expect(seen[0]).toBe(true);
      expect(seen).not.toContain(false);
    });

    it('re-asks when the stored consent is from an older policy version', () => {
      seedConsentCookie({
        necessary: true, analytics: true, marketing: true,
        version: CONSENT_VERSION - 1, ts: new Date().toISOString(),
      });

      renderBanner();

      expect(banner()).toBeInTheDocument();
    });

    it('re-asks when the stored cookie is corrupt', () => {
      document.cookie = `${CONSENT_COOKIE}=not-json; path=/`;

      renderBanner();

      expect(banner()).toBeInTheDocument();
    });
  });

  describe('accepting', () => {
    it('persists the choice and hides the banner', async () => {
      renderBanner();
      expect(banner()).toBeInTheDocument();

      await userEvent.click(btn('cookieAcceptAll'));

      expect(banner()).not.toBeInTheDocument();
      const stored = loadConsent();
      expect(stored).not.toBeNull();
      expect(stored).toMatchObject({ necessary: true, analytics: true, marketing: true, version: CONSENT_VERSION });
    });

    it('survives a remount — the banner does not come back', async () => {
      const { unmount } = renderBanner();
      await userEvent.click(btn('cookieAcceptAll'));
      unmount();

      renderBanner();

      expect(banner()).not.toBeInTheDocument();
    });

    it('grants the Meta Pixel consent', async () => {
      renderBanner();
      await userEvent.click(btn('cookieAcceptAll'));

      expect(fbqSpy).toHaveBeenCalledWith('consent', 'grant');
    });
  });

  describe('rejecting', () => {
    it('persists the rejection, hides the banner and revokes the pixel', async () => {
      renderBanner();

      await userEvent.click(btn('cookieRejectAll'));

      expect(banner()).not.toBeInTheDocument();
      expect(loadConsent()).toMatchObject({ necessary: true, analytics: false, marketing: false });
      expect(fbqSpy).toHaveBeenCalledWith('consent', 'revoke');
    });

    it('does not come back after a remount', async () => {
      const { unmount } = renderBanner();
      await userEvent.click(btn('cookieRejectAll'));
      unmount();

      renderBanner();

      expect(banner()).not.toBeInTheDocument();
    });
  });

  describe('custom selection', () => {
    it('saves only the categories the user switched on', async () => {
      renderBanner();
      await userEvent.click(btn('cookieCustomize'));

      // Analytics on, marketing left off.
      await userEvent.click(screen.getByRole('switch', { name: translations.cookieCatAnalyticsTitle.uk }));
      await userEvent.click(btn('cookieSave'));

      expect(banner()).not.toBeInTheDocument();
      expect(loadConsent()).toMatchObject({ analytics: true, marketing: false });
    });

    it('necessary cookies cannot be switched off', async () => {
      renderBanner();
      await userEvent.click(btn('cookieCustomize'));

      // Only analytics + marketing are toggleable; "necessary" is a static label.
      expect(screen.getAllByRole('switch')).toHaveLength(2);
      expect(screen.getByText(translations.cookieAlwaysOn.uk)).toBeInTheDocument();
    });
  });

  describe('re-opening from the footer', () => {
    it('shows the banner again with the stored choice pre-filled and details collapsed', async () => {
      seedConsentCookie({
        necessary: true, analytics: true, marketing: false,
        version: CONSENT_VERSION, ts: new Date().toISOString(),
      });

      function Reopen() {
        const { reopen } = useCookieConsent();
        return <button onClick={reopen}>reopen</button>;
      }
      render(
        <MemoryRouter>
          <LanguageProvider>
            <CookieConsentProvider>
              <CookieBanner />
              <Reopen />
            </CookieConsentProvider>
          </LanguageProvider>
        </MemoryRouter>,
      );

      expect(banner()).not.toBeInTheDocument();
      await userEvent.click(screen.getByRole('button', { name: 'reopen' }));
      expect(banner()).toBeInTheDocument();

      // Collapsed on re-open: the toggles are only rendered once expanded.
      expect(screen.queryAllByRole('switch')).toHaveLength(0);
      await userEvent.click(btn('cookieCustomize'));

      // Pre-filled from the stored consent, not from the defaults.
      expect(screen.getByRole('switch', { name: translations.cookieCatAnalyticsTitle.uk })).toHaveAttribute('aria-checked', 'true');
      expect(screen.getByRole('switch', { name: translations.cookieCatMarketingTitle.uk })).toHaveAttribute('aria-checked', 'false');
    });

    it('discards an un-saved toggle change when the banner is closed and re-opened', async () => {
      seedConsentCookie({
        necessary: true, analytics: false, marketing: false,
        version: CONSENT_VERSION, ts: new Date().toISOString(),
      });

      function Reopen() {
        const { reopen } = useCookieConsent();
        return <button onClick={reopen}>reopen</button>;
      }
      render(
        <MemoryRouter>
          <LanguageProvider>
            <CookieConsentProvider>
              <CookieBanner />
              <Reopen />
            </CookieConsentProvider>
          </LanguageProvider>
        </MemoryRouter>,
      );

      await userEvent.click(screen.getByRole('button', { name: 'reopen' }));
      await userEvent.click(btn('cookieCustomize'));
      // Flip analytics on but DON'T save — then reject, which closes the banner.
      await userEvent.click(screen.getByRole('switch', { name: translations.cookieCatAnalyticsTitle.uk }));
      await userEvent.click(screen.getByRole('button', { name: translations.cookieBack.uk }));
      await userEvent.click(btn('cookieRejectAll'));

      // Re-open: the abandoned "analytics on" must not persist into the new session.
      await userEvent.click(screen.getByRole('button', { name: 'reopen' }));
      await userEvent.click(btn('cookieCustomize'));
      expect(screen.getByRole('switch', { name: translations.cookieCatAnalyticsTitle.uk })).toHaveAttribute('aria-checked', 'false');
    });
  });

  describe('i18n', () => {
    it('renders the English accept button under en', () => {
      renderBanner('en');
      expect(btn('cookieAcceptAll', 'en')).toBeInTheDocument();
    });
  });
});
