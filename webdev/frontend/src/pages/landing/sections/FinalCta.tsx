import { Link } from 'react-router-dom';
import { useLang } from '@/context/LanguageContext';
import { useTestCta } from '@/hooks/useCtaTarget';
import './FinalCta.css';

export default function FinalCta() {
  const { t } = useLang();
  // Admin-configured test (cta_final_test) wins; otherwise the default check-up.
  const testCta = useTestCta('cta_final_test');

  return (
    <section className="final-cta" data-section="final-cta">
      <div className="final-cta__inner">
        <div className="final-cta__text">
          <h2 className="final-cta__title">{t('finalCtaTitle')}</h2>
        </div>
        <Link to={testCta.href} className="final-cta__btn" onClick={testCta.go}>{t('finalCtaButton')}</Link>
      </div>
    </section>
  );
}
