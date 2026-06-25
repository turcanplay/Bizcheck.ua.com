import type { Block, Answers } from '@/types';
import { useLang } from '@/context/LanguageContext';
import './QuestionChecklistPage.css';

interface Props {
  block: Block;
  blockIndex: number;        // 0-based block order
  blockScore: number;         // rounded total block %
  answers: Answers;
  selectedKeys: Record<string, string>;
}

/**
 * Standard-report page: for one block, list every question with the user's
 * answer and a pass/fail badge (derived from score: 1 → pass, 0 → fail, else
 * partial). Replaces per-block explanation pages for the 'standard' variant.
 */
export default function QuestionChecklistPage({
  block,
  blockIndex,
  blockScore,
  answers,
  selectedKeys,
}: Props) {
  const { t } = useLang();

  // Top-level questions only — sub-questions (branching) are skipped for clarity.
  // They're answered but not shown as separate rows here.
  const topLevel = block.questions.filter(q => !q.parent_question_id);

  return (
    <section className="qchecklist" data-pdf-section>
      <header className="qchecklist__header">
        <div className="qchecklist__header-bar">
          <div className="qchecklist__header-label">
            {t('blockLabel')} {blockIndex + 1}
          </div>
          <div className="qchecklist__header-score" data-score-state={zoneOfScore(blockScore)}>
            {blockScore}%
          </div>
        </div>
        <h2 className="qchecklist__title">{block.title}</h2>
        <p className="qchecklist__subtitle">{t('checklistSubtitle')}</p>
      </header>

      <ol className="qchecklist__list">
        {topLevel.map((q, i) => {
          const answered = Object.prototype.hasOwnProperty.call(answers, q.id);
          if (!answered) {
            return (
              <li key={q.db_id} className="qchecklist__item qchecklist__item--skipped">
                <div className="qchecklist__item-num">{i + 1}</div>
                <div className="qchecklist__item-body">
                  <div className="qchecklist__item-text">{q.text}</div>
                  <div className="qchecklist__item-answer qchecklist__item-answer--skip">
                    {t('checklistNoAnswer')}
                  </div>
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
            <li key={q.db_id} className={`qchecklist__item qchecklist__item--${status}`}>
              <div className="qchecklist__item-num">{i + 1}</div>
              <div className="qchecklist__item-body">
                <div className="qchecklist__item-text">{q.text}</div>
                <div className="qchecklist__item-answer-row">
                  <span className="qchecklist__item-answer-label">{t('checklistYourAnswer')}:</span>
                  <span className="qchecklist__item-answer-value">{answerLabel}</span>
                </div>
              </div>
              <div className={`qchecklist__badge qchecklist__badge--${status}`}>
                {status === 'pass' && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M3 7l3 3 5-6" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {status === 'fail' && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M3.5 3.5l7 7M10.5 3.5l-7 7" strokeLinecap="round" />
                  </svg>
                )}
                {status === 'partial' && (
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2.2">
                    <path d="M3 7h8" strokeLinecap="round" />
                  </svg>
                )}
                <span className="qchecklist__badge-text">
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

function zoneOfScore(pct: number): 'safe' | 'developing' | 'warning' | 'risk' {
  if (pct >= 80) return 'safe';
  if (pct >= 70) return 'developing';
  if (pct >= 65) return 'warning';
  return 'risk';
}
