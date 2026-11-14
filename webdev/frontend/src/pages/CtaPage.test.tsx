import { act, cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MemoryRouter } from 'react-router-dom';
import { LanguageProvider, useLang } from '@/context/LanguageContext';
import { QuizProvider } from '@/context/QuizContext';
import { generateFullPdf } from '@/utils/pdfGenerator';
import { translations } from '@/i18n/translations';
import CtaPage from './CtaPage';

const { openTelegram } = vi.hoisted(() => ({ openTelegram: vi.fn().mockResolvedValue(undefined) }));
vi.mock('@/utils/pdfGenerator', () => ({ generateFullPdf: vi.fn() }));
vi.mock('@/utils/durableSave', () => ({
  enqueueSave: vi.fn(), isPending: vi.fn(() => false), wasDropped: vi.fn(() => false),
  flushAndConfirm: vi.fn().mockResolvedValue(true),
}));
vi.mock('@/hooks/useTelegramLink', () => ({
  useTelegramLink: () => ({
    tgLoading: false, tgError: false, tgPending: false,
    openTelegram, resetTelegram: vi.fn(),
  }),
}));

type Pdf = Awaited<ReturnType<typeof generateFullPdf>>;
function pdf(marker: string): Pdf {
  return { output: () => `data:application/pdf;base64,${marker.repeat(120)}`, save: vi.fn() };
}
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}
const apiBlock = {
  id: 1, title_uk: 'Управління компанією', title_en: 'Company management',
  questions: [{
    id: 'q1', db_id: 101, parent_question_id: null,
    text_uk: 'Чи є план?', text_en: 'Is there a plan?', note_uk: null, note_en: null,
    options: [{ key: 'yes', label_uk: 'Так', label_en: 'Yes', score: 10, next_question_id: null }],
  }],
};
let uploads: string[];
let pendingUpload: ReturnType<typeof deferred<Response>> | null;

function SwitchLanguage() {
  const { setLang } = useLang();
  return <><button onClick={() => setLang('en')}>english</button>
    <button onClick={() => setLang('uk')}>ukrainian</button></>;
}
function mount() {
  return render(
    <MemoryRouter initialEntries={['/uk/test/demo']}>
      <LanguageProvider><QuizProvider><SwitchLanguage /><CtaPage /></QuizProvider></LanguageProvider>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  uploads = [];
  pendingUpload = null;
  sessionStorage.clear();
  localStorage.clear();
  sessionStorage.setItem('bizcheck_quiz_state_v2', JSON.stringify({
    phase: 'cta', currentBlock: 0, currentQuestionDbId: 101, topLevelIndex: 0,
    answers: { q1: 10 }, selectedKeys: { q1: 'yes' }, selectedTestSlug: 'demo',
    submissionId: 7, submissionToken: 'owner-token',
    userInfo: { firstName: '', lastName: '', email: '', phone: '', consent: false,
      sector: '', size: '', age: '', revenue: '' },
  }));
  vi.spyOn(HTMLElement.prototype, 'scrollHeight', 'get').mockReturnValue(1103);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) =>
    setTimeout(() => callback(performance.now()), 0));
  vi.stubGlobal('cancelAnimationFrame', clearTimeout);
  vi.stubGlobal('fetch', vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = String(input);
    let body: unknown = {};
    if (url.includes('/blocks/quiz')) body = { blocks: [apiBlock] };
    else if (url.endsWith('/tests')) body = { tests: [{ id: 1, slug: 'demo', name_uk: 'Демо',
      name_en: 'Demo', description_uk: '', description_en: '', report_type: 'premium' }] };
    else if (url.endsWith('/site-settings')) body = { settings: { email_delivery_enabled: '1' } };
    else if (url.endsWith('/submissions/7/pdf')) {
      uploads.push((JSON.parse(String(init?.body)) as { pdf: string }).pdf);
      if (pendingUpload) {
        const pending = pendingUpload;
        pendingUpload = null;
        return pending.promise;
      }
    }
    return { ok: true, status: 200, json: async () => body } as Response;
  }));
  vi.mocked(generateFullPdf).mockResolvedValue(pdf('U'));
});
afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('current PDF delivery', () => {
  it('queues a language change during capture and never uploads or marks the stale PDF ready', async () => {
    const first = deferred<Pdf>();
    const latest = deferred<Pdf>();
    vi.mocked(generateFullPdf).mockReturnValueOnce(first.promise).mockReturnValueOnce(latest.promise);
    mount();
    await waitFor(() => expect(generateFullPdf).toHaveBeenCalledTimes(1));
    await userEvent.click(screen.getByRole('button', { name: 'english' }));
    await act(async () => { first.resolve(pdf('U')); });
    await waitFor(() => expect(generateFullPdf).toHaveBeenCalledTimes(2));
    expect(uploads).toEqual([]);
    expect(screen.queryByText(translations.ctaPdfReady.en)).not.toBeInTheDocument();
    const options = vi.mocked(generateFullPdf).mock.calls[1][0];
    expect(options.lang).toBe('en');
    expect(options.rootEl).toHaveTextContent('Company management');
    expect(options.rootEl).not.toHaveTextContent('Управління компанією');
    await act(async () => { latest.resolve(pdf('E')); });
    await screen.findByText(translations.ctaPdfReady.en);
    expect(uploads).toEqual(['E'.repeat(120)]);
  });

  it('waits for the personalized PDF before opening Telegram after contact entry', async () => {
    mount();
    await screen.findByText(translations.ctaPdfReady.uk);
    const personalized = deferred<Pdf>();
    vi.mocked(generateFullPdf).mockReturnValueOnce(personalized.promise);
    await userEvent.click(screen.getByRole('button', { name: new RegExp(translations.ctaTelegramTitle.uk) }));
    await userEvent.type(screen.getByRole('textbox', { name: translations.labelFullName.uk }), 'Олена Приклад');
    await userEvent.click(screen.getByRole('checkbox'));
    await userEvent.click(screen.getByRole('button', { name: translations.ctaTelegramBtn.uk }));
    await waitFor(() => expect(generateFullPdf).toHaveBeenCalledTimes(2));
    expect(vi.mocked(generateFullPdf).mock.calls[1][0].rootEl).toHaveTextContent('Олена Приклад');
    expect(openTelegram).not.toHaveBeenCalled();
    expect(screen.queryByText(translations.ctaPdfReady.uk)).not.toBeInTheDocument();
    await act(async () => { personalized.resolve(pdf('N')); });
    await waitFor(() => expect(openTelegram).toHaveBeenCalledTimes(1));
    expect(uploads).toEqual(['U'.repeat(120), 'N'.repeat(120)]);
  });

  it('keeps delivery unready while an old-language upload finishes and then replaces it', async () => {
    const oldUpload = deferred<Response>();
    pendingUpload = oldUpload;
    mount();
    await waitFor(() => expect(uploads).toHaveLength(1));
    await userEvent.click(screen.getByRole('button', { name: 'english' }));
    expect(screen.queryByText(translations.ctaPdfReady.en)).not.toBeInTheDocument();
    expect(generateFullPdf).toHaveBeenCalledTimes(1);
    vi.mocked(generateFullPdf).mockResolvedValueOnce(pdf('E'));
    await act(async () => { oldUpload.resolve({ ok: true, status: 200 } as Response); });
    await screen.findByText(translations.ctaPdfReady.en);
    expect(uploads).toEqual(['U'.repeat(120), 'E'.repeat(120)]);
    expect(vi.mocked(generateFullPdf).mock.calls[1][0].lang).toBe('en');
  });

  it('refreshes again when the user returns to the original language during another upload', async () => {
    mount();
    await screen.findByText(translations.ctaPdfReady.uk);
    const englishUpload = deferred<Response>();
    pendingUpload = englishUpload;
    vi.mocked(generateFullPdf).mockResolvedValueOnce(pdf('E'));
    await userEvent.click(screen.getByRole('button', { name: 'english' }));
    await waitFor(() => expect(uploads).toHaveLength(2));
    await userEvent.click(screen.getByRole('button', { name: 'ukrainian' }));
    expect(screen.queryByText(translations.ctaPdfReady.uk)).not.toBeInTheDocument();
    vi.mocked(generateFullPdf).mockResolvedValueOnce(pdf('R'));
    await act(async () => { englishUpload.resolve({ ok: true, status: 200 } as Response); });
    await screen.findByText(translations.ctaPdfReady.uk);
    expect(uploads).toEqual(['U'.repeat(120), 'E'.repeat(120), 'R'.repeat(120)]);
    expect(vi.mocked(generateFullPdf).mock.calls[2][0].lang).toBe('uk');
  });
});
