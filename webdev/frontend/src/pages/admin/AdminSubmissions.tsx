import { useCallback, useEffect, useRef, useState } from 'react';
import { adminApi, adminFetch, type AdminSubmission, type AdminTest } from '@/api/admin';

export default function AdminSubmissions() {
  const [submissions, setSubmissions] = useState<AdminSubmission[]>([]);
  const [tests, setTests] = useState<AdminTest[]>([]);
  const [testFilter, setTestFilter] = useState<number | ''>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  // The test list is fetched once and reused for the filter dropdown / testName().
  // Tracked in a ref rather than by reading `tests` inside load(): load() also
  // SETS `tests`, so depending on it would make load() a new function on every
  // fetch and the mount effect below would refetch forever.
  const testsLoadedRef = useRef(false);

  // Deps are honestly empty: only setters and the explicit testId argument are
  // used, so `load` is referentially stable for the component's whole lifetime.
  const load = useCallback(async (testId: number | '') => {
    setLoading(true);
    try {
      const [s, t] = await Promise.all([
        adminApi.listSubmissions(testId || undefined),
        testsLoadedRef.current ? Promise.resolve(null) : adminApi.listTests(),
      ]);
      setSubmissions(s.submissions);
      if (t) { setTests(t.tests); testsLoadedRef.current = true; }
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetches on mount, and again only when the admin picks a different test.
  useEffect(() => { load(testFilter); }, [load, testFilter]);

  function testName(id: number | null) {
    if (!id) return '—';
    const t = tests.find(x => x.id === id);
    return t ? t.name_uk : `#${id}`;
  }

  async function onDelete(id: number) {
    if (!confirm('Видалити цю відповідь?')) return;
    await adminApi.deleteSubmission(id);
    await load(testFilter);
  }

  async function onDeleteAll() {
    if (submissions.length === 0) return;
    // Масове видалення, НЕЗВОРОТНЕ (усі тести) — обовʼязкове підтвердження.
    if (!confirm(`Видалити ВСІ ${submissions.length} відповідей з усіх тестів?\n\nДія є НЕЗВОРОТНОЮ.`)) return;
    try {
      await adminApi.deleteAllSubmissions();
      await load(testFilter);
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Помилка видалення');
    }
  }

  async function exportExcel() {
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

  return (
    <>
      <div className="admin-section-header">
        <h2>📋 Submissions</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          {/* The effect above reacts to testFilter — do not also call load() from
              onChange, that would fire two requests for one filter change. */}
          <select
            className="admin-btn admin-btn-ghost"
            style={{ padding: '8px 14px' }}
            value={testFilter}
            onChange={e => setTestFilter(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">Усі тести</option>
            {tests.map(t => <option value={t.id} key={t.id}>{t.name_uk}</option>)}
          </select>
          <button className="admin-btn admin-btn-accent" onClick={exportExcel}>📥 Export Excel</button>
          {submissions.length > 0 && (
            <button className="admin-btn admin-btn-danger" onClick={onDeleteAll}>🗑 Видалити все</button>
          )}
        </div>
      </div>

      {error && <div className="admin-error">⚠️ {error}</div>}
      {loading && <div className="admin-empty">Завантаження...</div>}

      {!loading && submissions.length === 0 && <div className="admin-empty">Поки що немає відповідей.</div>}

      {!loading && submissions.length > 0 && (
        <div className="admin-table-wrap">
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
                      Перераховується автоматично при кожному завантаженні, зокрема після видалення. */}
                  <td>{submissions.length - i}</td>
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
      )}
    </>
  );
}
