import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLang } from '@/context/LanguageContext';
import { publicApi } from '@/api/public';
import { useCtaTarget } from '@/hooks/useCtaTarget';
import './AboutPlatform.css';

export default function AboutPlatform() {
  const { t, lang } = useLang();
  const navigate = useNavigate();
  const ctaTarget = useCtaTarget('cta_about_test');

  const [counts, setCounts] = useState<{ total: number } | null>(null);
  useEffect(() => {
    Promise.all([publicApi.listTests(), publicApi.listTemplates()])
      .then(([a, b]) => setCounts({ total: (a.tests?.length ?? 0) + (b.templates?.length ?? 0) }))
      .catch(() => setCounts({ total: 0 }));
  }, []);

  function goToCatalog(e: React.MouseEvent) {
    e.preventDefault();
    // Admin-configured test target wins; otherwise scroll to the catalog.
    if (ctaTarget.kind === 'route') {
      navigate(ctaTarget.to);
      return;
    }
    const el = document.getElementById('resurse');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else {
      navigate('/');
      requestAnimationFrame(() => {
        document.getElementById('resurse')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    }
  }

  const title = t('aboutTitle');
  const [titleFirst, titleLast] = splitTitle(title);
  const eyebrow = lang === 'uk' ? 'ПРО НАС' : 'О НАС';
  const totalResources = counts?.total ?? 0;
  const stats = lang === 'uk'
    ? [
        { value: formatCount(totalResources), label: 'Шаблонів і тестів' },
        { value: '24/7', label: 'Онлайн-доступ' },
        { value: '8 хв', label: 'Час на тест' },
      ]
    : [
        { value: formatCount(totalResources), label: 'Шаблонов и тестов' },
        { value: '24/7', label: 'Онлайн-доступ' },
        { value: '8 мин', label: 'Время на тест' },
      ];

  return (
    <section className="about" data-section="about" id="about-platform">
      <div className="about__inner">
        <div className="about__copy">
          <span className="about__eyebrow">
            <span className="about__eyebrow-dot" aria-hidden />
            {eyebrow}
          </span>
          <h2 className="about__title">
            {titleFirst} <span className="about__title-accent">{titleLast}</span>
          </h2>

          <ul className="about__points">
            <AboutPoint icon="spark" text={t('aboutP1')} />
            <AboutPoint icon="docs"  text={t('aboutP2')} />
            <AboutPoint icon="check" text={t('aboutP3')} />
          </ul>

          <Link to="/" className="about__cta" onClick={goToCatalog}>
            {t('aboutCta')}
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M5 12h14M13 6l6 6-6 6"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </Link>
        </div>

        <div className="about__visual" aria-hidden>
          <div className="about__visual-card about__visual-card--main">
            <div className="about__visual-card-top">
              <span className="about__dot about__dot--red" />
              <span className="about__dot about__dot--amber" />
              <span className="about__dot about__dot--green" />
              <span className="about__visual-filename">bizcheck.platform</span>
            </div>
            <div className="about__visual-bars">
              <span style={{ width: '92%' }} />
              <span style={{ width: '78%' }} />
              <span style={{ width: '64%' }} />
              <span style={{ width: '85%' }} />
            </div>
            <div className="about__stats">
              {stats.map(s => (
                <div className="about__stat" key={s.label}>
                  <div className="about__stat-value">{s.value}</div>
                  <div className="about__stat-label">{s.label}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="about__visual-card about__visual-card--floating">
            <div className="about__visual-check">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
                <path d="M5 12l5 5L20 7" stroke="currentColor" strokeWidth="2.4"
                  strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <div>
              <div className="about__visual-check-title">
                {lang === 'uk' ? 'Перевірено юристами' : 'Проверено юристами'}
              </div>
              <div className="about__visual-check-sub">
                {lang === 'uk'
                  ? 'реальні документи від професіоналів'
                  : 'реальные документы от профессионалов'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function formatCount(n: number): string {
  if (n <= 0) return '—';
  if (n < 10) return String(n);
  const rounded = Math.floor(n / 10) * 10;
  return `${rounded}+`;
}

function splitTitle(title: string): [string, string] {
  const parts = title.trim().split(/\s+/);
  if (parts.length < 2) return [title, ''];
  const last = parts.pop() as string;
  return [parts.join(' '), last];
}

function AboutPoint({ icon, text }: { icon: 'spark' | 'docs' | 'check'; text: string }) {
  return (
    <li className="about__point">
      <span className={`about__point-icon about__point-icon--${icon}`}>
        {icon === 'spark' && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M13 2L4.5 13.5h6.5L10 22l8.5-11.5H12L13 2z"
              stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
        {icon === 'docs' && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z"
              stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M14 3v5h5" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
          </svg>
        )}
        {icon === 'check' && (
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
            <path d="M8 12l3 3 5-6" stroke="currentColor" strokeWidth="1.8"
              strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </span>
      <span>{text}</span>
    </li>
  );
}
