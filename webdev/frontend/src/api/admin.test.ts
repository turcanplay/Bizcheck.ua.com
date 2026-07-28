import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  adminApi,
  buildSubmissionsQuery,
  clampPerPage,
  normalizeSubmissionsResponse,
  SUBMISSIONS_DEFAULT_PER_PAGE,
  SUBMISSIONS_MAX_PER_PAGE,
  type AdminSubmission,
} from '@/api/admin';

/**
 * Pagination on GET /submissions is OPT-IN on the backend: paging engages only
 * when `page` or `per_page` is present, otherwise the full array comes back
 * (see backend/routes/submissions.py::_paging_params). The client must
 * therefore (a) send the params only when it actually wants a page, and
 * (b) understand BOTH response shapes.
 */

function sub(id: number): AdminSubmission {
  return {
    id,
    test_id: 1,
    first_name: `User${id}`,
    last_name: null,
    email: null,
    phone: null,
    sector: null,
    total_score: null,
    status: 'completed',
    created_at: '2026-01-01T00:00:00Z',
    language: 'uk',
    tg_chat_id: null,
    tg_username: null,
    tg_first_name: null,
    tg_last_name: null,
  };
}

describe('buildSubmissionsQuery', () => {
  it('sends nothing at all with no filter and no paging (full-array mode)', () => {
    expect(buildSubmissionsQuery()).toBe('');
  });

  it('sends only test_id when paging is not requested', () => {
    expect(buildSubmissionsQuery(7)).toBe('?test_id=7');
  });

  it('adds page and per_page once paging is requested', () => {
    expect(buildSubmissionsQuery(undefined, { page: 3, perPage: 50 }))
      .toBe('?page=3&per_page=50');
  });

  it('combines the filter with the paging params', () => {
    expect(buildSubmissionsQuery(7, { page: 2, perPage: 25 }))
      .toBe('?test_id=7&page=2&per_page=25');
  });

  it('defaults per_page to 50 and page to 1', () => {
    expect(buildSubmissionsQuery(undefined, {})).toBe('?page=1&per_page=50');
  });

  it('never emits page < 1 or per_page above the server cap', () => {
    expect(buildSubmissionsQuery(undefined, { page: 0, perPage: 5000 }))
      .toBe(`?page=1&per_page=${SUBMISSIONS_MAX_PER_PAGE}`);
    expect(buildSubmissionsQuery(undefined, { page: -4, perPage: 0 }))
      .toBe('?page=1&per_page=1');
  });

  it('drops a falsy test filter instead of sending test_id=0', () => {
    expect(buildSubmissionsQuery(0)).toBe('');
  });
});

describe('clampPerPage', () => {
  it('clamps into [1, 200] and falls back to the default for garbage', () => {
    expect(clampPerPage(50)).toBe(50);
    expect(clampPerPage(999)).toBe(SUBMISSIONS_MAX_PER_PAGE);
    expect(clampPerPage(-1)).toBe(1);
    expect(clampPerPage(NaN)).toBe(SUBMISSIONS_DEFAULT_PER_PAGE);
    expect(clampPerPage(undefined)).toBe(SUBMISSIONS_DEFAULT_PER_PAGE);
  });
});

describe('normalizeSubmissionsResponse — unpaged shape', () => {
  it('treats the whole array as one page', () => {
    const r = normalizeSubmissionsResponse(
      { submissions: [sub(1), sub(2), sub(3)], count: 3, total: 3 },
      '3',
    );
    expect(r.paginated).toBe(false);
    expect(r.submissions).toHaveLength(3);
    expect(r.total).toBe(3);
    expect(r.page).toBe(1);
    expect(r.totalPages).toBe(1);
  });

  it('falls back to X-Total-Count when the body has no total', () => {
    const r = normalizeSubmissionsResponse({ submissions: [sub(1)], count: 1 }, '120');
    expect(r.total).toBe(120);
  });

  it('falls back to the page length when neither total nor header exists', () => {
    const r = normalizeSubmissionsResponse({ submissions: [sub(1), sub(2)] }, null);
    expect(r.total).toBe(2);
    expect(r.count).toBe(2);
  });
});

describe('normalizeSubmissionsResponse — paged shape', () => {
  it('reads page metadata straight from the body', () => {
    const r = normalizeSubmissionsResponse({
      submissions: [sub(1), sub(2)], count: 2, total: 120,
      page: 2, per_page: 50, total_pages: 3,
    }, '120');
    expect(r.paginated).toBe(true);
    expect(r.page).toBe(2);
    expect(r.perPage).toBe(50);
    expect(r.totalPages).toBe(3);
    expect(r.total).toBe(120);
    expect(r.count).toBe(2);
  });

  it('derives total_pages when the server omits it', () => {
    const r = normalizeSubmissionsResponse({
      submissions: [], count: 0, total: 101, page: 1, per_page: 50,
    });
    expect(r.totalPages).toBe(3);
  });
});

describe('normalizeSubmissionsResponse — empty / defensive', () => {
  it('handles zero submissions without inventing pages', () => {
    const r = normalizeSubmissionsResponse(
      { submissions: [], count: 0, total: 0, page: 1, per_page: 50, total_pages: 0 },
      '0',
    );
    expect(r.submissions).toEqual([]);
    expect(r.total).toBe(0);
    expect(r.totalPages).toBe(0);
  });

  it('survives a null/garbage body', () => {
    const r = normalizeSubmissionsResponse(null);
    expect(r.submissions).toEqual([]);
    expect(r.total).toBe(0);
    expect(r.totalPages).toBe(0);
  });
});

describe('adminApi.listSubmissions', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal('fetch', fetchMock);
  });
  afterEach(() => { vi.unstubAllGlobals(); });

  function jsonResponse(body: unknown, headers: Record<string, string> = {}) {
    return {
      ok: true,
      status: 200,
      headers: { get: (k: string) => headers[k] ?? null },
      json: async () => body,
    };
  }

  it('requests the unpaged URL when no paging is given', async () => {
    fetchMock.mockResolvedValue(jsonResponse(
      { submissions: [sub(1)], count: 1, total: 1 }, { 'X-Total-Count': '1' },
    ));
    const r = await adminApi.listSubmissions();
    expect(fetchMock.mock.calls[0][0]).toMatch(/\/submissions$/);
    expect(r.paginated).toBe(false);
  });

  it('requests the paged URL and returns page metadata', async () => {
    fetchMock.mockResolvedValue(jsonResponse({
      submissions: [sub(1)], count: 1, total: 120, page: 2, per_page: 50, total_pages: 3,
    }, { 'X-Total-Count': '120' }));
    const r = await adminApi.listSubmissions(4, { page: 2, perPage: 50 });
    expect(fetchMock.mock.calls[0][0]).toContain('?test_id=4&page=2&per_page=50');
    expect(r.total).toBe(120);
    expect(r.totalPages).toBe(3);
    expect(r.page).toBe(2);
  });
});
