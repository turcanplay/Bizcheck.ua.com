import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider } from '@/context/LanguageContext';
import { translations } from '@/i18n/translations';
import type { Question } from '@/types';

/**
 * QuizPage behaviour when the admin has not entered any quiz content yet.
 *
 * A brand-new install has zero blocks and zero questions (there is no seed —
 * see backend/database/db.py, migrate() creates tables only). QuizPage used to
 * `return null` in that situation, which painted a blank white page with no
 * explanation and no way out. It must show the "no questions" empty state
 * instead, in the language of the URL.
 */

const useQuizMock = vi.fn();
vi.mock('@/context/QuizContext', () => ({
  useQuiz: () => useQuizMock(),
}));

// QuizProgress/QuizQuestion pull in their own CSS + context; the empty-state
// paths never reach them, and the "has content" case only needs to prove that
// the question tree renders at all.
vi.mock('@/components/quiz/QuizProgress', () => ({
  default: () => <div data-testid="progress" />,
}));
vi.mock('@/components/quiz/QuizQuestion', () => ({
  default: ({ question }: { question: Question }) => (
    <div data-testid="question">{question.text}</div>
  ),
}));

const { default: QuizPage } = await import('@/pages/QuizPage');

interface QuizState {
  currentQuestion: Question | null;
  loading: boolean;
  answerableQuestionCount: number;
  restartQuiz: () => void;
}

function state(over: Partial<QuizState> = {}): QuizState & Record<string, unknown> {
  return {
    currentQuestion: null,
    canGoPrev: false,
    recordAnswer: vi.fn(),
    nextQuestion: vi.fn(),
    prevQuestion: vi.fn(),
    loading: false,
    answerableQuestionCount: 0,
    restartQuiz: vi.fn(),
    ...over,
  };
}

function renderQuizPage(lang: 'uk' | 'en' = 'uk') {
  localStorage.setItem('bizcheck_lang', lang);
  return render(
    <MemoryRouter initialEntries={[`/${lang}/test/demo`]}>
      <LanguageProvider>
        <QuizPage />
      </LanguageProvider>
    </MemoryRouter>,
  );
}

const question: Question = {
  id: 'q1',
  db_id: 11,
  parent_question_id: null,
  text: 'Питання?',
  note: null,
  options: [],
};

beforeEach(() => {
  localStorage.clear();
  useQuizMock.mockReset();
});

describe('QuizPage with no quiz content', () => {
  it('shows the empty state instead of a blank page', () => {
    useQuizMock.mockReturnValue(state({ answerableQuestionCount: 0 }));
    const { container } = renderQuizPage('uk');

    expect(screen.getByText(translations.noQuestions.uk)).toBeInTheDocument();
    expect(container.querySelector('[data-testid="question"]')).toBeNull();
  });

  it('shows the empty state in English on an /en/ route', () => {
    useQuizMock.mockReturnValue(state({ answerableQuestionCount: 0 }));
    renderQuizPage('en');

    expect(screen.getByText(translations.noQuestions.en)).toBeInTheDocument();
  });

  it('offers a way out that restarts the quiz', async () => {
    const restartQuiz = vi.fn();
    useQuizMock.mockReturnValue(state({ answerableQuestionCount: 0, restartQuiz }));
    renderQuizPage('uk');

    await userEvent.click(screen.getByRole('button', { name: translations.ctaRestart.uk }));
    expect(restartQuiz).toHaveBeenCalledTimes(1);
  });

  it('shows the loading notice while blocks are still being fetched', () => {
    useQuizMock.mockReturnValue(state({ loading: true, answerableQuestionCount: 0 }));
    renderQuizPage('uk');

    expect(screen.getByText(translations.loading.uk)).toBeInTheDocument();
    expect(screen.queryByText(translations.noQuestions.uk)).toBeNull();
  });
});

describe('QuizPage with quiz content', () => {
  it('renders the question, not the empty state', () => {
    useQuizMock.mockReturnValue(
      state({ answerableQuestionCount: 3, currentQuestion: question }),
    );
    renderQuizPage('uk');

    expect(screen.getByTestId('question')).toHaveTextContent('Питання?');
    expect(screen.queryByText(translations.noQuestions.uk)).toBeNull();
  });

  it('renders nothing for the transient frame between blocks', () => {
    // Questions exist but the "enter block" effect has not selected one yet.
    useQuizMock.mockReturnValue(
      state({ answerableQuestionCount: 3, currentQuestion: null }),
    );
    const { container } = renderQuizPage('uk');

    expect(container).toBeEmptyDOMElement();
    expect(screen.queryByText(translations.noQuestions.uk)).toBeNull();
  });
});
