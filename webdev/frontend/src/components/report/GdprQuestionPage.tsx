import type { Question, Answers } from '@/types';
import { useLang } from '@/context/LanguageContext';
import { findGdprExplanation } from '@/data/gdprExplanations';
import './GdprQuestionPage.css';

interface Props {
  q: Question;
  number: number;                       // 1-based question position == explanation order
  answers: Answers;
  selectedKeys: Record<string, string>;
}

/**
 * GDPR report — one page per question. The question text and the user's answer
 * sit at the top (same "form" as the rest of the report); below them follows the
 * fixed explanation for that question (intro / risk / action), in RO or RU.
 *
 * The whole page is captured and scaled to A4 by pdfGenerator, so longer
 * explanations simply render at a slightly smaller scale — never clipped.
 */
export default function GdprQuestionPage({ q, number, answers, selectedKeys }: Props) {
  const { t, lang } = useLang();
  const explanation = findGdprExplanation(number);

  const answered = Object.prototype.hasOwnProperty.call(answers, q.id);
  const selectedKey = selectedKeys[q.id];
  const selectedOption = q.options.find(o => o.key === selectedKey);
  const answerLabel = selectedOption?.label ?? '—';

  return (
    <section className="gdpr-q" data-pdf-section>
      {/* ── Question header: number + text + given answer ── */}
      <header className="gdpr-q__top">
        <div className="gdpr-q__num">{number}</div>
        <div className="gdpr-q__head-right">
          <div className="gdpr-q__eyebrow">{t('gdprQuestionLabel')} {number}</div>
          <h2 className="gdpr-q__question">{q.text}</h2>
          <div className="gdpr-q__answer">
            <span className="gdpr-q__answer-label">{t('checklistYourAnswer')}:</span>
            {answered ? (
              <span className="gdpr-q__answer-value">{answerLabel}</span>
            ) : (
              <span className="gdpr-q__answer-skip">{t('checklistNoAnswer')}</span>
            )}
          </div>
        </div>
      </header>

      {explanation && (
        <>
          <h3 className="gdpr-q__title">{explanation.title[lang]}</h3>

          {explanation.intro[lang].length > 0 && (
            <div className="gdpr-q__paragraphs gdpr-q__paragraphs--intro">
              {explanation.intro[lang].map((p, i) => (
                <p key={i} className="gdpr-q__p">{p}</p>
              ))}
            </div>
          )}

          <div className="gdpr-q__section">
            <h4 className="gdpr-q__section-title gdpr-q__section-title--risk">
              {t('blockRiskLabel')}
            </h4>
            <div className="gdpr-q__paragraphs">
              {explanation.risk[lang].map((p, i) => (
                <p key={i} className="gdpr-q__p">{p}</p>
              ))}
            </div>
          </div>

          <div className="gdpr-q__section">
            <h4 className="gdpr-q__section-title gdpr-q__section-title--action">
              {t('blockActionLabel')}
            </h4>
            <div className="gdpr-q__paragraphs">
              {explanation.action[lang].map((p, i) => (
                <p key={i} className="gdpr-q__p">{p}</p>
              ))}
            </div>
          </div>
        </>
      )}
    </section>
  );
}
