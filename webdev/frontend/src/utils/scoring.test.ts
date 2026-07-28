import { describe, it, expect } from 'vitest';
import {
  DEFAULT_ZONES,
  resolveZones,
  getZone,
  displayPct,
  buildReport,
  calculateBlockScore,
  calculateTotalScore,
} from './scoring';
import type { Block, Answers, ScoringZones, UserInfo } from '@/types';

const USER: UserInfo = {
  firstName: 'A', lastName: 'B', email: '', phone: '', consent: true,
  sector: '', size: '', age: '', revenue: '',
};

/** One block, one question worth 0..10, so the block score is score*10 %. */
function block(id: number, title = `B${id}`): Block {
  return {
    id,
    title,
    questions: [{
      id: `b${id}q1`,
      db_id: id * 100,
      parent_question_id: null,
      text: 'q',
      note: null,
      options: [
        { label: 'no', key: 'a1', score: 0, next_question_id: null },
        { label: 'yes', key: 'a2', score: 10, next_question_id: null },
      ],
    }],
  };
}

function answersFor(id: number, pct: number): Answers {
  return { [`b${id}q1`]: pct / 10 };
}

describe('resolveZones', () => {
  it('falls back to the defaults when the field is missing', () => {
    expect(resolveZones(undefined)).toEqual(DEFAULT_ZONES);
    expect(resolveZones(null)).toEqual(DEFAULT_ZONES);
  });

  it('falls back to the defaults for a non-object value', () => {
    // A legacy row could hold a JSON string / number instead of an object.
    expect(resolveZones('80' as unknown as ScoringZones)).toEqual(DEFAULT_ZONES);
    expect(resolveZones(42 as unknown as ScoringZones)).toEqual(DEFAULT_ZONES);
  });

  it('keeps a valid custom set as-is', () => {
    expect(resolveZones({ safe: 90, developing: 75, warn: 50, risk: 0 }))
      .toEqual({ safe: 90, developing: 75, warn: 50, risk: 0 });
  });

  it('fills only the missing keys from the defaults', () => {
    expect(resolveZones({ safe: 95 }))
      .toEqual({ safe: 95, developing: 70, warn: 65, risk: 0 });
  });

  it('substitutes the default for a non-numeric value', () => {
    expect(resolveZones({ safe: 'abc' as unknown as number, developing: 60, warn: 40, risk: 0 }))
      .toEqual({ safe: 80, developing: 60, warn: 40, risk: 0 });
  });

  it('coerces numeric strings (JSONB round-trips are not always typed)', () => {
    expect(resolveZones({ safe: '90' as unknown as number }).safe).toBe(90);
  });

  it('clamps values outside 0..100', () => {
    expect(resolveZones({ safe: 500, developing: 70, warn: 65, risk: -20 }))
      .toEqual({ safe: 100, developing: 70, warn: 65, risk: 0 });
  });

  it('repairs an inverted set into a descending one instead of throwing', () => {
    // Admin typed 60/70/80 (ascending). Each band is clamped to the one above,
    // which collapses the lower bands — deterministic, never order-dependent.
    const z = resolveZones({ safe: 60, developing: 70, warn: 80, risk: 0 });
    expect(z.safe).toBeGreaterThanOrEqual(z.developing);
    expect(z.developing).toBeGreaterThanOrEqual(z.warn);
    expect(z.warn).toBeGreaterThanOrEqual(z.risk);
    expect(z).toEqual({ safe: 60, developing: 60, warn: 60, risk: 0 });
  });

  it('accepts equal thresholds (a deliberately collapsed band)', () => {
    expect(resolveZones({ safe: 80, developing: 80, warn: 65, risk: 0 }))
      .toEqual({ safe: 80, developing: 80, warn: 65, risk: 0 });
  });

  it('never mutates the shared DEFAULT_ZONES object', () => {
    const z = resolveZones(undefined);
    z.safe = 1;
    expect(DEFAULT_ZONES.safe).toBe(80);
  });
});

describe('getZone', () => {
  it('uses the default thresholds when none are supplied', () => {
    expect(getZone(85)).toBe('safe');
    expect(getZone(75)).toBe('developing');
    expect(getZone(66)).toBe('warning');
    expect(getZone(10)).toBe('risk');
  });

  it('puts a score exactly ON a threshold in the HIGHER zone', () => {
    expect(getZone(80)).toBe('safe');
    expect(getZone(70)).toBe('developing');
    expect(getZone(65)).toBe('warning');
    expect(getZone(64)).toBe('risk');
    expect(getZone(79)).toBe('developing');
    expect(getZone(69)).toBe('warning');
  });

  it('honours custom thresholds — the same score changes zone', () => {
    const custom = resolveZones({ safe: 50, developing: 40, warn: 30, risk: 0 });
    expect(getZone(55)).toBe('risk');           // default ladder
    expect(getZone(55, custom)).toBe('safe');   // admin-configured ladder
    expect(getZone(45, custom)).toBe('developing');
    expect(getZone(35, custom)).toBe('warning');
    expect(getZone(29, custom)).toBe('risk');
  });

  it('respects custom boundaries exactly', () => {
    const custom = resolveZones({ safe: 90, developing: 60, warn: 30, risk: 0 });
    expect(getZone(90, custom)).toBe('safe');
    expect(getZone(89, custom)).toBe('developing');
    expect(getZone(60, custom)).toBe('developing');
    expect(getZone(59, custom)).toBe('warning');
    expect(getZone(30, custom)).toBe('warning');
    expect(getZone(29, custom)).toBe('risk');
  });

  it('maps the DB key `warn` to the UI zone name `warning`', () => {
    expect(getZone(65, resolveZones({ warn: 65 }))).toBe('warning');
  });

  it('keeps 0 in the risk zone', () => {
    expect(getZone(0)).toBe('risk');
    expect(getZone(0, resolveZones({ safe: 50, developing: 40, warn: 30, risk: 0 }))).toBe('risk');
  });
});

describe('displayPct', () => {
  it('shows a computed 0 as 1 — "0%" reads as a broken calculation', () => {
    expect(displayPct(0)).toBe(1);
  });

  it('leaves every other value alone (rounded)', () => {
    expect(displayPct(1)).toBe(1);
    expect(displayPct(49.4)).toBe(49);
    expect(displayPct(49.6)).toBe(50);
    expect(displayPct(100)).toBe(100);
  });

  it('floors a negative / non-finite value to 1 rather than printing junk', () => {
    expect(displayPct(-5)).toBe(1);
    expect(displayPct(NaN)).toBe(1);
  });

  it('does NOT change the zone — clamping is display-only', () => {
    expect(getZone(0)).toBe('risk');
    expect(getZone(displayPct(0))).toBe('risk');   // 1 is still risk
  });
});

describe('buildReport', () => {
  it('carries the resolved zones on the report', () => {
    const r = buildReport([block(1)], answersFor(1, 100), USER, { safe: 50, developing: 40, warn: 30, risk: 0 });
    expect(r.zones).toEqual({ safe: 50, developing: 40, warn: 30, risk: 0 });
  });

  it('falls back to the defaults when the test has no zones', () => {
    const r = buildReport([block(1)], answersFor(1, 100), USER);
    expect(r.zones).toEqual(DEFAULT_ZONES);
  });

  it('assigns block zones with the TEST thresholds, not the hard-coded ones', () => {
    const blocks = [block(1)];
    const answers = answersFor(1, 50);

    expect(buildReport(blocks, answers, USER).blockScores[0].zone).toBe('risk');
    expect(
      buildReport(blocks, answers, USER, { safe: 50, developing: 40, warn: 30, risk: 0 })
        .blockScores[0].zone,
    ).toBe('safe');
  });

  it('stores the RAW total score — the 0→1 floor is never persisted', () => {
    const r = buildReport([block(1)], answersFor(1, 0), USER);
    expect(r.totalScore).toBe(0);
    expect(r.blockScores[0].score).toBe(0);
    expect(r.blockScores[0].zone).toBe('risk');
  });

  it('survives a garbage zones payload', () => {
    const r = buildReport([block(1)], answersFor(1, 90), USER,
      { safe: 'x' as unknown as number, developing: null as unknown as number });
    expect(r.zones).toEqual(DEFAULT_ZONES);
    expect(r.blockScores[0].zone).toBe('safe');
  });
});

describe('score arithmetic (unchanged by the zone work)', () => {
  it('scores a block against the answered questions only', () => {
    expect(calculateBlockScore(block(1), answersFor(1, 70))).toBe(70);
    expect(calculateBlockScore(block(1), {})).toBe(0);
  });

  it('averages block scores', () => {
    expect(calculateTotalScore([100, 0])).toBe(50);
    expect(calculateTotalScore([])).toBe(0);
  });
});
