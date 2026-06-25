import { useEffect, useState } from 'react';
import { publicApi, type PublicTest, type SiteSettings, type CtaKey } from '@/api/public';

/**
 * Resolves a landing-page CTA button to its navigation target.
 *
 * Admin configures, per button, which test slug it points to (see the
 * "Setări pagină" admin page). A button with no configured slug — or one
 * pointing at a missing/inactive test — falls back to `{ scroll: true }`,
 * i.e. the old behavior of scrolling to the catalog section.
 *
 * Tests + settings are fetched once and shared across all callers via a
 * module-level promise cache (the landing renders 3 CTA buttons).
 */

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

export function useCtaTarget(key: CtaKey): CtaTarget {
  const [target, setTarget] = useState<CtaTarget>({ kind: 'scroll' });

  useEffect(() => {
    let cancelled = false;
    loadCtaData().then(({ settings, tests }) => {
      if (cancelled) return;
      const slug = settings[key];
      if (!slug) { setTarget({ kind: 'scroll' }); return; }
      const test = tests.find(x => x.slug === slug && x.is_active);
      if (!test) { setTarget({ kind: 'scroll' }); return; }
      // Paid tests route through the checkout placeholder, mirroring TestsShowcase.
      setTarget({
        kind: 'route',
        to: test.is_paid ? `/plata/test/${test.slug}` : `/test/${test.slug}`,
      });
    });
    return () => { cancelled = true; };
  }, [key]);

  return target;
}