import { useState, type FormEvent } from 'react';
import type { AdminTest, AdminTestInput, ReportType } from '@/api/admin';

interface Props {
  initial: AdminTest | null;
  onClose: () => void;
  onSave: (data: AdminTestInput, id: number | null) => Promise<void>;
}

export default function AdminTestModal({ initial, onClose, onSave }: Props) {
  const editing = !!initial;
  const [nameRo, setNameRo] = useState(initial?.name_uk ?? '');
  const [nameRu, setNameRu] = useState(initial?.name_en ?? '');
  const [descRo, setDescRo] = useState(initial?.description_uk ?? '');
  const [descRu, setDescRu] = useState(initial?.description_en ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  const [safe, setSafe] = useState(initial?.scoring_zones?.safe ?? 80);
  const [developing, setDeveloping] = useState(initial?.scoring_zones?.developing ?? 70);
  const [warn, setWarn] = useState(initial?.scoring_zones?.warn ?? 65);
  const [risk, setRisk] = useState(initial?.scoring_zones?.risk ?? 0);
  // Three-state visibility: 'active' = видимий + клікабельний, 'coming_soon' =
  // видимий з накладкою 'Незабаром' і вимкненою кнопкою, 'hidden' = повністю прихований у каталозі.
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
  // 3 distinct layouts (backend canonical): 'bizcheck' | 'standard' | 'premium'.
  const [reportType, setReportType] = useState<ReportType>(
    (initial?.report_type as ReportType) ?? 'bizcheck'
  );
  const [orderIndex, setOrderIndex] = useState<number>(initial?.order_index ?? 0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!nameRo.trim()) { setError('Title (UK) is required'); return; }
    setBusy(true);
    try {
      let priceNum: number | null = null;
      if (isPaid) {
        const parsed = parseFloat(price.replace(',', '.'));
        if (!Number.isFinite(parsed) || parsed < 0) {
          setError('Price must be a number ≥ 0 when the test is paid');
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
        name_uk: nameRo.trim(),
        name_en: nameRu.trim() || undefined,
        description_uk: descRo,
        description_en: descRu,
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
        <h3>{editing ? 'Edit Test' : 'Add Test'}</h3>

        <div className="admin-form-group">
          <label>Title (UK) * <small style={{ color: 'var(--text2)' }}>(max 255)</small></label>
          <input value={nameRo} maxLength={255} onChange={e => setNameRo(e.target.value)} placeholder="e.g.: HR GDPR Audit" autoFocus />
        </div>
        <div className="admin-form-group">
          <label>Title (EN) <small style={{ color: 'var(--text2)' }}>(max 255)</small></label>
          <input value={nameRu} maxLength={255} onChange={e => setNameRu(e.target.value)} placeholder="e.g.: HR GDPR Audit" />
        </div>
        <div className="admin-form-group">
          <label>Description (UK)</label>
          <textarea value={descRo} maxLength={2000} onChange={e => setDescRo(e.target.value)} placeholder="Test description..." />
        </div>
        <div className="admin-form-group">
          <label>Description (EN)</label>
          <textarea value={descRu} maxLength={2000} onChange={e => setDescRu(e.target.value)} placeholder="Test description..." />
        </div>
        <div className="admin-form-group">
          <label>Slug (URL) — leave empty for auto-generation <small style={{ color: 'var(--text2)' }}>(max 64, a-z 0-9 _ -)</small></label>
          <input
            value={slug}
            maxLength={64}
            onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
            placeholder="e.g.: hr-gdpr-audit"
          />
        </div>

        <div className="admin-form-group">
          <label>Catalog order <small style={{ color: 'var(--text2)' }}>(0 = first / left; increases to the right)</small></label>
          <input
            type="number"
            min={0}
            value={orderIndex}
            onChange={e => setOrderIndex(Math.max(0, parseInt(e.target.value, 10) || 0))}
            placeholder="e.g.: 0, 1, 2..."
            style={{ width: 140 }}
          />
        </div>

        <div className="admin-form-group">
          <label>Category <small style={{ color: 'var(--text2)' }}>(appears in the catalog filter — e.g.: GDPR, Legal, Business)</small></label>
          <input
            list="test-category-suggestions"
            value={category}
            maxLength={50}
            onChange={e => setCategory(e.target.value)}
            placeholder="e.g.: GDPR"
          />
          <datalist id="test-category-suggestions">
            <option value="GDPR" />
            <option value="Legal" />
            <option value="Business" />
            <option value="HR" />
          </datalist>
        </div>

        <div className="admin-form-group">
          <label>Card bullets / features <small style={{ color: 'var(--text2)' }}>(one line = one bullet, max 20)</small></label>
          <textarea
            value={featuresText}
            onChange={e => setFeaturesText(e.target.value)}
            placeholder={'e.g.:\n5 minutes\n10 questions\nInstant result'}
            style={{ minHeight: 110, fontFamily: 'inherit' }}
            maxLength={4000}
          />
        </div>

        <div className="admin-form-group">
          <label style={{ fontWeight: 600 }}>Score zones (%)</label>
          <div className="admin-zones-grid">
            <div>
              <label style={{ fontSize: 12 }}>🟢 Low risk (≥%)</label>
              <input type="number" min={0} max={100} value={safe} onChange={e => setSafe(+e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12 }}>🟡 Moderate risk (≥%)</label>
              <input type="number" min={0} max={100} value={developing} onChange={e => setDeveloping(+e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12 }}>🟠 High risk (≥%)</label>
              <input type="number" min={0} max={100} value={warn} onChange={e => setWarn(+e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12 }}>🔴 Critical risk (≥%)</label>
              <input type="number" min={0} max={100} value={risk} onChange={e => setRisk(+e.target.value)} />
            </div>
          </div>
        </div>

        <div className="admin-form-group">
          <label style={{ fontWeight: 600 }}>
            📄 Report type <small style={{ color: 'var(--text2)', fontWeight: 400 }}>
              (what the user receives at the end of the test)
            </small>
          </label>
          <div className="admin-report-type-grid admin-report-type-grid--3">
            {([
              { v: 'bizcheck', icon: '🧭', title: 'BizCheck Report',
                desc: 'Full — navy cover, per-block summary, 4 risk zones and detailed pages per block (essence, risk, action, regulatory).' },
              { v: 'standard', icon: '📋', title: 'Standard Report',
                desc: 'Same structure as BizCheck + per-question checklist (✓ meets the standard / ✗ does not). Simpler, without the per-block explanation pages.' },
              { v: 'premium',  icon: '💎', title: 'Premium',
                desc: 'Summary only — cover, per-block summary, 4 risk zones. No detailed pages.' },
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
          <label style={{ fontWeight: 600 }}>Catalog visibility</label>
          <div className="admin-visibility-grid">
            {([
              { v: 'active' as const, icon: '✅', title: 'Active',
                desc: 'Visible and clickable for users.' },
              { v: 'coming_soon' as const, icon: '⏳', title: 'Coming soon',
                desc: 'Visible with a "Coming soon" overlay and a disabled button.' },
              { v: 'hidden' as const, icon: '🚫', title: 'Inactive',
                desc: 'Completely hidden from the public catalog.' },
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
            💰 Paid test (metadata flag — the actual gate is on the external landing page)
          </label>
        </div>

        {isPaid && (
          <div className="admin-form-group">
            <label>💰 Access price <small style={{ color: 'var(--text2)' }}>(comma or dot, max 99 999 999.99)</small></label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                inputMode="decimal"
                value={price}
                maxLength={12}
                onChange={e => setPrice(e.target.value.replace(/[^0-9.,]/g, ''))}
                placeholder="e.g.: 199 or 199.50"
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
          <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="admin-btn admin-btn-accent" disabled={busy}>{busy ? '...' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}
