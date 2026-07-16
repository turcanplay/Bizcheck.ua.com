import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCookieConsent } from '@/context/CookieConsentContext';
import { useLang } from '@/context/LanguageContext';
import './CookieBanner.css';

/**
 * The card only exists while the banner is open, so its local toggle state is
 * seeded from `consent` at mount. Re-opening the banner from the footer
 * ("Setări cookies") unmounts/remounts this component, which re-seeds the
 * toggles and collapses the details view — exactly what the old
 * "sync on bannerVisible" effect did, but without the extra render pass.
 */
export default function CookieBanner() {
  const { bannerVisible, consent, acceptAll, rejectAll, saveCustom } = useCookieConsent();

  if (!bannerVisible) return null;

  return (
    <CookieBannerCard
      consent={consent}
      acceptAll={acceptAll}
      rejectAll={rejectAll}
      saveCustom={saveCustom}
    />
  );
}

type CardProps = Pick<
  ReturnType<typeof useCookieConsent>,
  'consent' | 'acceptAll' | 'rejectAll' | 'saveCustom'
>;

function CookieBannerCard({ consent, acceptAll, rejectAll, saveCustom }: CardProps) {
  const { t } = useLang();
  const [expanded, setExpanded] = useState(false);
  const [analytics, setAnalytics] = useState(consent.analytics);
  const [marketing, setMarketing] = useState(consent.marketing);

  return (
    <div className={`cookie-banner ${expanded ? 'cookie-banner--expanded' : ''}`} role="dialog" aria-label="Cookie consent" aria-modal="false">
      <div className="cookie-banner__card">
        <div className="cookie-banner__head">
          <h3 className="cookie-banner__title">{t('cookieTitle')}</h3>
          <p className="cookie-banner__desc">{t('cookieDesc')}</p>
          <Link to="/confidentialitate" className="cookie-banner__policy-link">
            {t('cookiePolicyLink')} →
          </Link>
        </div>

        {expanded && (
          <ul className="cookie-banner__cats">
            <li className="cookie-banner__cat">
              <div className="cookie-banner__cat-text">
                <strong>{t('cookieCatNecessaryTitle')}</strong>
                <span>{t('cookieCatNecessaryDesc')}</span>
              </div>
              <span className="cookie-banner__locked">{t('cookieAlwaysOn')}</span>
            </li>

            <li className="cookie-banner__cat">
              <div className="cookie-banner__cat-text">
                <strong>{t('cookieCatAnalyticsTitle')}</strong>
                <span>{t('cookieCatAnalyticsDesc')}</span>
              </div>
              <Toggle checked={analytics} onChange={setAnalytics} label={t('cookieCatAnalyticsTitle')} />
            </li>

            <li className="cookie-banner__cat">
              <div className="cookie-banner__cat-text">
                <strong>{t('cookieCatMarketingTitle')}</strong>
                <span>{t('cookieCatMarketingDesc')}</span>
              </div>
              <Toggle checked={marketing} onChange={setMarketing} label={t('cookieCatMarketingTitle')} />
            </li>
          </ul>
        )}

        <div className="cookie-banner__actions">
          {expanded ? (
            <>
              <button
                type="button"
                className="cookie-banner__btn cookie-banner__btn--ghost"
                onClick={() => setExpanded(false)}
              >
                {t('cookieBack')}
              </button>
              <button
                type="button"
                className="cookie-banner__btn cookie-banner__btn--primary"
                onClick={() => saveCustom({ analytics, marketing })}
              >
                {t('cookieSave')}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                className="cookie-banner__btn cookie-banner__btn--ghost"
                onClick={() => setExpanded(true)}
              >
                {t('cookieCustomize')}
              </button>
              <button
                type="button"
                className="cookie-banner__btn cookie-banner__btn--ghost"
                onClick={rejectAll}
              >
                {t('cookieRejectAll')}
              </button>
              <button
                type="button"
                className="cookie-banner__btn cookie-banner__btn--primary"
                onClick={acceptAll}
              >
                {t('cookieAcceptAll')}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function Toggle({
  checked, onChange, label,
}: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      className={`cookie-toggle ${checked ? 'cookie-toggle--on' : ''}`}
      onClick={() => onChange(!checked)}
    >
      <span className="cookie-toggle__knob" />
    </button>
  );
}
