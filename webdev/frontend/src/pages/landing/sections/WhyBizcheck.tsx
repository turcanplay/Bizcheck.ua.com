import { useLang } from '@/context/LanguageContext';
import type { TranslationKey } from '@/i18n/translations';
import './WhyBizcheck.css';

const FEATURES: Array<{
  icon: React.ReactNode;
  titleKey: TranslationKey;
  descKey: TranslationKey;
  accent: string;
}> = [
  {
    accent: 'blue',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M13 2L4.5 13.5h6.5L10 22l8.5-11.5H12L13 2z"
          stroke="currentColor" strokeWidth="1.8"
          strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    titleKey: 'whyFastTitle',
    descKey: 'whyFastDesc',
  },
  {
    accent: 'violet',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z"
          stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
        <path d="M9 13h6M9 17h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    titleKey: 'whyDocsTitle',
    descKey: 'whyDocsDesc',
  },
  {
    accent: 'emerald',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="5" stroke="currentColor" strokeWidth="1.8" />
        <circle cx="12" cy="12" r="1.6" fill="currentColor" />
        <path d="M18 6l3-3M21 3h-3M21 3v3"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
    titleKey: 'whyBusinessTitle',
    descKey: 'whyBusinessDesc',
  },
  {
    accent: 'amber',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="4" y="10" width="16" height="11" rx="2.2"
          stroke="currentColor" strokeWidth="1.8" />
        <path d="M8 10V7a4 4 0 0 1 8 0v3"
          stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="12" cy="15.5" r="1.4" fill="currentColor" />
        <path d="M12 16.9v2" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
    titleKey: 'whyLegalTitle',
    descKey: 'whyLegalDesc',
  },
];

export default function WhyBizcheck() {
  const { t, lang } = useLang();
  return (
    <section className="why" data-section="why" id="why-bizcheck">
      <div className="why__header">
        <span className="why__eyebrow">
          <span className="why__eyebrow-dot" aria-hidden />
          {lang === 'uk' ? 'ПЕРЕВАГИ' : 'ADVANTAGES'}
        </span>
        <h2 className="why__title">
          {lang === 'uk' ? (
            <>Чому <span className="why__title-accent">Bizcheck</span>?</>
          ) : (
            <>Why <span className="why__title-accent">Bizcheck</span>?</>
          )}
        </h2>
        <p className="why__subtitle">{lang === 'uk'
          ? 'Усе для бізнес-документів в одному місці.'
          : 'Everything for business documents in one place.'}</p>
      </div>

      <div className="why__grid">
        {FEATURES.map(f => (
          <div className={`why__card why__card--${f.accent}`} key={f.titleKey}>
            <div className="why__icon-wrap">
              <div className="why__icon-glow" aria-hidden />
              <div className="why__icon">{f.icon}</div>
            </div>
            <div className="why__card-title">{t(f.titleKey)}</div>
            <div className="why__card-desc">{t(f.descKey)}</div>
          </div>
        ))}
      </div>
    </section>
  );
}
