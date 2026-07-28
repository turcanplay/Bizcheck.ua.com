import { Link, useNavigate } from 'react-router-dom';
import { useLang } from '@/context/LanguageContext';
import { useLocalizedPath } from '@/i18n/useLocalizedPath';
import { useCookieConsent } from '@/context/CookieConsentContext';
import { CONTACT_EMAIL, CONTACT_EMAIL_HREF, CONTACT_PHONE, CONTACT_PHONE_TEL, CROWE_GLOBAL_URL } from '@/config/contact';
import { BRAND } from '@/config/siteMeta';
import './Footer.css';

export default function Footer() {
  const { t } = useLang();
  const L = useLocalizedPath();
  const navigate = useNavigate();
  const { reopen } = useCookieConsent();
  const year = new Date().getFullYear();

  function goToCatalog(e: React.MouseEvent, tab?: string) {
    e.preventDefault();
    const el = document.getElementById('resurse');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      if (tab) history.replaceState(null, '', `${L('/')}?tab=${tab}`);
    } else {
      navigate(tab ? `${L('/')}?tab=${tab}` : L('/'));
      requestAnimationFrame(() => {
        document.getElementById('resurse')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  return (
    <footer className="footer" data-section="footer">
      <div className="footer__inner">
        <div className="footer__brand">
          <Link to={L('/')} className="footer__logo">Bizcheck<span>.ua.com</span></Link>
        </div>

        <div className="footer__col">
          <div className="footer__col-title">{t('footerResources')}</div>
          <Link to={L('/')} className="footer__link" onClick={(e) => goToCatalog(e, 'tests')}>{t('footerLinkTests')}</Link>
          <Link to={L('/')} className="footer__link" onClick={(e) => goToCatalog(e, 'templates')}>{t('footerLinkTemplates')}</Link>
        </div>

        <div className="footer__col">
          <div className="footer__col-title">{t('footerLegal')}</div>
          {/* No standalone terms page exists yet — the terms text is a section of
              the privacy policy, so all three point there. */}
          <Link to={L('/privacy')} className="footer__link">{t('footerTerms')}</Link>
          <Link to={L('/privacy')} className="footer__link">{t('footerPrivacy')}</Link>
          <Link to={L('/privacy')} className="footer__link">{t('footerCookies')}</Link>
          <button type="button" className="footer__link footer__link--button" onClick={reopen}>
            {t('footerCookieSettings')}
          </button>
        </div>

        <div className="footer__col">
          <div className="footer__col-title">{t('footerOfficial')}</div>
          <a href="https://turcan.md" target="_blank" rel="noopener noreferrer" className="footer__link">{t('footerLinkTurcan')}</a>
          <a href={CROWE_GLOBAL_URL} target="_blank" rel="noopener noreferrer" className="footer__link">{t('footerLinkCrowe')}</a>
        </div>

        <div className="footer__col">
          <div className="footer__col-title">{t('footerContacts')}</div>
          <a href={CONTACT_PHONE_TEL} className="footer__link">
            <PhoneIcon /> {CONTACT_PHONE}
          </a>
          <a href={CONTACT_EMAIL_HREF} className="footer__link">
            <MailIcon /> {CONTACT_EMAIL}
          </a>
          <span className="footer__link footer__link--muted">{t('footerHours')}</span>
        </div>
      </div>

      <div className="footer__divider" />

      <div className="footer__copyright">
        © {year} {BRAND}. {t('footerCopyright')}
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
