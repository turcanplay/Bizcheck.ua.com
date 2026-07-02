import { lazy, Suspense, Component, type ReactNode } from 'react';
import { BrowserRouter, Route, Routes, useLocation } from 'react-router-dom';
import { HelmetProvider } from 'react-helmet-async';
import { LanguageProvider } from '@/context/LanguageContext';
import { QuizProvider } from '@/context/QuizContext';
import { CookieConsentProvider } from '@/context/CookieConsentContext';
import CookieBanner from '@/components/ui/CookieBanner';
import LandingPage from '@/pages/landing/LandingPage';
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
          justifyContent: 'center', minHeight: '60vh', color: '#0F172A', fontSize: 15,
          fontFamily: 'Inter, system-ui, sans-serif', textAlign: 'center', padding: 24,
        }}>
          <span>S-a actualizat aplicația. Reîncărcăm pagina…</span>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 22px', borderRadius: 999, border: 'none', cursor: 'pointer',
              background: '#E03E2D', color: '#fff', fontWeight: 700, fontSize: 14,
            }}
          >
            Reîncarcă
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
    <LanguageProvider>
    <CookieConsentProvider>
    <BrowserRouter>
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

          {/* Public landing + catalog */}
          <Route path="/" element={<LandingPage />} />
          <Route path="/sablon/:slug" element={<TemplateDetailPage />} />

          {/* Privacy / consent (placeholder — Crowe Legal fills content later) */}
          <Route path="/confidentialitate" element={<PrivacyPage />} />

          {/* Checkout (placeholder — MAIB later) */}
          <Route path="/plata/:kind/:slug" element={<CheckoutPage />} />

          {/* Quiz SPA (needs providers) */}
          <Route path="/test/:slug" element={<QuizShell><QuizApp /></QuizShell>} />

          {/* Fallback → landing */}
          <Route path="*" element={<LandingPage />} />
        </Routes>
      </Suspense>
      </ChunkReloadBoundary>
      <PublicChrome />
    </BrowserRouter>
    </CookieConsentProvider>
    </LanguageProvider>
    </HelmetProvider>
  );
}
