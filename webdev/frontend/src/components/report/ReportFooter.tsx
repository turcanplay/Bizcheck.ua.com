import { useLang } from '@/context/LanguageContext';
import {
  COMPANY_NAME,
  COMPANY_WEBSITE,
  COMPANY_WEBSITE_LABEL,
  CROWE_GLOBAL_URL,
  CONTACT_EMAIL,
  CONTACT_EMAIL_HREF,
  CONTACT_TELEGRAM,
  CONTACT_TELEGRAM_URL,
} from '@/config/contact';
import './ReportFooter.css';

export default function ReportFooter() {
  const { t } = useLang();

  return (
    <section className="report-footer" data-pdf-section>
      <div className="report-footer__gold-line" />
      <div className="report-footer__inner">
        <h2 className="report-footer__title">{t('pdfFooterTitle')}</h2>
        <p className="report-footer__desc">{t('pdfFooterDesc')}</p>
        <p className="report-footer__contact-note">{t('pdfFooterContact')}</p>

        <div className="report-footer__contacts">
          <div className="report-footer__contact-item">
            <div className="report-footer__contact-label">Web</div>
            <a
              href={COMPANY_WEBSITE}
              target="_blank"
              rel="noopener noreferrer"
              className="report-footer__contact-value"
              data-pdf-link={COMPANY_WEBSITE}
            >{COMPANY_WEBSITE_LABEL}</a>
          </div>
          <div className="report-footer__contact-item">
            <div className="report-footer__contact-label">Email</div>
            <a
              href={CONTACT_EMAIL_HREF}
              className="report-footer__contact-value"
              data-pdf-link={CONTACT_EMAIL_HREF}
            >{CONTACT_EMAIL}</a>
          </div>
          <div className="report-footer__contact-item">
            <div className="report-footer__contact-label">Telegram</div>
            <a
              href={CONTACT_TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="report-footer__contact-value"
              data-pdf-link={CONTACT_TELEGRAM_URL}
            >{CONTACT_TELEGRAM}</a>
          </div>
        </div>

        <div className="report-footer__bottom">
          <div className="report-footer__brand">
            <a href={CROWE_GLOBAL_URL} target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
              <strong>{COMPANY_NAME}</strong>
            </a>
          </div>
          <div className="report-footer__legal">
            <p>{t('pdfFooterConfidential')}</p>
            <p>{t('pdfFooterGenerated')}</p>
          </div>
        </div>
      </div>
    </section>
  );
}
