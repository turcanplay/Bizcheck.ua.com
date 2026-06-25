import { useEffect, useState } from 'react';
import { useQuiz } from '@/context/QuizContext';
import { useLang } from '@/context/LanguageContext';
import './QuizProgress.css';

export default function QuizProgress() {
  const { blocks, currentBlock, answers, currentQuestionIndex, topLevelQuestionCount } = useQuiz();
  const { t } = useLang();

  const totalBlocks   = blocks.length;
  const answeredCount = Object.keys(answers).length;
  const totalQ        = blocks.reduce((s, b) => s + b.questions.length, 0);
  const progressPct   = totalQ > 0 ? Math.round((answeredCount / totalQ) * 100) : 0;

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
          <div className="qp__bar">
            <div className="qp__fill" style={{ width: `${progressPct}%` }} />
            <div className="qp__glow"  style={{ left:  `${Math.max(0, progressPct - 1)}%` }} />
          </div>
          <span className="qp__pct">{progressPct}<span className="qp__pct-sign">%</span></span>
        </div>

      </div>
    </div>
  );
}
