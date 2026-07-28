import { useEffect, useMemo, useState } from 'react';
import { Helmet } from 'react-helmet-async';
import { useLang } from '@/context/LanguageContext';
import { faqSchema } from '@/components/seo/schema';
import { publicApi, type PublicFaqItem } from '@/api/public';
import './FAQ.css';

export default function FAQ() {
  const { t, lang } = useLang();
  const [items, setItems] = useState<PublicFaqItem[]>([]);
  const [openId, setOpenId] = useState<number | null>(null);

  useEffect(() => {
    publicApi.listFaq().then(r => {
      setItems(r.faq);
      if (r.faq.length > 0) setOpenId(r.faq[0].id); // open first by default
    }).catch(() => {});
  }, []);

  /** Resolve each row to the active language once, with a fallback to the other
   *  language so a half-translated row still renders (and still gets indexed). */
  const localized = useMemo(
    () => items.map(f => ({
      id: f.id,
      question: (lang === 'uk' ? f.question_uk : f.question_en) || f.question_uk || f.question_en,
      answer:   (lang === 'uk' ? f.answer_uk   : f.answer_en)   || f.answer_uk   || f.answer_en,
    })),
    [items, lang],
  );

  /** FAQPage rich result. Google rejects a Question without an answer, so rows
   *  missing either half are dropped rather than emitted empty. */
  const jsonLd = useMemo(() => {
    const usable = localized
      .filter(f => f.question?.trim() && f.answer?.trim())
      .map(f => ({ question: f.question.trim(), answer: f.answer.trim() }));
    return usable.length > 0 ? faqSchema(usable, lang) : null;
  }, [localized, lang]);

  function toggle(id: number) {
    setOpenId(curr => (curr === id ? null : id));
  }

  return (
    <section className="faq" data-section="faq" id="faq">
      {jsonLd && (
        <Helmet>
          <script type="application/ld+json">{JSON.stringify(jsonLd)}</script>
        </Helmet>
      )}
      <div className="faq__header">
        <span className="faq__eyebrow">
          <span className="faq__eyebrow-dot" aria-hidden />
          {lang === 'uk' ? 'ДОПОМОГА' : 'HELP'}
        </span>
        <h2 className="faq__title">
          {lang === 'uk' ? (
            <>Часті <span className="faq__title-accent">запитання</span></>
          ) : (
            <>Frequently asked <span className="faq__title-accent">questions</span></>
          )}
        </h2>
        <p className="faq__subtitle">
          {lang === 'uk'
            ? 'Відповіді на найпоширеніші запитання про платформу.'
            : 'Answers to the most common questions about the platform.'}
        </p>
      </div>

      <div className="faq__list">
        {items.length === 0 && <div className="faq__empty">{t('faqEmpty')}</div>}

        {localized.map((f, i) => {
          const { question, answer } = f;
          const isOpen = openId === f.id;
          const num = String(i + 1).padStart(2, '0');
          return (
            <div className={`faq-item ${isOpen ? 'is-open' : ''}`} key={f.id}>
              <button
                className="faq-item__head"
                onClick={() => toggle(f.id)}
                aria-expanded={isOpen}
              >
                <span className="faq-item__num">{num}</span>
                <span className="faq-item__question">{question}</span>
                <span className="faq-item__sign" aria-hidden>{isOpen ? '−' : '+'}</span>
              </button>
              {isOpen && answer && (
                <div className="faq-item__body">
                  <p>{answer}</p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
