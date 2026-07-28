import { Navigate, useLocation, useParams, type Params } from 'react-router-dom';
import { DEFAULT_LANG, localizePath, readStoredLang, stripLangPrefix } from '@/i18n/routing';

/**
 * `/` → `/uk/` (or `/en/` for a returning visitor who last browsed English).
 *
 * Client-side `<Navigate replace>` is the SPA half of the fix; nginx should
 * also answer `/` with a real 301 so crawlers never see a language-less URL
 * (see the deployment notes). Deliberately NOT sniffing `Accept-Language` /
 * `navigator.language`: the default language must be deterministic, otherwise
 * Googlebot (which crawls as `en`) would index `/en/` as x-default.
 */
export default function LangRedirect() {
  const { pathname, search, hash } = useLocation();
  const lang = readStoredLang() ?? DEFAULT_LANG;
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
