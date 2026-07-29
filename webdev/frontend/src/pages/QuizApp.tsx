import { lazy, Suspense, useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuiz } from '@/context/QuizContext';
import { useLang } from '@/context/LanguageContext';
import { pickLang } from '@/i18n/pickLang';
import Seo from '@/components/seo/Seo';
import Header from '@/components/layout/Header';
import StartPage from '@/pages/StartPage';
import QuizPage from '@/pages/QuizPage';

/**
 * The report (`phase === 'cta'`) is by far the heaviest thing in this route:
 * the eight report components, `data/blockExplanations` (~74 KB) and
 * `data/gdprExplanations` (~137 KB) of static legal copy, plus CtaPage.css +
 * ReportPage.css. Statically imported, all of that had to arrive before the
 * FIRST question could render, even though a visitor reaches it minutes later
 * (and never at all if they abandon the quiz).
 *
 * Split out, it is fetched in the background right after this route paints
 * (see the idle prefetch below), so the total bytes for someone who finishes
 * the quiz are unchanged — they just no longer sit on the critical path.
 */
const CtaPage = lazy(() => import('@/pages/CtaPage'));

/** Same look as the router-level fallback in App.tsx. */
const ReportFallback = () => (
  <div style={{
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    minHeight: '60vh', color: '#6B7280', fontSize: 14,
  }}>
    <span>…</span>
  </div>
);

export default function QuizApp() {
  const { phase, selectedTestSlug, selectTest, restartQuiz, submissionId, tests } = useQuiz();
  const { lang } = useLang();
  const { slug } = useParams<{ slug?: string }>();

  // Deep-link: /test/:slug pre-selects the test so the user skips Step 0.
  // Also re-selects the test after a "Refă testul" reset (which clears the slug).
  useEffect(() => {
    if (slug && slug !== selectedTestSlug) {
      selectTest(slug);
    }
  }, [slug, selectedTestSlug, selectTest]);

  // Entering a test via /test/:slug (a CTA click, the catalog, or a pasted
  // link) must begin at the company-profile questions in StartPage — sector,
  // employee count, age — not jump straight to the block questions. A stale
  // `phase: 'quiz'` left in sessionStorage from an earlier run would otherwise
  // skip that intro step.
  //
  // The ONLY case we keep a run going is a genuine page reload (accidental F5
  // mid-quiz) where a live run for this exact test exists — so progress isn't
  // lost. Every other arrival is a fresh start.
  const freshStartDone = useRef<string | null>(null);
  useEffect(() => {
    if (!slug || freshStartDone.current === slug) return;
    freshStartDone.current = slug;

    const navEntry = performance.getEntriesByType('navigation')[0] as
      PerformanceNavigationTiming | undefined;
    const isReload = navEntry?.type === 'reload';
    const hasLiveRun =
      selectedTestSlug === slug && phase === 'quiz' && submissionId != null;

    if (!(isReload && hasLiveRun) && phase !== 'start') {
      restartQuiz();    // wipe stale session (phase → 'start', slug → null)
      selectTest(slug); // re-apply the slug so StartPage opens at the profile step
    }
  }, [slug, selectedTestSlug, phase, submissionId, restartQuiz, selectTest]);

  // Warm the report chunk once the browser is idle, so the transition to the
  // CTA phase is instant even though the import is now dynamic. Skipped when
  // we are already on `cta` — React is fetching it right then anyway.
  useEffect(() => {
    if (phase === 'cta') return;
    const prefetch = () => { void import('@/pages/CtaPage'); };
    const ric = window.requestIdleCallback;
    if (typeof ric === 'function') {
      const id = ric(prefetch, { timeout: 4000 });
      return () => window.cancelIdleCallback?.(id);
    }
    const id = window.setTimeout(prefetch, 1500);
    return () => window.clearTimeout(id);
  }, [phase]);

  const test = tests.find(t => t.slug === selectedTestSlug);
  const testName = pickLang(test, 'name', lang);
  const seoTitle = testName
    ? `${testName} · Bizcheck.ua.com · Crowe`
    : (lang === 'en' ? 'Test Bizcheck.ua.com · Crowe' : 'Тест Bizcheck.ua.com · Crowe');
  const seoDesc = testName
    ? (lang === 'en'
        ? `Take the "${testName}" test on Bizcheck.ua.com and get a detailed report on your business risks.`
        : `Пройдіть тест «${testName}» на Bizcheck.ua.com і отримайте детальний звіт про ризики вашого бізнесу.`)
    : undefined;

  // Quiz pages are dynamic — index but with light priority; CTA stage is noindex.
  const noindex = phase === 'cta';

  return (
    <div className="app">
      <Seo
        title={seoTitle}
        description={seoDesc}
        path={slug ? `/test/${slug}` : '/test'}
        noindex={noindex}
      />
      <Header />
      {phase === 'start' && <StartPage />}
      {phase === 'quiz' && <QuizPage />}
      {phase === 'cta' && (
        <Suspense fallback={<ReportFallback />}>
          <CtaPage />
        </Suspense>
      )}
    </div>
  );
}
