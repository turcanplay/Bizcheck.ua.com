import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ApiError, adminApi, adminFetch,
  type AdminSubmission, type ExportJob, type ExportJobState,
} from '@/api/admin';

interface Props {
  testId: number;
}

type Delivery = 'pdf' | 'email' | 'telegram';

/* ──────────────────────────────────────────────────────────────
 *  PDF-ZIP export — async job polling
 *
 *  3 000 ms is a FLOOR, not a preference: the submissions blueprint rate-limits
 *  at 60 requests/minute, and this screen also issues the listing + per-row
 *  downloads. Polling faster would let one long export lock the admin out of
 *  their own API with 429s.
 *
 *  MAX_POLL_ATTEMPTS bounds the loop so a job that never reaches a terminal
 *  state cannot poll forever in a tab left open overnight. 400 × 3 s = 20 min,
 *  comfortably past the backend's own EXPORT_JOB_STALE_AFTER (900 s), after
 *  which an abandoned job is reported as `failed` anyway — so hitting this
 *  ceiling means something is wrong, and we say so instead of spinning.
 * ────────────────────────────────────────────────────────────── */
export const ZIP_POLL_INTERVAL_MS = 3_000;
export const ZIP_MAX_POLL_ATTEMPTS = 400;

const ZIP_STATE_LABEL: Record<ExportJobState, string> = {
  queued: 'У черзі',
  running: 'Формування архіву',
  ready: 'Готово',
  failed: 'Помилка',
};

function formatBytes(bytes: number | null | undefined): string {
  if (!bytes || bytes < 0) return '';
  if (bytes < 1024) return `${bytes} Б`;
  const units = ['КБ', 'МБ', 'ГБ'];
  let value = bytes / 1024;
  let i = 0;
  while (value >= 1024 && i < units.length - 1) { value /= 1024; i += 1; }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[i]}`;
}

function inferDelivery(s: AdminSubmission): Delivery {
  if (s.tg_chat_id) return 'telegram';
  if (s.email) return 'email';
  return 'pdf';
}

function deliveryLabel(d: Delivery): string {
  if (d === 'telegram') return 'Telegram';
  if (d === 'email') return 'Email';
  return 'Завантаження PDF';
}

function deliveryBadgeClass(d: Delivery): string {
  if (d === 'telegram') return 'admin-badge-blue';
  if (d === 'email') return 'admin-badge-gold';
  return 'admin-badge-muted';
}

export default function AdminTestReports({ testId }: Props) {
  const [submissions, setSubmissions] = useState<AdminSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [qText, setQText] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [deliveryFilter, setDeliveryFilter] = useState<'' | Delivery>('');
  const [onlyWithPdf, setOnlyWithPdf] = useState(false);

  // Only real input is the testId prop. Filtering is client-side (see `filtered`
  // below), so filter state must NOT re-trigger a fetch.
  //
  // INTENTIONALLY UNPAGINATED. Every filter on this screen — free-text search
  // across name/email/phone/TG, the date range, the delivery channel, "only
  // with PDF" — runs over the whole array in `filtered`, and the header shows
  // "<matches> / <total> звітів". Handing this component a single page would
  // silently search only that page, so it asks for all rows of ONE test
  // (backend paging is opt-in: no page/per_page param → full array).
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await adminApi.listSubmissions(testId);
      setSubmissions(r.submissions);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [testId]);

  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const q = qText.trim().toLowerCase();
    const from = dateFrom ? new Date(dateFrom).getTime() : -Infinity;
    const to = dateTo ? new Date(dateTo).getTime() + 86_400_000 : Infinity; // inclusive
    return submissions.filter(s => {
      if (q) {
        const hay = [
          s.first_name, s.last_name, s.email, s.phone,
          s.tg_username, s.tg_first_name, s.tg_last_name,
        ].filter(Boolean).join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      const ts = new Date(s.created_at).getTime();
      if (ts < from || ts > to) return false;
      if (deliveryFilter && inferDelivery(s) !== deliveryFilter) return false;
      if (onlyWithPdf && !s.has_pdf) return false;
      return true;
    });
  }, [submissions, qText, dateFrom, dateTo, deliveryFilter, onlyWithPdf]);

  /** The one authenticated-download primitive on this screen (cookie + CSRF via
   *  adminFetch, blob → <a download>). Returns the Response so a caller that
   *  needs to branch on a specific status — 410 on an expired async archive —
   *  can do so; `silent` suppresses the generic alert for those callers. */
  async function authedDownload(
    path: string,
    fallbackName: string,
    opts: { silent?: boolean } = {},
  ): Promise<Response | null> {
    let res: Response;
    try {
      res = await adminFetch(path);
    } catch {
      if (!opts.silent) alert('Помилка завантаження');
      return null;
    }
    if (!res.ok) {
      if (!opts.silent) alert('Помилка завантаження');
      return res;
    }
    const disposition = res.headers.get('content-disposition') || '';
    const m = disposition.match(/filename="?([^"]+)"?/);
    const filename = m?.[1] || fallbackName;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    return res;
  }

  async function openPdf(s: AdminSubmission) {
    const res = await adminFetch(`/submissions/${s.id}/pdf`);
    if (!res.ok) { alert('PDF недоступний'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
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

  function nameOf(s: AdminSubmission): string {
    return [s.first_name, s.last_name].filter(Boolean).join(' ') || '—';
  }

  /* ── PDF-ZIP export: start → poll → download ─────────────────────────── */

  const [zipJob, setZipJob] = useState<ExportJob | null>(null);
  const [zipBusy, setZipBusy] = useState(false);
  const [zipError, setZipError] = useState('');
  const [zipNotice, setZipNotice] = useState('');

  // Every poll loop carries the run id it was started with. Bumping the ref
  // invalidates the loop AFTER any await it is currently suspended on, which is
  // what makes "no setState / no fetch after unmount" true even for a request
  // that is already in flight. clearTimeout alone cannot do that.
  const runIdRef = useRef(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const wakeRef = useRef<(() => void) | null>(null);

  const stopZipPolling = useCallback(() => {
    runIdRef.current += 1;
    if (timerRef.current !== null) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    // Resolve a pending sleep so the loop wakes up, sees the stale run id and
    // returns, instead of leaving a promise (and its closure) pending forever.
    wakeRef.current?.();
    wakeRef.current = null;
  }, []);

  const resetZipState = useCallback(() => {
    setZipJob(null);
    setZipBusy(false);
    setZipError('');
    setZipNotice('');
  }, []);

  // Cleanup runs on UNMOUNT and whenever `testId` changes.
  //
  // Switching test mid-export abandons the CLIENT side only: polling stops and
  // the panel resets, but the server keeps building the archive. That is the
  // deliberate choice over "keep polling the old test" (the progress would
  // belong to a test no longer on screen) and over "cancel the job" (there is
  // no cancel endpoint, and the work is nearly always worth keeping). Clicking
  // the button again on that test rejoins the same job — the backend's
  // _find_active dedupes on (kind, test_id) — so nothing is rebuilt.
  useEffect(() => {
    return () => {
      stopZipPolling();
      resetZipState();
    };
  }, [testId, stopZipPolling, resetZipState]);

  /** Cancellable sleep — the only place the poll interval is spent. */
  function zipSleep(ms: number): Promise<void> {
    return new Promise<void>(resolve => {
      wakeRef.current = resolve;
      timerRef.current = setTimeout(() => {
        wakeRef.current = null;
        timerRef.current = null;
        resolve();
      }, ms);
    });
  }

  function startJobErrorMessage(e: unknown): string {
    if (e instanceof ApiError) {
      if (e.status === 503) {
        return 'Черга експорту переповнена. Зачекайте кілька хвилин і спробуйте ще раз.';
      }
      if (e.status === 401) return 'Сесію завершено. Увійдіть знову.';
    }
    return `Не вдалося запустити експорт: ${e instanceof Error ? e.message : 'невідома помилка'}`;
  }

  function pollErrorMessage(e: unknown): string {
    if (e instanceof ApiError) {
      if (e.status === 404) {
        return 'Завдання експорту не знайдено або воно застаріло. Запустіть експорт ще раз.';
      }
      if (e.status === 401) return 'Сесію завершено. Увійдіть знову.';
    }
    return `Не вдалося отримати стан експорту: ${e instanceof Error ? e.message : 'невідома помилка'}`;
  }

  /** Pull a finished archive down. Kept separate so the 410/409 branches read
   *  as what they are: the archive expired, or the job is not ready after all. */
  async function downloadReadyZip(job: ExportJob, runId: number) {
    if (!job.download_path) {
      setZipError('Архів готовий, але сервер не повернув посилання на завантаження.');
      return;
    }
    const res = await authedDownload(
      job.download_path,
      job.filename || `BizCheck_test_${testId}_pdfs.zip`,
      { silent: true },
    );
    if (runId !== runIdRef.current) return;   // unmounted / test switched mid-download
    if (!res) {
      setZipError('Не вдалося завантажити архів — перевірте зʼєднання та спробуйте ще раз.');
      return;
    }
    if (res.status === 410) {
      setZipError('Архів більше не зберігається на сервері (термін дії минув). '
        + 'Натисніть «Повторити», щоб сформувати його заново.');
      return;
    }
    if (res.status === 409) {
      setZipError('Архів ще не готовий. Зачекайте кілька секунд і спробуйте ще раз.');
      return;
    }
    if (!res.ok) {
      setZipError(`Не вдалося завантажити архів (HTTP ${res.status}).`);
      return;
    }
    const size = formatBytes(job.size_bytes);
    setZipNotice(`Архів завантажено${size ? ` (${size})` : ''}.`);
  }

  async function startZipExport() {
    if (zipBusy) return;                 // one job per button — see `disabled`
    stopZipPolling();                    // also invalidates any earlier loop
    const runId = runIdRef.current;
    setZipJob(null);
    setZipError('');
    setZipNotice('');
    setZipBusy(true);

    let job: ExportJob;
    try {
      job = (await adminApi.startPdfsZipExport(testId)).job;
    } catch (e) {
      if (runId !== runIdRef.current) return;
      setZipBusy(false);
      setZipError(startJobErrorMessage(e));
      return;
    }
    if (runId !== runIdRef.current) return;
    setZipJob(job);

    for (let attempt = 0; attempt < ZIP_MAX_POLL_ATTEMPTS; attempt++) {
      if (job.state === 'ready') {
        setZipBusy(false);
        await downloadReadyZip(job, runId);
        return;
      }
      if (job.state === 'failed') {
        setZipBusy(false);
        setZipError(`Не вдалося сформувати архів: ${job.error || 'невідома помилка'}`);
        return;
      }

      await zipSleep(ZIP_POLL_INTERVAL_MS);
      if (runId !== runIdRef.current) return;

      try {
        job = (await adminApi.getExportJob(job.status_path)).job;
      } catch (e) {
        if (runId !== runIdRef.current) return;
        setZipBusy(false);
        setZipError(pollErrorMessage(e));
        return;
      }
      if (runId !== runIdRef.current) return;
      setZipJob(job);
    }

    setZipBusy(false);
    setZipError('Експорт триває надто довго — стеження припинено. '
      + 'Перевірте стан сервера або запустіть експорт ще раз.');
  }

  const zipProgressText = (() => {
    if (!zipJob) return '';
    const { done, total } = zipJob.progress ?? { done: 0, total: null };
    if (!total) return 'підготовка…';
    const pct = Math.min(100, Math.round((done / total) * 100));
    return `${done} / ${total} (${pct}%)`;
  })();

  const zipPercent = (() => {
    const total = zipJob?.progress?.total;
    if (!total) return null;
    return Math.min(100, Math.round(((zipJob?.progress?.done ?? 0) / total) * 100));
  })();

  return (
    <div>
      {/* Filter bar */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'minmax(160px, 1fr) 150px 150px 160px auto',
        gap: 10, alignItems: 'center',
        marginBottom: 14,
      }}>
        <input
          placeholder="🔎 Пошук за іменем, email, телефоном, TG..."
          value={qText}
          onChange={e => setQText(e.target.value)}
          style={{
            padding: '8px 12px', background: 'var(--surface2)',
            border: '1px solid var(--border)', borderRadius: 6,
            color: 'var(--text)', fontSize: 13,
          }}
        />
        <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)}
          style={{ padding: '8px 10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 13 }}
          title="Від дати"
        />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          style={{ padding: '8px 10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 13 }}
          title="До дати"
        />
        <select
          value={deliveryFilter}
          onChange={e => setDeliveryFilter(e.target.value as '' | Delivery)}
          style={{ padding: '8px 10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 13 }}
        >
          <option value="">Усі канали</option>
          <option value="pdf">Завантаження PDF</option>
          <option value="email">Email</option>
          <option value="telegram">Telegram</option>
        </select>
        <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 13, color: 'var(--text2)', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={onlyWithPdf} onChange={e => setOnlyWithPdf(e.target.checked)} />
          лише з PDF
        </label>
      </div>

      {/* Bulk export buttons */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 16 }}>
        <button
          className="admin-btn admin-btn-accent"
          onClick={() => authedDownload(
            `/submissions/tests/${testId}/export/excel-combined`,
            `BizCheck_test_${testId}_combined.xlsx`,
          )}
        >📊 Об'єднаний Excel (по вкладці на користувача)</button>
        <button
          className="admin-btn admin-btn-ghost"
          onClick={() => authedDownload(
            `/submissions/tests/${testId}/export/excels-zip`,
            `BizCheck_test_${testId}_excels.zip`,
          )}
        >🗂 Excel по користувачу (ZIP)</button>
        <button
          className="admin-btn admin-btn-ghost"
          onClick={() => { void startZipExport(); }}
          disabled={zipBusy}
          title="Архів формується у фоні — сторінку можна не перезавантажувати"
        >
          {zipBusy
            ? `⏳ Формування ZIP… ${zipProgressText}`
            : '📦 Усі PDF-файли (ZIP)'}
        </button>
      </div>

      {/* Async PDF-ZIP export: live progress, then the result. */}
      {zipBusy && zipJob && (
        <div className="admin-empty" style={{ marginBottom: 12, textAlign: 'left' }}>
          <div style={{ fontSize: 13, marginBottom: 6 }}>
            {ZIP_STATE_LABEL[zipJob.state]}: {zipProgressText}
          </div>
          <div
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={zipPercent ?? undefined}
            aria-label="Прогрес формування ZIP"
            style={{ height: 6, borderRadius: 3, background: 'var(--surface2)', overflow: 'hidden' }}
          >
            <div style={{
              height: '100%',
              width: `${zipPercent ?? 8}%`,
              background: 'var(--accent, #c8a24a)',
              transition: 'width .3s ease',
            }} />
          </div>
        </div>
      )}
      {zipError && (
        <div className="admin-error" style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <span>⚠️ {zipError}</span>
          <button
            className="admin-btn admin-btn-ghost admin-btn-sm"
            onClick={() => { void startZipExport(); }}
            disabled={zipBusy}
          >Повторити</button>
        </div>
      )}
      {zipNotice && <div className="admin-empty" style={{ marginBottom: 12 }}>✅ {zipNotice}</div>}

      {error && <div className="admin-error">⚠️ {error}</div>}
      {loading && <div className="admin-empty">Завантаження...</div>}

      {!loading && filtered.length === 0 && (
        <div className="admin-empty">
          {submissions.length === 0 ? 'Ще ніхто не пройшов цей тест.' : 'Немає результатів за поточними фільтрами.'}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>
            {filtered.length} / {submissions.length} звітів
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th><th>Ім'я</th><th>Контакт</th><th>Оцінка</th>
                  <th>Обраний канал</th><th>Дата</th><th>PDF</th><th>Excel</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(s => {
                  const d = inferDelivery(s);
                  return (
                    <tr key={s.id}>
                      <td>{s.id}</td>
                      <td>{nameOf(s)}</td>
                      <td style={{ fontSize: 12 }}>
                        <div>{s.email ?? '—'}</div>
                        <div style={{ color: 'var(--text2)' }}>{s.phone ?? '—'}</div>
                      </td>
                      <td>{s.total_score != null ? `${Math.round(s.total_score)}%` : '—'}</td>
                      <td>
                        <span className={`admin-badge ${deliveryBadgeClass(d)}`}>
                          {deliveryLabel(d)}
                        </span>
                      </td>
                      <td>{new Date(s.created_at).toLocaleString()}</td>
                      <td>
                        {s.has_pdf ? (
                          <div style={{ display: 'flex', gap: 4 }}>
                            <button
                              className="admin-btn admin-btn-ghost admin-btn-sm"
                              title="Відкрити PDF"
                              onClick={() => openPdf(s)}
                            >👁</button>
                            <button
                              className="admin-btn admin-btn-ghost admin-btn-sm"
                              title="Завантажити PDF"
                              onClick={() => authedDownload(
                                `/submissions/${s.id}/pdf`,
                                `BizCheck_${nameOf(s).replace(/\s+/g, '_')}.pdf`,
                              )}
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
                          <button
                            className="admin-btn admin-btn-ghost admin-btn-sm"
                            title="Завантажити окремий Excel"
                            onClick={() => authedDownload(
                              `/submissions/${s.id}/export/excel`,
                              `BizCheck_${nameOf(s).replace(/\s+/g, '_')}.xlsx`,
                            )}
                          >📑</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
