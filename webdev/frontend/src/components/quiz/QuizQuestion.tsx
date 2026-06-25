import { useState, useEffect, useRef } from 'react';
import type { Question } from '@/types';
import { useQuiz } from '@/context/QuizContext';
import { useLang } from '@/context/LanguageContext';
import './QuizQuestion.css';

const OPTION_LETTERS = ['A', 'B', 'C', 'D', 'E', 'F'];

/** Delay (ms) after selecting an answer before auto-advancing. */
const AUTO_ADVANCE_DELAY = 500;

interface QuizQuestionProps {
  question: Question;
  onAnswer: (answerKey: string, score: number, optionKey: string) => void;
  onNext: () => void;
  onPrev: () => void;
  canGoPrev: boolean;
}

export default function QuizQuestion({
  question,
  onAnswer,
  onNext,
  onPrev,
  canGoPrev,
}: QuizQuestionProps) {
  const { selectedKeys, blocks, currentBlock, currentQuestionIndex, topLevelQuestionCount } = useQuiz();
  const { t } = useLang();
  const answerKey = question.id;
  const currentSelectedKey = selectedKeys[answerKey];

  const [fadeClass, setFadeClass] = useState('quiz-question--enter');
  const isLastBlock = currentBlock === blocks.length - 1;
  const isLastQuestion = currentQuestionIndex === topLevelQuestionCount;
  // Also check if selected answer has no branching (sub-question chain ended)
  const selectedOpt = currentSelectedKey
    ? question.options.find(o => o.key === currentSelectedKey)
    : null;
  const hasBranching = selectedOpt?.next_question_id != null;
  const showFinish = isLastBlock && isLastQuestion && !hasBranching && currentSelectedKey !== undefined;

  /* Track whether user just clicked an option in THIS render */
  const justSelected = useRef(false);
  const autoAdvanceTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  useEffect(() => {
    // Animation: enter → active fade transition
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFadeClass('quiz-question--enter');
    justSelected.current = false;
    const timer = setTimeout(() => setFadeClass('quiz-question--active'), 30);
    return () => { clearTimeout(timer); clearTimeout(autoAdvanceTimer.current); };
  }, [question.db_id]);

  /** Handle option click — record answer and auto-advance after a short delay. */
  function handleSelect(optionKey: string, score: number) {
    onAnswer(answerKey, score, optionKey);

    // Auto-advance after a short delay so user sees the selection highlight
    if (!justSelected.current) {
      justSelected.current = true;
      autoAdvanceTimer.current = setTimeout(() => {
        onNext();
      }, AUTO_ADVANCE_DELAY);
    }
  }

  return (
    <div className={`quiz-question ${fadeClass}`}>
      <div className="quiz-question__island">
        <div className="quiz-question__num" key={currentQuestionIndex}>
          {t('questionOf', { current: currentQuestionIndex, total: topLevelQuestionCount })}
        </div>

        <div className="quiz-question__card">
          <h2 className="quiz-question__text">{question.text}</h2>
          {question.note && (
            <p className="quiz-question__note">{question.note}</p>
          )}
        </div>

        <div className="quiz-question__options">
          {question.options.map((opt, i) => {
            const active = currentSelectedKey === opt.key;

            return (
              <button
                key={opt.key}
                className={`quiz-question__option ${active ? 'quiz-question__option--selected' : ''}`}
                onClick={() => handleSelect(opt.key, opt.score)}
              >
                <span className="quiz-question__option-letter" style={{ background: 'var(--navy-mid)' }}>
                  {OPTION_LETTERS[i]}
                </span>
                <span className="quiz-question__option-label">{opt.label}</span>
                {active && (
                  <svg className="quiz-question__check" width="20" height="20" viewBox="0 0 20 20" fill="none">
                    <circle cx="10" cy="10" r="10" fill="var(--navy)" />
                    <path d="M6 10l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
              </button>
            );
          })}
        </div>

        <div className="quiz-question__actions">
          {canGoPrev && (
            <button className="quiz-question__btn-back" onClick={onPrev}>
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 7H2M6 3L2 7l4 4" />
              </svg>
              {t('btnBack')}
            </button>
          )}
          <div style={{ flex: 1 }} />
          {/* "Get Report" button on the last question (or last sub-question) when no further branching */}
          {showFinish && (
            <button className="quiz-question__btn-next" onClick={onNext}>
              {t('btnGetReport')}
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M2 7h10M8 3l4 4-4 4" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
