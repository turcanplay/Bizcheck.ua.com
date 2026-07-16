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
          : 'Політика конфіденційності · Bizcheck.md'}
        description={lang === 'ru'
          ? 'Политика обработки персональных данных, cookies и условия использования платформы Bizcheck.md от Crowe Turcan Mikhailenko.'
          : 'Політика обробки персональних даних, cookies та умови використання платформи Bizcheck.md від Crowe Turcan Mikhailenko.'}
        path="/confidentialitate"
        jsonLd={breadcrumbSchema([
          { name: lang === 'ru' ? 'Главная' : 'Головна', path: '/' },
          { name: lang === 'ru' ? 'Конфиденциальность' : 'Конфіденційність', path: '/confidentialitate' },
        ])}
      />
      <div className="privacy-page__inner">
        <Link to="/" className="privacy-page__back">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 7H2M6 3L2 7l4 4" />
          </svg>
          {lang === 'uk' ? 'Повернутися на головну' : 'Вернуться на главную'}
        </Link>

        {PRIVACY_BLOCKS.map((block, i) => {
          const text = lang === 'ru' ? block.ru : block.uk;
          if (block.k === 'title') {
            return (
              <h1 key={i} className="privacy-page__title">
                {text}
              </h1>
            );
          }
          if (block.k === 'h2') {
            return (
              <h2 key={i} className="privacy-page__heading">
                {text}
              </h2>
            );
          }
          return (
            <p key={i} className="privacy-page__text">
              {text}
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
