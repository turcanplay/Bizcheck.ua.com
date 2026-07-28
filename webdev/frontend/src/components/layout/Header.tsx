import { Link } from 'react-router-dom';
import { useLang } from '@/context/LanguageContext';
import { useLocalizedPath } from '@/i18n/useLocalizedPath';
import { useQuiz } from '@/context/QuizContext';
import croweLogo from './logo/Crowe.png';
import './Header.css';

export default function Header() {
  const { lang, setLang, t } = useLang();
  const L = useLocalizedPath();
  const { tests, selectedTestSlug, phase } = useQuiz();

  const currentTest = tests.find(x => x.slug === selectedTestSlug);
  const testName = currentTest
    ? (lang === 'uk' ? currentTest.name_uk : currentTest.name_en)
    : null;

  // Show test name only during quiz / cta phases where a test is active
  const showTestName = !!testName && (phase === 'quiz' || phase === 'cta' || phase === 'report');

  return (
    <header className="site-header">
      <Link to={L('/')} className="header-logo" aria-label="Bizcheck.ua.com home">
        <img src={croweLogo} alt="Crowe" className="crowe-logo__img" />
        <div className="header-sep" />
        <div className="header-sub">
          {showTestName ? testName : 'Bizcheck.ua.com'}
        </div>
      </Link>
      <div className="header-right">
        <span className="header-right__text">{t('headerRight')}</span>
        <div className="lang-toggle">
          <button
            className={`lang-toggle__btn ${lang === 'uk' ? 'lang-toggle__btn--active' : ''}`}
            onClick={() => setLang('uk')}
          >
            UA
          </button>
          <button
            className={`lang-toggle__btn ${lang === 'en' ? 'lang-toggle__btn--active' : ''}`}
            onClick={() => setLang('en')}
          >
            EN
          </button>
        </div>
      </div>
    </header>
  );
}
