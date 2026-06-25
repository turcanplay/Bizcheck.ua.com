import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLang } from '@/context/LanguageContext';
import { publicApi, type PublicTest, type PublicTemplate, type PublicTestimonial } from '@/api/public';
import { useCtaTarget } from '@/hooks/useCtaTarget';
import { sanitizeOneLine } from '@/utils/inputGuard';
import './Hero.css';

const RECENT_KEY = 'bizcheck_recent_searches';
const MAX_RECENT = 5;

interface UnifiedHit {
  kind: 'test' | 'template';
  slug: string;
  title: string;
  is_paid: boolean;
}

function loadRecents(): string[] {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.filter(x => typeof x === 'string').slice(0, MAX_RECENT) : [];
  } catch { return []; }
}
function saveRecent(q: string) {
  if (!q.trim()) return;
  const cur = loadRecents().filter(x => x.toLowerCase() !== q.toLowerCase());
  cur.unshift(q.trim());
  localStorage.setItem(RECENT_KEY, JSON.stringify(cur.slice(0, MAX_RECENT)));
}

const STOPWORDS = new Set(['the', 'a', 'an', 'of', 'for', 'to', 'in', 'on', 'and', 'or', 'with', 'і', 'та', 'для', 'на', 'в', 'у', 'з', 'по', 'до', 'що']);
function tokenize(s: string): string[] {
  return s.toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/).filter(Boolean).filter(t => !STOPWORDS.has(t));
}

export default function Hero() {
  const { t, lang, setLang } = useLang();
  const navigate = useNavigate();
  const heroCtaTarget = useCtaTarget('cta_hero_test');

  // Search state
  const inputRef = useRef<HTMLInputElement>(null);
  const searchBoxRef = useRef<HTMLDivElement>(null);
  const [query, setQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [recents, setRecents] = useState<string[]>(loadRecents);

  // Menu state
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  // Data
  const [tests, setTests] = useState<PublicTest[]>([]);
  const [templates, setTemplates] = useState<PublicTemplate[]>([]);
  const [testimonials, setTestimonials] = useState<PublicTestimonial[]>([]);

  useEffect(() => {
    Promise.all([publicApi.listTests(), publicApi.listTemplates()])
      .then(([a, b]) => { setTests(a.tests); setTemplates(b.templates); })
      .catch(() => {});
    publicApi.listTestimonials()
      .then(r => setTestimonials(r.testimonials ?? []))
      .catch(() => {});
  }, []);

  const ratingStats = useMemo(() => {
    const REVIEW_BASE = 55; // numărătoarea pornește de la 55, apoi se adaugă recenziile reale
    if (testimonials.length === 0) return { avg: '—', avgNum: 0, count: REVIEW_BASE };
    const sum = testimonials.reduce((s, x) => s + (x.rating || 0), 0);
    const avg = sum / testimonials.length;
    // Comma as decimal separator (RO/RU convention): 4.5 → "4,5".
    return { avg: avg.toFixed(1).replace('.', ','), avgNum: avg, count: REVIEW_BASE + testimonials.length };
  }, [testimonials]);

  // Close on outside click
  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (searchBoxRef.current && !searchBoxRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
      if (menuBtnRef.current && !menuBtnRef.current.parentElement?.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  // Build unified hit list (RO+RU + features + category — search hits anything)
  const hits: UnifiedHit[] = useMemo(() => {
    if (!query.trim()) return [];
    const tokens = tokenize(query);
    if (tokens.length === 0) return [];

    function score(haystack: string): number {
      const hay = haystack.toLowerCase();
      let s = 0;
      for (const t of tokens) {
        if (hay.includes(t)) s += 2;
        // partial keyword bonus
        if (hay.split(/\s+/).some(w => w.startsWith(t))) s += 1;
      }
      return s;
    }

    const all: Array<UnifiedHit & { _score: number }> = [];
    tests.forEach(t => {
      const haystack = [t.name_uk, t.name_en, t.description_uk, t.description_en,
                        t.category ?? '', (t.features ?? []).join(' ')].join(' ');
      const sc = score(haystack);
      if (sc > 0) all.push({ kind: 'test', slug: t.slug, title: lang === 'uk' ? t.name_uk : t.name_en, is_paid: t.is_paid, _score: sc });
    });
    templates.forEach(tp => {
      const haystack = [tp.title_uk, tp.title_en, tp.description_uk, tp.description_en,
                        tp.category ?? '', (tp.features ?? []).join(' ')].join(' ');
      const sc = score(haystack);
      if (sc > 0) all.push({ kind: 'template', slug: tp.slug, title: lang === 'uk' ? tp.title_uk : tp.title_en, is_paid: tp.is_paid, _score: sc });
    });
    return all.sort((a, b) => b._score - a._score).slice(0, 8);
  }, [query, tests, templates, lang]);

  function focusSearch() {
    setSearchOpen(true);
    setTimeout(() => inputRef.current?.focus(), 0);
  }

  function submitSearch(qOverride?: string) {
    const q = (qOverride ?? query).trim();
    if (q) saveRecent(q);
    setRecents(loadRecents());
    setSearchOpen(false);
    navigate(`/?q=${encodeURIComponent(q)}`);
    requestAnimationFrame(() => {
      document.getElementById('resurse')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  function clickHit(h: UnifiedHit) {
    saveRecent(query);
    setSearchOpen(false);
    if (h.kind === 'test') {
      navigate(h.is_paid ? `/plata/test/${h.slug}` : `/test/${h.slug}`);
    } else {
      navigate(h.is_paid ? `/plata/sablon/${h.slug}` : `/sablon/${h.slug}`);
    }
  }

  function jumpToSection(id: string, params?: string) {
    setMenuOpen(false);
    if (params) {
      navigate(`/?${params}`);
    } else if (window.location.pathname !== '/') {
      navigate('/');
    }
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      history.replaceState(null, '', window.location.pathname + window.location.search);
    });
  }

  // Hero CTA: go to the admin-configured test, or fall back to the catalog.
  function handleHeroCta(e: React.MouseEvent) {
    e.preventDefault();
    if (heroCtaTarget.kind === 'route') {
      navigate(heroCtaTarget.to);
    } else {
      jumpToSection('resurse', 'tab=tests');
    }
  }

  return (
    <header className="hero" data-section="hero">
      <div className="hero__bg" aria-hidden>
        <img src="/images/hero/Vector1.png" alt="" className="hero__bg-img hero__bg-img--right" />
      </div>

      <nav className="hero__nav">
        <Link to="/" className="hero__logo" aria-label="Bizcheck.md">
          <span className="hero__logo-text">Bizcheck<span className="hero__logo-dot">.md</span></span>
        </Link>

        <div className="hero__search" ref={searchBoxRef}>
          <button
            type="button"
            ref={menuBtnRef}
            className="hero__search-menu-btn"
            onClick={() => { setMenuOpen(o => !o); setSearchOpen(false); }}
            aria-label="Швидке меню"
            aria-expanded={menuOpen}
          >
            <svg width="14" height="10" viewBox="0 0 14 10" aria-hidden>
              <path d="M1 1h12M1 5h12M1 9h12" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          <input
            ref={inputRef}
            type="text"
            placeholder={t('heroSearchPh')}
            aria-label={t('heroSearchPh')}
            value={query}
            maxLength={120}
            onChange={e => { setQuery(sanitizeOneLine(e.target.value, 120)); setSearchOpen(true); }}
            onFocus={() => setSearchOpen(true)}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); submitSearch(); }
              if (e.key === 'Escape') setSearchOpen(false);
            }}
          />

          <button type="button" className="hero__search-icon-btn" onClick={focusSearch} aria-label="Пошук">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
              <circle cx="7" cy="7" r="5" stroke="#6B7280" strokeWidth="1.5" fill="none" />
              <path d="M11 11l4 4" stroke="#6B7280" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
          </button>

          {/* Hamburger dropdown menu */}
          {menuOpen && (
            <div className="hero__menu" role="menu">
              <MenuItem accent="blue"    icon="book"    label={t('menuJumpAbout')}       onClick={() => jumpToSection('about-platform')} />
              <MenuItem accent="amber"   icon="star"    label={t('menuJumpWhy')}         onClick={() => jumpToSection('why-bizcheck')} />
              <MenuItem accent="violet"  icon="grid"    label={t('menuJumpCatalog')}     onClick={() => jumpToSection('resurse')} />
              <MenuItem accent="emerald" icon="beaker"  label={t('menuJumpTests')}       onClick={() => jumpToSection('resurse', 'tab=tests')} />
              <MenuItem accent="indigo"  icon="doc"     label={t('menuJumpTemplates')}   onClick={() => jumpToSection('resurse', 'tab=templates')} />
              <MenuItem accent="rose"    icon="chat"    label={t('menuJumpTestimonials')} onClick={() => jumpToSection('testimonials')} />
              <MenuItem accent="pink"    icon="help"    label={t('menuJumpFaq')}         onClick={() => jumpToSection('faq')} />
            </div>
          )}

          {/* Search dropdown */}
          {searchOpen && !menuOpen && (
            <div className="hero__search-dropdown" role="listbox">
              {query.trim() && hits.length > 0 && (
                <>
                  <div className="hero__search-section">{t('searchSuggestions')}</div>
                  {hits.map(h => (
                    <button
                      key={`${h.kind}-${h.slug}`}
                      type="button"
                      className="hero__search-hit"
                      onMouseDown={(e) => { e.preventDefault(); clickHit(h); }}
                    >
                      <span className="hero__search-hit-icon">{h.kind === 'test' ? '🧪' : '📄'}</span>
                      <span className="hero__search-hit-title">{h.title || h.slug}</span>
                      <span className={`hero__search-hit-badge ${h.is_paid ? 'is-premium' : 'is-basic'}`}>
                        {h.is_paid ? 'Premium' : 'Basic'}
                      </span>
                    </button>
                  ))}
                  <button
                    type="button"
                    className="hero__search-all"
                    onMouseDown={(e) => { e.preventDefault(); submitSearch(); }}
                  >
                    🔍 {t('searchSeeAll')} →
                  </button>
                </>
              )}

              {query.trim() && hits.length === 0 && (
                <div className="hero__search-empty">{t('searchNoResults')}</div>
              )}

              {!query.trim() && recents.length > 0 && (
                <>
                  <div className="hero__search-section">{t('searchRecent')}</div>
                  {recents.map(r => (
                    <button
                      key={r}
                      type="button"
                      className="hero__search-hit hero__search-hit--recent"
                      onMouseDown={(e) => { e.preventDefault(); setQuery(r); submitSearch(r); }}
                    >
                      <span className="hero__search-hit-icon">🕘</span>
                      <span className="hero__search-hit-title">{r}</span>
                    </button>
                  ))}
                </>
              )}
            </div>
          )}
        </div>

        <div className="hero__nav-actions">
          <button
            type="button"
            className="hero__nav-tests"
            onClick={() => jumpToSection('resurse', 'tab=tests')}
          >
            {t('navTests')}
            <svg width="15" height="15" viewBox="0 0 16 16" aria-hidden>
              <path d="M8 3v10M3 8l5 5 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </button>
          <div className="hero__lang">
            <button className={`hero__lang-btn ${lang === 'uk' ? 'is-active' : ''}`} onClick={() => setLang('uk')}>UA</button>
            <button className={`hero__lang-btn ${lang === 'en' ? 'is-active' : ''}`} onClick={() => setLang('en')}>EN</button>
          </div>
        </div>
      </nav>

      <div className="hero__body">
        <div className="hero__copy">
          <span className="hero__eyebrow">
            <span className="hero__eyebrow-dot" aria-hidden />
            {t('heroEyebrowLanding')}
          </span>
          <h1 className="hero__title">
            <span className="hero__title-accent">{t('heroTitleLine1')}</span><br />
            {t('heroTitleLine2')}
          </h1>
          <p className="hero__desc">{t('heroDescLanding')}</p>

          <Link to="/" className="hero__cta" onClick={handleHeroCta}>
            {t('heroCta')}
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
              <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
            </svg>
          </Link>

          <div className="hero__trust">
            <div className="hero__avatars" aria-hidden>
              <span className="hero__avatar" style={{ background: 'linear-gradient(135deg,#4A63FF,#2D4BFF)' }}>
                <svg viewBox="0 0 36 36" fill="none">
                  <circle cx="18" cy="13" r="5" fill="rgba(255,255,255,0.95)" />
                  <path d="M6 32c0-6.6 5.4-11 12-11s12 4.4 12 11" fill="rgba(255,255,255,0.95)" />
                </svg>
              </span>
              <span className="hero__avatar" style={{ background: 'linear-gradient(135deg,#FFB97A,#FF8A2B)' }}>
                <svg viewBox="0 0 36 36" fill="none">
                  <circle cx="18" cy="13" r="5" fill="rgba(255,255,255,0.95)" />
                  <path d="M6 32c0-6.6 5.4-11 12-11s12 4.4 12 11" fill="rgba(255,255,255,0.95)" />
                </svg>
              </span>
              <span className="hero__avatar" style={{ background: 'linear-gradient(135deg,#7ED99A,#3FAE5C)' }}>
                <svg viewBox="0 0 36 36" fill="none">
                  <circle cx="18" cy="13" r="5" fill="rgba(255,255,255,0.95)" />
                  <path d="M6 32c0-6.6 5.4-11 12-11s12 4.4 12 11" fill="rgba(255,255,255,0.95)" />
                </svg>
              </span>
              <span className="hero__avatar hero__avatar--more" aria-label="more">
                <span>130+</span>
              </span>
            </div>
            <div>
              <div className="hero__trust-title">{t('heroTrustTitle')}</div>
              <div className="hero__trust-sub">{t('heroTrustSub')}</div>
            </div>
          </div>
        </div>

        <div className="hero__art">
          <div className="hero__badge hero__badge--rating">
            <div className="hero__stars" aria-hidden>
              {Array.from({ length: 5 }, (_, i) => (
                <Star key={i} fill={starFill(ratingStats.avgNum, i)} />
              ))}
            </div>
            <div className="hero__badge-num">{ratingStats.avg}<span>/5</span></div>
            <div className="hero__badge-sub">
              {ratingStats.count === 0
                ? (lang === 'uk' ? 'відгуки незабаром' : 'reviews coming soon')
                : (lang === 'uk'
                    ? `з ${ratingStats.count}${ratingStats.count >= 10 ? '+' : ''} відгуків`
                    : `from ${ratingStats.count}${ratingStats.count >= 10 ? '+' : ''} reviews`)}
            </div>
          </div>

          <div className="hero__badge hero__badge--purchases">
            <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
              <circle cx="7" cy="7" r="3" fill="#2D4BFF" />
              <circle cx="13" cy="7" r="3" fill="#2D4BFF" opacity=".6" />
              <path d="M2 17c1-3 3.5-4.5 5-4.5s4 1.5 5 4.5M9 17c1-3 3.5-4.5 5-4.5s4 1.5 5 4.5"
                    stroke="#2D4BFF" strokeWidth="1.5" strokeLinecap="round" fill="none" />
            </svg>
            <div>
              <div className="hero__badge-num">+130</div>
              <div className="hero__badge-sub">{t('heroPurchasesSub')}</div>
            </div>
          </div>

          <img
            className="hero__laptop"
            src="/images/hero/laptop.png"
            alt="Bizcheck.md marketplace preview"
            onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      </div>
    </header>
  );
}

function Star({ fill = 1 }: { fill?: number }) {
  const pct = Math.max(0, Math.min(1, fill));
  const id = `star-grad-${Math.random().toString(36).slice(2, 9)}`;
  return (
    <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="0">
          <stop offset={`${pct * 100}%`} stopColor="#F5C518" />
          <stop offset={`${pct * 100}%`} stopColor="#E5E7EB" />
        </linearGradient>
      </defs>
      <path d="M7 .7l1.9 4 4.4.6-3.1 3 .7 4.3L7 10.5 3.1 12.6l.7-4.3-3.1-3 4.4-.6z" fill={`url(#${id})`} />
    </svg>
  );
}

function starFill(avg: number, index: number): number {
  const diff = avg - index;
  if (diff >= 1) return 1;
  if (diff <= 0) return 0;
  return diff;
}

type MenuIcon = 'book' | 'star' | 'grid' | 'beaker' | 'doc' | 'chat' | 'help';
type MenuAccent = 'blue' | 'amber' | 'violet' | 'emerald' | 'indigo' | 'rose' | 'pink';

function MenuItem({ icon, label, accent, onClick }: {
  icon: MenuIcon; label: string; accent: MenuAccent; onClick: () => void;
}) {
  return (
    <button className={`hero__menu-item hero__menu-item--${accent}`} onClick={onClick}>
      <span className="hero__menu-icon">{renderMenuIcon(icon)}</span>
      <span className="hero__menu-label">{label}</span>
      <svg className="hero__menu-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  );
}

function renderMenuIcon(icon: MenuIcon) {
  const c = 'currentColor';
  const w = 1.8;
  switch (icon) {
    case 'book':
      return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M4 5a2 2 0 0 1 2-2h6v18H6a2 2 0 0 1-2-2V5zM12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6V3z"
          stroke={c} strokeWidth={w} strokeLinejoin="round" />
      </svg>);
    case 'star':
      return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9L12 3z"
          stroke={c} strokeWidth={w} strokeLinejoin="round" />
      </svg>);
    case 'grid':
      return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect x="3" y="3" width="7" height="7" rx="1.6" stroke={c} strokeWidth={w} />
        <rect x="14" y="3" width="7" height="7" rx="1.6" stroke={c} strokeWidth={w} />
        <rect x="3" y="14" width="7" height="7" rx="1.6" stroke={c} strokeWidth={w} />
        <rect x="14" y="14" width="7" height="7" rx="1.6" stroke={c} strokeWidth={w} />
      </svg>);
    case 'beaker':
      return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M9 3h6M10 3v7L5 19a2 2 0 0 0 1.7 3h10.6A2 2 0 0 0 19 19l-5-9V3"
          stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
        <path d="M7.5 15h9" stroke={c} strokeWidth={w} strokeLinecap="round" />
      </svg>);
    case 'doc':
      return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5z"
          stroke={c} strokeWidth={w} strokeLinejoin="round" />
        <path d="M14 3v5h5M9 13h6M9 17h4" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" />
      </svg>);
    case 'chat':
      return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path d="M21 12a8 8 0 1 1-3.1-6.3L21 4l-1 3.5A8 8 0 0 1 21 12z"
          stroke={c} strokeWidth={w} strokeLinejoin="round" />
        <path d="M8 11h8M8 14h5" stroke={c} strokeWidth={w} strokeLinecap="round" />
      </svg>);
    case 'help':
      return (<svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
        <circle cx="12" cy="12" r="9" stroke={c} strokeWidth={w} />
        <path d="M9.5 9a2.5 2.5 0 1 1 3.5 2.3c-.8.4-1 .8-1 1.7"
          stroke={c} strokeWidth={w} strokeLinecap="round" />
        <circle cx="12" cy="16.5" r="1" fill={c} />
      </svg>);
  }
}
