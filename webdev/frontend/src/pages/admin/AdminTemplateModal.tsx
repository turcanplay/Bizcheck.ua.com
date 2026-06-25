import { useState, type FormEvent } from 'react';
import type { AdminTemplate, AdminTemplateInput } from '@/api/admin';

interface Props {
  initial: AdminTemplate | null;
  onClose: () => void;
  onSave: (data: AdminTemplateInput, id: number | null) => Promise<void>;
}

export default function AdminTemplateModal({ initial, onClose, onSave }: Props) {
  const editing = !!initial;
  const [titleRo, setTitleRo] = useState(initial?.title_uk ?? '');
  const [titleRu, setTitleRu] = useState(initial?.title_en ?? '');
  const [descRo, setDescRo] = useState(initial?.description_uk ?? '');
  const [descRu, setDescRu] = useState(initial?.description_en ?? '');
  const [slug, setSlug] = useState(initial?.slug ?? '');
  // Three-state visibility — see AdminTestModal for the rationale.
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
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!titleRo.trim() && !titleRu.trim()) {
      setError('At least one title (UK or EN) is required');
      return;
    }
    setBusy(true);
    try {
      let priceNum: number | null = null;
      if (isPaid) {
        const parsed = parseFloat(price.replace(',', '.'));
        if (!Number.isFinite(parsed) || parsed < 0) {
          setError('Price must be a number ≥ 0 when the template is paid');
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
      await onSave({
        slug: slug.trim() || undefined,
        title_uk: titleRo.trim(),
        title_en: titleRu.trim() || undefined,
        description_uk: descRo,
        description_en: descRu,
        is_active: visibility !== 'hidden',
        is_coming_soon: visibility === 'coming_soon',
        is_paid: isPaid,
        price: priceNum,
        currency: currency.trim().toUpperCase().slice(0, 3) || 'MDL',
        category: category.trim() || null,
        features,
      }, initial?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <form className="admin-modal" onClick={e => e.stopPropagation()} onSubmit={onSubmit}>
        <h3>{editing ? 'Edit Template' : 'Add Template'}</h3>

        <div className="admin-form-group">
          <label>Title (UK) * <small style={{ color: 'var(--text2)' }}>(max 255)</small></label>
          <input value={titleRo} maxLength={255} onChange={e => setTitleRo(e.target.value)} placeholder="e.g.: Employment contract" autoFocus />
        </div>
        <div className="admin-form-group">
          <label>Title (EN) <small style={{ color: 'var(--text2)' }}>(max 255)</small></label>
          <input value={titleRu} maxLength={255} onChange={e => setTitleRu(e.target.value)} placeholder="e.g.: Employment contract" />
        </div>
        <div className="admin-form-group">
          <label>Description (UK) — core concepts</label>
          <textarea value={descRo} maxLength={2000} onChange={e => setDescRo(e.target.value)} placeholder="Template description, what it is used for..." />
        </div>
        <div className="admin-form-group">
          <label>Description (EN)</label>
          <textarea value={descRu} maxLength={2000} onChange={e => setDescRu(e.target.value)} placeholder="Template description..." />
        </div>
        <div className="admin-form-group">
          <label>Slug (URL) — leave empty for auto-generation <small style={{ color: 'var(--text2)' }}>(max 64)</small></label>
          <input
            value={slug}
            maxLength={64}
            onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
            placeholder="e.g.: employment-contract"
          />
        </div>

        <div className="admin-form-group">
          <label>Category <small style={{ color: 'var(--text2)' }}>(catalog filter — e.g.: GDPR, Legal, Business)</small></label>
          <input
            list="template-category-suggestions"
            value={category}
            maxLength={50}
            onChange={e => setCategory(e.target.value)}
            placeholder="e.g.: Legal"
          />
          <datalist id="template-category-suggestions">
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
            placeholder={'e.g.:\nStructured checklist\nEasy to use\nComplete format'}
            style={{ minHeight: 110, fontFamily: 'inherit' }}
            maxLength={4000}
          />
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
            💰 Paid template
          </label>
        </div>

        {isPaid && (
          <div className="admin-form-group">
            <label>💰 Access price <small style={{ color: 'var(--text2)' }}>(comma or dot)</small></label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                inputMode="decimal"
                value={price}
                maxLength={12}
                onChange={e => setPrice(e.target.value.replace(/[^0-9.,]/g, ''))}
                placeholder="e.g.: 99 or 99.50"
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
