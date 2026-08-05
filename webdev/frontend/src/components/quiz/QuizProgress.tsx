import { useEffect, useState } from 'react';
import { useQuiz } from '@/context/QuizContext';
import { useLang } from '@/context/LanguageContext';
import { countAnswerableQuestions, getTopLevelQuestions } from '@/utils/quizContent';
import './QuizProgress.css';

export default function QuizProgress() {
  const { blocks, currentBlock, currentQuestionIndex, topLevelQuestionCount } = useQuiz();
  const { t } = useLang();

  const totalBlocks = blocks.length;

  /* ── Progress ────────────────────────────────────────────────────────────
   * The bar and the "3 / 21" counter sitting next to it MUST measure the same
   * thing, otherwise they contradict each other on screen. They used to not:
   * the counter showed a POSITION among the current block's top-level
   * questions, while the bar showed ANSWERS COUNTED / ALL QUESTIONS — a
   * denominator that also includes branch sub-questions the user may never be
   * shown. On the production test (21 top-level, 25 rows) the counter reached
   * 21/21 while the bar stopped at 84 %.
   *
   * The bar is therefore the counter, scaled to the whole run: the 1-based
   * global position among ANSWERABLE (top-level) questions. Consequences:
   *   • it cannot exceed 100 — sub-question answers move neither term;
   *   • it is non-decreasing while moving forward, across block boundaries and
   *     through branches (entering a sub-question holds the parent's position);
   *   • it reads exactly 100 on the last question of the last block, which is
   *     precisely when the counter reads N / N.
   * Counting answers instead would drift from the counter again and, since
   * `answers` is keyed by question id INCLUDING sub-questions, would climb past
   * 100 % for anyone routed through a branch. */
  const totalAnswerable = countAnswerableQuestions(blocks);
  const questionsBefore = blocks
    .slice(0, Math.max(0, currentBlock))
    .reduce((s, b) => s + getTopLevelQuestions(b).length, 0);
  const positionInBlock = Math.min(Math.max(currentQuestionIndex, 0), topLevelQuestionCount);
  const globalPosition  = questionsBefore + positionInBlock;
  const progressPct     = totalAnswerable > 0
    ? Math.min(100, Math.max(0, Math.round((globalPosition / totalAnswerable) * 100)))
    : 0;

  // Fade-slide title when block changes
  const [titleIn, setTitleIn]         = useState(true);
  const [shownBlock, setShownBlock]   = useState(currentBlock);

  useEffect(() => {
    // Animation: fade-out title, swap block, fade-in
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTitleIn(false);
    const id = setTimeout(() => {
      setShownBlock(currentBlock);
      setTitleIn(true);
    }, 180);
    return () => clearTimeout(id);
  }, [currentBlock]);

  const block = blocks[shownBlock];

  return (
    <div className="qp">
      <div className="qp__inner">

        {/* ── Block stepper ── */}
        <div className="qp__steps">
          {blocks.map((b, i) => {
            const done   = i < currentBlock;
            const active = i === currentBlock;
            return (
              <div key={b.id} className={`qp__step${active ? ' qp__step--active' : ''}${done ? ' qp__step--done' : ''}`}>
                <div className="qp__dot">
                  {done ? (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  ) : (
                    <span>{i + 1}</span>
                  )}
                </div>
                {i < totalBlocks - 1 && (
                  <div className={`qp__line${done ? ' qp__line--done' : ''}`} />
                )}
              </div>
            );
          })}
        </div>

        {/* ── Animated block title ── */}
        <div className={`qp__title${titleIn ? ' qp__title--in' : ' qp__title--out'}`}>
          <span className="qp__title-block">{t('blockLabel')} {shownBlock + 1}</span>
          <span className="qp__title-sep">·</span>
          <span className="qp__title-name">{block?.title}</span>
        </div>

        {/* ── Animated question counter + bar ── */}
        <div className="qp__row">
          <div className="qp__counter" key={currentQuestionIndex}>
            <span className="qp__counter-num">{currentQuestionIndex}</span>
            <span className="qp__counter-slash">/</span>
            <span className="qp__counter-total">{topLevelQuestionCount}</span>
          </div>
          <div
            className="qp__bar"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={progressPct}
          >
            <div className="qp__fill" style={{ width: `${progressPct}%` }} />
            <div className="qp__glow"  style={{ left:  `${Math.max(0, progressPct - 1)}%` }} />
          </div>
          <span className="qp__pct">{progressPct}<span className="qp__pct-sign">%</span></span>
        </div>

      </div>
    </div>
  );
}
