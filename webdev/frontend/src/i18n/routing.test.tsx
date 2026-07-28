import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { LanguageProvider } from '@/context/LanguageContext';
import Seo from '@/components/seo/Seo';
import { SITE_URL } from '@/config/siteMeta';
import {
  alternateLinks,
  isLang,
  isLocalizableRoute,
  langFromPath,
  localizePath,
  localizedUrl,
  stripLangPrefix,
} from './routing';

/**
 * The bug these tests pin down: before the language lived in the URL, every
 * hreflang alternate pointed at the SAME href, so Google saw one page in two
 * languages and never indexed the English version. `localizePath` /
 * `stripLangPrefix` are the primitives the router, <Seo>, the sitemap script
 * and the prerender script all share — if they disagree, canonical and
 * hreflang drift apart again.
 */
describe('routing helpers', () => {
  describe('isLang', () => {
    it.each([['uk', true], ['en', true], ['ru', false], ['UK', false], ['', false]])(
      '%s → %s', (v, expected) => expect(isLang(v)).toBe(expected),
    );

    it('rejects non-strings', () => {
      expect(isLang(undefined)).toBe(false);
      expect(isLang(null)).toBe(false);
      expect(isLang(2)).toBe(false);
    });
  });

  describe('langFromPath', () => {
    it.each([
      ['/uk/', 'uk'],
      ['/uk', 'uk'],
      ['/en/privacy', 'en'],
      ['/uk/test/audit-hr', 'uk'],
      ['/', null],
      ['/privacy', null],
      ['/ru/privacy', null],
      // Admin is deliberately outside the localized tree.
      ['/admin_bizcheck_md_crowe/tests', null],
    ])('%s → %s', (path, expected) => {
      expect(langFromPath(path)).toBe(expected);
    });
  });

  describe('stripLangPrefix', () => {
    it.each([
      ['/uk/', '/'],
      ['/en', '/'],
      ['/uk/privacy', '/privacy'],
      ['/en/test/audit-hr', '/test/audit-hr'],
      ['/en/checkout/test/audit-hr', '/checkout/test/audit-hr'],
      // No prefix → unchanged.
      ['/privacy', '/privacy'],
      ['/', '/'],
    ])('%s → %s', (path, expected) => {
      expect(stripLangPrefix(path)).toBe(expected);
    });

    it('is idempotent', () => {
      expect(stripLangPrefix(stripLangPrefix('/uk/privacy'))).toBe('/privacy');
    });
  });

  describe('localizePath', () => {
    it('keeps the trailing slash on the landing only', () => {
      expect(localizePath('/', 'uk')).toBe('/uk/');
      expect(localizePath('/', 'en')).toBe('/en/');
      expect(localizePath('/privacy', 'en')).toBe('/en/privacy');
    });

    it('swaps an existing prefix instead of stacking one', () => {
      expect(localizePath('/uk/privacy', 'en')).toBe('/en/privacy');
      expect(localizePath('/en/test/x', 'uk')).toBe('/uk/test/x');
    });

    it('leaves admin paths alone', () => {
      expect(localizePath('/admin_bizcheck_md_crowe/tests', 'en'))
        .toBe('/admin_bizcheck_md_crowe/tests');
      expect(isLocalizableRoute('/admin_bizcheck_md_crowe')).toBe(false);
      expect(isLocalizableRoute('/uk/privacy')).toBe(true);
    });

    it('round-trips with stripLangPrefix', () => {
      for (const base of ['/', '/privacy', '/test/x', '/templates/y', '/checkout/test/z']) {
        expect(stripLangPrefix(localizePath(base, 'en'))).toBe(base);
        expect(stripLangPrefix(localizePath(base, 'uk'))).toBe(base);
      }
    });
  });

  describe('alternateLinks', () => {
    it('gives every language a DISTINCT href plus x-default → uk', () => {
      const alts = alternateLinks('/privacy');

      expect(alts).toEqual([
        { hrefLang: 'uk', href: `${SITE_URL}/uk/privacy` },
        { hrefLang: 'en', href: `${SITE_URL}/en/privacy` },
        { hrefLang: 'x-default', href: `${SITE_URL}/uk/privacy` },
      ]);

      // THE regression: uk and en must never resolve to the same URL.
      const uk = alts.find(a => a.hrefLang === 'uk')!.href;
      const en = alts.find(a => a.hrefLang === 'en')!.href;
      expect(uk).not.toBe(en);
    });

    it('accepts an already-prefixed path and still emits both languages', () => {
      expect(alternateLinks('/en/test/x')).toEqual(alternateLinks('/uk/test/x'));
    });

    it('localizedUrl is absolute', () => {
      expect(localizedUrl('/', 'uk')).toBe(`${SITE_URL}/uk/`);
    });
  });
});

/** Read the tags Helmet actually committed to <head>. */
function headLinks(rel: string) {
  return Array.from(document.head.querySelectorAll<HTMLLinkElement>(`link[rel="${rel}"]`))
    .map(el => ({ hrefLang: el.getAttribute('hreflang'), href: el.getAttribute('href') }));
}

function renderSeo(url: string, path?: string) {
  return render(
    <HelmetProvider>
      <MemoryRouter initialEntries={[url]}>
        <LanguageProvider>
          <Seo title="T" description="D" path={path} />
        </LanguageProvider>
      </MemoryRouter>
    </HelmetProvider>,
  );
}

describe('<Seo> hreflang + canonical', () => {
  // Do NOT wipe document.head between tests: Helmet owns the nodes it appended
  // and removes them itself on unmount (RTL's auto-cleanup). Clearing innerHTML
  // out from under it makes React's deletion pass throw on removeChild(null).
  beforeEach(() => { localStorage.clear(); });
  afterEach(() => { localStorage.clear(); });

  it('emits one alternate per language plus x-default, all distinct', async () => {
    renderSeo('/uk/privacy');

    await waitFor(() => expect(headLinks('alternate')).toHaveLength(3));
    expect(headLinks('alternate')).toEqual([
      { hrefLang: 'uk', href: `${SITE_URL}/uk/privacy` },
      { hrefLang: 'en', href: `${SITE_URL}/en/privacy` },
      { hrefLang: 'x-default', href: `${SITE_URL}/uk/privacy` },
    ]);
  });

  it('canonical follows the language in the URL', async () => {
    renderSeo('/en/privacy');
    await waitFor(() => expect(headLinks('canonical')[0]?.href).toBe(`${SITE_URL}/en/privacy`));
  });

  it('sets <html lang> from the URL, not from localStorage', async () => {
    localStorage.setItem('bizcheck_lang', 'uk');
    renderSeo('/en/');
    await waitFor(() => expect(document.documentElement.lang).toBe('en'));
  });

  it('normalizes a legacy-looking path prop instead of double-prefixing', async () => {
    renderSeo('/en/test/audit', '/test/audit');
    await waitFor(() => expect(headLinks('canonical')[0]?.href).toBe(`${SITE_URL}/en/test/audit`));
    expect(headLinks('alternate')).toContainEqual({
      hrefLang: 'uk', href: `${SITE_URL}/uk/test/audit`,
    });
  });
});
