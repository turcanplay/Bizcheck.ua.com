import { useEffect, useState } from 'react';
import { adminApi } from '@/api/admin';

interface Stats {
  total_users: number;
  total_blocks: number;
  total_questions: number;
  total_results: number;
  total_submissions: number;
  avg_per_block: Array<{ block_id: number; title: string; avg_score: number; attempts: number }>;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.stats().then(setStats).catch(e => setError(e.message));
  }, []);

  if (error) return <div className="admin-error">⚠️ {error}</div>;
  if (!stats) return <div className="admin-empty">Se încarcă...</div>;

  const cards: Array<[string, number]> = [
    ['Utilizatori', stats.total_users],
    ['Blocuri', stats.total_blocks],
    ['Întrebări', stats.total_questions],
    ['Rezultate', stats.total_results],
    ['Submissions', stats.total_submissions],
  ];

  return (
    <>
      <div className="admin-section-header">
        <h2>Dashboard</h2>
      </div>

      <div className="admin-stats-grid">
        {cards.map(([label, value]) => (
          <div className="admin-stat-card" key={label}>
            <div className="label">{label}</div>
            <div className="value">{value}</div>
          </div>
        ))}
      </div>

      <h3 style={{ marginBottom: 12 }}>Scor mediu per bloc</h3>
      {stats.avg_per_block.length === 0 ? (
        <div className="admin-empty">Încă nu sunt rezultate.</div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead><tr><th>Block</th><th>Scor mediu</th><th>Încercări</th></tr></thead>
            <tbody>
              {stats.avg_per_block.map(r => (
                <tr key={r.block_id}>
                  <td>{r.title}</td>
                  <td>{Math.round(r.avg_score)}%</td>
                  <td>{r.attempts}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
