import { useEffect, useState, type FormEvent } from 'react';
import { adminApi, type AdminTestimonial, type AdminTestimonialInput } from '@/api/admin';

export default function AdminTestimonials() {
  const [items, setItems] = useState<AdminTestimonial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<AdminTestimonial | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { testimonials } = await adminApi.listTestimonials();
      setItems(testimonials);
      setError('');
    } catch (e) { setError(e instanceof Error ? e.message : 'Load failed'); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function onSave(data: AdminTestimonialInput, id: number | null) {
    if (id === null) await adminApi.createTestimonial(data);
    else await adminApi.updateTestimonial(id, data);
    setEditing(null); setCreating(false);
    await load();
  }

  async function onDelete(t: AdminTestimonial) {
    if (!confirm(`Delete testimonial "${t.name}"?`)) return;
    await adminApi.deleteTestimonial(t.id);
    await load();
  }

  return (
    <>
      <div className="admin-section-header">
        <h2>💬 Testimonials</h2>
        <button className="admin-btn admin-btn-accent" onClick={() => setCreating(true)}>+ Add testimonial</button>
      </div>

      {error && <div className="admin-error">⚠️ {error}</div>}
      {loading && <div className="admin-empty">Loading...</div>}
      {!loading && items.length === 0 && <div className="admin-empty">No testimonials yet.</div>}

      {items.map(t => (
        <div className="admin-test-card" key={t.id} style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{t.name}</div>
              {t.role && <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>{t.role}</div>}
              {t.quote_uk && <div style={{ fontSize: 13, color: 'var(--text2)', fontStyle: 'italic', lineHeight: 1.5, marginBottom: 6 }}>"{t.quote_uk}"</div>}
              <div style={{ fontSize: 12, color: 'var(--accent)' }}>
                ⭐ {t.rating} · order: {t.order_index}
                {t.is_user_submitted && (
                  <span className="admin-badge admin-badge-blue" style={{ marginLeft: 8 }}>
                    👤 user{t.lang ? ` · ${t.lang.toUpperCase()}` : ''}
                  </span>
                )}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              {t.is_active
                ? <span className="admin-badge admin-badge-green">✅</span>
                : <span className="admin-badge admin-badge-muted">⏸</span>}
              <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setEditing(t)}>✏️</button>
              <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => onDelete(t)}>🗑</button>
            </div>
          </div>
        </div>
      ))}

      {(creating || editing) && (
        <TestimonialModal initial={editing} onClose={() => { setCreating(false); setEditing(null); }} onSave={onSave} />
      )}
    </>
  );
}

interface ModalProps {
  initial: AdminTestimonial | null;
  onClose: () => void;
  onSave: (data: AdminTestimonialInput, id: number | null) => Promise<void>;
}

function TestimonialModal({ initial, onClose, onSave }: ModalProps) {
  const [name, setName] = useState(initial?.name ?? '');
  const [role, setRole] = useState(initial?.role ?? '');
  const [quoteRo, setQuoteRo] = useState(initial?.quote_uk ?? '');
  const [quoteRu, setQuoteRu] = useState(initial?.quote_en ?? '');
  const [rating, setRating] = useState(initial?.rating ?? 5);
  const [avatar, setAvatar] = useState(initial?.avatar_url ?? '');
  const [orderIndex, setOrderIndex] = useState(initial?.order_index ?? 0);
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Name required'); return; }
    setBusy(true);
    try {
      await onSave({
        name: name.trim(),
        role: role.trim() || null,
        quote_uk: quoteRo.trim(),
        quote_en: quoteRu.trim(),
        rating: Math.max(1, Math.min(5, Math.round((Number(rating) || 5) * 2) / 2)),
        avatar_url: avatar.trim() || null,
        order_index: Number(orderIndex) || 0,
        is_active: isActive,
      }, initial?.id ?? null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Save failed'); }
    finally { setBusy(false); }
  }

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <form className="admin-modal" onClick={e => e.stopPropagation()} onSubmit={onSubmit}>
        <h3>{initial ? 'Edit testimonial' : 'Add testimonial'}</h3>

        <div className="admin-form-group">
          <label>Name *</label>
          <input value={name} maxLength={100} onChange={e => setName(e.target.value)} placeholder="E.g.: Vlad Rusu" autoFocus />
        </div>
        <div className="admin-form-group">
          <label>Role / company</label>
          <input value={role} maxLength={150} onChange={e => setRole(e.target.value)} placeholder="E.g.: CEO @ Company Ltd" />
        </div>
        <div className="admin-form-group">
          <label>Quote (UK)</label>
          <textarea value={quoteRo} maxLength={1000} onChange={e => setQuoteRo(e.target.value)} style={{ minHeight: 80 }} />
        </div>
        <div className="admin-form-group">
          <label>Quote (EN)</label>
          <textarea value={quoteRu} maxLength={1000} onChange={e => setQuoteRu(e.target.value)} style={{ minHeight: 80 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="admin-form-group">
            <label>Rating (1-5, step 0.5)</label>
            <input type="number" min={1} max={5} step={0.5} value={rating} onChange={e => setRating(+e.target.value)} />
          </div>
          <div className="admin-form-group">
            <label>Order</label>
            <input type="number" min={0} value={orderIndex} onChange={e => setOrderIndex(+e.target.value)} />
          </div>
        </div>
        <div className="admin-form-group">
          <label>Avatar URL (optional)</label>
          <input value={avatar} maxLength={500} onChange={e => setAvatar(e.target.value)} placeholder="https://..." />
        </div>
        <div className="admin-form-group">
          <label className="admin-checkbox-row">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
            ✅ Active
          </label>
        </div>

        {error && <div className="admin-error">⚠️ {error}</div>}

        <div className="admin-modal-actions">
          <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button type="submit" className="admin-btn admin-btn-accent" disabled={busy}>{busy ? '...' : 'Save'}</button>
        </div>
      </form>
    </div>
  );
}
