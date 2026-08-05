import { render, screen, cleanup, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import type { AdminTest } from '@/api/admin';
import { DEFAULT_ZONES, getZone, resolveZones } from '@/utils/scoring';
import { translations } from '@/i18n/translations';

/**
 * The admin threshold screens must not invent their own scoring rules.
 *
 * `AdminTests` used to fall back to a private `{ safe: 80, developing: 70,
 * warn: 65 }` literal — no `risk` at all — so a partial `scoring_zones` blob
 * printed "≥undefined%", an inverted one was echoed back raw while `getZone()`
 * clamped it, and the fourth band was simply missing. The modal held a third
 * copy of the same literals. Both now go through `resolveZones()`.
 *
 * The vocabulary was contradictory too: the list called `warn` „🟠 Низький"
 * while the modal called `safe` „🟢 Низький ризик". Both now read their labels
 * from `i18n/translations`, the same strings the public report prints.
 */

const listTestsMock = vi.fn();

vi.mock('@/api/admin', async () => {
  const actual = await vi.importActual<typeof import('@/api/admin')>('@/api/admin');
  return {
    ...actual,
    adminApi: {
      ...actual.adminApi,
      listTests: (...a: unknown[]) => listTestsMock(...a),
    },
  };
});

const { default: AdminTests } = await import('@/pages/admin/AdminTests');
const { default: AdminTestModal } = await import('@/pages/admin/AdminTestModal');

const UK = {
  safe: translations.zoneSafe.uk,
  developing: translations.zoneDeveloping.uk,
  warn: translations.zoneWarning.uk,
  risk: translations.zoneRisk.uk,
} as const;

function mkTest(over: Partial<AdminTest> = {}): AdminTest {
  return {
    id: 1, slug: 'demo', name_uk: 'Демо', name_en: '', description_uk: '', description_en: '',
    is_active: true, is_coming_soon: false, is_paid: false, price: null, currency: 'MDL',
    category: null, features: [], report_type: 'bizcheck', order_index: 0,
    scoring_zones: DEFAULT_ZONES, zone_recommendations: null, created_at: '2026-01-01T00:00:00Z',
    ...over,
  } as AdminTest;
}

async function renderList(zones: unknown) {
  listTestsMock.mockResolvedValue({
    tests: [mkTest({ scoring_zones: zones as AdminTest['scoring_zones'] })],
  });
  const view = render(<MemoryRouter><AdminTests /></MemoryRouter>);
  await waitFor(() => expect(screen.queryByText(/Завантаження/)).toBeNull());
  return view;
}

/** The threshold the card prints for one band, e.g. 80 out of "🟢 …: ≥80%". */
function shownThreshold(container: HTMLElement, label: string): number {
  const meta = container.querySelector('.admin-test-card__meta');
  const spans = Array.from(meta?.querySelectorAll('span') ?? []);
  const hit = spans.find(s => s.textContent?.includes(label));
  if (!hit) throw new Error(`no band labelled "${label}" on the card: ${meta?.textContent}`);
  const m = /≥\s*(-?\d+(?:\.\d+)?)\s*%/.exec(hit.textContent ?? '');
  if (!m) throw new Error(`band "${label}" prints no usable threshold: ${hit.textContent}`);
  return Number(m[1]);
}

beforeEach(() => {
  listTestsMock.mockReset();
});
afterEach(cleanup);

describe('AdminTests — thresholds come from resolveZones()', () => {
  it('prints all four defaults when scoring_zones is null', async () => {
    const { container } = await renderList(null);

    expect(shownThreshold(container, UK.safe)).toBe(DEFAULT_ZONES.safe);
    expect(shownThreshold(container, UK.developing)).toBe(DEFAULT_ZONES.developing);
    expect(shownThreshold(container, UK.warn)).toBe(DEFAULT_ZONES.warn);
    expect(shownThreshold(container, UK.risk)).toBe(DEFAULT_ZONES.risk);
    expect(container.textContent).not.toMatch(/undefined/);
  });

  it('fills the gaps of a partial blob instead of printing "≥undefined%"', async () => {
    const { container } = await renderList({ safe: 80 });

    expect(container.textContent).not.toMatch(/undefined/);
    expect(shownThreshold(container, UK.safe)).toBe(80);
    expect(shownThreshold(container, UK.developing)).toBe(DEFAULT_ZONES.developing);
    expect(shownThreshold(container, UK.warn)).toBe(DEFAULT_ZONES.warn);
    expect(shownThreshold(container, UK.risk)).toBe(DEFAULT_ZONES.risk);
  });

  it('shows an inverted blob the way getZone() actually reads it', async () => {
    // Ascending input: every band below `safe` is clamped down to it.
    const raw = { safe: 10, developing: 70, warn: 90, risk: 100 };
    const resolved = resolveZones(raw);
    const { container } = await renderList(raw);

    expect(container.textContent).not.toMatch(/undefined|NaN/);
    expect(shownThreshold(container, UK.safe)).toBe(resolved.safe);
    expect(shownThreshold(container, UK.developing)).toBe(resolved.developing);
    expect(shownThreshold(container, UK.warn)).toBe(resolved.warn);
    expect(shownThreshold(container, UK.risk)).toBe(resolved.risk);

    // Not merely equal to resolveZones — the printed numbers describe the
    // bands the report will really draw.
    expect(getZone(shownThreshold(container, UK.safe), resolved)).toBe('safe');
    expect(getZone(shownThreshold(container, UK.safe) - 1, resolved)).toBe('risk');
  });

  it('prints thresholds every band honours, for any blob', async () => {
    for (const raw of [null, {}, { safe: 80 }, { safe: 55, developing: 90 },
      { safe: 'x', developing: 40 }, { safe: 200, developing: -5, warn: 30, risk: 20 }]) {
      const { container } = await renderList(raw);
      const resolved = resolveZones(raw as never);

      expect(container.textContent).not.toMatch(/undefined|NaN/);
      expect(shownThreshold(container, UK.safe)).toBe(resolved.safe);
      expect(getZone(shownThreshold(container, UK.safe), resolved)).toBe('safe');
      expect(shownThreshold(container, UK.risk)).toBeGreaterThanOrEqual(0);
      cleanup();
    }
  });
});

describe('AdminTestModal — the form edits the repaired zones', () => {
  function zoneInput(label: string): HTMLInputElement {
    return screen.getByLabelText(new RegExp(label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))) as HTMLInputElement;
  }

  it('seeds a missing band from DEFAULT_ZONES rather than leaving it blank', () => {
    render(
      <AdminTestModal
        initial={mkTest({ scoring_zones: { safe: 80 } as AdminTest['scoring_zones'] })}
        onClose={() => {}}
        onSave={async () => {}}
      />,
    );

    expect(zoneInput(UK.safe).value).toBe('80');
    expect(zoneInput(UK.developing).value).toBe(String(DEFAULT_ZONES.developing));
    expect(zoneInput(UK.warn).value).toBe(String(DEFAULT_ZONES.warn));
    expect(zoneInput(UK.risk).value).toBe(String(DEFAULT_ZONES.risk));
  });

  it('loads an inverted blob already clamped into descending order', () => {
    const raw = { safe: 10, developing: 70, warn: 90, risk: 100 };
    const resolved = resolveZones(raw);
    render(
      <AdminTestModal
        initial={mkTest({ scoring_zones: raw as AdminTest['scoring_zones'] })}
        onClose={() => {}}
        onSave={async () => {}}
      />,
    );

    expect(zoneInput(UK.safe).value).toBe(String(resolved.safe));
    expect(zoneInput(UK.developing).value).toBe(String(resolved.developing));
    expect(zoneInput(UK.warn).value).toBe(String(resolved.warn));
    expect(zoneInput(UK.risk).value).toBe(String(resolved.risk));
  });

  it('offers all four bands to a brand-new test', () => {
    render(<AdminTestModal initial={null} onClose={() => {}} onSave={async () => {}} />);

    expect(zoneInput(UK.safe).value).toBe(String(DEFAULT_ZONES.safe));
    expect(zoneInput(UK.risk).value).toBe(String(DEFAULT_ZONES.risk));
  });
});

describe('the two admin screens use one vocabulary', () => {
  it('names each band the same way the report does, on both screens', async () => {
    const { container } = await renderList(DEFAULT_ZONES);
    const meta = container.querySelector('.admin-test-card__meta')?.textContent ?? '';

    // The list called `warn` „🟠 Низький" while the modal called `safe`
    // „🟢 Низький ризик" — the same word on opposite bands.
    expect(meta).toContain(`🟢 ${UK.safe}: ≥${DEFAULT_ZONES.safe}%`);
    expect(meta).toContain(`🟡 ${UK.developing}: ≥${DEFAULT_ZONES.developing}%`);
    expect(meta).toContain(`🟠 ${UK.warn}: ≥${DEFAULT_ZONES.warn}%`);
    expect(meta).toContain(`🔴 ${UK.risk}: ≥${DEFAULT_ZONES.risk}%`);
    cleanup();

    render(<AdminTestModal initial={null} onClose={() => {}} onSave={async () => {}} />);
    const form = document.querySelector('.admin-zones-grid')?.textContent ?? '';
    expect(form).toContain(`🟢 ${UK.safe}`);
    expect(form).toContain(`🟡 ${UK.developing}`);
    expect(form).toContain(`🟠 ${UK.warn}`);
    expect(form).toContain(`🔴 ${UK.risk}`);

    // …and „Низький ризик" is the green band on BOTH screens: it must not also
    // appear as the orange one, which is exactly what the list used to do.
    expect(form).not.toContain(`🟠 ${UK.safe}`);
    expect(meta).not.toContain(`🟠 ${UK.safe}`);
  });
});
