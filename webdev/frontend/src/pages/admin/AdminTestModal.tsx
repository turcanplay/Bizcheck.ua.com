import { useState, type FormEvent } from 'react';
import type { AdminTest, AdminTestInput, ReportType } from '@/api/admin';

interface Props {
  initial: AdminTest | null;
  onClose: () => void;
  onSave: (data: AdminTestInput, id: number | null) => Promise<void>;
}

export default function AdminTestModal({ initial, onClose, onSave }: Props) {
  const editing = !!initial;
  const [nameUk, setNameUk] = useState(initial?.name_uk ?? '');
  const [nameRu, setNameRu] = useState(initial?.name_ru ?? '');
  const [descUk, setDescUk] = useState(initial?.description_uk ?? '');
  const [descRu, setDescRu] = useState(initial?.description_ru ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [safe, setSafe] = useState(initial?.scoring_zones?.safe ?? 80);
  const [developing, setDeveloping] = useState(initial?.scoring_zones?.developing ?? 70);
  const [warn, setWarn] = useState(initial?.scoring_zones?.warn ?? 65);
  const [risk, setRisk] = useState(initial?.scoring_zones?.risk ?? 0);
  // Three-state visibility: 'active' = vizibil + clickabil, 'coming_soon' =
  // vizibil cu overlay 'În curând' și buton dezactivat, 'hidden' = ascuns complet în catalog.
  type Visibility = 'active' | 'coming_soon' | 'hidden';
  const [visibility, setVisibility] = useState<Visibility>(
    initial == null
      ? 'active'
      : initial.is_coming_soon
      ? 'coming_soon'
      : initial.is_active
      ? 'active'
      : 'hidden'
  );
  const [isPaid, setIsPaid] = useState(initial?.is_paid ?? false);
  const [price, setPrice] = useState<string>(initial?.price != null ? String(initial.price) : '');
  const [currency, setCurrency] = useState<string>(initial?.currency ?? 'MDL');
  const [category, setCategory] = useState<string>(initial?.category ?? '');
  const [featuresText, setFeaturesText] = useState<string>(
    (initial?.features ?? []).join('\n')
  );
  // 4 distinct layouts (backend canonical): 'bizcheck' | 'standard' | 'premium' | 'gdpr'.
  const [reportType, setReportType] = useState<ReportType>(
    (initial?.report_type as ReportType) ?? 'bizcheck'
  );
  const [orderIndex, setOrderIndex] = useState<number>(initial?.order_index ?? 0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!nameUk.trim()) { setError('Заголовок (UA) обов\'язковий'); return; }
    setBusy(true);
    try {
      let priceNum: number | null = null;
      if (isPaid) {
        const parsed = parseFloat(price.replace(',', '.'));
        if (!Number.isFinite(parsed) || parsed < 0) {
          setError('Ціна має бути числом ≥ 0, коли тест платний');
          setBusy(false);
          return;
        }
        priceNum = Math.round(parsed * 100) / 100;
      }
      const features = featuresText
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean)
        .slice(0, 20);
      const input: AdminTestInput = {
        name_uk: nameUk.trim(),
        name_ru: nameRu.trim() || undefined,
        description_uk: descUk,
        description_ru: descRu,
        slug: slug.trim() || undefined,
        is_active: visibility !== 'hidden',
        is_coming_soon: visibility === 'coming_soon',
        is_paid: isPaid,
        price: priceNum,
        currency: currency.trim().toUpperCase().slice(0, 3) || 'MDL',
        category: category.trim() || null,
        features,
        report_type: reportType,
        order_index: Number(orderIndex) || 0,
        scoring_zones: {
          safe: Number(safe),
          developing: Number(developing),
          warn: Number(warn),
          risk: Number(risk),
        },
      };
      await onSave(input, initial?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <form className="admin-modal" onClick={e => e.stopPropagation()} onSubmit={onSubmit}>
        <h3>{editing ? 'Редагувати тест' : 'Додати тест'}</h3>

        <div className="admin-form-group">
          <label>Заголовок (UA) * <small style={{ color: 'var(--text2)' }}>(макс. 255)</small></label>
          <input value={nameUk} maxLength={255} onChange={e => setNameUk(e.target.value)} placeholder="напр.: Аудит HR GDPR" autoFocus />
        </div>
        <div className="admin-form-group">
          <label>Заголовок (RU) <small style={{ color: 'var(--text2)' }}>(макс. 255)</small></label>
          <input value={nameRu} maxLength={255} onChange={e => setNameRu(e.target.value)} placeholder="напр.: Аудит HR GDPR" />
        </div>
        <div className="admin-form-group">
          <label>Опис (UA)</label>
          <textarea value={descUk} maxLength={2000} onChange={e => setDescUk(e.target.value)} placeholder="Опис тесту..." />
        </div>
        <div className="admin-form-group">
          <label>Опис (RU)</label>
          <textarea value={descRu} maxLength={2000} onChange={e => setDescRu(e.target.value)} placeholder="Описание теста..." />
        </div>
        <div className="admin-form-group">
          <label>Slug (URL) — залиште порожнім для автогенерації <small style={{ color: 'var(--text2)' }}>(макс. 64, a-z 0-9 _ -)</small></label>
          <input
            value={slug}
            maxLength={64}
            onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
            placeholder="напр.: audit-hr-gdpr"
          />
        </div>

        <div className="admin-form-group">
          <label>Порядок у каталозі <small style={{ color: 'var(--text2)' }}>(0 = перший / ліворуч; зростає праворуч)</small></label>
          <input
            type="number"
            min={0}
            value={orderIndex}
            onChange={e => setOrderIndex(Math.max(0, parseInt(e.target.value, 10) || 0))}
            placeholder="напр.: 0, 1, 2..."
            style={{ width: 140 }}
          />
        </div>

        <div className="admin-form-group">
          <label>Категорія <small style={{ color: 'var(--text2)' }}>(з'являється у фільтрі каталогу — напр.: GDPR, Legal, Business)</small></label>
          <input
            list="test-category-suggestions"
            value={category}
            maxLength={50}
            onChange={e => setCategory(e.target.value)}
            placeholder="напр.: GDPR"
          />
          <datalist id="test-category-suggestions">
            <option value="GDPR" />
            <option value="Legal" />
            <option value="Business" />
            <option value="HR" />
          </datalist>
        </div>

        <div className="admin-form-group">
          <label>Пункти / характеристики картки <small style={{ color: 'var(--text2)' }}>(один рядок = один пункт, макс. 20)</small></label>
          <textarea
            value={featuresText}
            onChange={e => setFeaturesText(e.target.value)}
            placeholder={'Напр.:\n5 хвилин\n10 запитань\nМиттєвий результат'}
            style={{ minHeight: 110, fontFamily: 'inherit' }}
            maxLength={4000}
          />
        </div>

        <div className="admin-form-group">
          <label style={{ fontWeight: 600 }}>Зони оцінки (%)</label>
          <div className="admin-zones-grid">
            <div>
              <label style={{ fontSize: 12 }}>🟢 Низький ризик (≥%)</label>
              <input type="number" min={0} max={100} value={safe} onChange={e => setSafe(+e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12 }}>🟡 Помірний ризик (≥%)</label>
              <input type="number" min={0} max={100} value={developing} onChange={e => setDeveloping(+e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12 }}>🟠 Високий ризик (≥%)</label>
              <input type="number" min={0} max={100} value={warn} onChange={e => setWarn(+e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12 }}>🔴 Критичний ризик (≥%)</label>
              <input type="number" min={0} max={100} value={risk} onChange={e => setRisk(+e.target.value)} />
            </div>
          </div>
        </div>

        <div className="admin-form-group">
          <label style={{ fontWeight: 600 }}>
            📄 Тип звіту <small style={{ color: 'var(--text2)', fontWeight: 400 }}>
              (що отримує користувач наприкінці тесту)
            </small>
          </label>
          <div className="admin-report-type-grid admin-report-type-grid--3">
            {([
              { v: 'bizcheck', icon: '🧭', title: 'Звіт BizCheck',
                desc: 'Повний — обкладинка navy, підсумок за блоками, 4 зони ризику та детальні сторінки за кожним блоком (суть, ризик, дія, regulatory).' },
              { v: 'standard', icon: '📋', title: 'Звіт Standard',
                desc: 'Ідентична структура з BizCheck + чек-лист за кожним запитанням (✓ відповідає нормі / ✗ не відповідає). Простіше, без сторінок пояснень за блоками.' },
              { v: 'premium',  icon: '💎', title: 'Premium',
                desc: 'Лише підсумок — обкладинка, підсумок за блоками, 4 зони ризику. Без детальних сторінок.' },
              { v: 'gdpr',     icon: '🛡️', title: 'Звіт GDPR',
                desc: 'Одна сторінка на запитання: запитання + відповідь угорі, потім пояснення (вступ / ризик / що робити) UA/RU.' },
            ] as const).map(opt => (
              <label
                key={opt.v}
                className={`admin-report-type-card ${reportType === opt.v ? 'is-selected' : ''}`}
              >
                <input
                  type="radio"
                  name="report_type"
                  value={opt.v}
                  checked={reportType === opt.v}
                  onChange={() => setReportType(opt.v)}
                />
                <div className="admin-report-type-icon">{opt.icon}</div>
                <div className="admin-report-type-title">{opt.title}</div>
                <div className="admin-report-type-desc">{opt.desc}</div>
              </label>
            ))}
          </div>
        </div>

        <div className="admin-form-group">
          <label style={{ fontWeight: 600 }}>Видимість у каталозі</label>
          <div className="admin-visibility-grid">
            {([
              { v: 'active' as const, icon: '✅', title: 'Активний',
                desc: 'Видимий і клікабельний для користувачів.' },
              { v: 'coming_soon' as const, icon: '⏳', title: 'Незабаром',
                desc: 'Видимий з накладкою „Незабаром" і вимкненою кнопкою.' },
              { v: 'hidden' as const, icon: '🚫', title: 'Неактивний',
                desc: 'Повністю прихований з публічного каталогу.' },
            ]).map(opt => (
              <label
                key={opt.v}
                className={`admin-visibility-card ${visibility === opt.v ? 'is-selected' : ''}`}
              >
                <input
                  type="radio"
                  name="visibility"
                  value={opt.v}
                  checked={visibility === opt.v}
                  onChange={() => setVisibility(opt.v)}
                />
                <div className="admin-visibility-icon">{opt.icon}</div>
                <div className="admin-visibility-title">{opt.title}</div>
                <div className="admin-visibility-desc">{opt.desc}</div>
              </label>
            ))}
          </div>
        </div>
        <div className="admin-form-group">
          <label className="admin-checkbox-row">
            <input type="checkbox" checked={isPaid} onChange={e => setIsPaid(e.target.checked)} />
            💰 Платний тест (прапорець метаданих — фактичний доступ контролюється на зовнішньому лендингу)
          </label>
        </div>

        {isPaid && (
          <div className="admin-form-group">
            <label>💰 Ціна доступу <small style={{ color: 'var(--text2)' }}>(кома або крапка, макс. 99 999 999.99)</small></label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                inputMode="decimal"
                value={price}
                maxLength={12}
                onChange={e => setPrice(e.target.value.replace(/[^0-9.,]/g, ''))}
                placeholder="напр.: 199 або 199.50"
                style={{ flex: 1 }}
              />
              <input
                type="text"
                value={currency}
                maxLength={3}
                onChange={e => setCurrency(e.target.value.toUpperCase().replace(/[^A-Z]/g, ''))}
                placeholder="MDL"
                style={{ width: 80, textAlign: 'center', fontWeight: 600 }}
              />
            </div>
          </div>
        )}

        {error && <div className="admin-error">⚠️ {error}</div>}

        <div className="admin-modal-actions">
          <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose} disabled={busy}>Скасувати</button>
          <button type="submit" className="admin-btn admin-btn-accent" disabled={busy}>{busy ? '...' : 'Зберегти'}</button>
        </div>
      </form>
    </div>
  );
}
