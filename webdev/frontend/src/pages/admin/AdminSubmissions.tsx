import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  adminApi, adminFetch, clampPerPage,
  SUBMISSIONS_DEFAULT_PER_PAGE,
  type AdminSubmission, type AdminTest,
} from '@/api/admin';
import { pickLang } from '@/i18n/pickLang';

const PER_PAGE_CHOICES = [25, 50, 100, 200];

/** Page size / filter / current page all live in the URL so a refresh, a
 *  bookmark and the browser Back button all land on the same view. */
function readPage(sp: URLSearchParams): number {
  const n = Number(sp.get('page'));
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : 1;
}

function readPerPage(sp: URLSearchParams): number {
  const n = Number(sp.get('per_page'));
  return Number.isFinite(n) && n >= 1 ? clampPerPage(n) : SUBMISSIONS_DEFAULT_PER_PAGE;
}

function readTest(sp: URLSearchParams): number | '' {
  const n = Number(sp.get('test'));
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : '';
}

export default function AdminSubmissions() {
  const [searchParams, setSearchParams] = useSearchParams();
  const testFilter = readTest(searchParams);
  const page = readPage(searchParams);
  const perPage = readPerPage(searchParams);

  const [submissions, setSubmissions] = useState<AdminSubmission[]>([]);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [tests, setTests] = useState<AdminTest[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  // Distinguishes "first paint, nothing to show yet" from "swapping pages":
  // on a page change we keep the previous rows mounted (dimmed) so the table
  // does not collapse to zero height and bounce the page.
  const [hasLoaded, setHasLoaded] = useState(false);
  const [reloadTick, setReloadTick] = useState(0);

  // The test list is fetched once and reused for the filter dropdown / testName().
  // Tracked in a ref rather than by reading `tests` inside load(): load() also
  // SETS `tests`, so depending on it would make load() a new function on every
  // fetch and the mount effect below would refetch forever.
  const testsLoadedRef = useRef(false);
  // Monotonic request id — a slow response for page 2 must not overwrite a
  // newer response for page 3.
  const reqIdRef = useRef(0);

  const goTo = useCallback((next: { test?: number | ''; page?: number; perPage?: number }, replace = false) => {
    setSearchParams(prev => {
      const sp = new URLSearchParams(prev);
      if (next.test !== undefined) {
        if (next.test === '') sp.delete('test');
        else sp.set('test', String(next.test));
      }
      if (next.perPage !== undefined) sp.set('per_page', String(clampPerPage(next.perPage)));
      if (next.page !== undefined) {
        if (next.page <= 1) sp.delete('page');
        else sp.set('page', String(next.page));
      }
      return sp;
    }, { replace });
  }, [setSearchParams]);

  // Paginated fetch: only `perPage` rows leave the server, and only those rows
  // get their PII decrypted. Depends on the URL-derived filter/page/perPage.
  useEffect(() => {
    const myReq = ++reqIdRef.current;
    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const [s, t] = await Promise.all([
          adminApi.listSubmissions(testFilter || undefined, { page, perPage }),
          testsLoadedRef.current ? Promise.resolve(null) : adminApi.listTests(),
        ]);
        if (cancelled || myReq !== reqIdRef.current) return;
        // The last page can vanish under us (someone deleted the only row on
        // it, or `total` shrank between requests). Snap back to the last page
        // that still exists instead of showing an empty table on page 7 of 2.
        if (s.submissions.length === 0 && s.total > 0 && page > 1) {
          goTo({ page: Math.max(1, s.totalPages) }, true);
          return;
        }
        setSubmissions(s.submissions);
        setTotal(s.total);
        setTotalPages(s.totalPages);
        if (t) { setTests(t.tests); testsLoadedRef.current = true; }
        setError('');
      } catch (e) {
        if (cancelled || myReq !== reqIdRef.current) return;
        setError(e instanceof Error ? e.message : 'Load failed');
      } finally {
        if (!cancelled && myReq === reqIdRef.current) {
          setLoading(false);
          setHasLoaded(true);
        }
      }
    })();
    return () => { cancelled = true; };
  }, [testFilter, page, perPage, reloadTick, goTo]);

  const reload = useCallback(() => setReloadTick(x => x + 1), []);

  function testName(id: number | null) {
    if (!id) return '—';
    const t = tests.find(x => x.id === id);
    return t ? (pickLang(t, 'name', 'uk') || `#${id}`) : `#${id}`;
  }

  async function onDelete(id: number) {
    if (!confirm('Видалити цю відповідь?')) return;
    await adminApi.deleteSubmission(id);
    reload();
  }

  async function onDeleteAll() {
    if (total === 0) return;
    // Масове видалення, НЕЗВОРОТНЕ (усі тести) — обовʼязкове підтвердження.
    if (!confirm(`Видалити ВСІ ${total} відповідей з усіх тестів?\n\nДія є НЕЗВОРОТНОЮ.`)) return;
    try {
      await adminApi.deleteAllSubmissions();
      goTo({ page: 1 }, true);
      reload();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Помилка видалення');
    }
  }

  async function exportExcel() {
    // Deliberately NOT paginated — the Excel export is a full-dataset dump
    // built server-side; it must cover every submission, not the visible page.
    const res = await adminFetch(`/submissions/export/excel`);
    if (!res.ok) { alert('Помилка експорту'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'bizcheck_submissions.xlsx';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function openPdf(s: AdminSubmission, download = false) {
    const res = await adminFetch(`/submissions/${s.id}/pdf`);
    if (!res.ok) { alert('PDF недоступний'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    if (download) {
      const name = [s.first_name, s.last_name].filter(Boolean).join('_') || `report_${s.id}`;
      const a = document.createElement('a');
      a.href = url;
      a.download = `BizCheck_${name}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    } else {
      window.open(url, '_blank', 'noopener');
    }
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  // HTML report — always available (independent of PDF). Fetched via adminFetch
  // so an expired session shows a friendly error instead of raw JSON in a tab.
  async function openReport(s: AdminSubmission) {
    const res = await adminFetch(`/submissions/${s.id}/report`);
    if (!res.ok) { alert('Звіт недоступний'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  const showSpinnerOnly = loading && !hasLoaded;
  const showEmpty = hasLoaded && total === 0;
  const showTable = hasLoaded && submissions.length > 0;
  // Global (not per-page) descending index: the list is newest-first, so row 1
  // of the last page is the oldest submission.
  const firstIndex = (page - 1) * perPage;

  return (
    <>
      <div className="admin-section-header">
        <h2>📋 Submissions</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* The effect above reacts to the URL params — do not also call a
              loader from onChange, that would fire two requests per change.
              Changing the filter ALWAYS resets to page 1: staying on page 7 of
              a 2-page result set would show an empty table. */}
          <select
            className="admin-btn admin-btn-ghost"
            style={{ padding: '8px 14px' }}
            aria-label="Фільтр за тестом"
            value={testFilter}
            onChange={e => goTo({ test: e.target.value ? Number(e.target.value) : '', page: 1 })}
          >
            <option value="">Усі тести</option>
            {tests.map(t => <option value={t.id} key={t.id}>{pickLang(t, 'name', 'uk') || `#${t.id}`}</option>)}
          </select>
          <select
            className="admin-btn admin-btn-ghost"
            style={{ padding: '8px 14px' }}
            aria-label="Рядків на сторінці"
            value={perPage}
            onChange={e => goTo({ perPage: Number(e.target.value), page: 1 })}
          >
            {PER_PAGE_CHOICES.map(n => <option value={n} key={n}>{n} / стор.</option>)}
          </select>
          <button className="admin-btn admin-btn-accent" onClick={exportExcel}>📥 Export Excel</button>
          {total > 0 && (
            <button className="admin-btn admin-btn-danger" onClick={onDeleteAll}>🗑 Видалити все</button>
          )}
        </div>
      </div>

      {error && <div className="admin-error">⚠️ {error}</div>}
      {showSpinnerOnly && <div className="admin-empty">Завантаження...</div>}

      {showEmpty && <div className="admin-empty">Поки що немає відповідей.</div>}

      {showTable && (
        <>
          <div
            className="admin-table-wrap"
            aria-busy={loading}
            style={{
              // Keep the previous page visible while the next one loads —
              // no blank flash, no scroll jump.
              opacity: loading ? 0.45 : 1,
              transition: 'opacity 120ms ease',
              pointerEvents: loading ? 'none' : undefined,
            }}
          >
            <table className="admin-table">
              <thead>
                <tr>
                  <th>№</th><th>Тест</th><th>Імʼя</th><th>Email</th><th>Телефон</th>
                  <th>Бал</th><th>Статус</th><th>Дата</th><th>TG</th><th>PDF</th><th></th>
                </tr>
              </thead>
              <tbody>
                {submissions.map((s, i) => (
                  <tr key={s.id}>
                    {/* Порядковий номер, що відображається (не ID з БД). Список надходить newest-first,
                        тож найстаріша заявка = 1, найновіша = найбільший номер.
                        Рахується від ЗАГАЛЬНОЇ кількості, тому нумерація неперервна між сторінками. */}
                    <td>{total - (firstIndex + i)}</td>
                    <td>{testName(s.test_id)}</td>
                    <td>{[s.first_name, s.last_name].filter(Boolean).join(' ')}</td>
                    <td>{s.email ?? '—'}</td>
                    <td>{s.phone ?? '—'}</td>
                    <td>{s.total_score != null ? `${Math.round(s.total_score)}%` : '—'}</td>
                    <td><span className="admin-badge admin-badge-muted">{s.status}</span></td>
                    <td>{new Date(s.created_at).toLocaleString()}</td>
                    <td>
                      {s.tg_username || s.tg_first_name || s.tg_last_name ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 2, lineHeight: 1.3 }}>
                          <span>{s.tg_username ? `@${s.tg_username}` : '—'}</span>
                          {(s.tg_first_name || s.tg_last_name) && (
                            <span style={{ fontSize: 11, color: 'var(--muted)' }}>
                              {[s.tg_first_name, s.tg_last_name].filter(Boolean).join(' ')}
                            </span>
                          )}
                        </div>
                      ) : '—'}
                    </td>
                    <td>
                      {s.has_pdf ? (
                        <div style={{ display: 'flex', gap: 4 }}>
                          <button
                            className="admin-btn admin-btn-ghost admin-btn-sm"
                            title="Відкрити PDF"
                            onClick={() => openPdf(s, false)}
                          >👁</button>
                          <button
                            className="admin-btn admin-btn-ghost admin-btn-sm"
                            title="Завантажити PDF"
                            onClick={() => openPdf(s, true)}
                          >⬇</button>
                        </div>
                      ) : <span style={{ color: 'var(--muted)' }}>—</span>}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 4 }}>
                        <button
                          className="admin-btn admin-btn-ghost admin-btn-sm"
                          title="Переглянути звіт (завжди доступний)"
                          onClick={() => openReport(s)}
                        >📄</button>
                        <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => onDelete(s.id)}>🗑</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* A single page needs no controls at all. */}
          {totalPages > 1 && (
            <nav
              aria-label="Пагінація"
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 12, marginTop: 14, flexWrap: 'wrap',
              }}
            >
              <button
                className="admin-btn admin-btn-ghost admin-btn-sm"
                onClick={() => goTo({ page: page - 1 })}
                disabled={page <= 1 || loading}
              >← Назад</button>
              <span style={{ fontSize: 13, color: 'var(--text2)' }}>
                Сторінка {Math.min(page, totalPages)} з {totalPages}
                <span style={{ color: 'var(--muted)' }}> · {total} заявок</span>
              </span>
              <button
                className="admin-btn admin-btn-ghost admin-btn-sm"
                onClick={() => goTo({ page: page + 1 })}
                disabled={page >= totalPages || loading}
              >Вперед →</button>
            </nav>
          )}
        </>
      )}
    </>
  );
}
