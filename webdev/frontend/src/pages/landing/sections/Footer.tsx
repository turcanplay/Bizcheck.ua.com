import { Link, useNavigate } from 'react-router-dom';
import { useLang } from '@/context/LanguageContext';
import { useCookieConsent } from '@/context/CookieConsentContext';
import './Footer.css';

export default function Footer() {
  const { t } = useLang();
  const navigate = useNavigate();
  const { reopen } = useCookieConsent();
  const year = new Date().getFullYear();

  function goToCatalog(e: React.MouseEvent, tab?: string) {
    e.preventDefault();
    const el = document.getElementById('resurse');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (tab) history.replaceState(null, '', `/?tab=${tab}`);
    } else {
      navigate(tab ? `/?tab=${tab}` : '/');
      requestAnimationFrame(() => {
        document.getElementById('resurse')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  return (
    <footer className="footer" data-section="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <Link to="/" className="footer__logo">Bizcheck<span>.md</span></Link>
        </div>

        <div className="footer__col">
          <div className="footer__col-title">{t('footerResources')}</div>
          <Link to="/" className="footer__link" onClick={(e) => goToCatalog(e, 'tests')}>{t('footerLinkTests')}</Link>
          <Link to="/" className="footer__link" onClick={(e) => goToCatalog(e, 'templates')}>{t('footerLinkTemplates')}</Link>
        </div>

        <div className="footer__col">
          <div className="footer__col-title">{t('footerLegal')}</div>
          <Link to="/termeni"        className="footer__link">{t('footerTerms')}</Link>
          <Link to="/confidentialitate" className="footer__link">{t('footerPrivacy')}</Link>
          <Link to="/confidentialitate" className="footer__link">{t('footerCookies')}</Link>
          <button type="button" className="footer__link footer__link--button" onClick={reopen}>
            {t('footerCookieSettings')}
          </button>
        </div>

        <div className="footer__col">
          <div className="footer__col-title">{t('footerContacts')}</div>
          <a href="tel:+37379027317" className="footer__link">
            <PhoneIcon /> +373 79 027 317
          </a>
          <a href="mailto:office@bizcheck.md" className="footer__link">
            <MailIcon /> office@bizcheck.md
          </a>
          <span className="footer__link footer__link--muted">{t('footerHours')}</span>
        </div>
      </div>

      <div className="footer__divider" />

      <div className="footer__copyright">
        © {year} Bizcheck.md. {t('footerCopyright')}
      </div>
    </footer>
  );
}

function PhoneIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <path d="M2.5 3c0 4 3.5 7.5 7.5 7.5l1.5-2-2.5-1-1 1a7 7 0 0 1-3-3l1-1-1-2.5-2 1.5z"
            stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
function MailIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden>
      <rect x="1.5" y="2.5" width="11" height="9" rx="1.5" stroke="currentColor" strokeWidth="1.2" fill="none" />
      <path d="M1.5 3.5l5.5 4 5.5-4" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" fill="none" />
    </svg>
  );
}
