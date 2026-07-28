import { lazy, Suspense, Component, type ReactNode } from 'react';
import { BrowserRouter, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { LanguageProvider } from '@/context/LanguageContext';
import { QuizProvider } from '@/context/QuizContext';
import { CookieConsentProvider } from '@/context/CookieConsentContext';
import CookieBanner from '@/components/ui/CookieBanner';
import LangRedirect, { LegacyRedirect } from '@/components/LangRedirect';
import LandingPage from '@/pages/landing/LandingPage';
import NotFoundPage from '@/pages/NotFoundPage';
import { isLang } from '@/i18n/routing';
import './App.css';

// Quiz is essential for the primary flow — keep eagerly loaded.
const QuizApp = lazy(() => import('@/pages/QuizApp'));

// Catalog / checkout — split out of initial bundle (most users start on landing).
const TemplateDetailPage = lazy(() => import('@/pages/catalog/TemplateDetailPage'));
const CheckoutPage = lazy(() => import('@/pages/checkout/CheckoutPage'));
const PrivacyPage = lazy(() => import('@/pages/PrivacyPage'));

// Admin — never loaded for public users. Shed ~40-50% of the bundle.
const AdminLogin = lazy(() => import('@/pages/admin/AdminLogin'));
const AdminLayout = lazy(() => import('@/pages/admin/AdminLayout'));
const AdminDashboard = lazy(() => import('@/pages/admin/AdminDashboard'));
const AdminTests = lazy(() => import('@/pages/admin/AdminTests'));
const AdminTestDetail = lazy(() => import('@/pages/admin/AdminTestDetail'));
const AdminSubmissions = lazy(() => import('@/pages/admin/AdminSubmissions'));
const AdminUsers = lazy(() => import('@/pages/admin/AdminUsers'));
const AdminTemplates = lazy(() => import('@/pages/admin/AdminTemplates'));
const AdminTemplateDetail = lazy(() => import('@/pages/admin/AdminTemplateDetail'));
const AdminFaq = lazy(() => import('@/pages/admin/AdminFaq'));
const AdminTestimonials = lazy(() => import('@/pages/admin/AdminTestimonials'));
const AdminPageSettings = lazy(() => import('@/pages/admin/AdminPageSettings'));
const AdminFeedback = lazy(() => import('@/pages/admin/AdminFeedback'));

const QuizShell = ({ children }: { children: React.ReactNode }) => (
  <QuizProvider>{children}</QuizProvider>
);

/**
 * Guard for the `/:lang/*` subtree.
 *
 * A single `:lang` param (instead of one hard-coded `<Route path="uk">` per
 * language) is what lets the language toggle keep component state: `/uk/test/x`
 * and `/en/test/x` match the SAME route objects, so React Router re-renders
 * rather than remounts, and an in-progress quiz survives the switch.
 *
 * The price is that `:lang` also matches junk first segments (`/foo`), so we
 * validate here and render a real 404 instead of a soft one.
 */
function LangGate() {
  const { lang } = useParams<{ lang: string }>();
  if (!isLang(lang)) return <NotFoundPage />;
  return <Outlet />;
}

const RouteFallback = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '60vh', color: '#6B7280', fontSize: 14,
  }}>
    <span>…</span>
  </div>
);

/**
 * Recovers from "white page on navigation" after a new deploy.
 *
 * When the SPA was loaded before a deploy, its lazy import() calls reference the
 * OLD hashed chunk filenames, which no longer exist on the server → the dynamic
 * import rejects and React renders nothing. We detect that specific error and
 * reload the page ONCE (throttled to avoid loops) so the browser fetches the
 * fresh index.html + chunk names.
 */
function isChunkLoadError(error: unknown): boolean {
  const msg = String((error as { message?: string })?.message ?? error ?? '');
  return /loading (?:css )?chunk|dynamically imported module|importing a module script failed|failed to (?:fetch dynamically|import)/i.test(msg);
}

class ChunkReloadBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    if (isChunkLoadError(error)) {
      const KEY = 'bizcheck_chunk_reload_ts';
      const last = Number(sessionStorage.getItem(KEY) || 0);
      // Reload at most once per 10s — if a reload doesn't fix it, show the
      // fallback UI instead of looping forever.
      if (Date.now() - last > 10_000) {
        sessionStorage.setItem(KEY, String(Date.now()));
        window.location.reload();
      }
    }
  }

  render() {
    if (this.state.failed) {
      return (
        <div style={{
          display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center',
          justifyContent: 'center', minHeight: '60vh', color: '#011E41', fontSize: 15,
          fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif", textAlign: 'center', padding: 24,
        }}>
          <span>Застосунок оновлено. Перезавантажуємо сторінку…</span>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 22px', borderRadius: 999, border: 'none', cursor: 'pointer',
              background: '#F5A800', color: '#011E41', fontWeight: 700, fontSize: 14,
            }}
          >
            Перезавантажити
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

/** Public-only chrome — banner skipped on admin routes (it would distract
 *  while moderating, and admins consent at hire time, not via cookie banner). */
function PublicChrome() {
  const { pathname } = useLocation();
  if (pathname.startsWith('/admin_bizcheck_md_crowe')) return null;
  return <CookieBanner />;
}

export default function App() {
  return (
    <HelmetProvider>
    {/* The router wraps LanguageProvider, not the other way round: the language
        is read off the URL, so the provider needs router context. */}
    <BrowserRouter>
    <LanguageProvider>
    <CookieConsentProvider>
      <ChunkReloadBoundary>
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Admin — outside quiz providers */}
          <Route path="/admin_bizcheck_md_crowe/login" element={<AdminLogin />} />
          <Route path="/admin_bizcheck_md_crowe" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="tests" element={<AdminTests />} />
            <Route path="tests/:slug" element={<AdminTestDetail />} />
            <Route path="submissions" element={<AdminSubmissions />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="templates" element={<AdminTemplates />} />
            <Route path="templates/:id" element={<AdminTemplateDetail />} />
            <Route path="testimonials" element={<AdminTestimonials />} />
            <Route path="feedback" element={<AdminFeedback />} />
            <Route path="faq" element={<AdminFaq />} />
            <Route path="page-settings" element={<AdminPageSettings />} />
          </Route>

          {/* `/` carries no language → bounce to the visitor's language.
              nginx should also 301 this server-side (see deployment notes). */}
          <Route path="/" element={<LangRedirect />} />

          {/* Pre-i18n URLs. Kept forever as redirects: they are in the wild
              (shared links, the old sitemap, Telegram messages) and dropping
              them would turn live inbound traffic into 404s. All land on `uk`,
              which is what those URLs always served. */}
          <Route path="/test/:slug"       element={<LegacyRedirect build={p => `/uk/test/${p.slug}`} />} />
          <Route path="/sablon/:slug"     element={<LegacyRedirect build={p => `/uk/templates/${p.slug}`} />} />
          <Route path="/confidentialitate" element={<LegacyRedirect build={() => '/uk/privacy'} />} />
          {/* /termeni never had a page of its own — the footer link pointed at
              a route that fell through to the landing. Privacy carries the
              terms text, so send it there instead of 404-ing. */}
          <Route path="/termeni"          element={<LegacyRedirect build={() => '/uk/privacy'} />} />
          <Route path="/plata/:kind/:slug" element={
            <LegacyRedirect build={p => `/uk/checkout/${p.kind === 'sablon' ? 'template' : 'test'}/${p.slug}`} />
          } />

          {/* Localized public tree — /uk/** and /en/** */}
          <Route path=":lang" element={<LangGate />}>
            <Route index element={<LandingPage />} />
            <Route path="templates/:slug" element={<TemplateDetailPage />} />

            {/* Privacy / consent (placeholder — Crowe Legal fills content later) */}
            <Route path="privacy" element={<PrivacyPage />} />

            {/* Checkout (placeholder — MAIB later) */}
            <Route path="checkout/:kind/:slug" element={<CheckoutPage />} />

            {/* Quiz SPA (needs providers) */}
            <Route path="test/:slug" element={<QuizShell><QuizApp /></QuizShell>} />

            <Route path="*" element={<NotFoundPage />} />
          </Route>

          {/* Anything with no first segment we recognise (`/`-rooted files are
              served by nginx and never reach here). Real 404, not the landing —
              the old catch-all was a soft-404 farm for Google. */}
          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
      </ChunkReloadBoundary>
      <PublicChrome />
    </CookieConsentProvider>
    </LanguageProvider>
    </BrowserRouter>
    </HelmetProvider>
  );
}
