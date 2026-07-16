import { Helmet } from 'react-helmet-async';
import { useLang } from '@/context/LanguageContext';
import {
  SITE_URL,
  DEFAULT_IMAGE,
  DEFAULT_TITLE_UK,
  DEFAULT_TITLE_EN,
  DEFAULT_DESC_UK,
  DEFAULT_DESC_EN,
} from './siteMeta';

interface SeoProps {
  title?: string;
  description?: string;
  /** Path part of the canonical URL (e.g. "/sablon/contract"). Leading slash required. */
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
 *   <Seo title="..." description="..." path="/sablon/x" />
 *
 * Updates <title>, meta description, canonical, hreflang, OG, Twitter,
 * and (optionally) appends JSON-LD structured data.
 *
 * This module exports the component ONLY — constants live in ./siteMeta and
 * JSON-LD builders in ./schema, so Vite fast refresh keeps working here.
 */
export default function Seo({
  title,
  description,
  path = '/',
  image,
  jsonLd,
  noindex = false,
  ogType = 'website',
}: SeoProps) {
  const { lang } = useLang();
  const finalTitle = title || (lang === 'en' ? DEFAULT_TITLE_EN : DEFAULT_TITLE_UK);
  const finalDesc = description || (lang === 'en' ? DEFAULT_DESC_EN : DEFAULT_DESC_UK);
  const finalImage = image || DEFAULT_IMAGE;
  const url = `${SITE_URL}${path}`;

  return (
    <Helmet prioritizeSeoTags>
      <html lang={lang} />
      <title>{finalTitle}</title>
      <meta name="description" content={finalDesc} />
      <meta name="robots" content={noindex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large'} />
      <link rel="canonical" href={url} />

      {/* Hreflang — same SPA path for both languages */}
      <link rel="alternate" hrefLang="uk" href={url} />
      <link rel="alternate" hrefLang="en" href={url} />
      <link rel="alternate" hrefLang="x-default" href={url} />

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content="Bizcheck.md" />
      <meta property="og:url" content={url} />
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
