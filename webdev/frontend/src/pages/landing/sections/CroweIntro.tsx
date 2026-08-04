import { useEffect, useRef } from 'react';
import type { ReactNode, SyntheticEvent } from 'react';
import { useLang } from '@/context/LanguageContext';
import Picture from '@/components/ui/Picture';
import {
  CROWE_GLOBAL_LABEL,
  CROWE_GLOBAL_URL,
  CROWE_MOLDOVA_URL,
  MIKHAILENKO_LABEL,
  MIKHAILENKO_URL,
  TURCAN_LABEL,
  TURCAN_URL,
} from '@/config/contact';
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

/** Hide a broken image instead of leaving the browser's placeholder glyph. */
function hideOnError(e: SyntheticEvent<HTMLImageElement>) {
  (e.currentTarget as HTMLImageElement).style.display = 'none';
}

/** Navy card used as hover preview for sites we have no screenshot of. */
function BrandPreview({ title, domain, withLogo }: { title: string; domain: string; withLogo?: boolean }) {
  return (
    <span className="crowe__preview-brand">
      {withLogo && (
        <Picture
          className="crowe__preview-logo"
          src="/logo-crowe.png"
          alt=""
          width={465}
          height={138}
          onError={hideOnError}
        />
      )}
      <span className="crowe__preview-brand-title">{title}</span>
      <span className="crowe__preview-brand-sub">{domain}</span>
    </span>
  );
}

interface PersonLink {
  href: string;
  /** Site / person name shown on the button. */
  label: string;
  /** Bare domain shown under the label. */
  domain: string;
  tone: 'gold' | 'solid';
  /** Contents of the hover popover (pointer devices only). */
  preview: ReactNode;
}

interface PersonProps {
  photo: string;
  name: string;
  role: string;
  bio: string;
  links: PersonLink[];
  /** Suffix appended to each link's aria-label ("go to the official website"). */
  visitHint: string;
  /** Extra class driving the staggered scroll reveal. */
  revealClass: string;
}

function PartnerCard({ photo, name, role, bio, links, visitHint, revealClass }: PersonProps) {
  return (
    <article className={`crowe__person crowe-reveal ${revealClass}`}>
      <figure className="crowe__visual">
        <div className="crowe__photo-backdrop" aria-hidden />
        {/* Both busts are rendered on the same 800×750 canvas, heads at the
            same height and cropped by the bottom edge — the caption plaque
            below covers that crop line. */}
        <Picture
          className="crowe__photo"
          src={photo}
          alt={name}
          width={800}
          height={750}
          onError={hideOnError}
        />
        <figcaption className="crowe__caption">
          <span className="crowe__caption-name">{name}</span>
          <span className="crowe__caption-role">{role}</span>
        </figcaption>
      </figure>

      <p className="crowe__bio">{bio}</p>

      <div className="crowe__links">
        {links.map((link) => (
          <span className="crowe__link-wrap" key={link.href}>
            <a
              className={`crowe__link crowe__link--${link.tone}`}
              href={link.href}
              target="_blank"
              rel="noopener noreferrer"
              aria-label={`${link.label} · ${visitHint}`}
            >
              <span className="crowe__link-main">
                <span className="crowe__link-label">{link.label}</span>
                <span className="crowe__link-domain">{link.domain}</span>
              </span>
              <ExternalIcon />
            </a>
            <span className="crowe__preview" aria-hidden>
              {link.preview}
            </span>
          </span>
        ))}
      </div>
    </article>
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

  const visitHint = t('croweVisitHint');

  return (
    <section
      className="crowe"
      data-section="crowe"
      id="crowe-intro"
      aria-label={t('croweTitle')}
      ref={sectionRef}
    >
      <div className="crowe__inner">
        <header className="crowe__header crowe-reveal">
          <span className="crowe__eyebrow">
            <span className="crowe__eyebrow-dot" aria-hidden />
            {t('croweEyebrow')}
          </span>
          <h2 className="crowe__title">{t('croweTitle')}</h2>

          <p className="crowe__body">{t('croweBody1')}</p>
          <p className="crowe__body">{t('croweBody2')}</p>

          <p className="crowe__cta-hint">{t('croweCtaHint')}</p>
        </header>

        <div className="crowe__people">
          {/* Ukraine first, Moldova second — order is intentional. */}
          <PartnerCard
            photo="/images/about/dmytro-mykhailenko.png"
            name={t('croweUaName')}
            role={t('croweUaRole')}
            bio={t('croweUaBio')}
            visitHint={visitHint}
            revealClass="crowe-reveal--first"
            links={[
              {
                href: CROWE_GLOBAL_URL,
                label: t('croweBtnCrowe'),
                domain: CROWE_GLOBAL_LABEL,
                tone: 'gold',
                preview: (
                  <BrandPreview title={t('croweBtnCrowe')} domain={CROWE_GLOBAL_LABEL} withLogo />
                ),
              },
              {
                href: MIKHAILENKO_URL,
                label: t('croweBtnMikhailenko'),
                domain: MIKHAILENKO_LABEL,
                tone: 'solid',
                preview: (
                  <BrandPreview title={t('croweUaName')} domain={MIKHAILENKO_LABEL} />
                ),
              },
            ]}
          />

          <PartnerCard
            photo="/images/about/ivan-turcan-bust.png"
            name={t('croweName')}
            role={t('croweRole')}
            bio={t('croweMdBio')}
            visitHint={visitHint}
            revealClass="crowe-reveal--second"
            links={[
              {
                href: CROWE_MOLDOVA_URL,
                label: t('croweBtnCroweTm'),
                domain: CROWE_GLOBAL_LABEL,
                tone: 'gold',
                preview: (
                  <BrandPreview title={t('croweBtnCroweTm')} domain={CROWE_GLOBAL_LABEL} withLogo />
                ),
              },
              {
                href: TURCAN_URL,
                label: t('croweBtnTurcan'),
                domain: TURCAN_LABEL,
                tone: 'solid',
                preview: (
                  <>
                    <span className="crowe__preview-media">
                      <Picture
                        className="crowe__preview-img"
                        src="/images/about/turcan-preview.jpg"
                        alt=""
                        width={820}
                        height={492}
                        onError={hideOnError}
                      />
                    </span>
                    <span className="crowe__preview-bar">{TURCAN_LABEL}</span>
                  </>
                ),
              },
            ]}
          />
        </div>
      </div>
    </section>
  );
}
