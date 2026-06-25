import { useEffect, useState } from 'react';
import { adminApi, adminFetch, type AdminSubmission, type AdminTest } from '@/api/admin';

export default function AdminSubmissions() {
  const [submissions, setSubmissions] = useState<AdminSubmission[]>([]);
  const [tests, setTests] = useState<AdminTest[]>([]);
  const [testFilter, setTestFilter] = useState<number | ''>('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  async function load(testId: number | '' = testFilter) {
    setLoading(true);
    try {
      const [s, t] = await Promise.all([
        adminApi.listSubmissions(testId || undefined),
        tests.length === 0 ? adminApi.listTests() : Promise.resolve({ tests }),
      ]);
      setSubmissions(s.submissions);
      if (tests.length === 0) setTests(t.tests);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  function testName(id: number | null) {
    if (!id) return '—';
    const t = tests.find(x => x.id === id);
    return t ? t.name_ro : `#${id}`;
  }

  async function onDelete(id: number) {
    if (!confirm('Ștergi acest răspuns?')) return;
    await adminApi.deleteSubmission(id);
    await load();
  }

  async function onDeleteAll() {
    if (submissions.length === 0) return;
    // Ștergere în masă, IREVERSIBILĂ (toate testele) — confirmare obligatorie.
    if (!confirm(`Ștergi TOATE cele ${submissions.length} răspunsuri din toate testele?\n\nAcțiunea este IREVERSIBILĂ.`)) return;
    try {
      await adminApi.deleteAllSubmissions();
      await load();
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Ștergere eșuată');
    }
  }

  async function exportExcel() {
    const res = await adminFetch(`/submissions/export/excel`);
    if (!res.ok) { alert('Export eșuat'); return; }
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
    if (!res.ok) { alert('PDF indisponibil'); return; }
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

  return (
    <>
      <div className="admin-section-header">
        <h2>📋 Submissions</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <select
            className="admin-btn admin-btn-ghost"
            style={{ padding: '8px 14px' }}
            value={testFilter}
            onChange={e => { const v = e.target.value ? Number(e.target.value) : ''; setTestFilter(v); load(v); }}
          >
            <option value="">Toate testele</option>
            {tests.map(t => <option value={t.id} key={t.id}>{t.name_ro}</option>)}
          </select>
          <button className="admin-btn admin-btn-accent" onClick={exportExcel}>📥 Export Excel</button>
          {submissions.length > 0 && (
            <button className="admin-btn admin-btn-danger" onClick={onDeleteAll}>🗑 Șterge tot</button>
          )}
        </div>
      </div>

      {error && <div className="admin-error">⚠️ {error}</div>}
      {loading && <div className="admin-empty">Se încarcă...</div>}

      {!loading && submissions.length === 0 && <div className="admin-empty">Niciun răspuns încă.</div>}

      {!loading && submissions.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Nr.</th><th>Test</th><th>Nume</th><th>Email</th><th>Telefon</th>
                <th>Scor</th><th>Status</th><th>Data</th><th>TG</th><th>PDF</th><th></th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s, i) => (
                <tr key={s.id}>
                  {/* Număr de ordine afișat (nu ID-ul din DB). Lista vine newest-first,
                      deci cea mai veche aplicație = 1, cea mai nouă = numărul cel mai mare.
                      Se recalculează automat la fiecare load, inclusiv după ștergere. */}
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
                          title="Deschide PDF"
                          onClick={() => openPdf(s, false)}
                        >👁</button>
                        <button
                          className="admin-btn admin-btn-ghost admin-btn-sm"
                          title="Descarcă PDF"
                          onClick={() => openPdf(s, true)}
                        >⬇</button>
                      </div>
                    ) : <span style={{ color: 'var(--muted)' }}>—</span>}
                  </td>
                  <td>
                    <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => onDelete(s.id)}>🗑</button>
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
