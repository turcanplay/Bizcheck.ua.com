import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { BlockResult, ReportData } from '@/types';
import BlockGrid from './BlockGrid';
import OverallScore from './OverallScore';
import ZoneSection from './ZoneSection';
import BlockDetailPage from './BlockDetailPage';

vi.mock('@/context/LanguageContext', () => ({
  useLang: () => ({ lang: 'uk', t: (key: string) => key }),
}));

const blocks: BlockResult[] = [100, 80, 67, 63, 33, 100, 75, 50].map((score, i) => ({
  id: i + 1, order: i + 1, title: `Блок ${i + 1}`, score,
  zone: score >= 80 ? 'safe' : score >= 70 ? 'developing' : score >= 65 ? 'warning' : 'risk',
  questionCount: 3,
}));

const report: ReportData = {
  blockScores: blocks, totalScore: 71, distanceFromPerfect: 29,
  zones: { safe: 80, developing: 70, warn: 65, risk: 0 },
  date: '13 листопада 2026 р.',
  userInfo: { firstName: 'Демо', lastName: 'Приклад', email: '', phone: '', consent: false,
    sector: '', size: '', age: '', revenue: '' },
};

function labels(container: HTMLElement) {
  return Array.from(container.querySelectorAll('svg text'), node => node.textContent);
}

describe('printable report charts', () => {
  it('shows every final block score before any animation frame or delay', () => {
    const { container } = render(<BlockGrid blocks={blocks} />);
    expect(labels(container)).toEqual(['100%', '80%', '67%', '63%', '33%', '100%', '75%', '50%']);
  });

  it('captures final overall, zone and explanation scores immediately', () => {
    const { container } = render(<>
      <OverallScore report={report} />
      <ZoneSection zone="risk" blocks={[blocks[4]]} />
      <BlockDetailPage block={blocks[0]} />
    </>);
    expect(labels(container)).toEqual(['71%', '33%', '100%']);
  });

  it('updates printable scores directly when the report changes', () => {
    const { container, rerender } = render(<BlockGrid blocks={[blocks[0]]} />);
    rerender(<BlockGrid blocks={[{ ...blocks[0], score: 92 }]} />);
    expect(labels(container)).toEqual(['92%']);
  });
});
