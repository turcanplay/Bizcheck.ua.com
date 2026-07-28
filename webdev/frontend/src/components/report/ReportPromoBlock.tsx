import { useLang } from '@/context/LanguageContext';
import {
  COMPANY_WEBSITE,
  COMPANY_WEBSITE_LABEL,
  CONTACT_EMAIL,
  CONTACT_EMAIL_HREF,
  CONTACT_TELEGRAM,
  CONTACT_TELEGRAM_URL,
} from '@/config/contact';
import './ReportPromoBlock.css';

export default function ReportPromoBlock() {
  const { t } = useLang();

  return (
    <section className="report-promo" data-pdf-section>
      <h2 className="report-promo__title">{t('ctaTitle')}</h2>
      <p className="report-promo__subtitle">{t('ctaSubtitle')}</p>
      <p className="report-promo__note">{t('ctaNote')}</p>

      <div className="report-promo__contacts">
        <div className="report-promo__contact">
          <div className="report-promo__contact-label">{t('ctaWebLabel')}</div>
          <a
            href={COMPANY_WEBSITE}
            className="report-promo__contact-value"
            target="_blank"
            rel="noopener noreferrer"
            data-pdf-link={COMPANY_WEBSITE}
          >{COMPANY_WEBSITE_LABEL}</a>
        </div>
        <div className="report-promo__contact">
          <div className="report-promo__contact-label">{t('ctaEmailLabel')}</div>
          <a
            href={CONTACT_EMAIL_HREF}
            className="report-promo__contact-value"
            data-pdf-link={CONTACT_EMAIL_HREF}
          >{CONTACT_EMAIL}</a>
        </div>
        <div className="report-promo__contact">
          <div className="report-promo__contact-label">{t('ctaTelegramLabel')}</div>
          <a
            href={CONTACT_TELEGRAM_URL}
            className="report-promo__contact-value"
            target="_blank"
            rel="noopener noreferrer"
            data-pdf-link={CONTACT_TELEGRAM_URL}
          >{CONTACT_TELEGRAM}</a>
        </div>
      </div>

      <div className="report-promo__crowe">{t('ctaCrowe')}</div>

      <p className="report-promo__disclaimer">{t('ctaDisclaimer')}</p>
    </section>
  );
}
