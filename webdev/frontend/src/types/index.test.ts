import { describe, it, expect, vi, afterEach } from 'vitest';
import { REPORT_TYPES, DEFAULT_REPORT_TYPE, normalizeReportType } from '@/types';

/**
 * Regressions this file guards:
 *
 *  1. A `report_type` the bundle does not know used to fall through to the
 *     `bizcheck` layout silently (`currentTest?.report_type ?? 'bizcheck'` in
 *     CtaPage), so a backend that shipped a new layout first handed the user
 *     the wrong PDF with no trace anywhere. It must still fall back — but loudly.
 *  2. The canonical set must stay exactly the backend's
 *     `CANONICAL_REPORT_TYPES` (services/test_service.py); a drift here means
 *     valid tests get the wrong layout.
 *  3. A missing `report_type` (legacy rows / legacy API) is NOT an anomaly and
 *     must default without crying wolf in the console.
 */
describe('normalizeReportType', () => {
  afterEach(() => { vi.restoreAllMocks(); });

  it('matches the backend canonical set, with bizcheck as the default', () => {
    expect([...REPORT_TYPES].sort()).toEqual(['bizcheck', 'gdpr', 'premium', 'standard']);
    expect(DEFAULT_REPORT_TYPE).toBe('bizcheck');
  });

  it.each(REPORT_TYPES)('passes the canonical value %s through untouched', (rt) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(normalizeReportType(rt)).toBe(rt);
    expect(warn).not.toHaveBeenCalled();
  });

  it('defaults silently when the field is absent', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(normalizeReportType(undefined)).toBe('bizcheck');
    expect(normalizeReportType(null)).toBe('bizcheck');
    expect(warn).not.toHaveBeenCalled();
  });

  it('warns and falls back to bizcheck on an unknown report type', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(normalizeReportType('esg')).toBe('bizcheck');
    expect(warn).toHaveBeenCalledTimes(1);
    const msg = String(warn.mock.calls[0][0]);
    expect(msg).toContain('esg');
    expect(msg).toContain('bizcheck');
  });

  const nonCanonical: [label: string, value: unknown][] = [
    ['empty string', ''],
    ['number', 42],
    ['object', {}],
    ['array', ['gdpr']],
  ];
  it.each(nonCanonical)('warns and falls back for a non-canonical %s value', (_label, value) => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(normalizeReportType(value)).toBe('bizcheck');
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('is case-sensitive — "GDPR" is not the gdpr layout', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(normalizeReportType('GDPR')).toBe('bizcheck');
    expect(warn).toHaveBeenCalledTimes(1);
  });
});
