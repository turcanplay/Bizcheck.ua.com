import type { Block, Answers, Zone, ScoringZones, BlockResult, ReportData, UserInfo } from '@/types';

export function calculateBlockScore(block: Block, answers: Answers): number {
  let earned = 0;
  let maxPossible = 0;

  block.questions.forEach(q => {
    // Only count questions that were actually answered (handles branching skip)
    if (answers[q.id] !== undefined) {
      const maxOption = Math.max(...q.options.map(o => o.score));
      maxPossible += maxOption;
      earned += answers[q.id];
    }
  });

  return maxPossible === 0 ? 0 : Math.round((earned / maxPossible) * 100);
}

export function calculateTotalScore(blockScores: number[]): number {
  if (blockScores.length === 0) return 0;
  return Math.round(blockScores.reduce((a, b) => a + b, 0) / blockScores.length);
}

/**
 * Thresholds used when a test carries no usable `scoring_zones`.
 *
 * Mirrors the DB default (`tests.scoring_zones`) and `backend/services/scoring.py`.
 * Keep the three files in step — they are the same product decision, not three
 * independent ones.
 */
export const DEFAULT_ZONES: ScoringZones = { safe: 80, developing: 70, warn: 65, risk: 0 };

function toPct(value: unknown, fallback: number): number {
  const n = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : NaN;
  if (!Number.isFinite(n)) return fallback;
  return Math.min(100, Math.max(0, n));
}

/**
 * Repair a raw `scoring_zones` value into a complete, descending threshold set.
 * NEVER throws: a report must render even for a legacy row, a hand-edited JSON
 * blob or a field the API forgot to send.
 *
 * Each band is clamped to the one above it, so `safe >= developing >= warn >=
 * risk` always holds. Inverted input therefore collapses a band to empty
 * (deterministic) instead of making `getZone` return something order-dependent.
 * The write path (`backend/routes/tests.py`) rejects such input outright — this
 * is only the read-side safety net for rows that predate that check.
 */
export function resolveZones(raw?: Partial<ScoringZones> | null): ScoringZones {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_ZONES };

  const safe = toPct(raw.safe, DEFAULT_ZONES.safe);
  const developing = Math.min(toPct(raw.developing, DEFAULT_ZONES.developing), safe);
  const warn = Math.min(toPct(raw.warn, DEFAULT_ZONES.warn), developing);
  const risk = Math.min(toPct(raw.risk, DEFAULT_ZONES.risk), warn);

  return { safe, developing, warn, risk };
}

/**
 * Colour band for a percentage.
 *
 * NOTE the key rename: the DB (and the admin modal) call the third band `warn`;
 * the UI type calls it `warning`. The mapping happens here and nowhere else.
 *
 * `zones` is optional so a caller with no test context still gets the defaults,
 * but every report path passes the current test's thresholds.
 */
export function getZone(pct: number, zones: ScoringZones = DEFAULT_ZONES): Zone {
  if (pct >= zones.safe) return 'safe';
  if (pct >= zones.developing) return 'developing';
  if (pct >= zones.warn) return 'warning';
  return 'risk';
}

/**
 * The percentage as SHOWN to a user: a computed 0 is displayed as 1.
 *
 * Product decision — "0%" reads like a broken calculation rather than a result.
 * Display only: never feed this into getZone() or into what we PATCH back as
 * `total_score`, or a 0 would climb out of the risk zone.
 */
export function displayPct(pct: number): number {
  if (!Number.isFinite(pct)) return 1;
  const n = Math.round(pct);
  return n <= 0 ? 1 : n;
}

export function getZoneColor(zone: Zone): string {
  switch (zone) {
    case 'safe': return '#05AB8C';       /* Crowe teal */
    case 'developing': return '#F5A800'; /* Crowe amber */
    case 'warning': return '#E07B00';    /* burnt amber */
    case 'risk': return '#D64535';       /* red */
  }
}

export function buildReport(
  blocks: Block[],
  answers: Answers,
  userInfo: UserInfo,
  zones?: Partial<ScoringZones> | null,
): ReportData {
  // Resolved ONCE and carried on the report, so every component down the tree
  // splits zones by the same thresholds without re-reading the test.
  const resolved = resolveZones(zones);

  const blockScores: BlockResult[] = blocks.map((block, index) => {
    const score = calculateBlockScore(block, answers);
    return {
      id: block.id,
      order: index + 1,
      title: block.title,
      score,
      zone: getZone(score, resolved),
      questionCount: block.questions.length,
    };
  });

  const totalScore = calculateTotalScore(blockScores.map(b => b.score));

  return {
    blockScores,
    totalScore,
    zones: resolved,
    distanceFromPerfect: 100 - totalScore,
    userInfo,
    date: new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  };
}
