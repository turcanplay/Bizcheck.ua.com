import { useState, type FormEvent } from 'react';
import type { AdminTest, AdminTestInput, ReportType } from '@/api/admin';

interface Props {
  initial: AdminTest | null;
  onClose: () => void;
  onSave: (data: AdminTestInput, id: number | null) => Promise<void>;
}

export default function AdminTestModal({ initial, onClose, onSave }: Props) {
  const editing = !!initial;
  const [nameRo, setNameRo] = useState(initial?.name_ro ?? '');
  const [nameRu, setNameRu] = useState(initial?.name_ru ?? '');
  const [descRo, setDescRo] = useState(initial?.description_ro ?? '');
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
    if (!nameRo.trim()) { setError('Titlu (RO) este obligatoriu'); return; }
    setBusy(true);
    try {
      let priceNum: number | null = null;
      if (isPaid) {
        const parsed = parseFloat(price.replace(',', '.'));
        if (!Number.isFinite(parsed) || parsed < 0) {
          setError('Prețul trebuie să fie un număr ≥ 0 când testul este cu plată');
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
        name_ro: nameRo.trim(),
        name_ru: nameRu.trim() || undefined,
        description_ro: descRo,
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
        <h3>{editing ? 'Editează Test' : 'Adaugă Test'}</h3>

        <div className="admin-form-group">
          <label>Titlu (RO) * <small style={{ color: 'var(--text2)' }}>(max 255)</small></label>
          <input value={nameRo} maxLength={255} onChange={e => setNameRo(e.target.value)} placeholder="ex: Audit HR GDPR" autoFocus />
        </div>
        <div className="admin-form-group">
          <label>Titlu (RU) <small style={{ color: 'var(--text2)' }}>(max 255)</small></label>
          <input value={nameRu} maxLength={255} onChange={e => setNameRu(e.target.value)} placeholder="ex: Аудит HR GDPR" />
        </div>
        <div className="admin-form-group">
          <label>Descriere (RO)</label>
          <textarea value={descRo} maxLength={2000} onChange={e => setDescRo(e.target.value)} placeholder="Descrierea testului..." />
        </div>
        <div className="admin-form-group">
          <label>Descriere (RU)</label>
          <textarea value={descRu} maxLength={2000} onChange={e => setDescRu(e.target.value)} placeholder="Описание теста..." />
        </div>
        <div className="admin-form-group">
          <label>Slug (URL) — lăsați gol pentru auto-generare <small style={{ color: 'var(--text2)' }}>(max 64, a-z 0-9 _ -)</small></label>
          <input
            value={slug}
            maxLength={64}
            onChange={e => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9_-]/g, ''))}
            placeholder="ex: audit-hr-gdpr"
          />
        </div>

        <div className="admin-form-group">
          <label>Ordine în catalog <small style={{ color: 'var(--text2)' }}>(0 = primul / stânga; crește spre dreapta)</small></label>
          <input
            type="number"
            min={0}
            value={orderIndex}
            onChange={e => setOrderIndex(Math.max(0, parseInt(e.target.value, 10) || 0))}
            placeholder="ex: 0, 1, 2..."
            style={{ width: 140 }}
          />
        </div>

        <div className="admin-form-group">
          <label>Categorie <small style={{ color: 'var(--text2)' }}>(apare în filtrul catalog — ex: GDPR, Legal, Business)</small></label>
          <input
            list="test-category-suggestions"
            value={category}
            maxLength={50}
            onChange={e => setCategory(e.target.value)}
            placeholder="ex: GDPR"
          />
          <datalist id="test-category-suggestions">
            <option value="GDPR" />
            <option value="Legal" />
            <option value="Business" />
            <option value="HR" />
          </datalist>
        </div>

        <div className="admin-form-group">
          <label>Bullets / caracteristici card <small style={{ color: 'var(--text2)' }}>(o linie = un bullet, max 20)</small></label>
          <textarea
            value={featuresText}
            onChange={e => setFeaturesText(e.target.value)}
            placeholder={'Ex:\n5 minute\n10 întrebări\nRezultat instant'}
            style={{ minHeight: 110, fontFamily: 'inherit' }}
            maxLength={4000}
          />
        </div>

        <div className="admin-form-group">
          <label style={{ fontWeight: 600 }}>Zone de scor (%)</label>
          <div className="admin-zones-grid">
            <div>
              <label style={{ fontSize: 12 }}>🟢 Risc scăzut (≥%)</label>
              <input type="number" min={0} max={100} value={safe} onChange={e => setSafe(+e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12 }}>🟡 Risc moderat (≥%)</label>
              <input type="number" min={0} max={100} value={developing} onChange={e => setDeveloping(+e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12 }}>🟠 Risc ridicat (≥%)</label>
              <input type="number" min={0} max={100} value={warn} onChange={e => setWarn(+e.target.value)} />
            </div>
            <div>
              <label style={{ fontSize: 12 }}>🔴 Risc critic (≥%)</label>
              <input type="number" min={0} max={100} value={risk} onChange={e => setRisk(+e.target.value)} />
            </div>
          </div>
        </div>

        <div className="admin-form-group">
          <label style={{ fontWeight: 600 }}>
            📄 Tip raport <small style={{ color: 'var(--text2)', fontWeight: 400 }}>
              (ce primește utilizatorul la finalul testului)
            </small>
          </label>
          <div className="admin-report-type-grid admin-report-type-grid--3">
            {([
              { v: 'bizcheck', icon: '🧭', title: 'Raport BizCheck',
                desc: 'Complet — copertă navy, rezumat pe blocuri, 4 zone de risc și pagini detaliate per bloc (esența, risc, acțiune, regulatory).' },
              { v: 'standard', icon: '📋', title: 'Raport Standard',
                desc: 'Structură identică cu BizCheck + checklist per-întrebare (✓ corespunde normei / ✗ nu corespunde). Mai simplu, fără paginile de explicații pe bloc.' },
              { v: 'premium',  icon: '💎', title: 'Premium',
                desc: 'Doar sumar — copertă, rezumat pe blocuri, 4 zone de risc. Fără pagini detaliate.' },
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
          <label style={{ fontWeight: 600 }}>Vizibilitate în catalog</label>
          <div className="admin-visibility-grid">
            {([
              { v: 'active' as const, icon: '✅', title: 'Activ',
                desc: 'Vizibil și clickabil pentru utilizatori.' },
              { v: 'coming_soon' as const, icon: '⏳', title: 'În curând',
                desc: 'Vizibil cu overlay „În curând" și buton dezactivat.' },
              { v: 'hidden' as const, icon: '🚫', title: 'Inactiv',
                desc: 'Ascuns complet din catalogul public.' },
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
            💰 Test cu plată (flag metadata — gate-ul efectiv e pe landing-ul extern)
          </label>
        </div>

        {isPaid && (
          <div className="admin-form-group">
            <label>💰 Preț acces <small style={{ color: 'var(--text2)' }}>(virgulă sau punct, max 99 999 999.99)</small></label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type="text"
                inputMode="decimal"
                value={price}
                maxLength={12}
                onChange={e => setPrice(e.target.value.replace(/[^0-9.,]/g, ''))}
                placeholder="ex: 199 sau 199.50"
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
          <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose} disabled={busy}>Anulează</button>
          <button type="submit" className="admin-btn admin-btn-accent" disabled={busy}>{busy ? '...' : 'Salvează'}</button>
        </div>
      </form>
    </div>
  );
}
