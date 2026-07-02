import { API_BASE } from '@/config/api';

export interface PublicTest {
  id: number;
  slug: string;
  name_ro: string;
  name_ru: string;
  description_ro: string;
  description_ru: string;
  is_paid: boolean;
  is_active: boolean;
  is_coming_soon: boolean;
  price: number | null;
  currency: string;
  category: string | null;
  features: string[];
  order_index?: number;
}

export interface PublicTemplate {
  id: number;
  slug: string;
  title_ro: string;
  title_ru: string;
  description_ro: string;
  description_ru: string;
  is_paid: boolean;
  is_active: boolean;
  is_coming_soon: boolean;
  price: number | null;
  currency: string;
  category: string | null;
  features: string[];
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json() as Promise<T>;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // Surface the server's machine code (e.g. "review_too_short") + HTTP status
    // so the caller can map it to a localized message.
    const err = new Error((data as { error?: string }).error || `HTTP ${res.status}`);
    (err as Error & { status?: number }).status = res.status;
    throw err;
  }
  return data as T;
}

export interface PublicTestimonial {
  id: number;
  name: string;
  role: string | null;
  quote_ro: string;
  quote_ru: string;
  rating: number;
  avatar_url: string | null;
  lang?: string;
  is_user_submitted?: boolean;
}

/** Payload for a review submitted by a public visitor. */
export interface TestimonialSubmission {
  name: string;
  role?: string | null;
  quote: string;
  rating: number;
  lang: string;
}

export interface PublicFaqItem {
  id: number;
  question_ro: string;
  question_ru: string;
  answer_ro: string;
  answer_ru: string;
}

/** Editable site settings: CTA targets (test slug, '' = none) + feature flags. */
export interface SiteSettings {
  cta_hero_test: string;
  cta_about_test: string;
  cta_final_test: string;
  cta_catalog_test: string;
  /** Feature flag, "1" | "0": is the post-test email delivery method active? */
  email_delivery_enabled: string;
}

export type CtaKey = 'cta_hero_test' | 'cta_about_test' | 'cta_final_test' | 'cta_catalog_test';

export const publicApi = {
  listTests: () => getJson<{ tests: PublicTest[] }>('/tests'),
  listTemplates: () => getJson<{ templates: PublicTemplate[] }>('/templates'),
  listTestimonials: () => getJson<{ testimonials: PublicTestimonial[] }>('/testimonials'),
  submitTestimonial: (data: TestimonialSubmission) =>
    postJson<{ testimonial: PublicTestimonial }>('/testimonials', data),
  listFaq: () => getJson<{ faq: PublicFaqItem[] }>('/faq'),
  getSiteSettings: () => getJson<{ settings: SiteSettings }>('/site-settings'),
};
