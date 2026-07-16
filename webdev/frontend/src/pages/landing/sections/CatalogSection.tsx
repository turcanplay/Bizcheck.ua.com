import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useLang } from '@/context/LanguageContext';
import { publicApi, type PublicTest, type PublicTemplate } from '@/api/public';
import { useCtaTarget } from '@/hooks/useCtaTarget';
import { sanitizeOneLine } from '@/utils/inputGuard';
import './CatalogSection.css';

type Tab = 'all' | 'tests' | 'templates';
type PriceFilter = 'free' | 'paid';

interface UnifiedItem {
  kind: 'test' | 'template';
  id: number;
  slug: string;
  title_uk: string;
  title_en: string;
  desc_uk: string;
  desc_en: string;
  is_paid: boolean;
  is_active: boolean;
  is_coming_soon: boolean;
  price: number | null;
  currency: string;
  category: string | null;
  features: string[];
}

/**
 * Read the catalog filters out of `?q=...&tab=...`.
 *
 * `location.search` comes from react-router (not from `window`), so this is safe
 * to call during render — including in a lazy useState initializer.
 */
function readUrlFilters(search: string): { q: string | null; tab: Tab | null } {
  const params = new URLSearchParams(search);
  const tabParam = params.get('tab');
  return {
    q: params.get('q'),
    tab: tabParam === 'tests' || tabParam === 'templates' || tabParam === 'all' ? tabParam : null,
  };
}

function toUnified(tests: PublicTest[], templates: PublicTemplate[]): UnifiedItem[] {
  const a: UnifiedItem[] = tests.map(t => ({
    kind: 'test', id: t.id, slug: t.slug,
    title_uk: t.name_uk, title_en: t.name_en,
    desc_uk: t.description_uk, desc_en: t.description_en,
    is_paid: t.is_paid, is_active: t.is_active, is_coming_soon: t.is_coming_soon ?? false,
    price: t.price, currency: t.currency, category: t.category,
    features: t.features ?? [],
  }));
  const b: UnifiedItem[] = templates.map(t => ({
    kind: 'template', id: t.id, slug: t.slug,
    title_uk: t.title_uk, title_en: t.title_en,
    desc_uk: t.description_uk, desc_en: t.description_en,
    is_paid: t.is_paid, is_active: t.is_active, is_coming_soon: t.is_coming_soon ?? false,
    price: t.price, currency: t.currency, category: t.category,
    features: t.features ?? [],
  }));
  return [...a, ...b];
}

export default function CatalogSection() {
  const { t, lang } = useLang();
  const nav = useNavigate();
  const location = useLocation();
  const catalogCta = useCtaTarget('cta_catalog_test');

  const [tests, setTests] = useState<PublicTest[]>([]);
  const [templates, setTemplates] = useState<PublicTemplate[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters — seeded from the URL on the very first render, so arriving at
  // /?q=foo paints the filtered list directly instead of rendering the full
  // catalog and then re-rendering it filtered.
  const [tab, setTab] = useState<Tab>(() => readUrlFilters(location.search).tab ?? 'all');
  const [search, setSearch] = useState(() => readUrlFilters(location.search).q ?? '');
  const [filtersOpen, setFiltersOpen] = useState(false);

  // ...and re-synced when the URL changes while we stay mounted (Hero's search
  // box navigates to /?q=... while the landing page is already open). The URL is
  // the source of truth here but `search`/`tab` are also edited locally, so this
  // is the "adjust state when a value changes" pattern rather than pure derived
  // state: react to the transition, not to the current value.
  const [prevSearchParams, setPrevSearchParams] = useState(location.search);
  if (location.search !== prevSearchParams) {
    setPrevSearchParams(location.search);
    const { q, tab: tabFromUrl } = readUrlFilters(location.search);
    if (q !== null) setSearch(q);
    if (tabFromUrl) setTab(tabFromUrl);
  }

  const [categoriesSel, setCategoriesSel] = useState<Set<string>>(new Set());
  const [typesSel, setTypesSel] = useState<Set<'test' | 'template'>>(new Set());
  const [pricesSel, setPricesSel] = useState<Set<PriceFilter>>(new Set());

  useEffect(() => {
    Promise.all([publicApi.listTests(), publicApi.listTemplates()])
      .then(([a, b]) => { setTests(a.tests); setTemplates(b.templates); })
      .finally(() => setLoading(false));
  }, []);

  const items = useMemo(() => toUnified(tests, templates), [tests, templates]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach(x => { if (x.category) set.add(x.category); });
    return [...set].sort((a, b) => a.localeCompare(b));
  }, [items]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return items.filter(x => {
      // Hide fully inactive items from the public catalog (defense in depth — the
      // backend already filters them out, but we don't trust upstream payloads).
      if (!x.is_active) return false;
      // Tab
      if (tab === 'tests' && x.kind !== 'test') return false;
      if (tab === 'templates' && x.kind !== 'template') return false;
      // Search on title + desc in both languages
      if (q) {
        const hay = [x.title_uk, x.title_en, x.desc_uk, x.desc_en, x.category ?? '']
          .join(' ').toLowerCase();
        if (!hay.includes(q)) return false;
      }
      // Category
      if (categoriesSel.size > 0 && (!x.category || !categoriesSel.has(x.category))) return false;
      // Type (checkbox mirrors tab; either acts as filter)
      if (typesSel.size > 0 && !typesSel.has(x.kind)) return false;
      // Price
      if (pricesSel.size > 0) {
        const isFree = !x.is_paid;
        if (isFree && !pricesSel.has('free')) return false;
        if (!isFree && !pricesSel.has('paid')) return false;
      }
      return true;
    });
  }, [items, tab, search, categoriesSel, typesSel, pricesSel]);

  const testsInView = filtered.filter(x => x.kind === 'test');
  const templatesInView = filtered.filter(x => x.kind === 'template');

  function onCardClick(x: UnifiedItem) {
    if (x.is_coming_soon) return;
    if (x.kind === 'test') {
      nav(x.is_paid ? `/plata/test/${x.slug}` : `/test/${x.slug}`);
    } else {
      nav(x.is_paid ? `/plata/sablon/${x.slug}` : `/sablon/${x.slug}`);
    }
  }

  // Admin-configurable CTA in the catalog header. Routes to the chosen test;
  // if none is set, falls back to showing the tests tab.
  function handleCatalogCta() {
    if (catalogCta.kind === 'route') {
      nav(catalogCta.to);
    } else {
      setTab('tests');
      document.getElementById('resurse')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  function toggleSetItem<T>(set: Set<T>, item: T, setter: (s: Set<T>) => void) {
    const next = new Set(set);
    if (next.has(item)) next.delete(item);
    else next.add(item);
    setter(next);
  }

  return (
    <section className="catalog" data-section="catalog" id="resurse">
      <div className="catalog__header">
        <span className="catalog__eyebrow">
          <span className="catalog__eyebrow-dot" aria-hidden />
          {lang === 'uk' ? 'МАРКЕТПЛЕЙС' : 'MARKETPLACE'}
        </span>
        <h2 className="catalog__title">
          {(() => {
            const title = t('catalogTitle');
            const parts = title.trim().split(/\s+/);
            const last = parts.pop();
            return (<>{parts.join(' ')} <span className="catalog__title-accent">{last}</span></>);
          })()}
        </h2>
        <p className="catalog__subtitle-intro">
          {lang === 'uk'
            ? 'Тести та шаблони в одному місці.'
            : 'Tests and templates in one place.'}
        </p>
        <button type="button" className="catalog__cta" onClick={handleCatalogCta}>
          {t('heroCta')}
          <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </button>
      </div>

      <div className="catalog__layout">
        {/* --- Sidebar filters --- */}
        <aside className={`catalog__sidebar ${filtersOpen ? 'is-open' : ''}`}>
          <button
            type="button"
            className="catalog__filters-title"
            onClick={() => setFiltersOpen(v => !v)}
            aria-expanded={filtersOpen}
          >
            <svg className="catalog__filters-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden>
              <path d="M4 6h16M7 12h10M10 18h4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              <circle cx="7" cy="6"  r="2" fill="#fff" stroke="currentColor" strokeWidth="2" />
              <circle cx="14" cy="12" r="2" fill="#fff" stroke="currentColor" strokeWidth="2" />
              <circle cx="10" cy="18" r="2" fill="#fff" stroke="currentColor" strokeWidth="2" />
            </svg>
            <span>{t('catalogFiltersLbl')}</span>
            <svg className="catalog__filters-chevron" width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
              <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>

          <div className="catalog__search">
            <svg width="16" height="16" viewBox="0 0 16 16" aria-hidden>
              <circle cx="7" cy="7" r="5" stroke="currentColor" strokeWidth="1.6" fill="none" />
              <path d="M11 11l4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              placeholder={t('catalogSearchPh')}
              value={search}
              maxLength={120}
              onChange={e => setSearch(sanitizeOneLine(e.target.value, 120))}
              aria-label="Пошук"
            />
          </div>

          <div className="catalog__filters-body">
          {categories.length > 0 && (
            <div className="catalog__filter-group">
              <div className="catalog__filter-title">{t('catalogCategories')}</div>
              {categories.map(cat => (
                <label key={cat} className="catalog__checkbox">
                  <input
                    type="checkbox"
                    checked={categoriesSel.has(cat)}
                    onChange={() => toggleSetItem(categoriesSel, cat, setCategoriesSel)}
                  />
                  <span>{cat}</span>
                </label>
              ))}
            </div>
          )}

          <div className="catalog__filter-group">
            <div className="catalog__filter-title">{t('catalogType')}</div>
            <label className="catalog__checkbox">
              <input
                type="checkbox"
                checked={typesSel.has('test')}
                onChange={() => toggleSetItem(typesSel, 'test', setTypesSel)}
              />
              <span>{t('catalogTabTests')}</span>
            </label>
            <label className="catalog__checkbox">
              <input
                type="checkbox"
                checked={typesSel.has('template')}
                onChange={() => toggleSetItem(typesSel, 'template', setTypesSel)}
              />
              <span>{t('catalogTabTemplates')}</span>
            </label>
          </div>

          <div className="catalog__filter-group">
            <div className="catalog__filter-title">{t('catalogPrice')}</div>
            <label className="catalog__checkbox">
              <input
                type="checkbox"
                checked={pricesSel.has('free')}
                onChange={() => toggleSetItem(pricesSel, 'free', setPricesSel)}
              />
              <span>{t('catalogPriceFree')}</span>
            </label>
            <label className="catalog__checkbox">
              <input
                type="checkbox"
                checked={pricesSel.has('paid')}
                onChange={() => toggleSetItem(pricesSel, 'paid', setPricesSel)}
              />
              <span>{t('catalogPricePaid')}</span>
            </label>
          </div>
          </div>
        </aside>

        {/* --- Right side: tabs + cards --- */}
        <div className="catalog__content">
          <div className="catalog__tabs" role="tablist">
            <button
              role="tab"
              className={`catalog__tab ${tab === 'all' ? 'is-active' : ''}`}
              onClick={() => setTab('all')}
            >{t('catalogTabAll')}</button>
            <button
              role="tab"
              className={`catalog__tab ${tab === 'tests' ? 'is-active' : ''}`}
              onClick={() => setTab('tests')}
            >{t('catalogTabTests')}</button>
            <button
              role="tab"
              className={`catalog__tab ${tab === 'templates' ? 'is-active' : ''}`}
              onClick={() => setTab('templates')}
            >{t('catalogTabTemplates')}</button>
          </div>

          {loading && <div className="catalog__empty">...</div>}

          {!loading && filtered.length === 0 && (
            <div className="catalog__empty">{t('catalogEmpty')}</div>
          )}

          {!loading && (tab === 'all' || tab === 'tests') && testsInView.length > 0 && (
            <>
              <h3 className="catalog__subtitle">{t('catalogSectionTests')}</h3>
              <CatalogGroup
                items={testsInView}
                lang={lang}
                onClickItem={onCardClick}
                cta={t('catalogStartTest')}
                badgeBasic={t('catalogBadgeBasic')}
                badgePremium={t('catalogBadgePremium')}
                freeLabel={t('catalogPriceFree')}
                keyPrefix="t"
              />
            </>
          )}

          {!loading && (tab === 'all' || tab === 'templates') && templatesInView.length > 0 && (
            <>
              <h3 className="catalog__subtitle">{t('catalogSectionTemplates')}</h3>
              <CatalogGroup
                items={templatesInView}
                lang={lang}
                onClickItem={onCardClick}
                cta={t('catalogDownload')}
                ctaPaid={t('catalogViewDetails')}
                badgeBasic={t('catalogBadgeBasic')}
                badgePremium={t('catalogBadgePremium')}
                freeLabel={t('catalogPriceFree')}
                keyPrefix="tpl"
              />
            </>
          )}
        </div>
      </div>
    </section>
  );
}

interface CatalogGroupProps {
  items: UnifiedItem[];
  lang: 'uk' | 'en';
  onClickItem: (x: UnifiedItem) => void;
  cta: string;
  ctaPaid?: string;
  badgeBasic: string;
  badgePremium: string;
  freeLabel: string;
  keyPrefix: string;
}

// Renders a single section's cards. If the section is mixed (both free & paid),
// keeps the original two-column split layout (Basic on the left, Premium on the right).
// If the section is single-tier (only free OR only paid), switches to a compact 2-per-row grid
// so we don't render a half-empty layout (which is what the user saw in the screenshot).
function CatalogGroup({ items, lang, onClickItem, cta, ctaPaid, badgeBasic, badgePremium, freeLabel, keyPrefix }: CatalogGroupProps) {
  const free = items.filter(x => !x.is_paid);
  const paid = items.filter(x => x.is_paid);
  const singleTier = free.length === 0 || paid.length === 0;

  if (singleTier) {
    return (
      <div className="catalog__grid catalog__grid--compact">
        {items.map(x => (
          <Card key={`${keyPrefix}-${x.id}`} item={x} lang={lang}
            onClick={() => onClickItem(x)}
            cta={x.is_paid && ctaPaid ? ctaPaid : cta}
            badgeBasic={badgeBasic}
            badgePremium={badgePremium}
            freeLabel={freeLabel} />
        ))}
      </div>
    );
  }
  return (
    <div className="catalog__split">
      <div className="catalog__col">
        {free.map(x => (
          <Card key={`${keyPrefix}-${x.id}`} item={x} lang={lang}
            onClick={() => onClickItem(x)}
            cta={cta}
            badgeBasic={badgeBasic}
            badgePremium={badgePremium}
            freeLabel={freeLabel} />
        ))}
      </div>
      <div className="catalog__col">
        {paid.map(x => (
          <Card key={`${keyPrefix}-${x.id}`} item={x} lang={lang}
            onClick={() => onClickItem(x)}
            cta={ctaPaid ?? cta}
            badgeBasic={badgeBasic}
            badgePremium={badgePremium}
            freeLabel={freeLabel} />
        ))}
      </div>
    </div>
  );
}

interface CardProps {
  item: UnifiedItem;
  lang: 'uk' | 'en';
  onClick: () => void;
  cta: string;
  badgeBasic: string;
  badgePremium: string;
  freeLabel: string;
}

function Card({ item, lang, onClick, cta, badgeBasic, badgePremium, freeLabel }: CardProps) {
  const title = lang === 'uk' ? item.title_uk : item.title_en;
  const desc  = lang === 'uk' ? item.desc_uk  : item.desc_en;
  const premium = item.is_paid;
  const comingSoon = item.is_coming_soon;
  const comingSoonCta = lang === 'uk' ? 'Незабаром' : 'Soon';
  return (
    <div className={`catalog-card ${premium ? 'catalog-card--premium' : 'catalog-card--basic'}${comingSoon ? ' catalog-card--inactive' : ''}`}>
      {comingSoon && (
        <span className="catalog-card__coming-soon">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
            <path d="M12 7v5l3 2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
          {comingSoonCta}
        </span>
      )}
      <div className="catalog-card__head">
        <span className={`catalog-card__badge ${premium ? 'is-premium' : 'is-basic'}`}>
          {premium ? badgePremium : badgeBasic}
        </span>
      </div>
      <div className="catalog-card__title">{title || '—'}</div>
      {desc && <div className="catalog-card__desc">{desc}</div>}
      <div className="catalog-card__price">
        {premium
          ? <>{item.price != null ? `${item.price} ${item.currency}` : '—'}</>
          : freeLabel}
      </div>
      {item.features.length > 0 && (
        <ul className="catalog-card__features">
          {item.features.map((f, i) => (
            <li key={i}>
              <span className="catalog-card__feature-icon" aria-hidden>
                <svg width="11" height="11" viewBox="0 0 14 14" fill="none">
                  <path d="M3 7.4l2.4 2.4L11 4" stroke="currentColor" strokeWidth="2"
                    strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      )}
      <button
        className={`catalog-card__cta ${premium ? 'is-dark' : 'is-yellow'}${comingSoon ? ' is-disabled' : ''}`}
        onClick={onClick}
        disabled={comingSoon}
      >
        {comingSoon ? comingSoonCta : cta}
      </button>
    </div>
  );
}
