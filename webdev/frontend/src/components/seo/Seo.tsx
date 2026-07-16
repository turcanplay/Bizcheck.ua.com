import { Helmet } from 'react-helmet-async';
import { useLang } from '@/context/LanguageContext';

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

/** Canonical origin of the public site. Single source of truth — import as
 *  `SITE_URL` anywhere a full absolute URL is needed (JSON-LD, OG images).
 *  Not build-time env: this frontend has no `args:` block in docker-compose and
 *  its VITE_* vars are never passed at build time, so a literal is the only
 *  thing that actually ships. */
export const SITE_URL = 'https://bizcheck.ua.com';
const SITE = SITE_URL;
const DEFAULT_IMAGE = `${SITE}/android-chrome-512x512.png`;
const DEFAULT_TITLE_UK = 'Bizcheck.md · Оцінка ризиків бізнесу · Crowe';
const DEFAULT_TITLE_EN = 'Bizcheck.md · Business Risk Assessment · Crowe';
const DEFAULT_DESC_UK = 'Bizcheck.md — онлайн-платформа самодіагностики ризиків бізнесу за методологією Crowe. Тести за блоками, детальний звіт PDF, юридичні шаблони для МСБ.';
const DEFAULT_DESC_EN = 'Bizcheck.md is an online platform for self-diagnosing business risks based on the Crowe methodology. Block-based tests, a detailed PDF report, and legal templates for SMEs.';

/**
 * Per-page SEO meta. Drop into the top of any page component:
 *
 *   <Seo title="..." description="..." path="/sablon/x" />
 *
 * Updates <title>, meta description, canonical, hreflang, OG, Twitter,
 * and (optionally) appends JSON-LD structured data.
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
  const url = `${SITE}${path}`;

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

// ── JSON-LD builders ──────────────────────────────────────────────

export function articleSchema(opts: {
  title: string;
  description: string;
  url: string;
  image?: string;
  datePublished?: string;
  dateModified?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: opts.title,
    description: opts.description,
    url: opts.url,
    image: opts.image || DEFAULT_IMAGE,
    datePublished: opts.datePublished,
    dateModified: opts.dateModified || opts.datePublished,
    author: { '@type': 'Organization', name: 'Crowe Turcan Mikhailenko' },
    publisher: {
      '@type': 'Organization',
      name: 'Crowe Turcan Mikhailenko',
      logo: { '@type': 'ImageObject', url: `${SITE}/android-chrome-512x512.png` },
    },
  };
}

export function breadcrumbSchema(items: { name: string; path: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.name,
      item: `${SITE}${it.path}`,
    })),
  };
}

export function faqSchema(faqs: { question: string; answer: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map(f => ({
      '@type': 'Question',
      name: f.question,
      acceptedAnswer: { '@type': 'Answer', text: f.answer },
    })),
  };
}

export function productSchema(opts: {
  name: string;
  description: string;
  url: string;
  image?: string;
  price?: number | null;
  currency?: string;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: opts.name,
    description: opts.description,
    url: opts.url,
    image: opts.image || DEFAULT_IMAGE,
    brand: { '@type': 'Brand', name: 'Bizcheck.md · Crowe' },
    offers: opts.price != null
      ? {
          '@type': 'Offer',
          price: opts.price,
          priceCurrency: opts.currency || 'MDL',
          availability: 'https://schema.org/InStock',
          url: opts.url,
        }
      : undefined,
  };
}
