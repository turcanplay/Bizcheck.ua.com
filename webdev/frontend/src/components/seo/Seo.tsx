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

const SITE = 'https://bizcheck.md';
const DEFAULT_IMAGE = `${SITE}/android-chrome-512x512.png`;
const DEFAULT_TITLE_RO = 'Bizcheck.md · Evaluarea riscurilor afacerii · Crowe';
const DEFAULT_TITLE_RU = 'Bizcheck.md · Оценка рисков бизнеса · Crowe';
const DEFAULT_DESC_RO = 'Bizcheck.md — platforma online de autoevaluare a riscurilor afacerii prin metodologia Crowe. Teste pe blocuri, raport detaliat PDF, șabloane juridice pentru IMM-uri din Moldova.';
const DEFAULT_DESC_RU = 'Bizcheck.md — онлайн-платформа самодиагностики рисков бизнеса по методологии Crowe. Тесты, детальный отчёт PDF, юридические шаблоны для МСБ Молдовы.';

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
  const finalTitle = title || (lang === 'ru' ? DEFAULT_TITLE_RU : DEFAULT_TITLE_RO);
  const finalDesc = description || (lang === 'ru' ? DEFAULT_DESC_RU : DEFAULT_DESC_RO);
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
      <link rel="alternate" hrefLang="ro" href={url} />
      <link rel="alternate" hrefLang="ru" href={url} />
      <link rel="alternate" hrefLang="x-default" href={url} />

      {/* Open Graph */}
      <meta property="og:type" content={ogType} />
      <meta property="og:site_name" content="Bizcheck.md" />
      <meta property="og:url" content={url} />
      <meta property="og:title" content={finalTitle} />
      <meta property="og:description" content={finalDesc} />
      <meta property="og:image" content={finalImage} />
      <meta property="og:locale" content={lang === 'ru' ? 'ru_RU' : 'ro_RO'} />
      <meta property="og:locale:alternate" content={lang === 'ru' ? 'ro_RO' : 'ru_RU'} />

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
