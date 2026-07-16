import { useEffect, useState, type FormEvent } from 'react';
import { adminApi, type AdminFaqItem, type AdminFaqInput } from '@/api/admin';

export default function AdminFaq() {
  const [items, setItems] = useState<AdminFaqItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<AdminFaqItem | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { faq } = await adminApi.listFaq();
      setItems(faq);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function onSave(data: AdminFaqInput, id: number | null) {
    if (id === null) await adminApi.createFaq(data);
    else await adminApi.updateFaq(id, data);
    setEditing(null); setCreating(false);
    await load();
  }

  async function onDelete(f: AdminFaqItem) {
    if (!confirm(`Видалити запитання "${f.question_uk || f.question_en}"?`)) return;
    await adminApi.deleteFaq(f.id);
    await load();
  }

  return (
    <>
      <div className="admin-section-header">
        <h2>❓ Часті запитання</h2>
        <button className="admin-btn admin-btn-accent" onClick={() => setCreating(true)}>+ Додати запитання</button>
      </div>

      {error && <div className="admin-error">⚠️ {error}</div>}
      {loading && <div className="admin-empty">Завантаження...</div>}
      {!loading && items.length === 0 && <div className="admin-empty">Ще немає запитань.</div>}

      {items.map((f, idx) => (
        <div className="admin-test-card" key={f.id} style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13, color: 'var(--text2)', fontFamily: 'monospace', marginBottom: 4 }}>
                #{String(idx + 1).padStart(2, '0')} · порядок: {f.order_index}
              </div>
              <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                {f.question_uk || '—'}
              </div>
              {f.question_en && <div style={{ fontSize: 13, color: 'var(--text2)', marginBottom: 6 }}>{f.question_en}</div>}
              {f.answer_uk && <div style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5 }}>{f.answer_uk}</div>}
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              {f.is_active
                ? <span className="admin-badge admin-badge-green">✅</span>
                : <span className="admin-badge admin-badge-muted">⏸</span>}
              <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setEditing(f)}>✏️</button>
              <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => onDelete(f)}>🗑</button>
            </div>
          </div>
        </div>
      ))}

      {(creating || editing) && (
        <FaqModal initial={editing} onClose={() => { setCreating(false); setEditing(null); }} onSave={onSave} />
      )}
    </>
  );
}

interface ModalProps {
  initial: AdminFaqItem | null;
  onClose: () => void;
  onSave: (data: AdminFaqInput, id: number | null) => Promise<void>;
}

function FaqModal({ initial, onClose, onSave }: ModalProps) {
  const [quk, setQro] = useState(initial?.question_uk ?? '');
  const [qen, setQen] = useState(initial?.question_en ?? '');
  const [auk, setAro] = useState(initial?.answer_uk ?? '');
  const [aen, setAen] = useState(initial?.answer_en ?? '');
  const [orderIndex, setOrderIndex] = useState(initial?.order_index ?? 0);
  const [isActive, setIsActive] = useState(initial?.is_active ?? true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!quk.trim() && !qen.trim()) { setError('Потрібне щонайменше одне запитання (UA або EN)'); return; }
    setBusy(true);
    try {
      await onSave({
        question_uk: quk.trim(), question_en: qen.trim(),
        answer_uk: auk.trim(), answer_en: aen.trim(),
        order_index: Number(orderIndex) || 0,
        is_active: isActive,
      }, initial?.id ?? null);
    } catch (e) { setError(e instanceof Error ? e.message : 'Save failed'); }
    finally { setBusy(false); }
  }

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <form className="admin-modal" onClick={e => e.stopPropagation()} onSubmit={onSubmit}>
        <h3>{initial ? 'Редагувати запитання' : 'Додати запитання'}</h3>

        <div className="admin-form-group">
          <label>Запитання (UA) *</label>
          <input value={quk} maxLength={500} onChange={e => setQro(e.target.value)} placeholder="Напр.: Це безкоштовно?" autoFocus />
        </div>
        <div className="admin-form-group">
          <label>Запитання (EN)</label>
          <input value={qen} maxLength={500} onChange={e => setQen(e.target.value)} placeholder="e.g.: Is it free?" />
        </div>
        <div className="admin-form-group">
          <label>Відповідь (UA)</label>
          <textarea value={auk} maxLength={3000} onChange={e => setAro(e.target.value)} placeholder="Детальна відповідь..." style={{ minHeight: 100 }} />
        </div>
        <div className="admin-form-group">
          <label>Відповідь (EN)</label>
          <textarea value={aen} maxLength={3000} onChange={e => setAen(e.target.value)} placeholder="Detailed answer..." style={{ minHeight: 100 }} />
        </div>
        <div className="admin-form-group">
          <label>Порядок</label>
          <input type="number" min={0} value={orderIndex} onChange={e => setOrderIndex(+e.target.value)} />
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
