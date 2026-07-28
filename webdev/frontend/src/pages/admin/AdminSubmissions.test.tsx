import { useEffect } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import type { AdminSubmission, AdminTest, SubmissionsPaging } from '@/api/admin';

/**
 * The admin submissions table used to pull EVERY row on every render (12.3 MB
 * at 5000 rows, with Fernet decryption of 4 PII columns per row). It now asks
 * for one page at a time. These tests pin the behaviours that are easy to
 * regress: the query it builds, the page-1 reset on filter change, hiding the
 * controls when there is only one page, and the empty state.
 */

const listSubmissionsMock = vi.fn();
const listTestsMock = vi.fn();

vi.mock('@/api/admin', async () => {
  const actual = await vi.importActual<typeof import('@/api/admin')>('@/api/admin');
  return {
    ...actual,
    adminApi: {
      listSubmissions: (...args: unknown[]) => listSubmissionsMock(...args),
      listTests: () => listTestsMock(),
      deleteSubmission: vi.fn(),
      deleteAllSubmissions: vi.fn(),
    },
    adminFetch: vi.fn(),
  };
});

const { default: AdminSubmissions } = await import('@/pages/admin/AdminSubmissions');

function sub(id: number): AdminSubmission {
  return {
    id,
    test_id: 1,
    first_name: `User${id}`,
    last_name: null,
    email: `u${id}@example.com`,
    phone: null,
    sector: null,
    total_score: 50,
    status: 'completed',
    created_at: '2026-01-01T00:00:00Z',
    language: 'uk',
    tg_chat_id: null,
    tg_username: null,
    tg_first_name: null,
    tg_last_name: null,
  };
}

const TESTS: AdminTest[] = [
  { id: 1, name_uk: 'Тест A' } as AdminTest,
  { id: 2, name_uk: 'Тест B' } as AdminTest,
];

/** Serves `total` rows, slicing them the way the backend would. */
function serveRows(total: number) {
  listSubmissionsMock.mockImplementation(async (_testId?: number, paging?: SubmissionsPaging) => {
    const perPage = paging?.perPage ?? 50;
    const page = paging?.page ?? 1;
    const all = Array.from({ length: total }, (_, i) => sub(i + 1));
    const slice = paging ? all.slice((page - 1) * perPage, page * perPage) : all;
    return {
      submissions: slice,
      count: slice.length,
      total,
      page: paging ? page : 1,
      perPage,
      totalPages: Math.ceil(total / perPage),
      paginated: !!paging,
    };
  });
}

let lastSearch = '';
/** Mirrors the router's query string out to the test. Written in an effect,
 *  never during render — reassigning a module variable while rendering is a
 *  side effect React (and the lint rule) rightly rejects. */
function SearchSpy() {
  const { search } = useLocation();
  useEffect(() => { lastSearch = search; }, [search]);
  return null;
}

function renderAt(initialEntry: string) {
  return render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <SearchSpy />
      <Routes>
        <Route path="/subs" element={<AdminSubmissions />} />
      </Routes>
    </MemoryRouter>,
  );
}

beforeEach(() => {
  listSubmissionsMock.mockReset();
  listTestsMock.mockReset();
  listTestsMock.mockResolvedValue({ tests: TESTS });
  lastSearch = '';
});

describe('AdminSubmissions — paged fetching', () => {
  it('asks for page 1 with per_page 50 on first mount', async () => {
    serveRows(120);
    renderAt('/subs');
    await waitFor(() => expect(listSubmissionsMock).toHaveBeenCalled());
    expect(listSubmissionsMock).toHaveBeenCalledWith(undefined, { page: 1, perPage: 50 });
  });

  it('honours page and per_page taken from the URL (refresh / bookmark works)', async () => {
    serveRows(120);
    renderAt('/subs?page=3&per_page=25');
    await waitFor(() => expect(listSubmissionsMock).toHaveBeenCalled());
    expect(listSubmissionsMock).toHaveBeenCalledWith(undefined, { page: 3, perPage: 25 });
  });

  it('passes the test filter from the URL to the API', async () => {
    serveRows(120);
    renderAt('/subs?test=2');
    await waitFor(() => expect(listSubmissionsMock).toHaveBeenCalled());
    expect(listSubmissionsMock).toHaveBeenCalledWith(2, { page: 1, perPage: 50 });
  });

  it('numbers rows against the global total, not the page offset', async () => {
    serveRows(120);
    renderAt('/subs?page=2');
    // Page 2 of 120 newest-first rows starts at global index 50 → number 70.
    await waitFor(() => expect(screen.getByText('70')).toBeInTheDocument());
  });
});

describe('AdminSubmissions — page controls', () => {
  it('shows "page X of Y" and moves forward, writing the page into the URL', async () => {
    serveRows(120);
    const user = userEvent.setup();
    renderAt('/subs');
    await waitFor(() => expect(screen.getByText(/Сторінка 1 з 3/)).toBeInTheDocument());

    await user.click(screen.getByRole('button', { name: /Вперед/ }));
    await waitFor(() => expect(lastSearch).toContain('page=2'));
    await waitFor(() => expect(screen.getByText(/Сторінка 2 з 3/)).toBeInTheDocument());
  });

  it('disables "back" on the first page and "forward" on the last', async () => {
    serveRows(120);
    renderAt('/subs?page=3');
    await waitFor(() => expect(screen.getByText(/Сторінка 3 з 3/)).toBeInTheDocument());
    expect(screen.getByRole('button', { name: /Вперед/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /Назад/ })).not.toBeDisabled();
  });

  it('hides the controls entirely when everything fits on one page', async () => {
    serveRows(10);
    renderAt('/subs');
    await waitFor(() => expect(screen.getByText('User1')).toBeInTheDocument());
    expect(screen.queryByRole('navigation', { name: 'Пагінація' })).toBeNull();
  });
});

describe('AdminSubmissions — filter changes reset the page', () => {
  it('goes back to page 1 when the test filter changes', async () => {
    serveRows(120);
    const user = userEvent.setup();
    renderAt('/subs?page=3');
    await waitFor(() => expect(screen.getByText(/Сторінка 3 з 3/)).toBeInTheDocument());

    listSubmissionsMock.mockClear();
    await user.selectOptions(screen.getByLabelText('Фільтр за тестом'), '2');

    await waitFor(() => expect(listSubmissionsMock).toHaveBeenCalledWith(2, { page: 1, perPage: 50 }));
    expect(lastSearch).not.toContain('page=3');
    expect(lastSearch).toContain('test=2');
  });

  it('goes back to page 1 when the page size changes', async () => {
    serveRows(120);
    const user = userEvent.setup();
    renderAt('/subs?page=3');
    await waitFor(() => expect(screen.getByText(/Сторінка 3 з 3/)).toBeInTheDocument());

    listSubmissionsMock.mockClear();
    await user.selectOptions(screen.getByLabelText('Рядків на сторінці'), '100');

    await waitFor(() => expect(listSubmissionsMock).toHaveBeenCalledWith(undefined, { page: 1, perPage: 100 }));
  });
});

describe('AdminSubmissions — edge cases', () => {
  it('renders the empty state (not an empty table) when there are no submissions', async () => {
    serveRows(0);
    renderAt('/subs');
    await waitFor(() => expect(screen.getByText('Поки що немає відповідей.')).toBeInTheDocument());
    expect(screen.queryByRole('table')).toBeNull();
    expect(screen.queryByRole('navigation', { name: 'Пагінація' })).toBeNull();
    // Nothing to delete → no destructive button offered.
    expect(screen.queryByRole('button', { name: /Видалити все/ })).toBeNull();
  });

  it('snaps back to the last surviving page when the current one no longer exists', async () => {
    // 120 rows shrank to 60 while the admin sat on page 3 → page 3 is now empty.
    serveRows(60);
    renderAt('/subs?page=3');
    await waitFor(() => expect(screen.getByText(/Сторінка 2 з 2/)).toBeInTheDocument());
    expect(lastSearch).toContain('page=2');
  });

  it('keeps the previous rows on screen while the next page loads', async () => {
    serveRows(120);
    const user = userEvent.setup();
    renderAt('/subs');
    await waitFor(() => expect(screen.getByText('User1')).toBeInTheDocument());

    // Next response never settles → the table must still be mounted, marked busy.
    listSubmissionsMock.mockImplementation(() => new Promise(() => {}));
    await user.click(screen.getByRole('button', { name: /Вперед/ }));

    await waitFor(() => {
      const wrap = document.querySelector('.admin-table-wrap');
      expect(wrap).not.toBeNull();
      expect(wrap?.getAttribute('aria-busy')).toBe('true');
    });
    expect(screen.getByText('User1')).toBeInTheDocument();
  });

  it('surfaces a load error instead of a silently empty table', async () => {
    listSubmissionsMock.mockRejectedValue(new Error('Unauthorized'));
    renderAt('/subs');
    await waitFor(() => expect(screen.getByText(/Unauthorized/)).toBeInTheDocument());
  });
});
