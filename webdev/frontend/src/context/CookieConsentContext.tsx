import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from 'react';
import { loadConsent, saveConsent, applyMarketingConsent, applyAnalyticsConsent, type CookieConsent, DEFAULT_CONSENT } from '@/utils/cookieConsent';

interface CookieConsentValue {
  consent: CookieConsent;
  bannerVisible: boolean;
  acceptAll: () => void;
  rejectAll: () => void;
  saveCustom: (c: { analytics: boolean; marketing: boolean }) => void;
  reopen: () => void;       // footer "Setări cookies" link
  hasDecided: boolean;
}

const Ctx = createContext<CookieConsentValue | null>(null);

export function CookieConsentProvider({ children }: { children: ReactNode }) {
  // Read the stored choice during the FIRST render instead of in a mount effect.
  // Reading it in an effect meant every visitor rendered one frame with
  // DEFAULT_CONSENT + no banner, then re-rendered — a flash of the wrong UI for
  // users who had already consented, and a cascading render for everyone.
  const [stored] = useState<CookieConsent | null>(loadConsent);
  const [consent, setConsent] = useState<CookieConsent>(stored ?? DEFAULT_CONSENT);
  const [hasDecided, setHasDecided] = useState(stored !== null);
  const [bannerVisible, setBannerVisible] = useState(stored === null);

  // Re-applying a stored choice to the third-party tags is a genuine side effect
  // (it calls fbq and injects the Metrica <script>), so it stays in an effect —
  // it must not run during render, and `stored`'s initializer can be invoked
  // twice under StrictMode. It sets no state, so it triggers no extra render.
  useEffect(() => {
    if (!stored) return;
    applyMarketingConsent(stored.marketing);  // marketing salvat → Meta Pixel
    applyAnalyticsConsent(stored.analytics);  // statistici salvat → încarcă Yandex Metrica
  }, [stored]);

  const acceptAll = useCallback(() => {
    const next = saveConsent({ analytics: true, marketing: true });
    setConsent(next);
    setHasDecided(true);
    setBannerVisible(false);
  }, []);

  const rejectAll = useCallback(() => {
    const next = saveConsent({ analytics: false, marketing: false });
    setConsent(next);
    setHasDecided(true);
    setBannerVisible(false);
  }, []);

  const saveCustom = useCallback((c: { analytics: boolean; marketing: boolean }) => {
    const next = saveConsent(c);
    setConsent(next);
    setHasDecided(true);
    setBannerVisible(false);
  }, []);

  const reopen = useCallback(() => {
    setBannerVisible(true);
  }, []);

  return (
    <Ctx.Provider value={{ consent, bannerVisible, acceptAll, rejectAll, saveCustom, reopen, hasDecided }}>
      {children}
    </Ctx.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useCookieConsent(): CookieConsentValue {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useCookieConsent must be used inside CookieConsentProvider');
  return ctx;
}