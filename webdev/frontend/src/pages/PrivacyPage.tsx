import { Link } from 'react-router-dom';
import { useLang } from '@/context/LanguageContext';
import Seo, { breadcrumbSchema } from '@/components/seo/Seo';
import { PRIVACY_BLOCKS } from './privacyContent';
import './PrivacyPage.css';

export default function PrivacyPage() {
  const { lang } = useLang();

  return (
    <div className="privacy-page">
      <Seo
        title={lang === 'ru'
          ? 'Политика конфиденциальности · Bizcheck.md'
          : 'Politica de confidențialitate · Bizcheck.md'}
        description={lang === 'ru'
          ? 'Политика обработки персональных данных, cookies и условия использования платформы Bizcheck.md от Crowe Turcan Mikhailenko.'
          : 'Politica de prelucrare a datelor personale, cookies și condițiile de utilizare ale platformei Bizcheck.md de la Crowe Turcan Mikhailenko.'}
        path="/confidentialitate"
        jsonLd={breadcrumbSchema([
          { name: lang === 'ru' ? 'Главная' : 'Acasă', path: '/' },
          { name: lang === 'ru' ? 'Конфиденциальность' : 'Confidențialitate', path: '/confidentialitate' },
        ])}
      />
      <div className="privacy-page__inner">
        <Link to="/" className="privacy-page__back">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 7H2M6 3L2 7l4 4" />
          </svg>
          {lang === 'ro' ? 'Înapoi la pagina principală' : 'Вернуться на главную'}
        </Link>

        {PRIVACY_BLOCKS.map((block, i) => {
          if (block.k === 'title') {
            return (
              <h1 key={i} className="privacy-page__title">
                {block.text}
              </h1>
            );
          }
          if (block.k === 'h2') {
            return (
              <h2 key={i} className="privacy-page__heading">
                {block.text}
              </h2>
            );
          }
          return (
            <p key={i} className="privacy-page__text">
              {block.text}
            </p>
          );
        })}

        <div className="privacy-page__contact">
          <strong>Crowe Turcan Mikhailenko</strong>
          <span>office@bizcheck.md · crowe-tm.md</span>
        </div>
      </div>
    </div>
  );
}
