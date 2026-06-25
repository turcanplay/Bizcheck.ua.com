import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useQuiz } from '@/context/QuizContext';
import { useLang } from '@/context/LanguageContext';
import './StartPage.css';

export default function StartPage() {
  const {
    sectors, sizes, ages, revenues, setUserInfo, setPhase, blocks, loading,
    createSubmission, updateSubmission,
    tests, selectedTestSlug, selectTest,
  } = useQuiz();
  const { t, lang, setLang } = useLang();
  const location = useLocation();

  // Deep-link `/test/:slug` pre-selects the test and hides Step 0 entirely.
  const fromDeepLink = location.pathname.startsWith('/test/');

  // Step 0 picks the test; deep-link or restored slug => skip to Step 1.
  // Personal info is now collected on the CTA page, so Step 1 is skipped.
  // Remaining steps: 1 = sector, 2 = size, 3 = age, 4 = sales revenue.
  const [step, setStep] = useState<0 | 1 | 2 | 3 | 4>(fromDeepLink || selectedTestSlug ? 1 : 0);

  // If the test slug becomes available after mount (context async), advance.
  useEffect(() => {
    if (selectedTestSlug && step === 0) setStep(1);
  }, [selectedTestSlug, step]);

  /* Company info (4 sub-steps) */
  const [sectorList, setSectorList] = useState<string[]>([]);
  const [size, setSize] = useState('');
  const [age, setAge] = useState('');
  const [revenue, setRevenue] = useState('');

  function toggleSector(s: string) {
    setSectorList(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  const [warn, setWarn] = useState('');

  const totalQuestions = blocks.reduce((sum, b) => sum + b.questions.length, 0);

  function showWarn(key: string) {
    setWarn(key);
    setTimeout(() => setWarn(''), 3000);
  }

  function handlePickTest(slug: string) {
    selectTest(slug);
    setStep(1);
  }

  function handleNextSector() {
    if (sectorList.length === 0) { showWarn('formWarnCompany'); return; }
    setStep(2);
  }
  function handleNextSize() {
    if (!size) { showWarn('formWarnCompany'); return; }
    setStep(3);
  }
  function handleNextAge() {
    if (!age) { showWarn('formWarnCompany'); return; }
    setStep(4);
  }
  async function handleStart() {
    if (!revenue) { showWarn('formWarnCompany'); return; }
    const sector = sectorList.join(', ');
    setUserInfo({ firstName: '', lastName: '', email: '', phone: '', consent: false, sector, size, age, revenue });

    // Create anonymous submission now — contact info collected on CTA page.
    const subId = await createSubmission();
    if (!subId) {
      showWarn('formWarnServer');
      return;
    }
    updateSubmission({ sector, company_size: size, company_age: age, company_revenue: revenue, status: 'in_progress' });
    setPhase('quiz');
  }

  return (
    <div className="start-page">
      {/* Hero */}
      <section className="start-hero">
        <div className="start-hero__inner">
          <span className="start-hero__eyebrow">
            <span className="start-hero__eyebrow-dot" aria-hidden />
            {t('heroEyebrow')}
          </span>
          <h1 className="start-hero__title">
            {t('heroTitle1')}<br />
            <span className="start-hero__title-accent">{t('heroTitle2')}</span>
          </h1>
          <p className="start-hero__desc">
            {t('heroDesc', { blocks: blocks.length })}
          </p>
          <div className="start-hero__meta">
            <div className="start-hero__meta-item">
              <div className="start-hero__meta-num">{blocks.length}</div>
              <div className="start-hero__meta-label">{t('metaBlocks')}</div>
            </div>
            <div className="start-hero__meta-item">
              <div className="start-hero__meta-num">{totalQuestions}</div>
              <div className="start-hero__meta-label">{t('metaQuestions')}</div>
            </div>
            <div className="start-hero__meta-item">
              <div className="start-hero__meta-num">~8</div>
              <div className="start-hero__meta-label">{t('metaMinutes')}</div>
            </div>
          </div>
        </div>
      </section>

      {/* Form */}
      <div className="start-form">
        <div className="start-form__inner">

          {/* Loading / no questions notice */}
          {loading && (
            <div className="start-form__notice">{t('loading')}</div>
          )}
          {!loading && blocks.length === 0 && (
            <div className="start-form__notice start-form__notice--warn">{t('noQuestions')}</div>
          )}

          {/* ——— Step 0: Test picker ——— */}
          {step === 0 && (
            <>
              <div className="start-form__section-hd start-form__section-hd--step1">
                <div className="start-form__section-top">
                  <span className="start-form__step">{t('step0')}</span>
                  <div className="start-form__lang">
                    <button
                      className={`start-form__lang-btn ${lang === 'uk' ? 'start-form__lang-btn--active' : ''}`}
                      onClick={() => setLang('uk')}
                    >
                      UK
                    </button>
                    <button
                      className={`start-form__lang-btn ${lang === 'en' ? 'start-form__lang-btn--active' : ''}`}
                      onClick={() => setLang('en')}
                    >
                      EN
                    </button>
                  </div>
                </div>
                <span className="start-form__step-title">{t('step0Title')}</span>
                <div className="start-form__line" />
              </div>

              <p className="start-form__hint">{t('step0Hint')}</p>

              <div className="start-form__test-grid">
                {tests.map(tt => {
                  const name = lang === 'uk' ? tt.name_uk : tt.name_en;
                  const desc = lang === 'uk' ? tt.description_uk : tt.description_en;
                  return (
                    <button
                      key={tt.slug}
                      className={`start-form__test-card ${selectedTestSlug === tt.slug ? 'selected' : ''}`}
                      onClick={() => handlePickTest(tt.slug)}
                    >
                      <div className="start-form__test-name">{name}</div>
                      {desc && <div className="start-form__test-desc">{desc}</div>}
                    </button>
                  );
                })}
              </div>

              {tests.length === 0 && !loading && (
                <div className="start-form__notice start-form__notice--warn">{t('noQuestions')}</div>
              )}

              {warn && (
                <div className="start-form__warn">{t(warn as 'formWarnTest')}</div>
              )}
            </>
          )}

          {/* ——— Step 1 — Sector (multi-select) ——— */}
          {step === 1 && (
            <>
              <div className="start-form__section-hd start-form__section-hd--step1">
                <div className="start-form__section-top">
                  <span className="start-form__step">{t('step2')} · 1/4</span>
                  <div className="start-form__lang">
                    <button
                      className={`start-form__lang-btn ${lang === 'uk' ? 'start-form__lang-btn--active' : ''}`}
                      onClick={() => setLang('uk')}
                    >
                      UK
                    </button>
                    <button
                      className={`start-form__lang-btn ${lang === 'en' ? 'start-form__lang-btn--active' : ''}`}
                      onClick={() => setLang('en')}
                    >
                      EN
                    </button>
                  </div>
                </div>
                <span className="start-form__step-title">{t('labelSector')}</span>
                <div className="start-form__line" />
              </div>

              <p className="start-form__hint start-form__hint--multi">
                {lang === 'uk' ? (
                  <>✓ Можна обрати <strong>кілька</strong> напрямків, а не лише один.</>
                ) : (
                  <>✓ You can select <strong>several</strong> areas, not just one.</>
                )}
              </p>

              <div className="start-form__field">
                <div className="start-form__sector-grid">
                  {sectors.map(s => (
                    <button
                      key={s}
                      className={`start-form__sector-btn ${sectorList.includes(s) ? 'selected' : ''}`}
                      onClick={() => toggleSector(s)}
                      type="button"
                    >
                      <div className="start-form__radio" />
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {warn && <div className="start-form__warn">{t(warn as 'formWarnCompany')}</div>}

              <div className={fromDeepLink ? 'start-form__actions' : 'start-form__actions start-form__actions--split'}>
                {!fromDeepLink && (
                  <button className="start-form__btn start-form__btn--back" onClick={() => setStep(0)}>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M12 7H2M6 3L2 7l4 4" />
                    </svg>
                    {t('btnBack')}
                  </button>
                )}
                <button className="start-form__btn" onClick={handleNextSector}>
                  {t('btnNext')}
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 7h10M8 3l4 4-4 4" />
                  </svg>
                </button>
              </div>
            </>
          )}

          {/* ——— Step 2 — Size ——— */}
          {step === 2 && (
            <>
              <div className="start-form__section-hd">
                <span className="start-form__step">{t('step2')} · 2/4</span>
                <span className="start-form__step-title">{t('labelSize')}</span>
                <div className="start-form__line" />
              </div>

              <div className="start-form__field">
                <div className="start-form__pill-grid">
                  {sizes.map(s => (
                    <button
                      key={s}
                      className={`start-form__pill ${size === s ? 'selected' : ''}`}
                      onClick={() => setSize(s)}
                      type="button"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {warn && <div className="start-form__warn">{t(warn as 'formWarnCompany')}</div>}

              <div className="start-form__actions start-form__actions--split">
                <button className="start-form__btn start-form__btn--back" onClick={() => setStep(1)}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 7H2M6 3L2 7l4 4" />
                  </svg>
                  {t('btnBack')}
                </button>
                <button className="start-form__btn" onClick={handleNextSize}>
                  {t('btnNext')}
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 7h10M8 3l4 4-4 4" />
                  </svg>
                </button>
              </div>
            </>
          )}

          {/* ——— Step 3 — Age ——— */}
          {step === 3 && (
            <>
              <div className="start-form__section-hd">
                <span className="start-form__step">{t('step2')} · 3/4</span>
                <span className="start-form__step-title">{t('labelAge')}</span>
                <div className="start-form__line" />
              </div>

              <div className="start-form__field">
                <div className="start-form__pill-grid">
                  {ages.map(a => (
                    <button
                      key={a}
                      className={`start-form__pill ${age === a ? 'selected' : ''}`}
                      onClick={() => setAge(a)}
                      type="button"
                    >
                      {a}
                    </button>
                  ))}
                </div>
              </div>

              {warn && <div className="start-form__warn">{t(warn as 'formWarnCompany')}</div>}

              <div className="start-form__actions start-form__actions--split">
                <button className="start-form__btn start-form__btn--back" onClick={() => setStep(2)}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 7H2M6 3L2 7l4 4" />
                  </svg>
                  {t('btnBack')}
                </button>
                <button className="start-form__btn" onClick={handleNextAge}>
                  {t('btnNext')}
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 7h10M8 3l4 4-4 4" />
                  </svg>
                </button>
              </div>
            </>
          )}

          {/* ——— Step 4 — Sales revenue ——— */}
          {step === 4 && (
            <>
              <div className="start-form__section-hd">
                <span className="start-form__step">{t('step2')} · 4/4</span>
                <span className="start-form__step-title">{t('labelRevenue')}</span>
                <div className="start-form__line" />
              </div>

              <div className="start-form__field">
                <div className="start-form__pill-grid start-form__pill-grid--three">
                  {revenues.map(r => (
                    <button
                      key={r}
                      className={`start-form__pill ${revenue === r ? 'selected' : ''}`}
                      onClick={() => setRevenue(r)}
                      type="button"
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>

              {warn && <div className="start-form__warn">{t(warn as 'formWarnCompany' | 'formWarnServer')}</div>}

              <div className="start-form__actions start-form__actions--split">
                <button className="start-form__btn start-form__btn--back" onClick={() => setStep(3)}>
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M12 7H2M6 3L2 7l4 4" />
                  </svg>
                  {t('btnBack')}
                </button>
                <button className="start-form__btn" onClick={handleStart}>
                  {t('startBtn')}
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M2 7h10M8 3l4 4-4 4" />
                  </svg>
                </button>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
