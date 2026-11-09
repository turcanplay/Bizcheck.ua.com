import { Navigate, useLocation, useParams, type Params } from 'react-router-dom';
import { DEFAULT_LANG, detectBrowserLang, localizePath, readStoredLang, stripLangPrefix } from '@/i18n/routing';

/**
 * `/` → `/uk/` or `/en/`: the language the visitor last chose, else the
 * browser language, else Ukrainian. Crawlers are excluded from the browser
 * sniff (see `detectBrowserLang`), so Googlebot — which renders as `en` —
 * still lands on `/uk/` and the x-default stays deterministic.
 */
export default function LangRedirect() {
  const { pathname, search, hash } = useLocation();
  const lang = readStoredLang() ?? detectBrowserLang() ?? DEFAULT_LANG;
  return <Navigate to={`${localizePath(stripLangPrefix(pathname), lang)}${search}${hash}`} replace />;
}

/**
 * Permanent redirect off a pre-i18n URL (`/test/x`, `/sablon/x`,
 * `/confidentialitate`, `/plata/test/x`) onto its Ukrainian equivalent.
 *
 * `build` receives the matched route params so the slug survives the move.
 * Query string and hash are carried over untouched — old campaign links keep
 * their `?utm_*`.
 */
export function LegacyRedirect({ build }: { build: (params: Readonly<Params<string>>) => string }) {
  const params = useParams();
  const { search, hash } = useLocation();
  return <Navigate to={`${build(params)}${search}${hash}`} replace />;
}
