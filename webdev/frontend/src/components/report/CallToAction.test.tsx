import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi, type Mock } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import CallToAction from './CallToAction';
import { LanguageProvider } from '@/context/LanguageContext';
import { translations } from '@/i18n/translations';

/**
 * Behaviour tests for the Telegram CTA.
 *
 * The contract of POST /api_crowe_bizcheck/tg/link/<id> (backend
 * routes/telegram.py:50-93) is: 200 always returns { token, url, pdf_ready }.
 * The bot may only be opened when pdf_ready is true, and the URL must come
 * from the response — the hardcoded t.me/CROWE_BIZCHECK_bot fallback was
 * removed and must not come back.
 */

// The bot username the *backend* happens to return. Deliberately NOT the
// production one, so any hardcoded fallback in the component fails the test.
const RESPONSE_URL = 'https://t.me/TEST_FIXTURE_bot?start=tok123';
const HARDCODED = 'CROWE_BIZCHECK_bot';

function renderCta(lang: 'uk' | 'en' = 'uk', props: Partial<React.ComponentProps<typeof CallToAction>> = {}) {
  localStorage.setItem('bizcheck_lang', lang);
  return render(
    <LanguageProvider>
      <CallToAction
        onRestart={vi.fn()}
        submissionId={42}
        submissionToken="tok-abc"
        {...props}
      />
    </LanguageProvider>,
  );
}

function mockJson(body: unknown, ok = true, status = 200) {
  return vi.fn().mockResolvedValue({
    ok,
    status,
    json: async () => body,
  } as Response);
}

/** Click the "send report to Telegram" button (label is i18n'd). */
async function clickTelegram(lang: 'uk' | 'en' = 'uk') {
  const btn = screen.getByRole('button', { name: new RegExp(translations.telegramBtn[lang], 'i') });
  await userEvent.click(btn);
  return btn;
}

/**
 * jsdom does not implement navigation: assigning window.location.href logs
 * "Not implemented: navigation (except hash changes)" and leaves href
 * unchanged, which would make the URL assertions untestable AND spam the
 * output. window.location is configurable under jsdom, so replace it wholesale
 * with a stub whose href setter records the write and actually sticks — the
 * assertions stay exact, and no navigation is ever attempted.
 */
const realLocation = window.location;
let hrefSpy: Mock<(url: string) => void>;

/** Spy on window.open purely to prove it is NEVER used — see the popup-blocker test. */
let openSpy: ReturnType<typeof vi.spyOn>;

beforeEach(() => {
  openSpy = vi.spyOn(window, 'open').mockReturnValue(null);

  hrefSpy = vi.fn();
  let currentHref = realLocation.href;
  const stub: Record<string, unknown> = {
    ...realLocation,
    assign: vi.fn(),
    replace: vi.fn(),
    reload: vi.fn(),
    toString: () => currentHref,
  };
  Object.defineProperty(stub, 'href', {
    configurable: true,
    enumerable: true,
    get: () => currentHref,
    set: (v: string) => { hrefSpy(v); currentHref = v; },
  });
  Object.defineProperty(window, 'location', { configurable: true, writable: true, value: stub });
});

afterEach(() => {
  Object.defineProperty(window, 'location', { configurable: true, writable: true, value: realLocation });
  vi.restoreAllMocks();
  localStorage.clear();
});

describe('CallToAction — Telegram CTA', () => {
  describe('happy path', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', mockJson({ token: 'tok123', url: RESPONSE_URL, pdf_ready: true }));
    });

    it('navigates to the bot URL taken from the response body', async () => {
      renderCta();
      await clickTelegram();

      expect(hrefSpy).toHaveBeenCalledTimes(1);
      expect(hrefSpy).toHaveBeenCalledWith(RESPONSE_URL);
      expect(window.location.href).toBe(RESPONSE_URL);
    });

    it('POSTs to the tg/link endpoint with the submission token header', async () => {
      renderCta();
      await clickTelegram();

      const [url, init] = (fetch as unknown as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(url).toContain('/tg/link/42');
      expect(init.method).toBe('POST');
      expect(init.headers).toMatchObject({ 'X-Submission-Token': 'tok-abc' });
    });

    it('shows neither the error nor the pending message', async () => {
      renderCta();
      await clickTelegram();

      expect(screen.queryByText(translations.telegramError.uk)).not.toBeInTheDocument();
      expect(screen.queryByText(translations.telegramPdfPending.uk)).not.toBeInTheDocument();
    });
  });

  describe('pdf_ready: false — the core of the fix', () => {
    beforeEach(() => {
      vi.stubGlobal('fetch', mockJson({ token: 'tok123', url: RESPONSE_URL, pdf_ready: false }));
    });

    it('does NOT open the bot', async () => {
      renderCta();
      await clickTelegram();

      expect(hrefSpy).not.toHaveBeenCalled();
    });

    it('shows the "report still generating" message', async () => {
      renderCta();
      await clickTelegram();

      expect(await screen.findByText(translations.telegramPdfPending.uk)).toBeInTheDocument();
    });

    it('lets the user retry — a later pdf_ready:true click does open the bot', async () => {
      renderCta();
      await clickTelegram();
      expect(hrefSpy).not.toHaveBeenCalled();

      vi.stubGlobal('fetch', mockJson({ token: 'tok123', url: RESPONSE_URL, pdf_ready: true }));
      await clickTelegram();

      expect(hrefSpy).toHaveBeenCalledWith(RESPONSE_URL);
      // The stale pending notice must clear once the retry succeeds.
      expect(screen.queryByText(translations.telegramPdfPending.uk)).not.toBeInTheDocument();
    });
  });

  describe('error paths — regression for the removed hardcoded fallback', () => {
    it('non-ok response: shows the error and does not open any bot', async () => {
      vi.stubGlobal('fetch', mockJson({ error: 'nope' }, false, 500));
      renderCta();
      await clickTelegram();

      expect(await screen.findByText(translations.telegramError.uk)).toBeInTheDocument();
      expect(hrefSpy).not.toHaveBeenCalled();
    });

    it('fetch throws: shows the error and does not open any bot', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network down')));
      renderCta();
      await clickTelegram();

      expect(await screen.findByText(translations.telegramError.uk)).toBeInTheDocument();
      expect(hrefSpy).not.toHaveBeenCalled();
    });

    it('200 but no url in the body: treated as an error, does not open the bot', async () => {
      vi.stubGlobal('fetch', mockJson({ token: 'tok123', pdf_ready: true }));
      renderCta();
      await clickTelegram();

      expect(await screen.findByText(translations.telegramError.uk)).toBeInTheDocument();
      expect(hrefSpy).not.toHaveBeenCalled();
    });

    it('no submissionId: errors without even calling the backend', async () => {
      const fetchSpy = mockJson({});
      vi.stubGlobal('fetch', fetchSpy);
      renderCta('uk', { submissionId: null });
      await clickTelegram();

      expect(await screen.findByText(translations.telegramError.uk)).toBeInTheDocument();
      expect(fetchSpy).not.toHaveBeenCalled();
      expect(hrefSpy).not.toHaveBeenCalled();
    });

    it('re-enables the button after a failure so the user can retry', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network down')));
      renderCta();
      const btn = await clickTelegram();

      expect(await screen.findByText(translations.telegramError.uk)).toBeInTheDocument();
      expect(btn).not.toBeDisabled();
    });
  });

  describe('no hardcoded bot username', () => {
    it.each([
      ['non-ok response', mockJson({ error: 'nope' }, false, 500)],
      ['fetch throw', vi.fn().mockRejectedValue(new TypeError('network down'))],
      ['pdf_ready false', mockJson({ url: RESPONSE_URL, pdf_ready: false })],
      ['missing url', mockJson({ pdf_ready: true })],
    ])('never navigates to the production bot on %s', async (_label, fetchImpl) => {
      vi.stubGlobal('fetch', fetchImpl);
      renderCta();
      await clickTelegram();

      // Nothing navigated at all, and certainly nothing pointing at t.me.
      expect(hrefSpy).not.toHaveBeenCalled();
      expect(openSpy).not.toHaveBeenCalled();
      expect(window.location.href).not.toContain('t.me');
      expect(window.location.href).not.toContain(HARDCODED);
    });

    // import.meta.url is an http:// URL under jsdom, so resolve from the
    // Vitest root (= webdev/frontend) instead.
    const readSrc = (rel: string) => readFileSync(path.resolve(process.cwd(), rel), 'utf8');

    // The handler now lives in the shared useTelegramLink hook; CallToAction
    // and CtaPage are its only two callers. Guard all three sources so the URL
    // cannot be hardcoded anywhere on the path.
    it.each([
      ['the shared hook', 'src/hooks/useTelegramLink.ts'],
      ['CallToAction', 'src/components/report/CallToAction.tsx'],
      // CtaPage is too coupled to render in isolation (needs a fully-driven
      // QuizContext report), so its source is the guard.
      ['CtaPage', 'src/pages/CtaPage.tsx'],
    ])('%s does not contain the hardcoded username in its source', (_label, file) => {
      const src = readSrc(file);
      expect(src).not.toContain(HARDCODED);
      expect(src).not.toContain('t.me/');
    });
  });

  /**
   * Regression: the bot used to be opened with
   *   window.open(data.url, '_blank', 'noopener,noreferrer')
   * on a post-`await` path. By then the click's user activation is spent, so
   * Safari/Firefox block the popup — and because window.open's null return was
   * never checked, the failure was completely silent. Navigating the tab is not
   * subject to popup blocking.
   */
  describe('popup-blocker regression — must navigate, never window.open', () => {
    it('does not call window.open on the happy path', async () => {
      vi.stubGlobal('fetch', mockJson({ token: 'tok123', url: RESPONSE_URL, pdf_ready: true }));
      renderCta();
      await clickTelegram();

      // It really did hand off — via navigation, not a popup.
      expect(hrefSpy).toHaveBeenCalledWith(RESPONSE_URL);
      expect(openSpy).not.toHaveBeenCalled();
    });

    it.each([
      ['the shared hook', 'src/hooks/useTelegramLink.ts'],
      ['CallToAction', 'src/components/report/CallToAction.tsx'],
      ['CtaPage', 'src/pages/CtaPage.tsx'],
    ])('%s does not reintroduce window.open in its source', (_label, file) => {
      const src = readFileSync(path.resolve(process.cwd(), file), 'utf8');
      expect(src).not.toContain('window.open');
    });
  });

  describe('i18n', () => {
    it('renders the Ukrainian pending string under uk', async () => {
      vi.stubGlobal('fetch', mockJson({ url: RESPONSE_URL, pdf_ready: false }));
      renderCta('uk');
      await clickTelegram('uk');

      expect(await screen.findByText(translations.telegramPdfPending.uk)).toBeInTheDocument();
      expect(screen.queryByText(translations.telegramPdfPending.en)).not.toBeInTheDocument();
    });

    it('renders the English pending string under en', async () => {
      vi.stubGlobal('fetch', mockJson({ url: RESPONSE_URL, pdf_ready: false }));
      renderCta('en');
      await clickTelegram('en');

      expect(await screen.findByText(translations.telegramPdfPending.en)).toBeInTheDocument();
      expect(screen.queryByText(translations.telegramPdfPending.uk)).not.toBeInTheDocument();
    });

    it('renders the English error string under en', async () => {
      vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('network down')));
      renderCta('en');
      await clickTelegram('en');

      expect(await screen.findByText(translations.telegramError.en)).toBeInTheDocument();
    });

    it('uk and en pending strings are actually distinct', () => {
      expect(translations.telegramPdfPending.uk).not.toBe(translations.telegramPdfPending.en);
      expect(translations.telegramPdfPending.uk.trim()).not.toBe('');
      expect(translations.telegramPdfPending.en.trim()).not.toBe('');
    });
  });
});
