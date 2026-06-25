import { useLang } from '@/context/LanguageContext';
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
            href="https://crowe-tm.md"
            className="report-promo__contact-value"
            target="_blank"
            rel="noopener noreferrer"
            data-pdf-link="https://crowe-tm.md"
          >{t('ctaWebValue')}</a>
        </div>
        <div className="report-promo__contact">
          <div className="report-promo__contact-label">{t('ctaEmailLabel')}</div>
          <a
            href="mailto:office@bizcheck.md"
            className="report-promo__contact-value"
            data-pdf-link="mailto:office@bizcheck.md"
          >{t('ctaEmailValue')}</a>
        </div>
        <div className="report-promo__contact">
          <div className="report-promo__contact-label">{t('ctaTelegramLabel')}</div>
          <a
            href="https://t.me/CROWE_TM"
            className="report-promo__contact-value"
            target="_blank"
            rel="noopener noreferrer"
            data-pdf-link="https://t.me/CROWE_TM"
          >{t('ctaTelegramValue')}</a>
        </div>
      </div>

      <div className="report-promo__crowe">{t('ctaCrowe')}</div>

      <p className="report-promo__disclaimer">{t('ctaDisclaimer')}</p>
    </section>
  );
}
