/**
 * Backwards-compatible re-export.
 *
 * The constants themselves moved to `@/config/siteMeta` so non-SEO modules
 * (landing copy, PDF builders, sitemap scripts) can import them without
 * reaching into `components/`. Keep this file so the existing `./siteMeta`
 * imports in Seo.tsx / schema.ts keep working.
 */
export * from '@/config/siteMeta';
