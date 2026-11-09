import { useEffect, useState } from 'react';
import { publicApi, type PublicTest, type SiteSettings, type CtaKey } from '@/api/public';

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
 * module-level promise cache (the landing renders 3 CTA buttons).
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