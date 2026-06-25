import { API_BASE } from '@/config/api';
import type { SiteSettings } from '@/api/public';

export type { SiteSettings };

/**
 * Admin auth model:
 *   - The JWT lives in a httpOnly cookie set by /admin/login. JS cannot read
 *     it, so a stored XSS payload cannot exfiltrate the session.
 *   - The CSRF token lives in a separate non-httpOnly cookie (`admin_csrf`)
 *     and is also returned in /admin/login's body. We echo it as the
 *     X-CSRF-Token header on every mutating request (POST/PATCH/PUT/DELETE).
 *   - Server validates header == cookie (double-submit). Without a valid
 *     pair the request is rejected, so even cross-site forgery attempts
 *     cannot mutate state.
 */

const CSRF_COOKIE = 'admin_csrf';
const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

function readCookie(name: string): string | null {
  const prefix = `${name}=`;
  for (const part of document.cookie.split(';')) {
    const trimmed = part.trim();
    if (trimmed.startsWith(prefix)) return decodeURIComponent(trimmed.slice(prefix.length));
  }
  return null;
}

export function readCsrfToken(): string | null {
  return readCookie(CSRF_COOKIE);
}

/** Best-effort: did the user appear to log in successfully?
 *  The actual auth source of truth is the httpOnly session cookie which JS
 *  cannot read — so the SPA verifies via GET /admin/session on mount. The
 *  presence of the CSRF cookie is a fast pre-check.
 */
export function hasAdminSessionHint(): boolean {
  return !!readCsrfToken();
}

/** Fetch wrapper for admin endpoints that return non-JSON (PDFs, ZIPs, XLSX).
 *  Sends the session cookie automatically and adds the CSRF header for
 *  unsafe methods. Use this instead of bare fetch() for any admin call.
 */
export function adminFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const url = input.startsWith('http') ? input : `${API_BASE}${input}`;
  const method = (init.method || 'GET').toUpperCase();
  const headers: Record<string, string> = { ...(init.headers as Record<string, string> | undefined) };
  if (!SAFE_METHODS.has(method)) {
    const csrf = readCsrfToken();
    if (csrf) headers['X-CSRF-Token'] = csrf;
  }
  return fetch(url, { ...init, method, headers, credentials: 'include' });
}

async function request<T>(path: string, opts: RequestInit = {}): Promise<T> {
  const method = (opts.method || 'GET').toUpperCase();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(opts.headers as Record<string, string> | undefined),
  };
  if (!SAFE_METHODS.has(method)) {
    const csrf = readCsrfToken();
    if (csrf) headers['X-CSRF-Token'] = csrf;
  }
  const res = await fetch(`${API_BASE}${path}`, {
    ...opts,
    method,
    headers,
    credentials: 'include',
  });
  if (res.status === 401) {
    throw new Error('Unauthorized');
  }
  if (!res.ok) {
    let msg = `HTTP ${res.status}`;
    try { const body = await res.json(); msg = body.error || msg; } catch { /* ignore */ }
    throw new Error(msg);
  }
  if (res.status === 204) return null as T;
  return res.json() as Promise<T>;
}

export const adminApi = {
  login: (username: string, password: string) =>
    request<{ ok: boolean; csrf_token: string }>('/admin/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),
  session: () => request<{ ok: boolean; csrf_token: string }>('/admin/session'),
  logout: () => request<{ ok: boolean }>('/admin/logout', { method: 'POST' }),
  stats: () => request<{
    total_users: number; total_blocks: number; total_questions: number;
    total_results: number; total_submissions: number;
    avg_per_block: Array<{ block_id: number; title: string; avg_score: number; attempts: number }>;
  }>('/admin/stats'),
  listTests: () => request<{ tests: AdminTest[] }>('/admin/tests'),
  createTest: (data: AdminTestInput) =>
    request<{ test: AdminTest }>('/admin/tests', { method: 'POST', body: JSON.stringify(data) }),
  updateTest: (id: number, data: Partial<AdminTestInput>) =>
    request<{ test: AdminTest }>(`/admin/tests/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTest: (id: number) =>
    request<{ message: string }>(`/admin/tests/${id}`, { method: 'DELETE' }),
  reorderTests: (items: Array<{ id: number; order_index: number }>) =>
    request<{ message: string; count: number }>('/admin/tests/reorder', {
      method: 'POST', body: JSON.stringify({ items }),
    }),
  listSubmissions: (testId?: number) =>
    request<{ submissions: AdminSubmission[]; count: number }>(
      `/submissions${testId ? `?test_id=${testId}` : ''}`,
    ),
  deleteSubmission: (id: number) =>
    request<{ message: string }>(`/submissions/${id}`, { method: 'DELETE' }),
  deleteAllSubmissions: () =>
    request<{ message: string }>(`/submissions`, { method: 'DELETE' }),
  listBlocks: (testId?: number) =>
    request<{ blocks: AdminBlock[] }>(`/blocks${testId ? `?test_id=${testId}` : ''}`),
  createBlock: (data: { test_id: number; title_ro: string; title_ru: string; order_index?: number }) =>
    request<{ block: AdminBlock }>('/blocks', { method: 'POST', body: JSON.stringify(data) }),
  updateBlock: (id: number, data: Partial<{ title_ro: string; title_ru: string; order_index: number }>) =>
    request<{ block: AdminBlock }>(`/blocks/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteBlock: (id: number) =>
    request<{ message: string }>(`/blocks/${id}`, { method: 'DELETE' }),

  listQuestions: (testId?: number) =>
    request<{ questions: AdminQuestion[] }>(`/questions${testId ? `?test_id=${testId}` : ''}`),
  createQuestion: (data: AdminQuestionInput) =>
    request<{ question: AdminQuestion }>('/questions', { method: 'POST', body: JSON.stringify(data) }),
  updateQuestion: (id: number, data: Partial<AdminQuestionInput>) =>
    request<{ question: AdminQuestion }>(`/questions/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteQuestion: (id: number) =>
    request<{ message: string }>(`/questions/${id}`, { method: 'DELETE' }),
  reorderQuestions: (items: Array<{ id: number; block_id: number; order_index: number; parent_question_id: number | null }>) =>
    request<{ message: string; count: number }>('/questions/reorder', {
      method: 'PUT',
      body: JSON.stringify({ items }),
    }),

  listUsers: () =>
    request<{ users: AdminUser[] }>('/admin/users'),

  exportSubmissionsExcelUrl: () =>
    `${API_BASE}/submissions/export/excel`,

  listTemplates: () =>
    request<{ templates: AdminTemplate[] }>('/admin/templates'),
  getTemplate: (id: number) =>
    request<{ template: AdminTemplate & { files: AdminTemplateFile[] } }>(`/admin/templates/${id}`),
  createTemplate: (data: AdminTemplateInput) =>
    request<{ template: AdminTemplate }>('/admin/templates', { method: 'POST', body: JSON.stringify(data) }),
  updateTemplate: (id: number, data: Partial<AdminTemplateInput>) =>
    request<{ template: AdminTemplate }>(`/admin/templates/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTemplate: (id: number) =>
    request<{ message: string }>(`/admin/templates/${id}`, { method: 'DELETE' }),
  uploadTemplateFile: (templateId: number, filename: string, pdfBase64: string) =>
    request<{ file: AdminTemplateFile }>(`/admin/templates/${templateId}/files`, {
      method: 'POST',
      body: JSON.stringify({ filename, pdf: pdfBase64 }),
    }),
  deleteTemplateFile: (templateId: number, fileId: number) =>
    request<{ message: string }>(`/admin/templates/${templateId}/files/${fileId}`, { method: 'DELETE' }),
  templateFileDownloadUrl: (templateId: number, fileId: number) =>
    `${API_BASE}/admin/templates/${templateId}/files/${fileId}/download`,
  templateZipDownloadUrl: (templateId: number) =>
    `${API_BASE}/admin/templates/${templateId}/download`,

  listTestimonials: () =>
    request<{ testimonials: AdminTestimonial[] }>('/admin/testimonials'),
  createTestimonial: (data: AdminTestimonialInput) =>
    request<{ testimonial: AdminTestimonial }>('/admin/testimonials', { method: 'POST', body: JSON.stringify(data) }),
  updateTestimonial: (id: number, data: Partial<AdminTestimonialInput>) =>
    request<{ testimonial: AdminTestimonial }>(`/admin/testimonials/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTestimonial: (id: number) =>
    request<{ message: string }>(`/admin/testimonials/${id}`, { method: 'DELETE' }),

  listFaq: () =>
    request<{ faq: AdminFaqItem[] }>('/admin/faq'),
  createFaq: (data: AdminFaqInput) =>
    request<{ faq: AdminFaqItem }>('/admin/faq', { method: 'POST', body: JSON.stringify(data) }),
  updateFaq: (id: number, data: Partial<AdminFaqInput>) =>
    request<{ faq: AdminFaqItem }>(`/admin/faq/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteFaq: (id: number) =>
    request<{ message: string }>(`/admin/faq/${id}`, { method: 'DELETE' }),

  getSiteSettings: () =>
    request<{ settings: SiteSettings }>('/admin/site-settings'),
  updateSiteSettings: (data: Partial<SiteSettings>) =>
    request<{ settings: SiteSettings }>('/admin/site-settings', {
      method: 'PUT',
      body: JSON.stringify(data),
    }),
};

export type ReportType = 'standard' | 'premium' | 'bizcheck';

export interface AdminTest {
  id: number;
  slug: string;
  name_ro: string;
  name_ru: string;
  description_ro: string;
  description_ru: string;
  is_active: boolean;
  is_coming_soon: boolean;
  is_paid: boolean;
  price: number | null;
  currency: string;
  category: string | null;
  features: string[];
  report_type: ReportType;
  order_index: number;
  scoring_zones: { safe: number; developing: number; warn: number; risk?: number };
  zone_recommendations: unknown | null;
  created_at: string;
}

export interface AdminTestInput {
  slug?: string;
  name_ro: string;
  name_ru?: string;
  description_ro?: string;
  description_ru?: string;
  is_active?: boolean;
  is_coming_soon?: boolean;
  is_paid?: boolean;
  price?: number | null;
  currency?: string;
  category?: string | null;
  features?: string[];
  report_type?: ReportType;
  order_index?: number;
  scoring_zones?: { safe: number; developing: number; warn: number; risk?: number };
  zone_recommendations?: unknown;
}

export interface AdminSubmission {
  id: number;
  test_id: number | null;
  first_name: string;
  last_name: string | null;
  email: string | null;
  phone: string | null;
  sector: string | null;
  total_score: number | null;
  status: string;
  created_at: string;
  language: string;
  tg_chat_id: number | null;
  tg_username: string | null;
  tg_first_name: string | null;
  tg_last_name: string | null;
  has_pdf?: boolean;
}

export interface AdminBlock {
  id: number;
  test_id: number;
  title_ro: string;
  title_ru: string;
  order_index: number;
  created_at: string;
}

export interface AdminAnswer {
  id: number;
  question_id: number;
  text_ro: string;
  text_ru: string;
  score: number;
  next_question_id: number | null;
  explanation_ro?: string | null;
  explanation_ru?: string | null;
  risk_ro?: string | null;
  risk_ru?: string | null;
}

export interface AdminQuestion {
  id: number;
  block_id: number;
  parent_question_id: number | null;
  text_ro: string;
  text_ru: string;
  note_ro: string | null;
  note_ru: string | null;
  order_index: number;
  answers: AdminAnswer[];
  created_at: string;
}

export interface AdminAnswerInput {
  text_ro: string;
  text_ru: string;
  score: number;
  next_question_id?: number | null;
}

export interface AdminQuestionInput {
  block_id: number;
  text_ro: string;
  text_ru: string;
  note_ro?: string | null;
  note_ru?: string | null;
  order_index?: number;
  parent_question_id?: number | null;
  answers: AdminAnswerInput[];
}

export interface AdminTemplate {
  id: number;
  slug: string;
  title_ro: string;
  title_ru: string;
  description_ro: string;
  description_ru: string;
  is_active: boolean;
  is_coming_soon: boolean;
  is_paid: boolean;
  price: number | null;
  currency: string;
  category: string | null;
  features: string[];
  created_at: string;
  files?: AdminTemplateFile[];
}

export interface AdminTemplateInput {
  slug?: string;
  title_ro: string;
  title_ru?: string;
  description_ro?: string;
  description_ru?: string;
  is_active?: boolean;
  is_coming_soon?: boolean;
  is_paid?: boolean;
  price?: number | null;
  currency?: string;
  category?: string | null;
  features?: string[];
}

export interface AdminTemplateFile {
  id: number;
  template_id: number;
  filename: string;
  file_size: number;
  order_index: number;
  created_at: string;
}

export interface AdminTestimonial {
  id: number;
  name: string;
  role: string | null;
  quote_ro: string;
  quote_ru: string;
  rating: number;
  avatar_url: string | null;
  order_index: number;
  is_active: boolean;
  created_at: string;
  lang?: string;
  is_user_submitted?: boolean;
}

export interface AdminTestimonialInput {
  name: string;
  role?: string | null;
  quote_ro?: string;
  quote_ru?: string;
  rating?: number;
  avatar_url?: string | null;
  order_index?: number;
  is_active?: boolean;
  lang?: string;
}

export interface AdminFaqItem {
  id: number;
  question_ro: string;
  question_ru: string;
  answer_ro: string;
  answer_ru: string;
  order_index: number;
  is_active: boolean;
  created_at: string;
}

export interface AdminFaqInput {
  question_ro?: string;
  question_ru?: string;
  answer_ro?: string;
  answer_ru?: string;
  order_index?: number;
  is_active?: boolean;
}

export interface AdminUser {
  first_name: string | null;
  last_name: string | null;
  phone: string | null;
  tg_chat_id: number | null;
  tg_username: string | null;
  completed: boolean;
  sector: string | null;
  created_at: string;
}
