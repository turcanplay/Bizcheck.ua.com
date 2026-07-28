/**
 * `const L = useLocalizedPath()` → `L('/privacy')` gives `/uk/privacy` or
 * `/en/privacy` depending on the language currently in the URL.
 *
 * Every `<Link to>` / `navigate()` in the public SPA goes through this so a
 * user browsing in English never gets bounced back to the Ukrainian tree.
 * Pass the language-NEUTRAL path (no `/uk` or `/en`); passing an already
 * prefixed one is harmless — the prefix is normalized away first.
 */
import { useCallback } from 'react';
import { useLang } from '@/context/LanguageContext';
import { localizePath } from './routing';

export function useLocalizedPath(): (path: string) => string {
  const { lang } = useLang();
  return useCallback((path: string) => localizePath(path, lang), [lang]);
}
