import { useEffect, useMemo, useState } from 'react';
import { adminApi, adminFetch, type AdminSubmission } from '@/api/admin';

interface Props {
  testId: number;
}

type Delivery = 'pdf' | 'email' | 'telegram';

function inferDelivery(s: AdminSubmission): Delivery {
  if (s.tg_chat_id) return 'telegram';
  if (s.email) return 'email';
  return 'pdf';
}

function deliveryLabel(d: Delivery): string {
  if (d === 'telegram') return 'Telegram';
  if (d === 'email') return 'Email';
  return 'PDF download';
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

  async function load() {
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
  }

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [testId]);

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

  async function authedDownload(path: string, fallbackName: string) {
    const res = await adminFetch(path);
    if (!res.ok) { alert('Descărcare eșuată'); return; }
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
  }

  async function openPdf(s: AdminSubmission) {
    const res = await adminFetch(`/submissions/${s.id}/pdf`);
    if (!res.ok) { alert('PDF indisponibil'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  // HTML report — always available (independent of PDF). Fetched via adminFetch
  // so an expired session shows a friendly error instead of raw JSON in a tab.
  async function openReport(s: AdminSubmission) {
    const res = await adminFetch(`/submissions/${s.id}/report`);
    if (!res.ok) { alert('Raport indisponibil'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    window.open(url, '_blank', 'noopener');
    setTimeout(() => URL.revokeObjectURL(url), 60_000);
  }

  function nameOf(s: AdminSubmission): string {
    return [s.first_name, s.last_name].filter(Boolean).join(' ') || '—';
  }

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
          placeholder="🔎 Caută după nume, email, telefon, TG..."
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
          title="De la data"
        />
        <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)}
          style={{ padding: '8px 10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 13 }}
          title="Până la data"
        />
        <select
          value={deliveryFilter}
          onChange={e => setDeliveryFilter(e.target.value as '' | Delivery)}
          style={{ padding: '8px 10px', background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text)', fontSize: 13 }}
        >
          <option value="">Toate canalele</option>
          <option value="pdf">PDF download</option>
          <option value="email">Email</option>
          <option value="telegram">Telegram</option>
        </select>
        <label style={{ display: 'inline-flex', gap: 6, alignItems: 'center', fontSize: 13, color: 'var(--text2)', whiteSpace: 'nowrap' }}>
          <input type="checkbox" checked={onlyWithPdf} onChange={e => setOnlyWithPdf(e.target.checked)} />
          doar cu PDF
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
        >📊 Excel combinat (o filă per user)</button>
        <button
          className="admin-btn admin-btn-ghost"
          onClick={() => authedDownload(
            `/submissions/tests/${testId}/export/excels-zip`,
            `BizCheck_test_${testId}_excels.zip`,
          )}
        >🗂 Excel per user (ZIP)</button>
        <button
          className="admin-btn admin-btn-ghost"
          onClick={() => authedDownload(
            `/submissions/tests/${testId}/export/pdfs-zip`,
            `BizCheck_test_${testId}_pdfs.zip`,
          )}
        >📦 Toate PDF-urile (ZIP)</button>
      </div>

      {error && <div className="admin-error">⚠️ {error}</div>}
      {loading && <div className="admin-empty">Se încarcă...</div>}

      {!loading && filtered.length === 0 && (
        <div className="admin-empty">
          {submissions.length === 0 ? 'Nimeni nu a completat acest test încă.' : 'Niciun rezultat pentru filtrele curente.'}
        </div>
      )}

      {!loading && filtered.length > 0 && (
        <>
          <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>
            {filtered.length} / {submissions.length} rapoarte
          </div>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>ID</th><th>Nume</th><th>Contact</th><th>Scor</th>
                  <th>Canal ales</th><th>Data</th><th>PDF</th><th>Excel</th>
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
                              title="Deschide PDF"
                              onClick={() => openPdf(s)}
                            >👁</button>
                            <button
                              className="admin-btn admin-btn-ghost admin-btn-sm"
                              title="Descarcă PDF"
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
                            title="Vezi raport (mereu disponibil)"
                            onClick={() => openReport(s)}
                          >📄</button>
                          <button
                            className="admin-btn admin-btn-ghost admin-btn-sm"
                            title="Descarcă Excel individual"
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
