import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MemoryRouter, useLocation } from 'react-router-dom';
import type { ReactElement } from 'react';
import { LanguageProvider } from '@/context/LanguageContext';
import { CookieConsentProvider } from '@/context/CookieConsentContext';
import { resetCtaCacheForTests } from '@/hooks/useCtaTarget';
import type { PublicTest } from '@/api/public';
import Hero from './Hero';
import AboutPlatform from './AboutPlatform';
import FinalCta from './FinalCta';
import CatalogSection from './CatalogSection';
import Footer from './Footer';

/**
 * "Everything about the test leads to the test." Production has one test
 * (slug `bizcheck`) and the catalog listing is hidden below three items, so a
 * button that scrolls to the catalog does nothing visible. Every test-related
 * button on the landing must open `/<lang>/test/bizcheck` instead.
 */

const api = vi.hoisted(() => ({ tests: [] as PublicTest[] }));

vi.mock('@/api/public', () => ({
  TESTIMONIAL_ADDED_EVENT: 'bizcheck:testimonial-added',
  publicApi: {
    listTests: vi.fn(() => Promise.resolve({ tests: api.tests })),
    listTemplates: vi.fn(() => Promise.resolve({ templates: [] })),
    listTestimonials: vi.fn(() => Promise.resolve({ testimonials: [] })),
    getSiteSettings: vi.fn(() => Promise.resolve({
      settings: {
        cta_hero_test: '', cta_about_test: '', cta_final_test: '',
        cta_catalog_test: '', email_delivery_enabled: '0',
      },
    })),
  },
}));

function mkTest(over: Partial<PublicTest>): PublicTest {
  return {
    id: 1, slug: 'bizcheck', name_uk: 'Чек-ап бізнесу', name_en: 'Business check-up',
    description_uk: '', description_en: '', is_paid: false, is_active: true,
    is_coming_soon: false, price: null, currency: 'UAH', category: null, features: [],
    order_index: 0, report_type: 'bizcheck', ...over,
  };
}

function Probe() {
  const loc = useLocation();
  return <div data-testid="loc">{loc.pathname}</div>;
}

function renderAt(ui: ReactElement, path = '/uk/') {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <LanguageProvider>
        <CookieConsentProvider>
          {ui}
          <Probe />
        </CookieConsentProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );
}

const loc = () => screen.getByTestId('loc');
const expectAt = (p: string) => waitFor(() => expect(loc()).toHaveTextContent(new RegExp(`^${p}$`)));

beforeEach(() => {
  resetCtaCacheForTests();
  localStorage.clear();
  api.tests = [mkTest({})];
  Element.prototype.scrollIntoView = vi.fn();
});

describe('landing test buttons open the bizcheck test', () => {
  it('Hero main CTA', async () => {
    renderAt(<Hero />);
    const cta = screen.getByRole('link', { name: /Перевірте свою компанію зараз/ });
    await waitFor(() => expect(cta).toHaveAttribute('href', '/uk/test/bizcheck'));
    await userEvent.click(cta);
    await expectAt('/uk/test/bizcheck');
  });

  it('Hero nav "Тести" button (used to scroll to the hidden catalog)', async () => {
    renderAt(<Hero />);
    await userEvent.click(screen.getByRole('button', { name: /^Тести/ }));
    await expectAt('/uk/test/bizcheck');
  });

  it('Hero quick menu "Лише Тести" (used to scroll to the hidden catalog)', async () => {
    renderAt(<Hero />);
    await userEvent.click(screen.getByRole('button', { name: 'Швидке меню' }));
    await userEvent.click(within(screen.getByRole('menu')).getByRole('button', { name: /Лише Тести/ }));
    await expectAt('/uk/test/bizcheck');
  });

  it('AboutPlatform CTA', async () => {
    renderAt(<AboutPlatform />, '/en/');
    const cta = screen.getByRole('link', { name: /Check your company now/ });
    await waitFor(() => expect(cta).toHaveAttribute('href', '/en/test/bizcheck'));
    await userEvent.click(cta);
    await expectAt('/en/test/bizcheck');
  });

  it('FinalCta button', async () => {
    renderAt(<FinalCta />);
    const cta = screen.getByRole('link', { name: /Перевірте свою компанію зараз/ });
    await waitFor(() => expect(cta).toHaveAttribute('href', '/uk/test/bizcheck'));
    await userEvent.click(cta);
    await expectAt('/uk/test/bizcheck');
  });

  it('Catalog header CTA', async () => {
    renderAt(<CatalogSection />);
    await userEvent.click(screen.getByRole('button', { name: /Перевірте свою компанію зараз/ }));
    await expectAt('/uk/test/bizcheck');
  });

  it('Footer "Тести" link (used to scroll to the hidden catalog)', async () => {
    renderAt(<Footer />);
    const link = screen.getByRole('link', { name: 'Тести' });
    await waitFor(() => expect(link).toHaveAttribute('href', '/uk/test/bizcheck'));
    await userEvent.click(link);
    await expectAt('/uk/test/bizcheck');
  });
});

describe('test entry points outside the CTA keys', () => {
  it('hero search hit for a free test opens /<lang>/test/<slug>', async () => {
    renderAt(<Hero />);
    await userEvent.type(screen.getByRole('textbox'), 'Чек-ап');
    const hit = await screen.findByRole('button', { name: /Чек-ап бізнесу/ });
    await userEvent.click(hit);
    await expectAt('/uk/test/bizcheck');
  });

  it('hero search does not offer a "coming soon" test', async () => {
    api.tests = [mkTest({}), mkTest({ id: 2, slug: 'gdpr', name_uk: 'Чек-ап GDPR', is_coming_soon: true })];
    renderAt(<Hero />);
    await userEvent.type(screen.getByRole('textbox'), 'Чек-ап');
    await screen.findByRole('button', { name: /Чек-ап бізнесу/ });
    expect(screen.queryByRole('button', { name: /Чек-ап GDPR/ })).toBeNull();
  });

  it('catalog test card opens /<lang>/test/<slug> for a free test', async () => {
    // Three items so the listing is shown.
    api.tests = [
      mkTest({}),
      mkTest({ id: 2, slug: 'gdpr', name_uk: 'GDPR', report_type: 'gdpr', order_index: 1 }),
      mkTest({ id: 3, slug: 'hr', name_uk: 'HR', report_type: 'standard', order_index: 2 }),
    ];
    renderAt(<CatalogSection />, '/en/');
    const cards = await screen.findAllByRole('button', { name: 'Start test' });
    await userEvent.click(cards[0]);
    await expectAt('/en/test/bizcheck');
  });
});
