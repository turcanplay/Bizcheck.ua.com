import { useLang } from '@/context/LanguageContext';
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
              href="https://crowe-tm.md"
              target="_blank"
              rel="noopener noreferrer"
              className="report-footer__contact-value"
              data-pdf-link="https://crowe-tm.md"
            >crowe-tm.md</a>
          </div>
          <div className="report-footer__contact-item">
            <div className="report-footer__contact-label">Email</div>
            <a
              href="mailto:office@bizcheck.md"
              className="report-footer__contact-value"
              data-pdf-link="mailto:office@bizcheck.md"
            >office@bizcheck.md</a>
          </div>
          <div className="report-footer__contact-item">
            <div className="report-footer__contact-label">Telegram</div>
            <a
              href="https://t.me/CROWE_TM"
              target="_blank"
              rel="noopener noreferrer"
              className="report-footer__contact-value"
              data-pdf-link="https://t.me/CROWE_TM"
            >@CROWE_TM</a>
          </div>
        </div>

        <div className="report-footer__bottom">
          <div className="report-footer__brand">
            <a href="https://www.crowe.com/ua/crowemikhailenko/en-gb/moldova/" target="_blank" rel="noopener noreferrer" style={{ color: 'inherit', textDecoration: 'none' }}>
              <strong>Crowe Turcan Mikhailenko</strong>
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
