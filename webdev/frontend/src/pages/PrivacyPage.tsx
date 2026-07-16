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
        title={lang === 'en'
          ? 'Privacy Policy · Bizcheck.md'
          : 'Політика конфіденційності · Bizcheck.md'}
        description={lang === 'en'
          ? 'Personal data processing policy, cookies and terms of use of the Bizcheck.md platform by Crowe Turcan Mikhailenko.'
          : 'Політика обробки персональних даних, cookies та умови використання платформи Bizcheck.md від Crowe Turcan Mikhailenko.'}
        path="/confidentialitate"
        jsonLd={breadcrumbSchema([
          { name: lang === 'en' ? 'Home' : 'Головна', path: '/' },
          { name: lang === 'en' ? 'Privacy' : 'Конфіденційність', path: '/confidentialitate' },
        ])}
      />
      <div className="privacy-page__inner">
        <Link to="/" className="privacy-page__back">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 7H2M6 3L2 7l4 4" />
          </svg>
          {lang === 'uk' ? 'Повернутися на головну' : 'Back to home'}
        </Link>

        {PRIVACY_BLOCKS.map((block, i) => {
          const text = lang === 'en' ? block.en : block.uk;
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
