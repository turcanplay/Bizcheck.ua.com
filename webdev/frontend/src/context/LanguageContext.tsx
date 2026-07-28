import { createContext, useContext, useState, useCallback, useEffect, type ReactNode } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { translations, type Lang, type TranslationKey } from '@/i18n/translations';
import {
  DEFAULT_LANG,
  isLocalizableRoute,
  langFromPath,
  localizePath,
  readStoredLang,
  stripLangPrefix,
  writeStoredLang,
} from '@/i18n/routing';

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  tList: (key: 'sectors' | 'sizes' | 'ages' | 'revenues') => string[];
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

/**
 * Language provider.
 *
 * The URL is the source of truth: `/en/privacy` renders English, full stop.
 * localStorage is only a *preference* — it decides which language `/` sends a
 * returning visitor to, and it keeps the admin panel (which has no language
 * segment) on the language the visitor last used.
 *
 * Must be mounted INSIDE the router: it reads the current location and
 * navigates on `setLang`.
 */
export function LanguageProvider({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();

  const urlLang = langFromPath(location.pathname);

  // Fallback language for routes that carry no prefix (admin, and the brief
  // moment before `/` has redirected). Seeded from the URL the app booted on,
  // so deep-linking to /en/… and then opening the admin panel stays English.
  const [prefLang, setPrefLang] = useState<Lang>(
    () => langFromPath(window.location.pathname) ?? readStoredLang() ?? DEFAULT_LANG,
  );

  const lang: Lang = urlLang ?? prefLang;

  // Persist whichever language is actually on screen, so a later visit to `/`
  // redirects back into it. localStorage is an external system — syncing it
  // from an effect is the intended use; no React state is touched here.
  useEffect(() => {
    writeStoredLang(lang);
  }, [lang]);

  const setLang = useCallback((newLang: Lang) => {
    writeStoredLang(newLang);
    setPrefLang(newLang);

    // Admin and other non-localized routes have no language segment to swap —
    // the state change above is the whole switch.
    if (!isLocalizableRoute(location.pathname)) return;

    const target = localizePath(stripLangPrefix(location.pathname), newLang);
    if (target === location.pathname) return;

    // `replace` on purpose: a language toggle is not a navigation step, and it
    // keeps the Back button pointing at the page the user actually came from.
    //
    // The route *pattern* is identical across languages (`/:lang/test/:slug`),
    // so React Router re-renders the same component instances instead of
    // remounting them — an in-progress quiz keeps its QuizContext state, and
    // QuizContext's own `[lang, rawApiBlocks]` effect re-resolves the question
    // texts into the new language.
    navigate(`${target}${location.search}${location.hash}`, { replace: true });
  }, [location.pathname, location.search, location.hash, navigate]);

  const t = useCallback((key: TranslationKey, params?: Record<string, string | number>): string => {
    const val = translations[key];
    let text = (val as Record<Lang, string>)[lang] ?? key;
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        text = text.replace(`{${k}}`, String(v));
      });
    }
    return text;
  }, [lang]);

  const tList = useCallback((key: 'sectors' | 'sizes' | 'ages' | 'revenues'): string[] => {
    return [...translations[key][lang]];
  }, [lang]);

  return (
    <LanguageContext.Provider value={{ lang, setLang, t, tList }}>
      {children}
    </LanguageContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useLang(): LanguageContextValue {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLang must be used inside LanguageProvider');
  return ctx;
}
