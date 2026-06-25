import { useState, type FormEvent } from 'react';
import type { AdminBlock } from '@/api/admin';

interface Props {
  initial: AdminBlock | null;
  testId: number;
  onClose: () => void;
  onSave: (data: { title_ro: string; title_ru: string; order_index: number }, id: number | null) => Promise<void>;
}

export default function AdminBlockModal({ initial, onClose, onSave }: Props) {
  const editing = !!initial;
  const [titleRo, setTitleRo] = useState(initial?.title_ro ?? '');
  const [titleRu, setTitleRu] = useState(initial?.title_ru ?? '');
  const [orderIndex, setOrderIndex] = useState(initial?.order_index ?? 0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!titleRo.trim() && !titleRu.trim()) { setError('Cel puțin un titlu (RO sau RU) este obligatoriu'); return; }
    setBusy(true);
    try {
      await onSave(
        { title_ro: titleRo.trim(), title_ru: titleRu.trim(), order_index: Number(orderIndex) || 0 },
        initial?.id ?? null,
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <form className="admin-modal" style={{ width: 520 }} onClick={e => e.stopPropagation()} onSubmit={onSubmit}>
        <h3>{editing ? 'Editează Bloc' : 'Adaugă Bloc'}</h3>

        <div className="admin-form-group">
          <label>Titlu (RO) <small style={{ color: 'var(--text2)' }}>(max 255)</small></label>
          <input value={titleRo} maxLength={255} onChange={e => setTitleRo(e.target.value)} placeholder="ex: Conformitate HR" autoFocus />
        </div>
        <div className="admin-form-group">
          <label>Titlu (RU) <small style={{ color: 'var(--text2)' }}>(max 255)</small></label>
          <input value={titleRu} maxLength={255} onChange={e => setTitleRu(e.target.value)} placeholder="ex: Соответствие HR" />
        </div>
        <div className="admin-form-group">
          <label>Ordine</label>
          <input type="number" min={0} max={9999} value={orderIndex} onChange={e => setOrderIndex(+e.target.value)} />
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
