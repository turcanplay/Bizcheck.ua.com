import { useCallback, useEffect, useState, type MouseEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicApi, type PublicTest, type SiteSettings, type CtaKey } from '@/api/public';
import { useLocalizedPath } from '@/i18n/useLocalizedPath';

/**
 * Resolves a landing-page CTA button to its navigation target.
 *
 * Admin configures, per button, which test slug it points to (see the
 * "Setări pagină" admin page). A button with no configured slug — or one
 * pointing at a missing/inactive test — goes straight to the default
 * check-up test (see `pickDefaultTest`). Only when no test is takeable at
 * all does it fall back to `{ kind: 'scroll' }` (scroll to the catalog,
 * which is hidden while it holds fewer than three items).
 *
 * Tests + settings are fetched once and shared across all callers via a
 * module-level promise cache (the landing renders several test buttons).
 * Buttons should use `useTestCta` (bottom of this file), which wraps this
 * hook with a localized href and a click handler.
 */

/** `to` is the language-NEUTRAL path — callers must run it through
 *  `useLocalizedPath()` before navigating. */
export type CtaTarget =
  | { kind: 'route'; to: string }
  | { kind: 'scroll' };

interface CtaData {
  settings: SiteSettings;
  tests: PublicTest[];
}

let cache: Promise<CtaData> | null = null;

function loadCtaData(): Promise<CtaData> {
  if (!cache) {
    cache = Promise.all([publicApi.getSiteSettings(), publicApi.listTests()])
      .then(([s, t]) => ({ settings: s.settings, tests: t.tests }))
      .catch(() => ({
        settings: { cta_hero_test: '', cta_about_test: '', cta_final_test: '', cta_catalog_test: '', email_delivery_enabled: '0' },
        tests: [] as PublicTest[],
      }));
  }
  return cache;
}

/** Drop the shared cache — unit tests only, so each case sees fresh mocks. */
export function resetCtaCacheForTests(): void {
  cache = null;
}

/** Takeable = active and not a "coming soon" teaser. */
function isTakeable(t: PublicTest): boolean {
  return t.is_active && !t.is_coming_soon;
}

/** Default CTA destination: the BizCheck check-up (report_type `bizcheck`,
 *  or slug `bizcheck`), else the first takeable test in catalog order. */
export function pickDefaultTest(tests: PublicTest[]): PublicTest | undefined {
  const takeable = tests
    .filter(isTakeable)
    .sort((a, b) => (a.order_index ?? 0) - (b.order_index ?? 0));
  return (
    takeable.find(t => t.report_type === 'bizcheck') ??
    takeable.find(t => t.slug === 'bizcheck') ??
    takeable[0]
  );
}

/** Pure resolver behind the hook — exported for unit tests. */
export function resolveCtaTarget(slug: string | undefined, tests: PublicTest[]): CtaTarget {
  const configured = slug ? tests.find(x => x.slug === slug && isTakeable(x)) : undefined;
  const test = configured ?? pickDefaultTest(tests);
  if (!test) return { kind: 'scroll' };
  // Paid tests route through the checkout placeholder, mirroring TestsShowcase.
  return {
    kind: 'route',
    to: test.is_paid ? `/checkout/test/${test.slug}` : `/test/${test.slug}`,
  };
}

export function useCtaTarget(key: CtaKey): CtaTarget {
  const [target, setTarget] = useState<CtaTarget>({ kind: 'scroll' });

  useEffect(() => {
    let cancelled = false;
    loadCtaData().then(({ settings, tests }) => {
      if (cancelled) return;
      setTarget(resolveCtaTarget(settings[key], tests));
    });
    return () => { cancelled = true; };
  }, [key]);

  return target;
}

export interface TestCta {
  /** Localized href for a `<Link to>`: the resolved test once the data is in,
   *  the landing until then. Gives middle-click / "open in new tab" a real URL. */
  href: string;
  /** Click handler: goes to the test. */
  go: (e?: MouseEvent<HTMLElement>) => void;
}

/**
 * Everything a "take the test" button needs, in one call: `href` + `go`.
 *
 * `go` does not trust the `useCtaTarget` state, which reads `{ kind: 'scroll' }`
 * until the first fetch settles — a click in that window used to scroll to the
 * (hidden) catalog instead of opening the test. It waits on the shared,
 * already-cached data and resolves the target itself, so an early click still
 * lands on the test. Only when no test is takeable at all does it fall back to
 * scrolling to the catalog section.
 */
export function useTestCta(key: CtaKey): TestCta {
  const target = useCtaTarget(key);
  const L = useLocalizedPath();
  const navigate = useNavigate();
  const href = target.kind === 'route' ? L(target.to) : L('/');

  const go = useCallback((e?: MouseEvent<HTMLElement>) => {
    // Cmd/Ctrl/Shift/middle-click on a link whose href is already the test:
    // let the browser open it in a new tab/window as usual.
    if (
      e && e.currentTarget instanceof HTMLAnchorElement && target.kind === 'route' &&
      (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0)
    ) return;
    e?.preventDefault();
    void loadCtaData().then(({ settings, tests }) => {
      const resolved = resolveCtaTarget(settings[key], tests);
      if (resolved.kind === 'route') {
        navigate(L(resolved.to));
        return;
      }
      const el = document.getElementById('resurse');
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      } else {
        navigate(L('/'));
        requestAnimationFrame(() => {
          document.getElementById('resurse')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      }
    });
  }, [key, L, navigate, target.kind]);

  return { href, go };
}
