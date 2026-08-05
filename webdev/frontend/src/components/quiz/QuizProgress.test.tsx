import { render, screen, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/context/LanguageContext';
import type { Answers, Block, Question } from '@/types';
import { getTopLevelQuestions } from '@/utils/quizContent';

/**
 * The progress bar and the "3 / 21" counter must tell the SAME story.
 *
 * They did not: the counter showed a position among the current block's
 * top-level questions, while the bar showed `Object.keys(answers).length`
 * divided by EVERY row in `block.questions` — branch sub-questions included.
 * On the production test (21 top-level questions, 25 rows) the counter reached
 * 21 / 21 while the bar froze at 84 %: the two denominators can never agree.
 *
 * These tests pin the contract that replaced it — the bar is the counter,
 * scaled to the whole run:
 *   • bounded to 0…100 on every path, branches included;
 *   • non-decreasing while moving forward;
 *   • exactly 100 when the counter reads N / N on the last block.
 */

const useQuizMock = vi.fn();
vi.mock('@/context/QuizContext', () => ({
  useQuiz: () => useQuizMock(),
}));

const { default: QuizProgress } = await import('@/components/quiz/QuizProgress');

/* ---- fixtures ---------------------------------------------------------- */

function q(id: string, dbId: number, parent: number | null = null): Question {
  return { id, db_id: dbId, parent_question_id: parent, text: id, note: null, options: [] };
}

/** A block with `top` top-level questions and `sub` branch sub-questions. */
function block(id: number, top: number, sub = 0): Block {
  const questions: Question[] = [];
  for (let i = 1; i <= top; i++) questions.push(q(`b${id}q${i}`, id * 100 + i));
  for (let i = 1; i <= sub; i++) questions.push(q(`b${id}s${i}`, id * 100 + 50 + i, id * 100 + 1));
  return { id, title: `Блок ${id}`, questions };
}

interface QuizState {
  blocks: Block[];
  currentBlock: number;
  currentQuestionIndex: number;
  answers: Answers;
}

function state(over: Partial<QuizState>): Record<string, unknown> {
  const blocks = over.blocks ?? [];
  const currentBlock = over.currentBlock ?? 0;
  return {
    blocks,
    currentBlock,
    currentQuestionIndex: over.currentQuestionIndex ?? 1,
    // Kept in the fixture on purpose: the old implementation derived the bar
    // from it, so a regression back to answer-counting stays observable here.
    answers: over.answers ?? {},
    topLevelQuestionCount: getTopLevelQuestions(blocks[currentBlock]).length,
  };
}

function renderProgress(over: Partial<QuizState>) {
  useQuizMock.mockReturnValue(state(over));
  return render(
    <MemoryRouter initialEntries={['/uk/test/demo']}>
      <LanguageProvider>
        <QuizProgress />
      </LanguageProvider>
    </MemoryRouter>,
  );
}

/** The percentage the bar actually paints. */
function barPct(): number {
  const bar = screen.getByRole('progressbar');
  return Number(bar.getAttribute('aria-valuenow'));
}

/** The "3 / 21" counter, as `[current, total]`. */
function counter(container: HTMLElement): [number, number] {
  const num = container.querySelector('.qp__counter-num')?.textContent ?? '';
  const total = container.querySelector('.qp__counter-total')?.textContent ?? '';
  return [Number(num), Number(total)];
}

/** Every (block, question) step of a straight run through `blocks`. */
function walk(blocks: Block[]): Array<{ currentBlock: number; currentQuestionIndex: number }> {
  const steps: Array<{ currentBlock: number; currentQuestionIndex: number }> = [];
  blocks.forEach((b, bi) => {
    const top = getTopLevelQuestions(b).length;
    for (let i = 1; i <= top; i++) steps.push({ currentBlock: bi, currentQuestionIndex: i });
  });
  return steps;
}

beforeEach(() => {
  useQuizMock.mockReset();
});
afterEach(cleanup);

/* ---- tests ------------------------------------------------------------- */

describe('QuizProgress — bar agrees with the counter', () => {
  it('reaches 100 % on the last question of a single-block test with sub-questions', () => {
    // The production shape: 21 top-level questions, 25 rows in total.
    const blocks = [block(1, 21, 4)];
    // The user is ON the last question, so 20 top-level answers are recorded
    // plus the one branch they were routed through: 21 keys. The old bar
    // divided those 21 by the 25 rows and painted 84 % under a "21 / 21".
    const answers: Answers = {};
    for (let i = 1; i <= 20; i++) answers[`b1q${i}`] = 1;
    answers.b1s1 = 1;

    const { container } = renderProgress({ blocks, currentQuestionIndex: 21, answers });

    expect(counter(container)).toEqual([21, 21]);
    expect(barPct()).toBe(100);
    expect(container.querySelector('.qp__fill')).toHaveStyle({ width: '100%' });
  });

  it('never exceeds 100 % even when sub-question answers outnumber the questions', () => {
    const blocks = [block(1, 3, 5)];
    const answers: Answers = {};
    blocks[0].questions.forEach(qq => { answers[qq.id] = 1; });

    renderProgress({ blocks, currentQuestionIndex: 3, answers });

    expect(barPct()).toBe(100);
  });

  it('holds the parent question’s position while the user is inside a branch', () => {
    // On a sub-question QuizContext falls back to `topLevelIndex + 1`, i.e. the
    // parent's position. The bar must not move — and must not jump past it.
    const blocks = [block(1, 4, 2)];
    const answers: Answers = { b1q1: 1, b1q2: 1, b1s1: 1, b1s2: 1 };

    renderProgress({ blocks, currentQuestionIndex: 2, answers });

    expect(barPct()).toBe(50);   // 2 / 4 — sub-answers ignored on both sides
  });

  it('scales the counter across blocks instead of restarting at every block', () => {
    // Blocks of 3 + 2 top-level questions. First question of block 2 → 4 / 5.
    const blocks = [block(1, 3, 1), block(2, 2, 1)];
    const answers: Answers = { b1q1: 1, b1q2: 1, b1q3: 1, b1s1: 1 };

    const { container } = renderProgress({
      blocks, currentBlock: 1, currentQuestionIndex: 1, answers,
    });

    expect(counter(container)).toEqual([1, 2]);   // block-local counter
    expect(barPct()).toBe(80);                    // (3 + 1) / 5 globally
  });
});

describe('QuizProgress — monotonic and bounded on every path', () => {
  it('never decreases and ends at exactly 100 over a full multi-block run', () => {
    const blocks = [block(1, 5, 2), block(2, 3, 1), block(3, 4, 3)];
    const answers: Answers = {};
    const seen: number[] = [];

    for (const step of walk(blocks)) {
      const { container } = renderProgress({ ...step, blocks, answers: { ...answers } });
      seen.push(barPct());
      // The block-local counter stays in range at every step.
      const [cur, total] = counter(container);
      expect(cur).toBeGreaterThanOrEqual(1);
      expect(cur).toBeLessThanOrEqual(total);
      cleanup();

      // …then the user answers this question (and, on the first question of a
      // block, the branch hanging off it) before the next step is rendered.
      const b = blocks[step.currentBlock];
      answers[getTopLevelQuestions(b)[step.currentQuestionIndex - 1].id] = 1;
      if (step.currentQuestionIndex === 1) {
        b.questions.filter(x => x.parent_question_id !== null)
          .forEach(s => { answers[s.id] = 1; });
      }
    }

    expect(Math.min(...seen)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...seen)).toBeLessThanOrEqual(100);
    for (let i = 1; i < seen.length; i++) {
      expect(seen[i]).toBeGreaterThanOrEqual(seen[i - 1]);
    }
    expect(seen[seen.length - 1]).toBe(100);
  });

  it('stays at 0 with no content at all instead of printing NaN', () => {
    const { container } = renderProgress({ blocks: [], currentQuestionIndex: 0 });

    expect(barPct()).toBe(0);
    expect(container.querySelector('.qp__pct')?.textContent).not.toMatch(/NaN/);
  });

  it('ignores empty blocks that carry no answerable question', () => {
    // An admin-created but unfilled block sits between two real ones; it must
    // add nothing to the denominator and nothing to the offset.
    const blocks = [block(1, 2), block(2, 0), block(3, 2)];

    renderProgress({ blocks, currentBlock: 2, currentQuestionIndex: 2 });

    expect(barPct()).toBe(100);   // (2 + 0 + 2) / 4
  });
});
