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
    if (!confirm(`Видалити відгук "${t.name}"?`)) return;
    await adminApi.deleteTestimonial(t.id);
    await load();
  }

  return (
    <>
      <div className="admin-section-header">
        <h2>💬 Відгуки</h2>
        <button className="admin-btn admin-btn-accent" onClick={() => setCreating(true)}>+ Додати відгук</button>
      </div>

      {error && <div className="admin-error">⚠️ {error}</div>}
      {loading && <div className="admin-empty">Завантаження...</div>}
      {!loading && items.length === 0 && <div className="admin-empty">Ще немає відгуків.</div>}

      {items.map(t => (
        <div className="admin-test-card" key={t.id} style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 2 }}>{t.name}</div>
              {t.role && <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 8 }}>{t.role}</div>}
              {t.quote_uk && <div style={{ fontSize: 13, color: 'var(--text2)', fontStyle: 'italic', lineHeight: 1.5, marginBottom: 6 }}>"{t.quote_uk}"</div>}
              <div style={{ fontSize: 12, color: 'var(--accent)' }}>
                ⭐ {t.rating} · порядок: {t.order_index}
                {t.is_user_submitted && (
                  <span className="admin-badge admin-badge-blue" style={{ marginLeft: 8 }}>
                    👤 користувач{t.lang ? ` · ${t.lang.toUpperCase()}` : ''}
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
  const [quoteUk, setQuoteUk] = useState(initial?.quote_uk ?? '');
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
    if (!name.trim()) { setError('Ім\'я обов\'язкове'); return; }
    setBusy(true);
    try {
      await onSave({
        name: name.trim(),
        role: role.trim() || null,
        quote_uk: quoteUk.trim(),
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
        <h3>{initial ? 'Редагувати відгук' : 'Додати відгук'}</h3>

        <div className="admin-form-group">
          <label>Ім'я *</label>
          <input value={name} maxLength={100} onChange={e => setName(e.target.value)} placeholder="Напр.: Влад Русу" autoFocus />
        </div>
        <div className="admin-form-group">
          <label>Роль / компанія</label>
          <input value={role} maxLength={150} onChange={e => setRole(e.target.value)} placeholder="Напр.: CEO @ Фірма ТОВ" />
        </div>
        <div className="admin-form-group">
          <label>Цитата (UA)</label>
          <textarea value={quoteUk} maxLength={1000} onChange={e => setQuoteUk(e.target.value)} style={{ minHeight: 80 }} />
        </div>
        <div className="admin-form-group">
          <label>Цитата (RU)</label>
          <textarea value={quoteRu} maxLength={1000} onChange={e => setQuoteRu(e.target.value)} style={{ minHeight: 80 }} />
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="admin-form-group">
            <label>Рейтинг (1-5, крок 0.5)</label>
            <input type="number" min={1} max={5} step={0.5} value={rating} onChange={e => setRating(+e.target.value)} />
          </div>
          <div className="admin-form-group">
            <label>Порядок</label>
            <input type="number" min={0} value={orderIndex} onChange={e => setOrderIndex(+e.target.value)} />
          </div>
        </div>
        <div className="admin-form-group">
          <label>URL аватара (необов'язково)</label>
          <input value={avatar} maxLength={500} onChange={e => setAvatar(e.target.value)} placeholder="https://..." />
        </div>
        <div className="admin-form-group">
          <label className="admin-checkbox-row">
            <input type="checkbox" checked={isActive} onChange={e => setIsActive(e.target.checked)} />
            ✅ Активний
          </label>
        </div>

        {error && <div className="admin-error">⚠️ {error}</div>}

        <div className="admin-modal-actions">
          <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose} disabled={busy}>Скасувати</button>
          <button type="submit" className="admin-btn admin-btn-accent" disabled={busy}>{busy ? '...' : 'Зберегти'}</button>
        </div>
      </form>
    </div>
  );
}
