import { describe, it, expect } from 'vitest';
import { resolveCtaTarget, pickDefaultTest } from './useCtaTarget';
import type { PublicTest } from '@/api/public';

function t(over: Partial<PublicTest>): PublicTest {
  return {
    id: 1, slug: 'x', name_uk: '', name_en: '', description_uk: '', description_en: '',
    is_paid: false, is_active: true, is_coming_soon: false, price: null, currency: 'MDL',
    category: null, features: [], order_index: 0, ...over,
  };
}

describe('resolveCtaTarget', () => {
  const bizcheck = t({ id: 1, slug: 'bizcheck', report_type: 'bizcheck' });

  it('no slug configured → goes straight to the bizcheck test', () => {
    expect(resolveCtaTarget('', [bizcheck])).toEqual({ kind: 'route', to: '/test/bizcheck' });
  });

  it('configured slug wins', () => {
    const gdpr = t({ id: 2, slug: 'gdpr', report_type: 'gdpr', order_index: 1 });
    expect(resolveCtaTarget('gdpr', [bizcheck, gdpr])).toEqual({ kind: 'route', to: '/test/gdpr' });
  });

  it('configured slug that is inactive / missing → default test', () => {
    const gdpr = t({ id: 2, slug: 'gdpr', is_active: false });
    expect(resolveCtaTarget('gdpr', [bizcheck, gdpr])).toEqual({ kind: 'route', to: '/test/bizcheck' });
    expect(resolveCtaTarget('nope', [bizcheck])).toEqual({ kind: 'route', to: '/test/bizcheck' });
  });

  it('paid default goes through checkout', () => {
    expect(resolveCtaTarget('', [t({ slug: 'bizcheck', report_type: 'bizcheck', is_paid: true })]))
      .toEqual({ kind: 'route', to: '/checkout/test/bizcheck' });
  });

  it('no takeable test → scroll fallback', () => {
    expect(resolveCtaTarget('', [])).toEqual({ kind: 'scroll' });
    expect(resolveCtaTarget('', [t({ is_coming_soon: true })])).toEqual({ kind: 'scroll' });
  });
});

describe('pickDefaultTest', () => {
  it('prefers report_type bizcheck over catalog order', () => {
    const a = t({ id: 1, slug: 'gdpr', report_type: 'gdpr', order_index: 0 });
    const b = t({ id: 2, slug: 'main', report_type: 'bizcheck', order_index: 5 });
    expect(pickDefaultTest([a, b])?.slug).toBe('main');
  });

  it('falls back to the first takeable test by order_index', () => {
    const a = t({ id: 1, slug: 'b', order_index: 2 });
    const b = t({ id: 2, slug: 'a', order_index: 1 });
    expect(pickDefaultTest([a, b])?.slug).toBe('a');
  });
});
