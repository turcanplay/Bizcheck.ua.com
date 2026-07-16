import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';
import { translations, type Lang, type TranslationKey } from '@/i18n/translations';

interface LanguageContextValue {
  lang: Lang;
  setLang: (lang: Lang) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
  tList: (key: 'sectors' | 'sizes' | 'ages' | 'revenues') => string[];
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>(() => {
    const saved = localStorage.getItem('bizcheck_lang');
    return (saved === 'uk' || saved === 'ru') ? saved : 'uk';
  });

  const setLang = useCallback((newLang: Lang) => {
    setLangState(newLang);
    localStorage.setItem('bizcheck_lang', newLang);
  }, []);

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
