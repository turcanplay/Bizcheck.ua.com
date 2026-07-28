import { act, render, screen, fireEvent, cleanup } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { AdminSubmission, ExportJob, ExportJobState } from '@/api/admin';

/**
 * "📦 Усі PDF-файли (ZIP)" no longer hits the synchronous export (16 s of a
 * pinned gunicorn worker, 807 MB, at 250 submissions). It now:
 *
 *   POST .../export/pdfs-zip/jobs → poll job.status_path every 3 s
 *   → state 'ready'  → authenticated download of job.download_path
 *   → state 'failed' → show job.error
 *
 * These tests pin the parts that are easy to regress and expensive when they
 * do: the poll cadence (the blueprint rate-limits at 60 req/min — polling
 * faster would 429 the admin out of their own panel), the fact that polling
 * STOPS on unmount and on a test switch, and the three failure branches
 * (503 backlog full, failed job, 410 expired archive).
 */

const listSubmissionsMock = vi.fn();
const startPdfsZipExportMock = vi.fn();
const getExportJobMock = vi.fn();
const adminFetchMock = vi.fn();

vi.mock('@/api/admin', async () => {
  const actual = await vi.importActual<typeof import('@/api/admin')>('@/api/admin');
  return {
    ...actual,                                   // real ApiError → instanceof works
    adminApi: {
      listSubmissions: (...a: unknown[]) => listSubmissionsMock(...a),
      startPdfsZipExport: (...a: unknown[]) => startPdfsZipExportMock(...a),
      getExportJob: (...a: unknown[]) => getExportJobMock(...a),
    },
    adminFetch: (...a: unknown[]) => adminFetchMock(...a),
  };
});

const { ApiError } = await import('@/api/admin');
const { default: AdminTestReports, ZIP_POLL_INTERVAL_MS, ZIP_MAX_POLL_ATTEMPTS } =
  await import('@/pages/admin/AdminTestReports');

const TOKEN = 'tok_abcdefghijklmnopqrstuvwxyz012345';

function job(state: ExportJobState, over: Partial<ExportJob> = {}): ExportJob {
  return {
    token: TOKEN,
    kind: 'pdfs_zip',
    test_id: 7,
    state,
    created_at: 1_700_000_000,
    updated_at: 1_700_000_001,
    progress: { done: 0, total: null },
    size_bytes: null,
    filename: 'BizCheck_test_7_pdfs.zip',
    error: null,
    status_path: `/submissions/exports/jobs/${TOKEN}`,
    status_url: `/api_crowe_bizcheck/submissions/exports/jobs/${TOKEN}`,
    ...(state === 'ready'
      ? {
        download_path: `/submissions/exports/jobs/${TOKEN}/download`,
        download_url: `/api_crowe_bizcheck/submissions/exports/jobs/${TOKEN}/download`,
      }
      : {}),
    ...over,
  };
}

function sub(id: number): AdminSubmission {
  return {
    id, test_id: 7, first_name: `User${id}`, last_name: null,
    email: null, phone: null, sector: null, total_score: 40,
    status: 'completed', created_at: '2026-01-01T00:00:00Z', language: 'uk',
    tg_chat_id: null, tg_username: null, tg_first_name: null, tg_last_name: null,
    has_pdf: true,
  };
}

function zipResponse(status: number) {
  return {
    ok: status >= 200 && status < 300,
    status,
    headers: { get: () => 'attachment; filename="BizCheck_test_7_pdfs.zip"' },
    blob: async () => new Blob(['PK']),
  } as unknown as Response;
}

/** Flush pending promises without letting any poll timer fire. */
async function flush() {
  await act(async () => { await vi.advanceTimersByTimeAsync(0); });
}

/** Advance exactly one poll interval and let the resulting request settle. */
async function tick(times = 1) {
  for (let i = 0; i < times; i++) {
    await act(async () => { await vi.advanceTimersByTimeAsync(ZIP_POLL_INTERVAL_MS); });
  }
}

function zipButton(): HTMLButtonElement {
  const btn = screen
    .getAllByRole('button')
    .find(b => /ZIP/.test(b.textContent || '') && !/Excel/.test(b.textContent || ''));
  if (!btn) throw new Error('ZIP export button not found');
  return btn as HTMLButtonElement;
}

async function renderReports(testId = 7) {
  const view = render(<AdminTestReports testId={testId} />);
  await flush();
  return view;
}

describe('AdminTestReports — async PDF-ZIP export', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    listSubmissionsMock.mockReset();
    startPdfsZipExportMock.mockReset();
    getExportJobMock.mockReset();
    adminFetchMock.mockReset();
    listSubmissionsMock.mockResolvedValue({
      submissions: [sub(1), sub(2)], count: 2, total: 2,
      page: 1, perPage: 2, totalPages: 1, paginated: false,
    });
    vi.stubGlobal('URL', Object.assign(Object.create(URL), {
      createObjectURL: vi.fn(() => 'blob:zip'),
      revokeObjectURL: vi.fn(),
    }));
    vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it('runs the whole lifecycle: POST → poll → ready → authenticated download', async () => {
    startPdfsZipExportMock.mockResolvedValue({ job: job('queued') });
    getExportJobMock
      .mockResolvedValueOnce({ job: job('running', { progress: { done: 40, total: 250 } }) })
      .mockResolvedValueOnce({ job: job('running', { progress: { done: 200, total: 250 } }) })
      .mockResolvedValueOnce({ job: job('ready', { progress: { done: 250, total: 250 }, size_bytes: 807_000_000 }) });
    adminFetchMock.mockResolvedValue(zipResponse(200));

    await renderReports();
    fireEvent.click(zipButton());
    await flush();

    expect(startPdfsZipExportMock).toHaveBeenCalledWith(7);
    expect(screen.getByText(/У черзі/)).toBeInTheDocument();

    await tick();
    expect(getExportJobMock).toHaveBeenCalledWith(`/submissions/exports/jobs/${TOKEN}`);
    // Real numbers from job.progress, not a mute spinner.
    expect(screen.getByText(/Формування архіву: 40 \/ 250 \(16%\)/)).toBeInTheDocument();
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '16');

    await tick();
    // Shown twice on purpose: on the disabled button and on the status line.
    expect(screen.getAllByText(/200 \/ 250 \(80%\)/).length).toBeGreaterThan(0);
    expect(screen.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '80');

    await tick();
    expect(adminFetchMock).toHaveBeenCalledWith(`/submissions/exports/jobs/${TOKEN}/download`);
    expect(screen.getByText(/Архів завантажено/)).toBeInTheDocument();
    expect(screen.getByText(/770 МБ/)).toBeInTheDocument();
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
  });

  it('polls no faster than the 3 s the blueprint rate limit allows', async () => {
    startPdfsZipExportMock.mockResolvedValue({ job: job('queued') });
    getExportJobMock.mockResolvedValue({ job: job('running', { progress: { done: 1, total: 9 } }) });

    await renderReports();
    fireEvent.click(zipButton());
    await flush();

    expect(getExportJobMock).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(ZIP_POLL_INTERVAL_MS - 1); });
    expect(getExportJobMock).not.toHaveBeenCalled();
    await act(async () => { await vi.advanceTimersByTimeAsync(1); });
    expect(getExportJobMock).toHaveBeenCalledTimes(1);

    // 30 s of polling → 10 requests, well inside 60/min together with the rest.
    await tick(9);
    expect(getExportJobMock).toHaveBeenCalledTimes(10);
  });

  it('disables the button while a job is active so a second one cannot start', async () => {
    startPdfsZipExportMock.mockResolvedValue({ job: job('queued') });
    getExportJobMock.mockResolvedValue({ job: job('running', { progress: { done: 1, total: 4 } }) });

    await renderReports();
    fireEvent.click(zipButton());
    await flush();

    expect(zipButton()).toBeDisabled();
    fireEvent.click(zipButton());               // ignored — disabled
    await tick();
    expect(startPdfsZipExportMock).toHaveBeenCalledTimes(1);
  });

  it('stops polling on unmount — no request and no state update afterwards', async () => {
    startPdfsZipExportMock.mockResolvedValue({ job: job('queued') });
    getExportJobMock.mockResolvedValue({ job: job('running', { progress: { done: 2, total: 250 } }) });

    const { unmount } = await renderReports();
    fireEvent.click(zipButton());
    await flush();
    await tick(2);
    const callsBefore = getExportJobMock.mock.calls.length;
    expect(callsBefore).toBe(2);

    unmount();
    await act(async () => { await vi.advanceTimersByTimeAsync(ZIP_POLL_INTERVAL_MS * 20); });

    expect(getExportJobMock).toHaveBeenCalledTimes(callsBefore);
  });

  it('abandons the client side of the job when the selected test changes', async () => {
    startPdfsZipExportMock.mockResolvedValue({ job: job('queued') });
    getExportJobMock.mockResolvedValue({ job: job('running', { progress: { done: 5, total: 250 } }) });

    const { rerender } = await renderReports(7);
    fireEvent.click(zipButton());
    await flush();
    await tick();
    expect(getExportJobMock).toHaveBeenCalledTimes(1);

    await act(async () => { rerender(<AdminTestReports testId={8} />); });
    await flush();

    // Panel reset, polling stopped, button usable again for the new test.
    expect(screen.queryByRole('progressbar')).not.toBeInTheDocument();
    expect(zipButton()).not.toBeDisabled();
    await tick(5);
    expect(getExportJobMock).toHaveBeenCalledTimes(1);
  });

  it('shows job.error verbatim when the job fails', async () => {
    startPdfsZipExportMock.mockResolvedValue({ job: job('queued') });
    getExportJobMock.mockResolvedValue({
      job: job('failed', { error: 'archive exceeds the configured size limit' }),
    });

    await renderReports();
    fireEvent.click(zipButton());
    await flush();
    await tick();

    expect(screen.getByText(/Не вдалося сформувати архів: archive exceeds the configured size limit/))
      .toBeInTheDocument();
    expect(adminFetchMock).not.toHaveBeenCalled();
    expect(zipButton()).not.toBeDisabled();
    // …and polling is over.
    await tick(5);
    expect(getExportJobMock).toHaveBeenCalledTimes(1);
  });

  it('explains a 503 (backlog full) instead of a bare HTTP code', async () => {
    startPdfsZipExportMock.mockRejectedValue(
      new ApiError('Export queue is full. Try again in a few minutes.', 503),
    );

    await renderReports();
    fireEvent.click(zipButton());
    await flush();

    expect(screen.getByText(/Черга експорту переповнена/)).toBeInTheDocument();
    expect(zipButton()).not.toBeDisabled();
    expect(getExportJobMock).not.toHaveBeenCalled();
  });

  it('offers a retry when the archive expired (410 on download)', async () => {
    startPdfsZipExportMock.mockResolvedValue({ job: job('queued') });
    getExportJobMock.mockResolvedValue({ job: job('ready') });
    adminFetchMock.mockResolvedValue(zipResponse(410));

    await renderReports();
    fireEvent.click(zipButton());
    await flush();
    await tick();

    expect(screen.getByText(/термін дії минув/)).toBeInTheDocument();
    const retry = screen.getByRole('button', { name: 'Повторити' });
    expect(retry).not.toBeDisabled();

    // Retrying starts a fresh job rather than re-hitting the dead archive.
    getExportJobMock.mockResolvedValue({ job: job('running', { progress: { done: 1, total: 3 } }) });
    fireEvent.click(retry);
    await flush();
    expect(startPdfsZipExportMock).toHaveBeenCalledTimes(2);
  });

  it('tells the admin when a job disappeared mid-poll (404 / swept)', async () => {
    startPdfsZipExportMock.mockResolvedValue({ job: job('queued') });
    getExportJobMock.mockRejectedValue(new ApiError('Export job not found or expired', 404));

    await renderReports();
    fireEvent.click(zipButton());
    await flush();
    await tick();

    expect(screen.getByText(/Завдання експорту не знайдено або воно застаріло/)).toBeInTheDocument();
    expect(zipButton()).not.toBeDisabled();
  });

  it('gives up after the safety ceiling instead of polling forever', async () => {
    startPdfsZipExportMock.mockResolvedValue({ job: job('queued') });
    getExportJobMock.mockResolvedValue({ job: job('running', { progress: { done: 1, total: 250 } }) });

    await renderReports();
    fireEvent.click(zipButton());
    await flush();
    await tick(ZIP_MAX_POLL_ATTEMPTS);

    expect(getExportJobMock).toHaveBeenCalledTimes(ZIP_MAX_POLL_ATTEMPTS);
    expect(screen.getByText(/Експорт триває надто довго/)).toBeInTheDocument();

    await tick(5);
    expect(getExportJobMock).toHaveBeenCalledTimes(ZIP_MAX_POLL_ATTEMPTS);
  });
});
