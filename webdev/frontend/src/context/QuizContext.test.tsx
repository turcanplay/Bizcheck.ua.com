import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/context/LanguageContext';
import { QuizProvider, useQuiz } from '@/context/QuizContext';
import type { ApiBlock } from '@/utils/quizContent';

/**
 * Which question is selected while the quiz runs.
 *
 * The "initialize the block" effect re-runs on every new `blocks` identity, and
 * `blocks` is re-created right after the fetch (the language re-resolve) and on
 * every language toggle. Its old one-shot "we restored a question" ref was
 * consumed by the first run, so the second run re-initialized the block and
 * threw the position away. These tests pin the three visible consequences:
 *
 *  - a mid-quiz reload must resume on the SAVED question, not on question 1;
 *  - a saved question that no longer exists (deleted in the admin panel, or a
 *    block index past the end) must fall back to a real question instead of
 *    leaving `currentQuestion` null forever — QuizPage paints a blank page for
 *    that state, with no way forward;
 *  - stepping back into an earlier block must land on that block's LAST
 *    question, which prevQuestion() selects and the effect used to overwrite.
 */

vi.mock('@/utils/durableSave', () => ({
  enqueueSave: vi.fn(),
}));

const SESSION_KEY = 'bizcheck_quiz_state_v2';

const apiBlocks: ApiBlock[] = [
  {
    id: 1,
    title_uk: 'Блок 1',
    title_en: 'Block 1',
    questions: [
      {
        id: 'q1', db_id: 101, parent_question_id: null,
        text_uk: 'Перше питання', text_en: 'First question',
        note_uk: null, note_en: null, options: [],
      },
      {
        id: 'q2', db_id: 102, parent_question_id: null,
        text_uk: 'Друге питання', text_en: 'Second question',
        note_uk: null, note_en: null, options: [],
      },
    ],
  },
  {
    id: 2,
    title_uk: 'Блок 2',
    title_en: 'Block 2',
    questions: [
      {
        id: 'q3', db_id: 201, parent_question_id: null,
        text_uk: 'Третє питання', text_en: 'Third question',
        note_uk: null, note_en: null, options: [],
      },
    ],
  },
];

function seedSession(over: Record<string, unknown>) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify({
    phase: 'quiz',
    currentBlock: 0,
    currentQuestionDbId: 101,
    topLevelIndex: 0,
    answers: {},
    selectedKeys: {},
    userInfo: {
      firstName: '', lastName: '', email: '', phone: '', consent: false,
      sector: '', size: '', age: '', revenue: '',
    },
    submissionId: 7,
    submissionToken: 'tok',
    selectedTestSlug: 'demo',
    ...over,
  }));
}

function Probe() {
  const { currentQuestion, loading, nextQuestion, prevQuestion } = useQuiz();
  return (
    <div>
      <div data-testid="probe">{loading ? 'loading' : (currentQuestion?.text ?? 'BLANK')}</div>
      <button type="button" onClick={nextQuestion}>next</button>
      <button type="button" onClick={prevQuestion}>prev</button>
    </div>
  );
}

function renderProvider() {
  return render(
    <MemoryRouter initialEntries={['/uk/test/demo']}>
      <LanguageProvider>
        <QuizProvider>
          <Probe />
        </QuizProvider>
      </LanguageProvider>
    </MemoryRouter>,
  );
}

/** Wait for the fetches AND every follow-up effect to settle, so the assertion
 *  sees the state the user ends up on — not a frame that is overwritten. */
async function settle() {
  await waitFor(() => {
    expect(screen.getByTestId('probe')).not.toHaveTextContent('loading');
  });
  await act(async () => { await new Promise(resolve => setTimeout(resolve, 50)); });
}

beforeEach(() => {
  sessionStorage.clear();
  localStorage.clear();
  vi.stubGlobal('fetch', vi.fn((input: RequestInfo | URL) => {
    const url = String(input);
    const body = url.includes('/blocks/quiz')
      ? { blocks: apiBlocks }
      : { tests: [{ id: 1, slug: 'demo', name_uk: 'Демо', name_en: 'Demo', description_uk: '', description_en: '' }] };
    return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body) } as Response);
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('QuizContext session restore', () => {
  it('resumes on the saved question instead of restarting the block', async () => {
    seedSession({ currentQuestionDbId: 102, topLevelIndex: 1 });
    renderProvider();
    await settle();

    expect(screen.getByTestId('probe')).toHaveTextContent('Друге питання');
  });

  it('falls back to a real question when the saved one was deleted', async () => {
    seedSession({ currentQuestionDbId: 999 });   // id no longer in the content
    renderProvider();
    await settle();

    expect(screen.getByTestId('probe')).toHaveTextContent('Перше питання');
  });

  it('falls back when the saved block index no longer exists', async () => {
    seedSession({ currentBlock: 5, currentQuestionDbId: 555 });
    renderProvider();
    await settle();

    expect(screen.getByTestId('probe')).toHaveTextContent('Перше питання');
  });
});

describe('QuizContext block navigation', () => {
  it('steps back into the LAST question of the previous block', async () => {
    seedSession({ currentQuestionDbId: null });
    renderProvider();
    await settle();
    expect(screen.getByTestId('probe')).toHaveTextContent('Перше питання');

    await userEvent.click(screen.getByRole('button', { name: 'next' }));
    expect(screen.getByTestId('probe')).toHaveTextContent('Друге питання');

    await userEvent.click(screen.getByRole('button', { name: 'next' }));
    expect(screen.getByTestId('probe')).toHaveTextContent('Третє питання');

    // Back from the first question of block 2 → last question of block 1.
    await userEvent.click(screen.getByRole('button', { name: 'prev' }));
    expect(screen.getByTestId('probe')).toHaveTextContent('Друге питання');
  });
});
