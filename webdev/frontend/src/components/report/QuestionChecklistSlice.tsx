import type { Question, Answers } from '@/types';
import { useLang } from '@/context/LanguageContext';
import './QuestionChecklistSlice.css';

interface QuestionWithMeta {
  q: Question;
  blockTitle: string;
}

interface Props {
  questions: QuestionWithMeta[];   // up to 5 per page
  startNumber: number;               // global 1-based offset for this slice
  isFirstPage: boolean;              // show big title on page 1 only
  answers: Answers;
  selectedKeys: Record<string, string>;
}

/**
 * Standard-report per-page slice (up to 5 questions). Larger typography than
 * the block-based variant, so a single A4 page shows exactly 5 rows comfortably.
 */
export default function QuestionChecklistSlice({
  questions,
  startNumber,
  isFirstPage,
  answers,
  selectedKeys,
}: Props) {
  const { t } = useLang();

  return (
    <section className="qslice" data-pdf-section>
      {isFirstPage && (
        <header className="qslice__header">
          <div className="qslice__header-eyebrow">{t('checklistTitle')}</div>
          <h2 className="qslice__header-title">{t('checklistSubtitle')}</h2>
        </header>
      )}

      <ol className="qslice__list" start={startNumber}>
        {questions.map(({ q, blockTitle }, i) => {
          const answered = Object.prototype.hasOwnProperty.call(answers, q.id);
          const num = startNumber + i;

          if (!answered) {
            return (
              <li key={q.db_id} className="qslice__item qslice__item--skipped">
                <div className="qslice__num">{num}</div>
                <div className="qslice__body">
                  <div className="qslice__context">{blockTitle}</div>
                  <div className="qslice__text">{q.text}</div>
                  <div className="qslice__skip">{t('checklistNoAnswer')}</div>
                </div>
              </li>
            );
          }

          const score = answers[q.id];
          const selectedKey = selectedKeys[q.id];
          const selectedOption = q.options.find(o => o.key === selectedKey);
          const answerLabel = selectedOption?.label ?? '—';
          const maxScore = q.options.reduce((m, o) => Math.max(m, o.score), 0);
          const status = maxScore === 0
            ? 'pass'
            : score >= maxScore ? 'pass'
            : score <= 0         ? 'fail'
            : 'partial';

          return (
            <li key={q.db_id} className={`qslice__item qslice__item--${status}`}>
              <div className="qslice__num">{num}</div>
              <div className="qslice__body">
                <div className="qslice__context">{blockTitle}</div>
                <div className="qslice__text">{q.text}</div>
                <div className="qslice__answer">
                  <span className="qslice__answer-label">{t('checklistYourAnswer')}:</span>
                  <span className="qslice__answer-value">{answerLabel}</span>
                </div>
              </div>
              <div className={`qslice__badge qslice__badge--${status}`}>
                {status === 'pass' && (
                  <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path d="M3 7l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {status === 'fail' && (
                  <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" strokeLinecap="round" />
                  </svg>
                )}
                {status === 'partial' && (
                  <svg width="16" height="16" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.4">
                    <path d="M3 7h8" strokeLinecap="round" />
                  </svg>
                )}
                <span className="qslice__badge-text">
                  {status === 'pass' && t('checklistPass')}
                  {status === 'fail' && t('checklistFail')}
                  {status === 'partial' && t('checklistPartial')}
                </span>
              </div>
            </li>
          );
        })}
      </ol>
    </section>
  );
}
