import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';
import { useLang } from '@/context/LanguageContext';
import { alternateLinks, localizedUrl, stripLangPrefix } from '@/i18n/routing';
import {
  BRAND,
  DEFAULT_IMAGE,
  DEFAULT_TITLE_UK,
  DEFAULT_TITLE_EN,
  DEFAULT_DESC_UK,
  DEFAULT_DESC_EN,
} from './siteMeta';

interface SeoProps {
  title?: string;
  description?: string;
  /**
   * Language-NEUTRAL path of this page (e.g. "/templates/contract", "/privacy",
   * "/" for the landing) — the language prefix is added here. Omit it and the
   * current URL is used, which is what most pages want. A path that already
   * carries a `/uk` or `/en` prefix is accepted; the prefix is normalized away.
   */
  path?: string;
  /** Page-specific Open Graph image (full URL). Falls back to site default. */
  image?: string;
  /** Optional JSON-LD payload. Single object or array. */
  jsonLd?: object | object[];
  /** Pass true to mark page as not for indexing (admin, checkout draft, etc.). */
  noindex?: boolean;
  /** og:type — default 'website'; use 'article' for blog posts. */
  ogType?: 'website' | 'article' | 'product';
}

/**
 * Per-page SEO meta. Drop into the top of any page component:
 *
 *   <Seo title="..." description="..." path="/templates/x" />
 *
 * Updates <title>, meta description, canonical, hreflang, OG, Twitter,
 * and (optionally) appends JSON-LD structured data.
 *
 * Hreflang is REAL: every supported language gets an alternate pointing at the
 * same page under its own prefix, plus `x-default` → the Ukrainian version.
 * Before the language lived in the URL all three alternates pointed at the very
 * same href, which told Google the two languages were one page and made the
 * English version impossible to index.
 *
 * This module exports the component ONLY — constants live in ./siteMeta and
 * JSON-LD builders in ./schema, so Vite fast refresh keeps working here.
 */
export default function Seo({
  title,
  description,
  path,
  image,
  jsonLd,
  noindex = false,
  ogType = 'website',
}: SeoProps) {
  const { lang } = useLang();
  const { pathname } = useLocation();

  const basePath = stripLangPrefix(path ?? pathname);
  const canonical = localizedUrl(basePath, lang);
  const alternates = alternateLinks(basePath);

  const finalTitle = title || (lang === 'en' ? DEFAULT_TITLE_EN : DEFAULT_TITLE_UK);
  const finalDesc = description || (lang === 'en' ? DEFAULT_DESC_EN : DEFAULT_DESC_UK);
  const finalImage = image || DEFAULT_IMAGE;

  return (
    <Helmet prioritizeSeoTags>
      <html lang={lang} />
      <title>{finalTitle}</title>
      <meta name="description" content={finalDesc} />
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'} />
      <link rel="canonical" href={canonical} />

      {/* Hreflang — one entry per language + x-default → uk */}
      {alternates.map(alt => (
        <link key={alt.hrefLang} rel="alternate" hrefLang={alt.hrefLang} href={alt.href} />
      ))}

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content={BRAND} />
      <meta property="og:url" content={canonical} />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDesc} />
      <meta property="og:image" content={finalImage} />
      <meta property="og:locale" content={lang === 'en' ? 'en_US' : 'uk_UA'} />
      <meta property="og:locale:alternate" content={lang === 'en' ? 'uk_UA' : 'en_US'} />

      {/* Twitter */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={finalTitle} />
      <meta name="twitter:description" content={finalDesc} />
      <meta name="twitter:image" content={finalImage} />

      {/* Structured data — appended without overriding the global JSON-LD in index.html */}
      {jsonLd && (
        <script type="application/ld+json">
          {JSON.stringify(jsonLd)}
        </script>
      )}
    </Helmet>
  );
}
