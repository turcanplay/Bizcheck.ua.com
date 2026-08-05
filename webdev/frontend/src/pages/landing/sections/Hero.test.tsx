import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { MemoryRouter, useLocation } from 'react-router-dom';
import Hero from './Hero';
import { LanguageProvider } from '@/context/LanguageContext';

/**
 * Regression tests for the <Star/> gradient id in Hero.tsx.
 *
 * The bug: `const id = \`star-grad-${Math.random().toString(36).slice(2, 9)}\``
 * was computed during render. That is an impure render (eslint
 * react-hooks/purity) and it minted a brand-new <linearGradient> id — plus a
 * matching fill="url(#id)" — on EVERY re-render of Hero. The fix is useId(),
 * which is stable per component instance and collision-free by construction.
 *
 * These tests pin the three properties that Math.random() could not guarantee:
 * uniqueness across instances, stability across re-renders, and a fill
 * reference that actually resolves to a gradient present in the markup.
 */

vi.mock('@/api/public', () => ({
  publicApi: {
    listTests: vi.fn().mockResolvedValue({ tests: [] }),
    listTemplates: vi.fn().mockResolvedValue({ templates: [] }),
    // Two 4-star reviews → avg 4.0 → stars 1..4 full, star 5 empty. A mixed
    // fill set proves the ids stay wired up for partial gradients too.
    listTestimonials: vi.fn().mockResolvedValue({
      testimonials: [
        { id: 1, name: 'A', rating: 4, text: 'ok', is_approved: true },
        { id: 2, name: 'B', rating: 5, text: 'ok', is_approved: true },
      ],
    }),
    getSiteSettings: vi.fn().mockResolvedValue({
      settings: {
        cta_hero_test: '', cta_about_test: '', cta_final_test: '',
        cta_catalog_test: '', email_delivery_enabled: '0',
      },
    }),
  },
}));

function renderHero() {
  localStorage.setItem('bizcheck_lang', 'uk');
  return render(
    <MemoryRouter>
      <LanguageProvider>
        <Hero />
      </LanguageProvider>
    </MemoryRouter>,
  );
}

/** The rating badge's five <Star/> svgs. They live under aria-hidden, so RTL's
 *  accessible queries cannot reach them — go through the DOM. */
function starSvgs(container: HTMLElement): SVGSVGElement[] {
  return Array.from(container.querySelectorAll<SVGSVGElement>('.hero__stars svg'));
}

/** For one Star svg: the id its <linearGradient> declares. */
function gradientId(svg: SVGSVGElement): string {
  const grad = svg.querySelector('linearGradient');
  expect(grad, 'Star must declare a <linearGradient>').not.toBeNull();
  return grad!.getAttribute('id') ?? '';
}

/** For one Star svg: the id its <path fill="url(#…)"> points at. */
function fillRefId(svg: SVGSVGElement): string {
  const fill = svg.querySelector('path')?.getAttribute('fill') ?? '';
  const m = /^url\(#(.+)\)$/.exec(fill);
  expect(m, `path fill should be a url(#…) reference, got ${JSON.stringify(fill)}`).not.toBeNull();
  return m![1];
}

/** Wait until the testimonials fetch has resolved and the badge shows an average. */
async function renderHeroSettled() {
  const utils = renderHero();
  await waitFor(() => expect(screen.getByText('/5')).toBeInTheDocument());
  await waitFor(() => expect(starSvgs(utils.container)).toHaveLength(5));
  return utils;
}

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  vi.clearAllMocks();
});

describe('Hero <Star/> gradient ids', () => {
  it('renders five stars, each with a gradient and a url(#…) fill', async () => {
    const { container } = await renderHeroSettled();
    const svgs = starSvgs(container);

    expect(svgs).toHaveLength(5);
    for (const svg of svgs) {
      expect(gradientId(svg)).not.toBe('');
      expect(fillRefId(svg)).not.toBe('');
    }
  });

  it('gives every Star a DIFFERENT gradient id (no collision)', async () => {
    const { container } = await renderHeroSettled();
    const ids = starSvgs(container).map(gradientId);

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('each fill reference resolves to a gradient that exists in the markup', async () => {
    const { container } = await renderHeroSettled();

    for (const svg of starSvgs(container)) {
      const ref = fillRefId(svg);
      // The referenced gradient must exist — and be this Star's own, not a
      // sibling's. A dangling reference renders the star silently unfilled.
      expect(gradientId(svg)).toBe(ref);
      const target = Array.from(container.querySelectorAll('linearGradient'))
        .filter(g => g.getAttribute('id') === ref);
      expect(target, `no <linearGradient id="${ref}"> for fill url(#${ref})`).toHaveLength(1);
    }
  });

  /**
   * THE regression test. Under the old Math.random() implementation the ids
   * were re-minted on every render, so this failed.
   */
  it('keeps each Star id STABLE across a state-driven re-render', async () => {
    const { container } = await renderHeroSettled();
    const before = starSvgs(container).map(gradientId);

    // Typing sets `query` state → Hero re-renders → the Stars re-render.
    await userEvent.type(screen.getByRole('textbox'), 'audit');
    await waitFor(() => expect(screen.getByRole('textbox')).toHaveValue('audit'));

    const after = starSvgs(container).map(gradientId);
    expect(after).toEqual(before);
  });

  it('keeps ids stable across an explicit rerender of the tree', async () => {
    const { container, rerender } = await renderHeroSettled();
    const before = starSvgs(container).map(gradientId);

    rerender(
      <MemoryRouter>
        <LanguageProvider>
          <Hero />
        </LanguageProvider>
      </MemoryRouter>,
    );

    expect(starSvgs(container).map(gradientId)).toEqual(before);
  });

  it('keeps the fill reference pointing at a live gradient after a re-render', async () => {
    const { container } = await renderHeroSettled();

    await userEvent.type(screen.getByRole('textbox'), 'x');

    for (const svg of starSvgs(container)) {
      const ref = fillRefId(svg);
      expect(gradientId(svg)).toBe(ref);
      expect(container.querySelector(`linearGradient[id="${CSS.escape(ref)}"]`)).not.toBeNull();
    }
  });

  it('does not reintroduce Math.random() in the Hero source', () => {
    const src = readFileSync(
      path.resolve(process.cwd(), 'src/pages/landing/sections/Hero.tsx'),
      'utf8',
    );
    // Allowed inside comments explaining the fix; never as live code.
    const live = src
      .split('\n')
      .filter(l => !l.trim().startsWith('//') && !l.trim().startsWith('*'))
      .join('\n');
    expect(live).not.toContain('Math.random');
    expect(live).toContain('useId');
  });
});

/**
 * Recent-search persistence. The bug: `saveRecent()` called
 * `localStorage.setItem` bare, inside the search submit handler. In Safari
 * private mode (or once the origin's quota is full) that throws, submitSearch
 * dies on its first line and the user's search simply never happens — the whole
 * handler is aborted by a failed *convenience* write. It now goes through
 * utils/safeStorage, which degrades to a no-op.
 */
describe('Hero recent searches survive a hostile localStorage', () => {
  function LocationProbe() {
    const loc = useLocation();
    return <div data-testid="loc">{loc.pathname + loc.search}</div>;
  }

  async function renderWithLocation() {
    localStorage.setItem('bizcheck_lang', 'uk');
    const utils = render(
      <MemoryRouter>
        <LanguageProvider>
          <Hero />
          <LocationProbe />
        </LanguageProvider>
      </MemoryRouter>,
    );
    await waitFor(() => expect(screen.getByRole('textbox')).toBeInTheDocument());
    return utils;
  }

  /** Make every write throw, the way a full/blocked store does. */
  function breakWrites() {
    return vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError', 'QuotaExceededError');
    });
  }

  it('still performs the search when the write throws', async () => {
    await renderWithLocation();
    const spy = breakWrites();

    await userEvent.type(screen.getByRole('textbox'), 'audit{Enter}');

    // The navigation after saveRecent() is what the old code never reached.
    await waitFor(() => expect(screen.getByTestId('loc')).toHaveTextContent('q=audit'));
    expect(spy).toHaveBeenCalled(); // the write really was attempted and really did throw
    spy.mockRestore();
  });

  it('keeps the Hero mounted and usable after a failed write', async () => {
    await renderWithLocation();
    const spy = breakWrites();

    await userEvent.type(screen.getByRole('textbox'), 'audit{Enter}');
    await waitFor(() => expect(screen.getByTestId('loc')).toHaveTextContent('q=audit'));

    spy.mockRestore();
    // Component alive: it still accepts input after the failure.
    await userEvent.type(screen.getByRole('textbox'), 'x');
    expect(screen.getByRole('textbox')).toBeInTheDocument();
  });

  it('persists the search and reads it back when storage works', async () => {
    await renderWithLocation();

    await userEvent.type(screen.getByRole('textbox'), 'аудит{Enter}');

    await waitFor(() =>
      expect(JSON.parse(localStorage.getItem('bizcheck_recent_searches') ?? '[]')).toContain('аудит'),
    );
  });

  it('ignores a corrupt recents entry instead of throwing', async () => {
    localStorage.setItem('bizcheck_recent_searches', '{not json');
    await renderWithLocation();

    await userEvent.type(screen.getByRole('textbox'), 'audit{Enter}');

    await waitFor(() => expect(screen.getByTestId('loc')).toHaveTextContent('q=audit'));
    expect(JSON.parse(localStorage.getItem('bizcheck_recent_searches') ?? '[]')).toEqual(['audit']);
  });
});
