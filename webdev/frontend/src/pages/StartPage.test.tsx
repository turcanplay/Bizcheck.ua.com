import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { LanguageProvider } from '@/context/LanguageContext';
import { translations } from '@/i18n/translations';
import type { TestOption } from '@/types';

/**
 * StartPage deep-link detection after the language-prefix migration.
 *
 * Public quiz URLs are `/uk/test/:slug` and `/en/test/:slug`. StartPage used to
 * detect a deep link with `location.pathname.startsWith('/test/')`, which the
 * prefix makes permanently false — so every deep-linked visitor got the "back
 * to the test picker" button that is supposed to be hidden there, and the run
 * started at Step 0 whenever the context slug had not been applied yet.
 *
 * That was not cosmetic: picking another test in that picker only changed the
 * context slug, and QuizApp's `slug !== selectedTestSlug` effect snapped it
 * straight back to the slug in the URL — the visitor got a different test than
 * the one they clicked.
 *
 * These tests pin the detection to the route param, and keep the non-deep-link
 * case (no `:slug` in the URL) working so the fix cannot swallow Step 0.
 */

const useQuizMock = vi.fn();
vi.mock('@/context/QuizContext', () => ({
  useQuiz: () => useQuizMock(),
}));

const { default: StartPage } = await import('@/pages/StartPage');

const testOption: TestOption = {
  id: 1,
  slug: 'demo',
  name_uk: 'Демо тест',
  name_en: 'Demo test',
  description_uk: '',
  description_en: '',
};

function state(over: Record<string, unknown> = {}): Record<string, unknown> {
  return {
    sectors: ['IT', 'Retail'],
    sizes: ['1-10'],
    ages: ['<1'],
    revenues: ['<100k'],
    setUserInfo: vi.fn(),
    setPhase: vi.fn(),
    blocks: [],
    loading: false,
    answerableQuestionCount: 4,
    createSubmission: vi.fn(),
    updateSubmission: vi.fn(),
    tests: [testOption],
    selectedTestSlug: null,
    selectTest: vi.fn(),
    ...over,
  };
}

/** Render StartPage under the real localized quiz route (`/:lang/test/:slug`). */
function renderDeepLink(lang: 'uk' | 'en' = 'uk', slug = 'demo') {
  return render(
    <MemoryRouter initialEntries={[`/${lang}/test/${slug}`]}>
      <LanguageProvider>
        <Routes>
          <Route path=":lang/test/:slug" element={<StartPage />} />
        </Routes>
      </LanguageProvider>
    </MemoryRouter>,
  );
}

/** Render StartPage on a route that carries no test slug at all. */
function renderWithoutSlug(lang: 'uk' | 'en' = 'uk') {
  return render(
    <MemoryRouter initialEntries={[`/${lang}/test`]}>
      <LanguageProvider>
        <Routes>
          <Route path=":lang/test" element={<StartPage />} />
        </Routes>
      </LanguageProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  localStorage.clear();
  useQuizMock.mockReset();
});

describe('StartPage on a language-prefixed deep link', () => {
  it('starts at the company profile step, not at the test picker', () => {
    // The slug is in the URL but QuizApp has not applied it to the context yet
    // — the first render must still skip Step 0.
    useQuizMock.mockReturnValue(state({ selectedTestSlug: null }));
    renderDeepLink('uk');

    expect(screen.getByText(translations.labelSector.uk)).toBeInTheDocument();
    expect(screen.queryByText(translations.step0Title.uk)).toBeNull();
  });

  it('hides the "back to the test picker" button', () => {
    useQuizMock.mockReturnValue(state({ selectedTestSlug: 'demo' }));
    renderDeepLink('uk');

    expect(
      screen.queryByRole('button', { name: new RegExp(translations.btnBack.uk) }),
    ).toBeNull();
  });

  it('hides it on the English prefix too', () => {
    useQuizMock.mockReturnValue(state({ selectedTestSlug: 'demo' }));
    renderDeepLink('en');

    expect(screen.getByText(translations.labelSector.en)).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: new RegExp(translations.btnBack.en) }),
    ).toBeNull();
  });
});

describe('StartPage without a test slug in the URL', () => {
  it('still shows the test picker', () => {
    useQuizMock.mockReturnValue(state({ selectedTestSlug: null }));
    renderWithoutSlug('uk');

    expect(screen.getByText(translations.step0Title.uk)).toBeInTheDocument();
  });

  it('keeps the back button once a test has been picked there', async () => {
    const selectTest = vi.fn();
    useQuizMock.mockReturnValue(state({ selectedTestSlug: null, selectTest }));
    renderWithoutSlug('uk');

    await userEvent.click(screen.getByText(testOption.name_uk));

    expect(selectTest).toHaveBeenCalledWith('demo');
    expect(screen.getByText(translations.labelSector.uk)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: new RegExp(translations.btnBack.uk) }),
    ).toBeInTheDocument();
  });
});
