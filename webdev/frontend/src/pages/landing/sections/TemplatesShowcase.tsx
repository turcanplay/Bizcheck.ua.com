import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { publicApi, type PublicTemplate } from '@/api/public';

/**
 * TEMPLATES section — placeholder cards.
 * Design sources: /design/templates-section.png + /design/card-template.png
 * Logic already wired:
 *   - Free template → /sablon/:slug (delivery picker page)
 *   - Paid template → /plata/sablon/:slug → then /sablon/:slug?access=<token>
 */
export default function TemplatesShowcase() {
  const nav = useNavigate();
  const [items, setItems] = useState<PublicTemplate[]>([]);
  const [err, setErr] = useState('');

  useEffect(() => {
    publicApi.listTemplates()
      .then(r => setItems(r.templates))
      .catch(e => setErr(e.message));
  }, []);

  function onPick(t: PublicTemplate) {
    nav(t.is_paid ? `/plata/sablon/${t.slug}` : `/sablon/${t.slug}`);
  }

  return (
    <section className="landing-templates" data-section="templates">
      <h2>Шаблони документів</h2>
      {err && <p style={{ color: 'crimson' }}>{err}</p>}
      <div className="landing-templates__grid">
        {items.map(t => (
          <button key={t.slug} className="landing-card" data-card="template" onClick={() => onPick(t)}>
            <div className="landing-card__title">📄 {t.title_uk}</div>
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
