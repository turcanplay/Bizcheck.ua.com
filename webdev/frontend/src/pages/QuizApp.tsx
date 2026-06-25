import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { useQuiz } from '@/context/QuizContext';
import { useLang } from '@/context/LanguageContext';
import Seo from '@/components/seo/Seo';
import Header from '@/components/layout/Header';
import StartPage from '@/pages/StartPage';
import QuizPage from '@/pages/QuizPage';
import CtaPage from '@/pages/CtaPage';

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

  const test = tests.find(t => t.slug === selectedTestSlug);
  const testName = test ? (lang === 'en' ? test.name_en : test.name_uk) : '';
  const seoTitle = testName
    ? `${testName} · Bizcheck.md · Crowe`
    : (lang === 'en' ? 'Bizcheck.md Test · Crowe' : 'Тест Bizcheck.md · Crowe');
  const seoDesc = testName
    ? (lang === 'en'
        ? `Take the "${testName}" test on Bizcheck.md and get a detailed report on your business risks.`
        : `Пройдіть тест «${testName}» на Bizcheck.md та отримайте детальний звіт про ризики вашого бізнесу.`)
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
      {phase === 'cta' && <CtaPage />}
    </div>
  );
}
