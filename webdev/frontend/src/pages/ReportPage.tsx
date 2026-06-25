import { useRef, useState, useEffect, useCallback } from 'react';
import { useQuiz } from '@/context/QuizContext';
import { useLang } from '@/context/LanguageContext';
import { API_BASE } from '@/config/api';
import { generateFullPdf } from '@/utils/pdfGenerator';
import ReportHeader from '@/components/report/ReportHeader';
import BlockGrid from '@/components/report/BlockGrid';
import OverallScore from '@/components/report/OverallScore';
import ZoneSection from '@/components/report/ZoneSection';
import BlockDetailPage from '@/components/report/BlockDetailPage';
import QuestionChecklistSlice from '@/components/report/QuestionChecklistSlice';
import ReportFooter from '@/components/report/ReportFooter';
import CallToAction from '@/components/report/CallToAction';
import { findBlockExplanation } from '@/data/blockExplanations';
import type { Zone, Question } from '@/types';
import './ReportPage.css';

interface QuestionWithMeta { q: Question; blockTitle: string; }

export default function ReportPage() {
  const { report, restartQuiz, submissionId, submissionToken, tests, selectedTestSlug, blocks, answers, selectedKeys } = useQuiz();
  const { t, lang } = useLang();
  const reportRef = useRef<HTMLDivElement>(null);
  const [pdfReady, setPdfReady] = useState(false);
  const pdfSavedRef = useRef(false);

  const generatePdf = useCallback(async (download: boolean) => {
    if (!reportRef.current || !report) return;
    setPdfReady(true);

    try {
      const pdf = await generateFullPdf({
        rootEl: reportRef.current,
        lang,
      });

      if (download) {
        const userName = `${report.userInfo.firstName}_${report.userInfo.lastName}`;
        pdf.save(`BizCheck_${userName}.pdf`);
      }

      if (submissionId) {
        const pdfBase64 = pdf.output('datauristring').split(',')[1];
        fetch(`${API_BASE}/submissions/${submissionId}/pdf`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(submissionToken ? { 'X-Submission-Token': submissionToken } : {}),
          },
          body: JSON.stringify({ pdf: pdfBase64 }),
        }).catch(() => {});
      }
    } catch {
      // PDF errors surface via UI state; no console noise in production.
    } finally {
      setPdfReady(false);
    }
  }, [report, submissionId, submissionToken, lang]);

  useEffect(() => {
    if (!report || !submissionId || pdfSavedRef.current) return;
    pdfSavedRef.current = true;
    const timer = setTimeout(() => generatePdf(false), 2000);
    return () => clearTimeout(timer);
  }, [report, submissionId, generatePdf]);

  if (!report) return null;

  return (
    <div className="report-page">
      <div ref={reportRef} data-pdf-root className="report-pdf">
        <ReportHeader report={report} />

        <div className="report-pdf__body">
          {(() => {
            const currentTest = tests.find(tt => tt.slug === selectedTestSlug);
            const rt = currentTest?.report_type ?? 'bizcheck';

            // ── STANDARD layout ───────────────────────────
            // Cover → [checklist, 5 questions/page] → OverallScore+Footer → outro
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
                  <div className="report-pdf__page" data-pdf-page>
                    <OverallScore report={report} />
                    <ReportFooter />
                  </div>
                </>
              );
            }

            // ── BIZCHECK + PREMIUM layout ─────────────────
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

      <div className="report-page__actions">
        <div className="report-page__pdf-bar">
          <button className="report-page__pdf-btn" onClick={() => generatePdf(true)} disabled={pdfReady}>
            {pdfReady ? '...' : (
              <>
                <svg width="18" height="18" viewBox="0 0 18 18" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 12v3a1 1 0 001 1h10a1 1 0 001-1v-3M9 2v10M5 8l4 4 4-4" />
                </svg>
                {t('downloadPdf')}
              </>
            )}
          </button>
        </div>

        <CallToAction onRestart={restartQuiz} submissionId={submissionId} submissionToken={submissionToken} />
      </div>
    </div>
  );
}
