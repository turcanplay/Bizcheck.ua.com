import { useEffect, useRef } from 'react';
import { useLang } from '@/context/LanguageContext';
import './CroweIntro.css';

function ExternalIcon() {
  return (
    <svg
      className="crowe__link-icon"
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      focusable="false"
    >
      <path d="M7 17 17 7" />
      <path d="M8 7h9v9" />
    </svg>
  );
}

export default function CroweIntro() {
  const { t } = useLang();
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;

    // Respect reduced-motion: show immediately, skip observer/animation.
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (reduce.matches) {
      el.classList.add('is-visible');
      return;
    }

    // Safety net: if IntersectionObserver is unavailable, reveal immediately so
    // the content is never stuck at opacity:0.
    if (typeof IntersectionObserver === 'undefined') {
      el.classList.add('is-visible');
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            el.classList.add('is-visible');
            observer.disconnect();
            break;
          }
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(el);

    return () => observer.disconnect();
  }, []);

  const name = t('croweName');

  return (
    <section
      className="crowe"
      data-section="crowe"
      id="crowe-intro"
      aria-label={t('croweTitle')}
      ref={sectionRef}
    >
      <div className="crowe__inner">
        <figure className="crowe__visual crowe-reveal crowe-reveal--photo">
          <div className="crowe__photo-backdrop" aria-hidden />
          <img
            className="crowe__photo"
            src="/images/about/ivan-turcan.png"
            alt={name}
            width={800}
            height={1200}
            loading="lazy"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
          <figcaption className="crowe__caption">
            <span className="crowe__caption-name">{name}</span>
            <span className="crowe__caption-role">{t('croweRole')}</span>
          </figcaption>
        </figure>

        <div className="crowe__copy crowe-reveal crowe-reveal--text">
          <span className="crowe__eyebrow">
            <span className="crowe__eyebrow-dot" aria-hidden />
            {t('croweEyebrow')}
          </span>
          <h2 className="crowe__title">{t('croweTitle')}</h2>

          <p className="crowe__body">{t('croweBody1')}</p>
          <p className="crowe__body">{t('croweBody2')}</p>
          <p className="crowe__body">{t('croweBody3')}</p>

          <p className="crowe__cta-hint">{t('croweCtaHint')}</p>
          <div className="crowe__links">
            <span className="crowe__link-wrap">
              <a
                className="crowe__link crowe__link--solid"
                href="https://turcan.md"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${t('croweBtnTurcan')} · ${t('croweVisitHint')}`}
              >
                <span className="crowe__link-main">
                  <span className="crowe__link-label">{t('croweBtnTurcan')}</span>
                  <span className="crowe__link-domain">turcan.md</span>
                </span>
                <ExternalIcon />
              </a>
              <span className="crowe__preview" aria-hidden>
                <span className="crowe__preview-media">
                  <img
                    className="crowe__preview-img"
                    src="/images/about/turcan-preview.jpg"
                    alt=""
                    width={1000}
                    height={600}
                    loading="lazy"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                </span>
                <span className="crowe__preview-bar">turcan.md</span>
              </span>
            </span>

            <span className="crowe__link-wrap">
              <a
                className="crowe__link crowe__link--gold"
                href="https://www.crowe.com/ua/crowemikhailenko/en-gb/moldova/"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`${t('croweBtnCrowe')} · ${t('croweVisitHint')}`}
              >
                <span className="crowe__link-main">
                  <span className="crowe__link-label">{t('croweBtnCrowe')}</span>
                  <span className="crowe__link-domain">crowe.com</span>
                </span>
                <ExternalIcon />
              </a>
              <span className="crowe__preview crowe__preview--shift" aria-hidden>
                <span className="crowe__preview-brand">
                  <img
                    className="crowe__preview-logo"
                    src="/logo-crowe.png"
                    alt=""
                    width={150}
                    height={40}
                    loading="lazy"
                    onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
                  />
                  <span className="crowe__preview-brand-title">{t('croweTitle')}</span>
                  <span className="crowe__preview-brand-sub">crowe.com · Moldova</span>
                </span>
              </span>
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}
