import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  ApiError,
  adminApi,
  buildSubmissionsQuery,
  clampPerPage,
  fieldLabel,
  fieldTooLongDetail,
  normalizeSubmissionsResponse,
  saveErrorMessage,
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

/* ──────────────────────────────────────────────────────────────
 *  400 field_too_long
 *
 *  The admin authored-content validators (clean_authored) now REJECT an
 *  over-long value instead of silently truncating it, and answer
 *  400 {"code":"field_too_long","field","limit","length","submitted_length"}.
 *  The client used to flatten every failure into `new Error(body.error)`, so
 *  the modal could only say "Save failed". These pin the structured path.
 * ────────────────────────────────────────────────────────────── */

function tooLong(field: string, limit: number, length: number, submitted = length) {
  return new ApiError(
    `Field '${field}' is too long: ${length} characters after sanitization, the maximum is ${limit}.`,
    400,
    { code: 'field_too_long', field, limit, length, submitted_length: submitted },
  );
}

describe('ApiError plumbing', () => {
  const fetchMock = vi.fn();
  beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal('fetch', fetchMock); });
  afterEach(() => { vi.unstubAllGlobals(); });

  it('carries the status and the whole body off a failing request', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 400,
      headers: { get: () => null },
      json: async () => ({
        error: "Field 'title_uk' is too long: 405 characters after sanitization, the maximum is 255.",
        code: 'field_too_long', field: 'title_uk', limit: 255, length: 405, submitted_length: 412,
      }),
    });

    const err = await adminApi.createBlock({ test_id: 1, title_uk: 'x', title_en: 'y' })
      .then(() => null, (e: unknown) => e);

    expect(err).toBeInstanceOf(ApiError);
    expect(err).toBeInstanceOf(Error);                 // modals still catch it
    const api = err as ApiError;
    expect(api.status).toBe(400);
    expect(api.code).toBe('field_too_long');
    expect(api.body.field).toBe('title_uk');
  });

  it('keeps a status-only message when the body is not JSON', async () => {
    fetchMock.mockResolvedValue({
      ok: false, status: 502, headers: { get: () => null },
      json: async () => { throw new Error('not json'); },
    });
    const err = await adminApi.listTests().then(() => null, (e: unknown) => e) as ApiError;
    expect(err.status).toBe(502);
    expect(err.message).toBe('HTTP 502');
    expect(err.code).toBeNull();
  });

  it('still throws "Unauthorized" on 401 (the AdminLayout redirect depends on it)', async () => {
    fetchMock.mockResolvedValue({ ok: false, status: 401, headers: { get: () => null }, json: async () => ({}) });
    const err = await adminApi.listTests().then(() => null, (e: unknown) => e) as ApiError;
    expect(err.message).toBe('Unauthorized');
    expect(err.status).toBe(401);
  });
});

describe('fieldTooLongDetail', () => {
  it('normalizes the payload', () => {
    expect(fieldTooLongDetail(tooLong('title_uk', 255, 405, 412))).toEqual({
      field: 'title_uk', limit: 255, length: 405, submittedLength: 412,
    });
  });

  it('falls back to length when submitted_length is absent', () => {
    const err = new ApiError('too long', 400, { code: 'field_too_long', field: 'note_uk', limit: 10, length: 30 });
    expect(fieldTooLongDetail(err)?.submittedLength).toBe(30);
  });

  it('ignores other errors, other codes and non-numeric payloads', () => {
    expect(fieldTooLongDetail(new Error('boom'))).toBeNull();
    expect(fieldTooLongDetail(new ApiError('nope', 400, { code: 'other' }))).toBeNull();
    expect(fieldTooLongDetail(new ApiError('x', 400, { code: 'field_too_long', field: 'a' }))).toBeNull();
    expect(fieldTooLongDetail(null)).toBeNull();
  });
});

describe('fieldLabel', () => {
  it('maps the plain request keys to Ukrainian labels', () => {
    expect(fieldLabel('title_uk')).toBe('Назва (UA)');
    expect(fieldLabel('description_en')).toBe('Опис (EN)');
    expect(fieldLabel('note_uk')).toBe('Примітка (UA)');
  });

  it('renders the 1-based position for the indexed collection fields', () => {
    expect(fieldLabel('answers[0].text_uk')).toBe('Відповідь №1 — Текст (UA)');
    expect(fieldLabel('answers[3].text_en')).toBe('Відповідь №4 — Текст (EN)');
    expect(fieldLabel('features[2]')).toBe('Переваги №3');
  });

  it('falls back to the raw key for anything it does not know', () => {
    expect(fieldLabel('brand_new_field')).toBe('brand_new_field');
  });
});

describe('saveErrorMessage', () => {
  it('names the field, its length and the limit, and how much to cut', () => {
    const msg = saveErrorMessage(tooLong('title_uk', 255, 405));
    expect(msg).toContain('Назва (UA)');
    expect(msg).toContain('405');
    expect(msg).toContain('255');
    expect(msg).toContain('150');                       // 405 - 255
    expect(msg).not.toContain('Save failed');
  });

  it('points at the exact answer inside a question form', () => {
    expect(saveErrorMessage(tooLong('answers[1].text_uk', 2000, 2500)))
      .toContain('Відповідь №2 — Текст (UA)');
  });

  it('passes other errors through unchanged', () => {
    expect(saveErrorMessage(new Error('Unauthorized'))).toBe('Unauthorized');
    expect(saveErrorMessage(new ApiError('HTTP 500', 500))).toBe('HTTP 500');
  });

  it('uses the fallback for a non-Error throw', () => {
    expect(saveErrorMessage('oops')).toBe('Не вдалося зберегти');
    expect(saveErrorMessage(undefined, 'нема')).toBe('нема');
  });
});
