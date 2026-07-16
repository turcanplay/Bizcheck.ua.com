import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicApi, type PublicTest } from '@/api/public';

/**
 * TESTS section — placeholder cards.
 * Design sources: /design/tests-section.png + /design/card-test.png
 * Logic already wired:
 *   - Free test  → navigate('/test/:slug')
 *   - Paid test  → navigate('/plata/test/:slug')
 */
export default function TestsShowcase() {
  const nav = useNavigate();
  const [tests, setTests] = useState<PublicTest[]>([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    publicApi.listTests()
      .then(r => setTests(r.tests))
      .catch(e => setErr(e.message));
  }, []);

  function onPick(t: PublicTest) {
    nav(t.is_paid ? `/plata/test/${t.slug}` : `/test/${t.slug}`);
  }

  return (
    <section className="landing-tests" data-section="tests">
      <h2>Teste</h2>
      {err && <p style={{ color: 'crimson' }}>{err}</p>}
      <div className="landing-tests__grid">
        {tests.map(t => (
          <button key={t.slug} className="landing-card" data-card="test" onClick={() => onPick(t)}>
            <div className="landing-card__title">{t.name_uk}</div>
            <div className="landing-card__desc">{t.description_uk}</div>
            <div className="landing-card__meta">
              {t.is_paid
                ? <span>💰 {t.price != null ? `${t.price} ${t.currency}` : 'Платно'}</span>
                : <span>🆓 Безкоштовно</span>}
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}
