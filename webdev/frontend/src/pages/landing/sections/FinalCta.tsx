import { Link, useNavigate } from 'react-router-dom';
import { useLang } from '@/context/LanguageContext';
import { useCtaTarget } from '@/hooks/useCtaTarget';
import './FinalCta.css';

export default function FinalCta() {
  const { t } = useLang();
  const navigate = useNavigate();
  const ctaTarget = useCtaTarget('cta_final_test');

  function goToCatalog(e: React.MouseEvent) {
    e.preventDefault();
    // Admin-configured test target wins; otherwise scroll to the catalog.
    if (ctaTarget.kind === 'route') {
      navigate(ctaTarget.to);
      return;
    }
    const el = document.getElementById('resurse');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      navigate('/');
      requestAnimationFrame(() => {
        document.getElementById('resurse')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  return (
    <section className="final-cta" data-section="final-cta">
      <div className="final-cta__inner">
        <div className="final-cta__text">
          <h2 className="final-cta__title">{t('finalCtaTitle')}</h2>
          <p className="final-cta__subtitle">{t('finalCtaSubtitle')}</p>
        </div>
        <Link to="/" className="final-cta__btn" onClick={goToCatalog}>{t('finalCtaButton')}</Link>
      </div>
    </section>
  );
}
