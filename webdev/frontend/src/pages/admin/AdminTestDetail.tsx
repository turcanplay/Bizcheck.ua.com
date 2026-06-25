import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminApi, type AdminTest } from '@/api/admin';
import AdminTestQuestions from './AdminTestQuestions';
import AdminTestReports from './AdminTestReports';

type Tab = 'questions' | 'reports';

export default function AdminTestDetail() {
  const { slug } = useParams<{ slug: string }>();
  const [test, setTest] = useState<AdminTest | null>(null);
  const [tab, setTab] = useState<Tab>('questions');
  const [error, setError] = useState('');

  useEffect(() => {
    if (!slug) return;
    adminApi.listTests()
      .then(({ tests }) => {
        const t = tests.find(x => x.slug === slug) ?? null;
        setTest(t);
        if (!t) setError('Test negăsit');
      })
      .catch(e => setError(e.message));
  }, [slug]);

  if (error) return <div className="admin-error">⚠️ {error}</div>;
  if (!test) return <div className="admin-empty">Se încarcă...</div>;

  return (
    <>
      <div className="admin-section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/admin_bizcheck_md_crowe/tests" className="admin-back-link">← Înapoi la teste</Link>
          <h2 style={{ margin: 0 }}>{test.name_ro.toUpperCase()}</h2>
        </div>
      </div>

      <div className="admin-tabs">
        <button className={`admin-tab-btn ${tab === 'questions' ? 'active' : ''}`} onClick={() => setTab('questions')}>
          📝 Întrebări &amp; Blocuri
        </button>
        <button className={`admin-tab-btn ${tab === 'reports' ? 'active' : ''}`} onClick={() => setTab('reports')}>
          📄 Rapoarte
        </button>
      </div>

      {tab === 'questions' && <AdminTestQuestions testId={test.id} />}
      {tab === 'reports' && <AdminTestReports testId={test.id} />}
    </>
  );
}
