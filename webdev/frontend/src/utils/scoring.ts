import type { Block, Answers, Zone, BlockResult, ReportData, UserInfo } from '@/types';

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

export function getZone(pct: number): Zone {
  if (pct >= 80) return 'safe';
  if (pct >= 70) return 'developing';
  if (pct >= 65) return 'warning';
  return 'risk';
}

export function getZoneColor(zone: Zone): string {
  switch (zone) {
    case 'safe': return '#16A34A';
    case 'developing': return '#EAB308';
    case 'warning': return '#F97316';
    case 'risk': return '#DC2626';
  }
}

export function buildReport(blocks: Block[], answers: Answers, userInfo: UserInfo): ReportData {
  const blockScores: BlockResult[] = blocks.map((block, index) => {
    const score = calculateBlockScore(block, answers);
    return {
      id: block.id,
      order: index + 1,
      title: block.title,
      score,
      zone: getZone(score),
      questionCount: block.questions.length,
    };
  });

  const totalScore = calculateTotalScore(blockScores.map(b => b.score));

  return {
    blockScores,
    totalScore,
    distanceFromPerfect: 100 - totalScore,
    userInfo,
    date: new Date().toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    }),
  };
}
