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
    if (!confirm(`Ștergi testimonialul "${t.name}"?`)) return;
    await adminApi.deleteTestimonial(t.id);
    await load();
  }

  return (
    <>
      <div className="admin-section-header">
        <h2>💬 Testimoniale</h2>
        <button className="admin-btn admin-btn-accent" onClick={() => setCreating(true)}>+ Adaugă testimonial</button>
      </div>

      {error && <div className="admin-error">⚠️ {error}</div>}
      {loading && <div className="admin-empty">Se încarcă...</div>}
      {!loading && items.length === 0 && <div className="admin-empty">Niciun testimonial încă.</div>}

      {items.map(t => (
        <div className="admin-test-card" key={t.id} style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{t.name}</div>
              {t.role && <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>{t.role}</div>}
              {t.quote_ro && <div style={{ fontSize: 13, color: 'var(--text2)', fontStyle: 'italic', lineHeight: 1.5, marginBottom: 6 }}>"{t.quote_ro}"</div>}
              <div style={{ fontSize: 12, color: 'var(--accent)' }}>
                ⭐ {t.rating} · ordine: {t.order_index}
                {t.is_user_submitted && (
                  <span className="admin-badge admin-badge-blue" style={{ marginLeft: 8 }}>
                    👤 utilizator{t.lang ? ` · ${t.lang.toUpperCase()}` : ''}
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
  const [quoteRo, setQuoteRo] = useState(initial?.quote_ro ?? '');
  const [quoteRu, setQuoteRu] = useState(initial?.quote_ru ?? '');
  const [rating, setRating] = useState(initial?.rating ?? 5);
  const [avatar, setAvatar] = useState(initial?.avatar_url ?? '');
  const [orderIndex, setOrderIndex] = useState(initial?.order_index ?? 0);
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!name.trim()) { setError('Nume obligatoriu'); return; }
    setBusy(true);
    try {
      await onSave({
        name: name.trim(),
        role: role.trim() || null,
        quote_ro: quoteRo.trim(),
        quote_ru: quoteRu.trim(),
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
        <h3>{initial ? 'Editează testimonialul' : 'Adaugă testimonial'}</h3>

        <div className="admin-form-group">
          <label>Nume *</label>
          <input value={name} maxLength={100} onChange={e => setName(e.target.value)} placeholder="Ex: Vlad Rusu" autoFocus />
        </div>
        <div className="admin-form-group">
          <label>Rol / companie</label>
          <input value={role} maxLength={150} onChange={e => setRole(e.target.value)} placeholder="Ex: CEO @ Firma SRL" />
        </div>
        <div className="admin-form-group">
          <label>Citat (RO)</label>
          <textarea value={quoteRo} maxLength={1000} onChange={e => setQuoteRo(e.target.value)} style={{ minHeight: 80 }} />
        </div>
        <div className="admin-form-group">
          <label>Citat (RU)</label>
          <textarea value={quoteRu} maxLength={1000} onChange={e => setQuoteRu(e.target.value)} style={{ minHeight: 80 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="admin-form-group">
            <label>Rating (1-5, pas 0.5)</label>
            <input type="number" min={1} max={5} step={0.5} value={rating} onChange={e => setRating(+e.target.value)} />
          </div>
          <div className="admin-form-group">
            <label>Ordine</label>
            <input type="number" min={0} value={orderIndex} onChange={e => setOrderIndex(+e.target.value)} />
          </div>
        </div>
        <div className="admin-form-group">
          <label>URL avatar (opțional)</label>
          <input value={avatar} maxLength={500} onChange={e => setAvatar(e.target.value)} placeholder="https://..." />
        </div>
        <div className="admin-form-group">
          <label className="admin-checkbox-row">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
            ✅ Activ
          </label>
        </div>

        {error && <div className="admin-error">⚠️ {error}</div>}

        <div className="admin-modal-actions">
          <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose} disabled={busy}>Anulează</button>
          <button type="submit" className="admin-btn admin-btn-accent" disabled={busy}>{busy ? '...' : 'Salvează'}</button>
        </div>
      </form>
    </div>
  );
}
