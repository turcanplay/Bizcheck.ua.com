import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter, Link, useLocation } from 'react-router-dom';
import { LanguageProvider } from '@/context/LanguageContext';
import type { CtaKey, PublicTest, SiteSettings } from '@/api/public';
import { useTestCta, resetCtaCacheForTests } from './useCtaTarget';

/**
 * useTestCta = the click path every "take the test" button goes through.
 * Pinned here: an EARLY click (before the settings/tests fetch settles) still
 * opens the test instead of scrolling to the hidden catalog; the href becomes
 * the localized test URL; an admin override keeps winning.
 */

const api = vi.hoisted(() => ({
  settings: null as unknown as Promise<{ settings: SiteSettings }>,
  tests: null as unknown as Promise<{ tests: PublicTest[] }>,
}));

vi.mock('@/api/public', () => ({
  publicApi: {
    getSiteSettings: vi.fn(() => api.settings),
    listTests: vi.fn(() => api.tests),
  },
}));

function test_(over: Partial<PublicTest>): PublicTest {
  return {
    id: 1, slug: 'x', name_uk: '', name_en: '', description_uk: '', description_en: '',
    is_paid: false, is_active: true, is_coming_soon: false, price: null, currency: 'UAH',
    category: null, features: [], order_index: 0, ...over,
  };
}

function settings(over: Partial<SiteSettings> = {}): { settings: SiteSettings } {
  return {
    settings: {
      cta_hero_test: '', cta_about_test: '', cta_final_test: '', cta_catalog_test: '',
      email_delivery_enabled: '0', ...over,
    },
  };
}

const BIZCHECK = test_({ id: 1, slug: 'bizcheck', report_type: 'bizcheck' });

function Probe() {
  const loc = useLocation();
  return <div data-testid="loc">{loc.pathname}</div>;
}

function Button({ k }: { k: CtaKey }) {
  const cta = useTestCta(k);
  return <Link to={cta.href} onClick={cta.go}>go</Link>;
}

function renderAt(path: string, k: CtaKey = 'cta_hero_test') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LanguageProvider>
        <Button k={k} />
        <Probe />
      </LanguageProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  resetCtaCacheForTests();
  localStorage.clear();
  api.settings = Promise.resolve(settings());
  api.tests = Promise.resolve({ tests: [BIZCHECK] });
});

describe('useTestCta', () => {
  it('href becomes the localized test URL once loaded', async () => {
    renderAt('/en/');
    await waitFor(() =>
      expect(screen.getByRole('link', { name: 'go' })).toHaveAttribute('href', '/en/test/bizcheck'),
    );
  });

  it('a click BEFORE the data has loaded still opens the test (no catalog scroll)', async () => {
    let release!: (v: { settings: SiteSettings }) => void;
    api.settings = new Promise(r => { release = r; });
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;

    renderAt('/uk/');
    // Still loading: the href is the landing, the old code would have scrolled.
    expect(screen.getByRole('link', { name: 'go' })).toHaveAttribute('href', '/uk/');
    await userEvent.click(screen.getByRole('link', { name: 'go' }));
    expect(screen.getByTestId('loc')).toHaveTextContent('/uk/');

    release(settings());
    await waitFor(() => expect(screen.getByTestId('loc')).toHaveTextContent('/uk/test/bizcheck'));
    expect(scroll).not.toHaveBeenCalled();
  });

  it('an admin-configured slug for this key wins', async () => {
    api.settings = Promise.resolve(settings({ cta_catalog_test: 'gdpr' }));
    api.tests = Promise.resolve({
      tests: [BIZCHECK, test_({ id: 2, slug: 'gdpr', report_type: 'gdpr', order_index: 1 })],
    });
    renderAt('/uk/', 'cta_catalog_test');
    await userEvent.click(screen.getByRole('link', { name: 'go' }));
    await waitFor(() => expect(screen.getByTestId('loc')).toHaveTextContent('/uk/test/gdpr'));
  });

  it('with no takeable test it stays put and scrolls to the catalog section', async () => {
    api.tests = Promise.resolve({ tests: [test_({ slug: 'soon', is_coming_soon: true })] });
    const catalog = document.createElement('section');
    catalog.id = 'resurse';
    catalog.scrollIntoView = vi.fn();
    document.body.appendChild(catalog);

    renderAt('/uk/');
    await userEvent.click(screen.getByRole('link', { name: 'go' }));
    await waitFor(() => expect(catalog.scrollIntoView).toHaveBeenCalled());
    expect(screen.getByTestId('loc')).toHaveTextContent('/uk/');
    catalog.remove();
  });
});
