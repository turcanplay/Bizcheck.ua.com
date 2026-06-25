import { useEffect, useMemo, useState } from 'react';
import { adminApi, type AdminSubmission, type AdminTest } from '@/api/admin';

export default function AdminUsers() {
  const [submissions, setSubmissions] = useState<AdminSubmission[]>([]);
  const [tests, setTests] = useState<AdminTest[]>([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [s, t] = await Promise.all([adminApi.listSubmissions(), adminApi.listTests()]);
        setSubmissions(s.submissions);
        setTests(t.tests);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Load failed');
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const testName = (id: number | null) => {
    if (!id) return '—';
    const t = tests.find(x => x.id === id);
    return t ? t.name_uk : `#${id}`;
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return submissions;
    return submissions.filter(s => {
      const hay = [
        s.first_name, s.last_name, s.email, s.phone,
        s.tg_username, s.tg_first_name, s.tg_last_name, String(s.tg_chat_id ?? ''),
      ].filter(Boolean).join(' ').toLowerCase();
      return hay.includes(q);
    });
  }, [submissions, query]);

  return (
    <>
      <div className="admin-section-header">
        <h2>👥 Users</h2>
        <input
          placeholder="Search by name, email, phone, TG..."
          value={query}
          onChange={e => setQuery(e.target.value)}
          style={{
            padding: '8px 12px', background: 'var(--surface2)',
            border: '1px solid var(--border)', borderRadius: 6,
            color: 'var(--text)', fontSize: 13, width: 280,
          }}
        />
      </div>

      {error && <div className="admin-error">⚠️ {error}</div>}
      {loading && <div className="admin-empty">Loading...</div>}
      {!loading && filtered.length === 0 && (
        <div className="admin-empty">{query ? 'No results.' : 'No users yet.'}</div>
      )}

      {!loading && filtered.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>First name</th><th>Last name</th><th>Email</th><th>Phone</th>
                <th>Test</th><th>Sector</th>
                <th>Status</th><th>Score</th>
                <th>TG ID</th><th>TG Username</th><th>Date</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map(s => (
                <tr key={s.id}>
                  <td>{s.first_name ?? '—'}</td>
                  <td>{s.last_name ?? '—'}</td>
                  <td>{s.email ?? '—'}</td>
                  <td>{s.phone ?? '—'}</td>
                  <td>{testName(s.test_id)}</td>
                  <td>{s.sector ?? '—'}</td>
                  <td><span className="admin-badge admin-badge-muted">{s.status}</span></td>
                  <td>{s.total_score != null ? `${Math.round(s.total_score)}%` : '—'}</td>
                  <td>{s.tg_chat_id ?? '—'}</td>
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
                  <td>{new Date(s.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
