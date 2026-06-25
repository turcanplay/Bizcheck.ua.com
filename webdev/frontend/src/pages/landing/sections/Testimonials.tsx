import { useEffect, useRef, useState } from 'react';
import { useLang } from '@/context/LanguageContext';
import { publicApi, type PublicTestimonial } from '@/api/public';
import ReviewForm from './ReviewForm';
import './Testimonials.css';

export default function Testimonials() {
  const { t, lang } = useLang();
  const [items, setItems] = useState<PublicTestimonial[]>([]);
  const [showForm, setShowForm] = useState(false);

  // Native scroll-snap carousel: desktop shows ~3 cards + arrow buttons,
  // mobile shows one card per view with horizontal swipe.
  const cardsRef = useRef<HTMLDivElement>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  useEffect(() => {
    publicApi.listTestimonials().then(r => setItems(r.testimonials)).catch(() => {});
  }, []);

  function updateEdges() {
    const el = cardsRef.current;
    if (!el) return;
    setAtStart(el.scrollLeft <= 2);
    setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 2);
  }

  // Recompute reachable edges whenever the item set changes.
  useEffect(() => { updateEdges(); }, [items]);

  // Show the freshly-submitted review immediately (it's already live server-side).
  function handleSubmitted(created: PublicTestimonial) {
    setItems(prev => [...prev, created]);
  }

  function scrollByDir(dir: 1 | -1) {
    const el = cardsRef.current;
    if (!el) return;
    const card = el.querySelector<HTMLElement>('.testimonial-card');
    const step = card ? card.clientWidth + 20 : el.clientWidth; // 20 = gap
    el.scrollBy({ left: step * dir, behavior: 'smooth' });
  }

  return (
    <section className="testimonials" data-section="testimonials" id="testimonials">
      <div className="testimonials__header">
        <span className="testimonials__eyebrow">
          <span className="testimonials__eyebrow-dot" aria-hidden />
          {lang === 'uk' ? 'ВІДГУКИ' : 'REVIEWS'}
        </span>
        <h2 className="testimonials__title">
          {lang === 'uk' ? (
            <>Що кажуть наші <span className="testimonials__title-accent">клієнти</span>?</>
          ) : (
            <>What do our <span className="testimonials__title-accent">clients</span> say?</>
          )}
        </h2>
        <p className="testimonials__subtitle">
          {lang === 'uk'
            ? 'Реальний досвід компаній, які користуються Bizcheck.'
            : 'Real experiences from companies using Bizcheck.'}
        </p>
      </div>

      {items.length === 0 ? (
        <div className="testimonials__empty">{t('testimonialsEmpty')}</div>
      ) : (
        <div className="testimonials__row">
          <button className="testimonials__nav" onClick={() => scrollByDir(-1)} disabled={atStart} aria-label="Prev">
            <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
              <path d="M14 5l-6 6 6 6" stroke="#0F172A" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="testimonials__cards" ref={cardsRef} onScroll={updateEdges}>
            {items.map(t => {
              const quote = (lang === 'uk' ? t.quote_uk : t.quote_en) || t.quote_uk || t.quote_en;
              const initials = t.name.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
              return (
                <div key={t.id} className="testimonial-card">
                  <div className="testimonial-card__head">
                    <div className="testimonial-card__avatar">
                      {t.avatar_url
                        ? <img src={t.avatar_url} alt="" />
                        : <span>{initials || '?'}</span>}
                    </div>
                    <div>
                      <div className="testimonial-card__name">{t.name}</div>
                      {t.role && <div className="testimonial-card__role">{t.role}</div>}
                    </div>
                  </div>
                  <p className="testimonial-card__quote">"{quote}"</p>
                  <div className="testimonial-card__stars" aria-label={`${t.rating}/5`}>
                    {Array.from({ length: 5 }, (_, i) => {
                      // Fractional fill so a 4.5 rating shows a half star.
                      const frac = Math.max(0, Math.min(1, t.rating - i));
                      const gid = `star-${t.id}-${i}`;
                      return (
                        <svg key={i} width="14" height="14" viewBox="0 0 14 14" aria-hidden>
                          <defs>
                            <linearGradient id={gid}>
                              <stop offset={`${frac * 100}%`} stopColor="#F5C518" />
                              <stop offset={`${frac * 100}%`} stopColor="#E5E7EB" />
                            </linearGradient>
                          </defs>
                          <path d="M7 .7l1.9 4 4.4.6-3.1 3 .7 4.3L7 10.5 3.1 12.6l.7-4.3-3.1-3 4.4-.6z"
                                fill={`url(#${gid})`} />
                        </svg>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          <button className="testimonials__nav" onClick={() => scrollByDir(1)} disabled={atEnd} aria-label="Next">
            <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden>
              <path d="M8 5l6 6-6 6" stroke="#0F172A" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      )}

      <div className="review-cta-wrap">
        <button className="review-cta" onClick={() => setShowForm(true)}>
          <svg viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
          {t('reviewLeave')}
        </button>
      </div>

      {showForm && (
        <ReviewForm onClose={() => setShowForm(false)} onSubmitted={handleSubmitted} />
      )}
    </section>
  );
}
