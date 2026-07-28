/**
 * JSON-LD builders. Pass the result to <Seo jsonLd={...} />.
 *
 * Kept out of Seo.tsx so that module can stay component-only (Vite fast refresh).
 */
import { SITE_URL, DEFAULT_IMAGE, ORG_NAME, BRAND, CURRENCY } from './siteMeta';

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
    author: { '@type': 'Organization', name: ORG_NAME },
    publisher: {
      '@type': 'Organization',
      name: ORG_NAME,
      // Google wants a legible organisation logo, not the app icon:
      // public/logo_email.png is 1081x300, dark wordmark on transparent.
      // Must stay identical to the Organization "logo" node in index.html.
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/logo_email.png`,
        width: 1081,
        height: 300,
      },
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
      item: `${SITE_URL}${it.path}`,
    })),
  };
}

/**
 * FAQPage rich-result payload. Google requires every Question to carry a
 * non-empty acceptedAnswer, so callers must filter out half-filled rows before
 * passing them in (an empty answer invalidates the whole node).
 */
export function faqSchema(
  faqs: { question: string; answer: string }[],
  lang?: string,
) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    ...(lang ? { inLanguage: lang } : {}),
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
    brand: { '@type': 'Brand', name: `${BRAND} · Crowe` },
    offers: opts.price != null
      ? {
          '@type': 'Offer',
          price: opts.price,
          priceCurrency: opts.currency || CURRENCY,
          availability: 'https://schema.org/InStock',
          url: opts.url,
        }
      : undefined,
  };
}
