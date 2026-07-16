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
        if (!t) setErr(lang === 'ru' ? 'Шаблон не найден' : 'Шаблон не знайдено');
      })
      .catch(e => setErr(e.message));
  }, [slug]);

  if (err) return <div style={{ padding: 40, color: 'crimson' }}>⚠️ {err} · <Link to="/">{lang === 'ru' ? 'Назад' : 'Назад'}</Link></div>;
  if (!item) return <div style={{ padding: 40 }}>{lang === 'ru' ? 'Загрузка...' : 'Завантаження...'}</div>;

  const path = `/sablon/${slug}`;
  const title = lang === 'ru' ? (item.title_ru || item.title_uk) : item.title_uk;
  const description = lang === 'ru' ? (item.description_ru || item.description_uk) : item.description_uk;
  const seoDesc = (description || '').slice(0, 160) ||
    (lang === 'ru'
      ? `Юридический шаблон ${title} от Crowe Turcan Mikhailenko на платформе Bizcheck.md.`
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
            { name: lang === 'ru' ? 'Главная' : 'Головна', path: '/' },
            { name: lang === 'ru' ? 'Шаблоны' : 'Шаблони', path: '/' },
            { name: title, path },
          ]),
        ]}
      />
      <Link to="/" style={{ color: '#0A3A6E', textDecoration: 'none' }}>← {lang === 'ru' ? 'Назад' : 'Назад'}</Link>
      <h1 style={{ marginTop: 12 }}>📄 {title}</h1>
      <p style={{ color: '#555' }}>{description}</p>

      <h3 style={{ marginTop: 32 }}>{lang === 'ru' ? 'Как вы хотите получить шаблон?' : 'Як ви хочете отримати шаблон?'}</h3>
      <div style={{ display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', marginTop: 12 }} data-section="delivery-picker">
        <button className="landing-card" disabled>📥 {lang === 'ru' ? 'Скачать сейчас' : 'Завантажити зараз'}</button>
        <button className="landing-card" disabled>✉️ {lang === 'ru' ? 'На email' : 'На email'}</button>
        <button className="landing-card" disabled>💬 {lang === 'ru' ? 'В Telegram' : 'У Telegram'}</button>
      </div>
      <p style={{ fontSize: 12, color: '#999', marginTop: 12 }}>
        {lang === 'ru'
          ? '* Доставка будет подключена в следующей итерации. Telegram использует существующий бот BizCheck.'
          : '* Доставку буде підключено в наступній ітерації. Telegram використовує наявний бот BizCheck.'}
      </p>
    </div>
  );
}
