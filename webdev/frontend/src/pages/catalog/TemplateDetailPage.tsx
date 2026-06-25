import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { publicApi, type PublicTemplate } from '@/api/public';
import Seo, { productSchema, breadcrumbSchema } from '@/components/seo/Seo';
import { useLang } from '@/context/LanguageContext';

/**
 * Template detail + delivery picker.
 * Design sources: /design/template-detail.png + /design/delivery-picker.png
 *
 * Delivery methods (wired as UI placeholders only — no backend senders yet):
 *   📥 Download  — zip right here (will wire when confirmed)
 *   ✉️ Email     — capture email, POST to /api/templates/:slug/deliver/email (future)
 *   💬 Telegram  — open https://t.me/<BizCheckBot>?start=<token> (future — reusing existing BizCheck bot)
 */
export default function TemplateDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { lang } = useLang();
  const [item, setItem] = useState<PublicTemplate | null>(null);
  const [err, setErr] = useState('');

  useEffect(() => {
    publicApi.listTemplates()
      .then(r => {
        const t = r.templates.find(x => x.slug === slug) ?? null;
        setItem(t);
        if (!t) setErr('Шаблон не знайдено');
      })
      .catch(e => setErr(e.message));
  }, [slug]);

  if (err) return <div style={{ padding: 40, color: 'crimson' }}>⚠️ {err} · <Link to="/">Назад</Link></div>;
  if (!item) return <div style={{ padding: 40 }}>Завантаження...</div>;

  const path = `/sablon/${slug}`;
  const title = lang === 'en' ? (item.title_en || item.title_uk) : item.title_uk;
  const description = lang === 'en' ? (item.description_en || item.description_uk) : item.description_uk;
  const seoDesc = (description || '').slice(0, 160) ||
    (lang === 'en'
      ? `Legal template ${title} by Crowe Turcan Mikhailenko on the Bizcheck.md platform.`
      : `Юридичний шаблон ${title} від Crowe Turcan Mikhailenko на платформі Bizcheck.md.`);

  return (
    <div style={{ maxWidth: 720, margin: '40px auto', padding: 24 }} data-page="template-detail">
      <Seo
        title={`${title} · Bizcheck.md · Crowe`}
        description={seoDesc}
        path={path}
        ogType="product"
        jsonLd={[
          productSchema({
            name: title,
            description: seoDesc,
            url: `https://bizcheck.md${path}`,
            price: item.price ?? null,
            currency: item.currency ?? 'MDL',
          }),
          breadcrumbSchema([
            { name: lang === 'en' ? 'Home' : 'Головна', path: '/' },
            { name: lang === 'en' ? 'Templates' : 'Шаблони', path: '/' },
            { name: title, path },
          ]),
        ]}
      />
      <Link to="/" style={{ color: '#0b3d7a', textDecoration: 'none' }}>← Назад</Link>
      <h1 style={{ marginTop: 12 }}>📄 {item.title_uk}</h1>
      <p style={{ color: '#555' }}>{item.description_uk}</p>

      <h3 style={{ marginTop: 32 }}>Як ви хочете отримати шаблон?</h3>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', marginTop: 12 }} data-section="delivery-picker">
        <button className="landing-card" disabled title="Реалізація згодом">📥 Завантажити зараз</button>
        <button className="landing-card" disabled title="Реалізація згодом">✉️ На email</button>
        <button className="landing-card" disabled title="Реалізація згодом">💬 У Telegram</button>
      </div>
      <p style={{ fontSize: 12, color: '#999', marginTop: 12 }}>
        * Доставку буде підключено в наступній ітерації. Telegram використовує наявний бот BizCheck.
      </p>
    </div>
  );
}
