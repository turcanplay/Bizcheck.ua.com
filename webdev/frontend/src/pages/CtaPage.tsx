import { useRef, useState, useEffect, useCallback } from 'react';
import { useQuiz } from '@/context/QuizContext';
import { useLang } from '@/context/LanguageContext';
import { API_BASE } from '@/config/api';
import { publicApi } from '@/api/public';
import { generateFullPdf } from '@/utils/pdfGenerator';
import { enqueueSave, isPending, wasDropped, flushAndConfirm } from '@/utils/durableSave';
import ReportHeader from '@/components/report/ReportHeader';
import BlockGrid from '@/components/report/BlockGrid';
import OverallScore from '@/components/report/OverallScore';
import ZoneSection from '@/components/report/ZoneSection';
import BlockDetailPage from '@/components/report/BlockDetailPage';
import QuestionChecklistSlice from '@/components/report/QuestionChecklistSlice';
import ReportFooter from '@/components/report/ReportFooter';
import { findBlockExplanation } from '@/data/blockExplanations';
import type { Zone, Question } from '@/types';

interface QuestionWithMeta { q: Question; blockTitle: string; }
import './ReportPage.css';
import './CtaPage.css';

const EMAIL_RE = /^[^@\s]{1,64}@[^@\s]{1,253}\.[^@\s]{1,63}$/;
const PHONE_RE = /^\+?[\d\s\-()]{7,20}$/;

export default function CtaPage() {
  const { report, restartQuiz, submissionId, submissionToken, setUserInfo, updateSubmission, userInfo, sectors, sizes, ages, revenues, tests, selectedTestSlug, blocks, answers, selectedKeys } = useQuiz();
  const { t, lang } = useLang();
  const reportRef = useRef<HTMLDivElement>(null);
  const [pdfDone, setPdfDone] = useState(false);
  const [tgLoading, setTgLoading] = useState(false);
  const [tgError, setTgError] = useState(false);
  const [pdfError, setPdfError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [resending, setResending] = useState(false);
  const [resent, setResent] = useState(false);
  // Email delivery is admin-toggleable (site setting). Off → card shows "coming soon".
  const [emailEnabled, setEmailEnabled] = useState(false);
  const pdfSavedRef = useRef(false);

  // ── Save-gate: verify in the background that every answer reached the server.
  // 'ok'     → nothing pending (default) or confirmed saved
  // 'saving' → pending; apologising + retrying (up to 2×)
  // 'failed' → still not confirmed after retries; non-blocking, outbox keeps trying
  const [saveGate, setSaveGate] = useState<'ok' | 'saving' | 'failed'>('ok');
  const saveGateRunRef = useRef(false);

  useEffect(() => {
    if (!submissionId || saveGateRunRef.current) return;
    saveGateRunRef.current = true;
    // Stay 'ok' only when there is nothing pending AND nothing was permanently
    // dropped. A dropped payload (400/422) leaves the outbox empty but the data
    // is NOT saved — treat it as a failure so recovery is offered.
    if (!isPending(submissionId) && !wasDropped(submissionId)) return;

    let cancelled = false;
    (async () => {
      setSaveGate('saving');
      for (let attempt = 0; attempt < 2; attempt++) {
        const ok = await flushAndConfirm(submissionId);
        if (cancelled) return;
        if (ok) { setSaveGate('ok'); return; }
        await new Promise(r => setTimeout(r, 1500));
      }
      if (cancelled) return;
      // flushAndConfirm returns true only on a confirmed 2xx with nothing left
      // pending (a delivered-by-background flush included). Reaching here means
      // it never confirmed — show the honest non-blocking warning; the outbox
      // keeps retrying in the background.
      setSaveGate('failed');
    })();
    return () => { cancelled = true; };
  }, [submissionId]);

  useEffect(() => {
    publicApi.getSiteSettings()
      .then(r => setEmailEnabled(r.settings.email_delivery_enabled === '1'))
      .catch(() => setEmailEnabled(false));
  }, []);

  /* ── Delivery method frame state ──
     null = show grid of 2 method cards. Otherwise render the matching form. */
  type DeliveryMethod = 'download' | 'telegram';
  const [selectedMethod, setSelectedMethod] = useState<DeliveryMethod | null>(null);
  // Single "full name" field. Split on first space at submit time:
  // first word → first_name, the rest → last_name.
  const [formFullName, setFormFullName] = useState(
    [userInfo.firstName, userInfo.lastName].filter(Boolean).join(' '),
  );
  const [downloadPhone, setDownloadPhone] = useState(userInfo.phone || '');
  const [emailValue, setEmailValue] = useState(userInfo.email || '');
  const [formConsent, setFormConsent] = useState(userInfo.consent || false);
  const [downloadDone, setDownloadDone] = useState(false);
  const [formWarn, setFormWarn] = useState('');

  // ── Company-data recovery — only surfaced when the save-gate has failed.
  // Lets the user re-confirm the company profile collected on StartPage in case
  // it never reached the server. Pre-filled from the local userInfo snapshot.
  const [recSectors, setRecSectors] = useState<string[]>(
    userInfo.sector ? userInfo.sector.split(', ').filter(Boolean) : [],
  );
  const [recSize, setRecSize] = useState(userInfo.size || '');
  const [recAge, setRecAge] = useState(userInfo.age || '');
  const [recRevenue, setRecRevenue] = useState(userInfo.revenue || '');
  const [recSaving, setRecSaving] = useState(false);
  const [recSaved, setRecSaved] = useState(false);
  const recSavingRef = useRef(false); // synchronous double-submit guard

  function toggleRecSector(s: string) {
    setRecSectors(prev => prev.includes(s) ? prev.filter(x => x !== s) : [...prev, s]);
  }

  async function handleSaveRecovery() {
    if (!submissionId || recSavingRef.current) return;
    recSavingRef.current = true;
    setRecSaving(true);
    try {
      updateSubmission({
        sector: recSectors.join(', '),
        company_size: recSize,
        company_age: recAge,
        company_revenue: recRevenue,
        status: 'in_progress',
      });
      const ok = await flushAndConfirm(submissionId);
      setRecSaved(ok);
    } finally {
      setRecSaving(false);
      recSavingRef.current = false;
    }
  }

  // Reveal animation: show full-screen overlay for ~2s then fade out
  const [revealExiting, setRevealExiting] = useState(false);
  const [revealGone, setRevealGone] = useState(false);
  const [scoreDisplay, setScoreDisplay] = useState(0);

  useEffect(() => {
    if (!report) return;
    const target = Math.round(report.totalScore);
    const step = target / 40;
    let current = 0;
    const interval = setInterval(() => {
      current = Math.min(current + step, target);
      setScoreDisplay(Math.round(current));
      if (current >= target) clearInterval(interval);
    }, 30);
    const t1 = setTimeout(() => setRevealExiting(true), 2200);
    const t2 = setTimeout(() => setRevealGone(true), 2600);
    return () => { clearInterval(interval); clearTimeout(t1); clearTimeout(t2); };
  }, [report]);

  const generateAndSavePdf = useCallback(async (attempt = 1): Promise<void> => {
    const MAX_ATTEMPTS = 3;
    if (!reportRef.current || !report || !submissionId) {
      return;
    }

    try {
      const el = reportRef.current;

      if (el.scrollHeight < 100) {
        if (attempt < MAX_ATTEMPTS) {
          await new Promise(r => setTimeout(r, 3000));
          return generateAndSavePdf(attempt + 1);
        }
      }

      const pdf = await generateFullPdf({
        rootEl: el,
        lang,
        renderWidth: 780,
        scale: 2,
        jpegQuality: 0.85,
        unhideWrapper: true,
      });

      const pdfBase64 = pdf.output('datauristring').split(',')[1];
      if (!pdfBase64 || pdfBase64.length < 100) {
        throw new Error(`PDF base64 too small: ${pdfBase64?.length ?? 0} chars`);
      }

      const res = await fetch(`${API_BASE}/submissions/${submissionId}/pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(submissionToken ? { 'X-Submission-Token': submissionToken } : {}),
        },
        body: JSON.stringify({ pdf: pdfBase64 }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(`Upload failed: ${res.status} ${JSON.stringify(errData)}`);
      }

      setPdfDone(true);
    } catch (err) {
      if (attempt < MAX_ATTEMPTS) {
        await new Promise(r => setTimeout(r, 3000));
        return generateAndSavePdf(attempt + 1);
      }
      setPdfError(err instanceof Error ? err.message : String(err));
    }
  }, [report, submissionId, submissionToken, lang]);

  useEffect(() => {
    if (!report || !submissionId || pdfSavedRef.current) return;
    pdfSavedRef.current = true;
    const timer = setTimeout(() => generateAndSavePdf(), 3000);
    return () => clearTimeout(timer);
  }, [report, submissionId, generateAndSavePdf]);

  function handleSelectMethod(m: DeliveryMethod) {
    setSelectedMethod(m);
    setFormWarn('');
    setDownloadDone(false);
    setTgError(false);
  }

  function handleBackToMethods() {
    setSelectedMethod(null);
    setFormWarn('');
    setDownloadDone(false);
    setTgError(false);
  }

  function warn(key: string) {
    setFormWarn(key);
    setTimeout(() => setFormWarn(''), 3500);
  }

  // First word → first_name, the remainder → last_name.
  function splitFullName(full: string) {
    const parts = full.trim().split(/\s+/);
    return { first: parts[0] || '', last: parts.slice(1).join(' ') };
  }

  function commitContact(extras: Record<string, unknown> = {}) {
    const { first, last } = splitFullName(formFullName);
    setUserInfo({ ...userInfo, firstName: first, lastName: last, consent: true, ...extras });
    updateSubmission({ first_name: first, last_name: last, consent: true, ...extras });
  }

  async function handleSubmitDownload() {
    const { first, last } = splitFullName(formFullName);
    const phone = downloadPhone.trim();
    const em = emailValue.trim().toLowerCase();
    if (!first) { warn('formWarnFullName'); return; }
    if (!phone || !PHONE_RE.test(phone)) { warn('formWarnPhone'); return; }
    if (!em || !EMAIL_RE.test(em)) { warn('formWarnEmail'); return; }
    if (!formConsent) { warn('formWarnConsent'); return; }

    // Local UI state.
    setUserInfo({ ...userInfo, firstName: first, lastName: last, consent: true, phone, email: em });

    // Email-only delivery: send the stored PDF to the user's inbox. No browser
    // download. `downloading` doubles as the "sending…" indicator on the button.
    setDownloading(true);
    try {
      if (submissionId) {
        const headers = {
          'Content-Type': 'application/json',
          ...(submissionToken ? { 'X-Submission-Token': submissionToken } : {}),
        };
        // Durable backstop: if the awaited PATCH below fails silently (network
        // flap), the outbox retries this contact snapshot until it lands.
        enqueueSave(submissionId, submissionToken, { first_name: first, last_name: last, phone, email: em, consent: true });

        // 1) Persist the contact AND WAIT — /send-email reads the email from the
        //    DB, so it must be committed first (otherwise the server replies
        //    "no valid email" and never sends).
        await fetch(`${API_BASE}/submissions/${submissionId}`, {
          method: 'PATCH',
          headers,
          body: JSON.stringify({ first_name: first, last_name: last, phone, email: em, consent: true }),
        }).catch(() => {});

        // 2) Now ask the server to email the report. Retry while the PDF finishes saving.
        for (let attempt = 0; attempt < 6; attempt++) {
          const res = await fetch(`${API_BASE}/submissions/${submissionId}/send-email`, {
            method: 'POST',
            headers,
          });
          if (res.ok) break;
          if (res.status === 409) {
            // PDF not ready on the server yet — wait and retry.
            await new Promise(r => setTimeout(r, 2500));
            continue;
          }
          // Other error (400/404/5xx) — stop; user still sees the success UI.
          break;
        }
      }
    } catch {
      // Network failure is non-fatal: the submission is saved; admin can resend.
    } finally {
      setDownloading(false);
    }

    setDownloadDone(true);
  }

  // Resend the report email without re-validating the form — contact is already
  // stored. Retries while the PDF finishes saving (same 409 logic as submit).
  async function handleResendEmail() {
    if (!submissionId) return;
    setResending(true);
    setResent(false);
    try {
      const headers = {
        'Content-Type': 'application/json',
        ...(submissionToken ? { 'X-Submission-Token': submissionToken } : {}),
      };
      for (let attempt = 0; attempt < 6; attempt++) {
        const res = await fetch(`${API_BASE}/submissions/${submissionId}/send-email`, {
          method: 'POST',
          headers,
        });
        if (res.ok) { setResent(true); break; }
        if (res.status === 409) { await new Promise(r => setTimeout(r, 2500)); continue; }
        break;
      }
    } catch {
      // Non-fatal — submission is saved; admin can resend from the panel.
    } finally {
      setResending(false);
    }
  }

  async function handleOpenTelegram() {
    const fallback = 'https://t.me/CROWE_BIZCHECK_bot';

    if (!submissionId) {
      window.location.href = fallback;
      return;
    }

    setTgLoading(true);
    setTgError(false);

    try {
      const res = await fetch(`${API_BASE}/tg/link/${submissionId}`, {
        method: 'POST',
        headers: submissionToken ? { 'X-Submission-Token': submissionToken } : {},
      });
      if (!res.ok) throw new Error('failed');
      const data = await res.json();
      window.location.href = data.url;
    } catch {
      setTgError(true);
      window.location.href = fallback;
    } finally {
      setTgLoading(false);
    }
  }

  async function handleSubmitTelegram() {
    const { first } = splitFullName(formFullName);
    if (!first) { warn('formWarnFullName'); return; }
    if (!formConsent) { warn('formWarnConsent'); return; }
    commitContact();
    await handleOpenTelegram();
  }

  if (!report) return null;

  const score = Math.round(report.totalScore);
  const scoreColor = score >= 80 ? '#05AB8C' : score >= 70 ? '#F5A800' : score >= 65 ? '#E07B00' : '#D64535';

  return (
    <div className="cta-page">

      {/* ── Full-screen reveal overlay ── */}
      {!revealGone && (
        <div className={`cta-reveal ${revealExiting ? 'cta-reveal--exit' : ''}`}>
          <div className="cta-reveal__ring cta-reveal__ring--1" />
          <div className="cta-reveal__ring cta-reveal__ring--2" />
          <div className="cta-reveal__ring cta-reveal__ring--3" />

          <div className="cta-reveal__content">
            <div className="cta-reveal__score" style={{ color: scoreColor }}>
              {scoreDisplay}<span className="cta-reveal__pct">%</span>
            </div>
            <div className="cta-reveal__label">
              {score >= 80 ? `🟢 ${t('zoneSafe')}`
                : score >= 70 ? `🟡 ${t('zoneDeveloping')}`
                : score >= 65 ? `🟠 ${t('zoneWarning')}`
                : `🔴 ${t('zoneRisk')}`}
            </div>
            <div className="cta-reveal__bar">
              <div className="cta-reveal__bar-fill" style={{ width: `${scoreDisplay}%`, background: scoreColor }} />
            </div>
            <p className="cta-reveal__hint">{t('ctaPdfPreparing')}</p>
          </div>
        </div>
      )}

      {/* ── Hidden report DOM — source HTML for PDF capture ── */}
      <div style={{ height: 0, overflow: 'hidden', pointerEvents: 'none' }}>
        <div ref={reportRef} data-pdf-root className="report-pdf" style={{ width: 780 }}>
          <ReportHeader report={report} />
          <div className="report-pdf__body">
            {(() => {
              const currentTest = tests.find(tt => tt.slug === selectedTestSlug);
              const rt = currentTest?.report_type ?? 'bizcheck';

              // ── STANDARD layout ───────────────────────────
              // Cover → [checklist, 5 questions/page] → OverallScore+Footer → outro
              // Nu are BlockGrid, nu are ZoneSections (redundante pentru acest tip).
              if (rt === 'standard') {
                const flatQuestions: QuestionWithMeta[] = [];
                blocks.forEach(block => {
                  block.questions.filter(q => !q.parent_question_id).forEach(q => {
                    flatQuestions.push({ q, blockTitle: block.title });
                  });
                });
                const CHUNK = 5;
                const slices: QuestionWithMeta[][] = [];
                for (let i = 0; i < flatQuestions.length; i += CHUNK) {
                  slices.push(flatQuestions.slice(i, i + CHUNK));
                }
                return (
                  <>
                    {slices.map((slice, si) => (
                      <div className="report-pdf__page" data-pdf-page key={`qslice-${si}`}>
                        <QuestionChecklistSlice
                          questions={slice}
                          startNumber={si * CHUNK + 1}
                          isFirstPage={si === 0}
                          answers={answers}
                          selectedKeys={selectedKeys}
                        />
                      </div>
                    ))}
                    {/* Ultima pagină înainte de outro: Rezultat general + CTA contact */}
                    <div className="report-pdf__page" data-pdf-page>
                      <OverallScore report={report} />
                      <ReportFooter />
                    </div>
                  </>
                );
              }

              // ── BIZCHECK + PREMIUM layout ─────────────────
              // Cover → BlockGrid → OverallScore+Footer → Zone pairs → (BlockDetail dacă bizcheck) → outro
              const zones: Zone[] = ['risk', 'warning', 'developing', 'safe'];
              const nonEmpty = zones.filter(z => report.blockScores.some(b => b.zone === z));
              const zonePages: Zone[][] = [];
              for (let i = 0; i < nonEmpty.length; i += 2) {
                zonePages.push(nonEmpty.slice(i, i + 2));
              }
              return (
                <>
                  <BlockGrid blocks={report.blockScores} />

                  <div className="report-pdf__page" data-pdf-page>
                    <OverallScore report={report} />
                    <ReportFooter />
                  </div>

                  {zonePages.map((zs, pi) => (
                    <div className="report-pdf__page" data-pdf-page key={`zone-${pi}`}>
                      {zs.map(zone => (
                        <ZoneSection
                          key={zone}
                          zone={zone}
                          blocks={report.blockScores.filter(b => b.zone === zone)}
                        />
                      ))}
                    </div>
                  ))}

                  {rt === 'bizcheck' && report.blockScores
                    .filter(b => findBlockExplanation(b.order) !== null)
                    .sort((a, b) => a.order - b.order)
                    .map(block => (
                      <div className="report-pdf__page" data-pdf-page key={`bd-${block.id}`}>
                        <BlockDetailPage block={block} />
                      </div>
                    ))}
                </>
              );
            })()}
          </div>
        </div>
      </div>

      {/* ── Visible CTA ── */}
      <div className="cta-page__inner">

        {/* Save-gate banner — verify answers reached the server (non-blocking). */}
        {saveGate === 'saving' && (
          <div className="cta-save-banner cta-save-banner--saving" role="status">
            <span className="cta-page__status-spinner" aria-hidden />
            <div>
              <strong>{t('ctaSavingTitle')}</strong>
              <p>{t('ctaSavingText')}</p>
            </div>
          </div>
        )}
        {saveGate === 'failed' && !recSaved && (
          <div className="cta-save-banner cta-save-banner--failed" role="alert">
            <span className="cta-save-banner__icon" aria-hidden>⚠️</span>
            <div>
              <strong>{t('ctaSaveFailTitle')}</strong>
              <p>{t('ctaSaveFailText')}</p>
            </div>
          </div>
        )}

        {/* Top hero — overall score + PDF status */}
        <div className="cta-page__score-hero">
          <div className="cta-page__score-pct" style={{ color: scoreColor }}>
            {score}<span className="cta-page__score-pct-sign">%</span>
          </div>
          <div className="cta-page__score-zone">
            {score >= 80 ? `🟢 ${t('zoneSafe')}`
              : score >= 70 ? `🟡 ${t('zoneDeveloping')}`
              : score >= 65 ? `🟠 ${t('zoneWarning')}`
              : `🔴 ${t('zoneRisk')}`}
          </div>
          <p className={`cta-page__status ${pdfDone ? 'cta-page__status--ready' : ''}`}>
            {!pdfDone && <span className="cta-page__status-spinner" aria-hidden />}
            {pdfDone ? t('ctaPdfReady') : t('ctaPdfPreparing')}
          </p>
        </div>

        <p className="cta-page__delivery-prompt">{t('ctaDeliveryTitle')}</p>

        {pdfError && (
          <div className="cta-page__error">
            <p>⚠️ {t('ctaPdfError')}</p>
            <button
              onClick={() => { setPdfError(''); pdfSavedRef.current = false; generateAndSavePdf(); }}
            >
              {t('ctaPdfRetry')}
            </button>
          </div>
        )}

        {/* ── Grid de metode — afișat doar cât timp nu a ales nimic ── */}
        {selectedMethod === null && (
          <div className="cta-page__delivery">
            {/* Email delivery is admin-toggleable (email_delivery_enabled site
                setting). Off → "coming soon" + disabled; On → active method. */}
            <button
              type="button"
              className={`cta-page__option cta-page__option--download${emailEnabled ? '' : ' cta-page__option--soon'}`}
              onClick={emailEnabled ? () => handleSelectMethod('download') : undefined}
              disabled={!emailEnabled}
              aria-disabled={!emailEnabled}
            >
              {!emailEnabled && <span className="cta-page__option-badge">{t('ctaEmailComingSoon')}</span>}
              <div className="cta-page__option-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M3 7l9 6 9-6M4 5h16a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </div>
              <div className="cta-page__option-title">{t('ctaEmailTitle')}</div>
              <div className="cta-page__option-desc">{emailEnabled ? t('ctaEmailDesc') : t('ctaEmailSoonDesc')}</div>
              <span className="cta-page__option-btn cta-page__option-btn--static">
                {emailEnabled ? t('ctaEmailBtn') : t('ctaEmailComingSoon')}
              </span>
            </button>

            <button
              type="button"
              className="cta-page__option cta-page__option--telegram"
              onClick={() => handleSelectMethod('telegram')}
            >
              <div className="cta-page__option-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M11.944 0A12 12 0 0 0 0 12a12 12 0 0 0 12 12 12 12 0 0 0 12-12A12 12 0 0 0 12 0zm4.962 7.224c.1-.002.321.023.465.14a.506.506 0 0 1 .171.325c.016.093.036.306.02.472-.18 1.898-.962 6.502-1.36 8.627-.168.9-.499 1.201-.82 1.23-.696.065-1.225-.46-1.9-.902-1.056-.693-1.653-1.124-2.678-1.8-1.185-.78-.417-1.21.258-1.91.177-.184 3.247-2.977 3.307-3.23.007-.032.014-.15-.056-.212s-.174-.041-.249-.024c-.106.024-1.793 1.14-5.061 3.345-.479.33-.913.49-1.302.48-.428-.008-1.252-.241-1.865-.44-.752-.245-1.349-.374-1.297-.789.027-.216.325-.437.893-.663 3.498-1.524 5.83-2.529 6.998-3.014 3.332-1.386 4.025-1.627 4.476-1.635z" />
                </svg>
              </div>
              <div className="cta-page__option-title">{t('ctaTelegramTitle')}</div>
              <div className="cta-page__option-desc">{t('ctaTelegramDesc')}</div>
              <span className="cta-page__option-btn cta-page__option-btn--static">
                {t('ctaTelegramBtn')}
              </span>
            </button>
          </div>
        )}

        {/* ── Frame per metodă — cere date specifice + buton înapoi ── */}
        {selectedMethod !== null && (
          <div className={`cta-frame cta-frame--${selectedMethod}`}>
            <button type="button" className="cta-frame__back" onClick={handleBackToMethods}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 7H2M6 3L2 7l4 4" />
              </svg>
              {t('ctaFrameBack')}
            </button>

            <h2 className="cta-frame__title">
              {selectedMethod === 'download' && t('ctaEmailTitle')}
              {selectedMethod === 'telegram' && t('ctaTelegramTitle')}
            </h2>
            <p className="cta-frame__sub">
              {selectedMethod === 'download' && t('ctaFrameEmailSub')}
              {selectedMethod === 'telegram' && t('ctaFrameTelegramSub')}
            </p>

            <label className="cta-frame__field">
              <span className="cta-frame__label">{t('labelFullName')}</span>
              <input
                type="text"
                className="cta-frame__input"
                placeholder={t('placeholderFullName')}
                value={formFullName}
                onChange={e => setFormFullName(e.target.value.slice(0, 120))}
                autoFocus
              />
            </label>

            {selectedMethod === 'download' && (
              <>
                <label className="cta-frame__field">
                  <span className="cta-frame__label">{t('labelPhone')}</span>
                  <input
                    type="tel"
                    inputMode="tel"
                    className="cta-frame__input"
                    placeholder={t('placeholderPhone')}
                    value={downloadPhone}
                    onChange={e => setDownloadPhone(e.target.value.replace(/[^\d+\-() ]/g, ''))}
                  />
                </label>
                <label className="cta-frame__field">
                  <span className="cta-frame__label">{t('labelEmail')}</span>
                  <input
                    type="email"
                    className="cta-frame__input"
                    placeholder={t('ctaEmailPlaceholder')}
                    value={emailValue}
                    onChange={e => setEmailValue(e.target.value)}
                  />
                </label>
              </>
            )}

            <label className="cta-frame__consent">
              <input
                type="checkbox"
                className="cta-frame__consent-input"
                checked={formConsent}
                onChange={e => setFormConsent(e.target.checked)}
              />
              <span className="cta-frame__consent-box" aria-hidden>
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2.2">
                  <path d="M2.5 6.3l2.3 2.3L9.5 3.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span className="cta-frame__consent-text">
                {t('ctaConsentPrefix')}{' '}
                <a
                  href="/confidentialitate"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="cta-frame__consent-link"
                  onClick={e => e.stopPropagation()}
                >
                  {t('ctaConsentLink')}
                </a>
                .
              </span>
            </label>

            {formWarn && (
              <div className="cta-frame__warn">{t(formWarn as 'formWarnFullName' | 'formWarnPhone' | 'formWarnEmail' | 'formWarnConsent')}</div>
            )}

            {selectedMethod === 'download' && downloadDone ? (
              <div className="cta-frame__success">
                <div className="cta-frame__success-title">✓ {t('ctaEmailSent')}</div>
                <div className="cta-frame__success-sub">
                  {t('ctaEmailSentSub', { email: emailValue })}
                </div>
                <div className="cta-spam-notice" role="alert">
                  <span className="cta-spam-notice__icon" aria-hidden>📩</span>
                  <div className="cta-spam-notice__body">
                    <strong className="cta-spam-notice__title">{t('ctaSpamNoticeTitle')}</strong>
                    <p className="cta-spam-notice__text">{t('ctaSpamNoticeText')}</p>
                  </div>
                </div>
                <button
                  type="button"
                  className="cta-frame__resend"
                  onClick={() => void handleResendEmail()}
                  disabled={resending}
                >
                  {resending
                    ? <span className="cta-page__spinner" />
                    : (
                      <>
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M21 2v6h-6M3 12a9 9 0 0 1 15-6.7L21 8M3 22v-6h6M21 12a9 9 0 0 1-15 6.7L3 16" />
                        </svg>
                        {resent ? t('ctaEmailResent') : t('ctaEmailResend')}
                      </>
                    )}
                </button>
              </div>
            ) : (
              <button
                type="button"
                className="cta-frame__submit"
                onClick={() => {
                  if (selectedMethod === 'download') void handleSubmitDownload();
                  else if (selectedMethod === 'telegram') void handleSubmitTelegram();
                }}
                disabled={
                  (selectedMethod === 'download' && (downloading || !pdfDone)) ||
                  (selectedMethod === 'telegram' && (tgLoading || !pdfDone))
                }
              >
                {((selectedMethod === 'download' && downloading) ||
                  (selectedMethod === 'telegram' && tgLoading))
                  ? <span className="cta-page__spinner cta-page__spinner--light" />
                  : !pdfDone
                    ? t('ctaPdfPreparing')
                    : (
                      <>
                        {selectedMethod === 'download' && t('ctaEmailBtn')}
                        {selectedMethod === 'telegram' && t('ctaTelegramBtn')}
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M2 7h10M8 3l4 4-4 4" />
                        </svg>
                      </>
                    )}
              </button>
            )}

            {selectedMethod === 'telegram' && tgError && (
              <p className="cta-page__tg-error">{t('telegramError')}</p>
            )}
          </div>
        )}

        {/* ── Company-data recovery — only when the save-gate failed and there
            is company data to confirm. Delivery above stays fully usable. ── */}
        {saveGate === 'failed' && submissionId &&
          (userInfo.sector || userInfo.size || userInfo.age || userInfo.revenue) && (
          <div className="cta-recovery">
            <h3 className="cta-recovery__title">{t('ctaRecoveryTitle')}</h3>
            <p className="cta-recovery__intro">{t('ctaRecoveryIntro')}</p>

            {!recSaved && (
              <>
                <div className="cta-recovery__field">
                  <span className="cta-recovery__label">{t('labelSector')}</span>
                  <div className="start-form__sector-grid">
                    {sectors.map(s => (
                      <button
                        key={s}
                        type="button"
                        className={`start-form__sector-btn ${recSectors.includes(s) ? 'selected' : ''}`}
                        onClick={() => toggleRecSector(s)}
                      >
                        <div className="start-form__radio" />
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="cta-recovery__field">
                  <span className="cta-recovery__label">{t('labelSize')}</span>
                  <div className="start-form__pill-grid">
                    {sizes.map(s => (
                      <button
                        key={s}
                        type="button"
                        className={`start-form__pill ${recSize === s ? 'selected' : ''}`}
                        onClick={() => setRecSize(s)}
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="cta-recovery__field">
                  <span className="cta-recovery__label">{t('labelAge')}</span>
                  <div className="start-form__pill-grid">
                    {ages.map(a => (
                      <button
                        key={a}
                        type="button"
                        className={`start-form__pill ${recAge === a ? 'selected' : ''}`}
                        onClick={() => setRecAge(a)}
                      >
                        {a}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="cta-recovery__field">
                  <span className="cta-recovery__label">{t('labelRevenue')}</span>
                  <div className="start-form__pill-grid start-form__pill-grid--three">
                    {revenues.map(r => (
                      <button
                        key={r}
                        type="button"
                        className={`start-form__pill ${recRevenue === r ? 'selected' : ''}`}
                        onClick={() => setRecRevenue(r)}
                      >
                        {r}
                      </button>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  className="cta-recovery__save"
                  onClick={() => void handleSaveRecovery()}
                  disabled={recSaving}
                >
                  {recSaving
                    ? <span className="cta-page__status-spinner" aria-hidden />
                    : null}
                  {recSaving ? t('ctaRecoverySaving') : t('ctaRecoverySave')}
                </button>
              </>
            )}

            {recSaved && (
              <div className="cta-recovery__ok" role="status">{t('ctaRecoverySaved')}</div>
            )}

            <p className={`cta-recovery__support${!recSaved ? ' cta-recovery__support--prominent' : ''}`}>
              {t('ctaRecoverySupport')}{' '}
              <a href="mailto:office@bizcheck.md" className="cta-recovery__support-link">office@bizcheck.md</a>.
            </p>
          </div>
        )}

        <button className="cta-page__restart" onClick={restartQuiz}>
          {t('ctaRestart')}
        </button>

      </div>
    </div>
  );
}
