import { useEffect, useState, type FormEvent } from 'react';
import { useLang } from '@/context/LanguageContext';
import { publicApi, type PublicTestimonial } from '@/api/public';
import { sanitizeOneLine, sanitizeText, validateField } from '@/utils/inputGuard';
import './ReviewForm.css';

const NAME_MAX = 100;
const ROLE_MAX = 150;
const REVIEW_MAX = 600;
const REVIEW_MIN = 3;

interface Props {
  onClose: () => void;
  /** Called with the newly created review so the list can update instantly. */
  onSubmitted: (created: PublicTestimonial) => void;
}

export default function ReviewForm({ onClose, onSubmitted }: Props) {
  const { t, lang } = useLang();
  const [name, setName] = useState('');
  const [role, setRole] = useState('');
  const [quote, setQuote] = useState('');
  const [rating, setRating] = useState(5);
  const [hover, setHover] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);

  // Close on Escape — matches the rest of the landing's overlay behavior.
  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');

    // Sanitize client-side (server re-sanitizes regardless).
    const cleanName = sanitizeOneLine(name, NAME_MAX);
    const cleanRole = sanitizeOneLine(role, ROLE_MAX);
    const cleanQuote = sanitizeText(quote, REVIEW_MAX);

    if (validateField(cleanName, { required: true, min: 2 })) { setError(t('reviewErrName')); return; }
    if (validateField(cleanQuote, { required: true, min: REVIEW_MIN })) { setError(t('reviewErrText')); return; }

    setBusy(true);
    try {
      const { testimonial } = await publicApi.submitTestimonial({
        name: cleanName,
        role: cleanRole || null,
        quote: cleanQuote,
        rating: Math.max(1, Math.min(5, Math.round(rating))),
        lang, // store the review in the language the user is browsing in
      });
      setDone(true);
      onSubmitted(testimonial);
      // Brief success state, then auto-close.
      setTimeout(onClose, 1600);
    } catch (err) {
      const status = (err as { status?: number }).status;
      setError(status === 429 ? t('reviewErrRate') : t('reviewErrGeneric'));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="review-overlay" onClick={onClose}>
      <form className="review-modal" onClick={e => e.stopPropagation()} onSubmit={onSubmit}>
        <button type="button" className="review-modal__close" onClick={onClose} aria-label="Close">×</button>

        {done ? (
          <div className="review-modal__success">
            <div className="review-modal__success-icon">✓</div>
            <p>{t('reviewThanks')}</p>
          </div>
        ) : (
          <>
            <h3 className="review-modal__title">{t('reviewFormTitle')}</h3>
            <p className="review-modal__subtitle">{t('reviewFormSubtitle')}</p>

            <div className="review-field">
              <label>{t('reviewRating')}</label>
              <div className="review-stars" role="radiogroup" aria-label={t('reviewRating')}>
                {[1, 2, 3, 4, 5].map(n => (
                  <button
                    type="button"
                    key={n}
                    className={`review-star ${(hover || rating) >= n ? 'is-on' : ''}`}
                    onMouseEnter={() => setHover(n)}
                    onMouseLeave={() => setHover(0)}
                    onClick={() => setRating(n)}
                    aria-label={`${n}/5`}
                    aria-checked={rating === n}
                    role="radio"
                  >
                    <svg width="30" height="30" viewBox="0 0 14 14" aria-hidden>
                      <path d="M7 .7l1.9 4 4.4.6-3.1 3 .7 4.3L7 10.5 3.1 12.6l.7-4.3-3.1-3 4.4-.6z" fill="currentColor" />
                    </svg>
                  </button>
                ))}
              </div>
            </div>

            <div className="review-field">
              <label htmlFor="rv-name">{t('reviewName')}</label>
              <input
                id="rv-name"
                value={name}
                maxLength={NAME_MAX}
                autoFocus
                onChange={e => setName(sanitizeOneLine(e.target.value, NAME_MAX))}
                placeholder={t('reviewNamePh')}
              />
            </div>

            <div className="review-field">
              <label htmlFor="rv-role">{t('reviewRole')}</label>
              <input
                id="rv-role"
                value={role}
                maxLength={ROLE_MAX}
                onChange={e => setRole(sanitizeOneLine(e.target.value, ROLE_MAX))}
                placeholder={t('reviewRolePh')}
              />
            </div>

            <div className="review-field">
              <label htmlFor="rv-quote">{t('reviewText')}</label>
              <textarea
                id="rv-quote"
                value={quote}
                maxLength={REVIEW_MAX}
                onChange={e => setQuote(sanitizeText(e.target.value, REVIEW_MAX))}
                placeholder={t('reviewTextPh')}
              />
              <span className="review-counter">{quote.length}/{REVIEW_MAX}</span>
            </div>

            {error && <div className="review-error">⚠️ {error}</div>}

            <button type="submit" className="review-submit" disabled={busy}>
              {busy ? t('reviewSending') : t('reviewSubmit')}
            </button>
          </>
        )}
      </form>
    </div>
  );
}
