import { Link } from 'react-router-dom';
import { useLang } from '@/context/LanguageContext';
import { useLocalizedPath } from '@/i18n/useLocalizedPath';
import Seo from '@/components/seo/Seo';

/**
 * Real 404.
 *
 * The old catch-all rendered <LandingPage /> for every unknown URL, which is a
 * soft-404: Google sees HTTP 200 + full landing content on infinite junk URLs
 * and either indexes them or (more often) devalues the whole site. This page
 * is explicitly `noindex, nofollow`.
 *
 * The HTTP status is still 200 — an SPA cannot set it. nginx should map unknown
 * paths to a 404 status for crawlers; the meta robots tag is the part we can
 * guarantee from here.
 */
export default function NotFoundPage() {
  const { lang } = useLang();
  const L = useLocalizedPath();
  const en = lang === 'en';

  return (
    <div
      style={{
        display: 'flex', flexDirection: 'column', gap: 16, alignItems: 'center',
        justifyContent: 'center', minHeight: '70vh', padding: 24, textAlign: 'center',
        color: '#011E41', fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif",
      }}
      data-page="not-found"
    >
      <Seo
        title={en ? 'Page not found · Bizcheck.ua.com' : 'Сторінку не знайдено · Bizcheck.ua.com'}
        description={en
          ? 'The requested page does not exist or has been moved.'
          : 'Запитувана сторінка не існує або була переміщена.'}
        noindex
      />
      <div style={{ fontSize: 64, fontWeight: 800, lineHeight: 1, color: '#F5A800' }}>404</div>
      <h1 style={{ fontSize: 22, margin: 0 }}>
        {en ? 'Page not found' : 'Сторінку не знайдено'}
      </h1>
      <p style={{ color: '#6B7280', fontSize: 15, maxWidth: 420, margin: 0 }}>
        {en
          ? 'The requested page does not exist or has been moved.'
          : 'Запитувана сторінка не існує або була переміщена.'}
      </p>
      <Link
        to={L('/')}
        style={{
          marginTop: 8, padding: '11px 24px', borderRadius: 999, textDecoration: 'none',
          background: '#F5A800', color: '#011E41', fontWeight: 700, fontSize: 14,
        }}
      >
        {en ? 'Back to home' : 'Повернутися на головну'}
      </Link>
    </div>
  );
}
