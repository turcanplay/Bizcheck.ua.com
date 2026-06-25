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
  const [consent, setConsent] = useState<CookieConsent>(DEFAULT_CONSENT);
  const [hasDecided, setHasDecided] = useState(false);
  const [bannerVisible, setBannerVisible] = useState(false);

  // Load any stored choice on mount.
  useEffect(() => {
    const existing = loadConsent();
    if (existing) {
      setConsent(existing);
      setHasDecided(true);
      applyMarketingConsent(existing.marketing);  // marketing salvat → Meta Pixel
      applyAnalyticsConsent(existing.analytics);  // statistici salvat → încarcă Yandex Metrica
    } else {
      setBannerVisible(true);
    }
  }, []);

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