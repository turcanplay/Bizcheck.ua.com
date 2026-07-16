import { useState, type FormEvent } from 'react';
import type { AdminBlock } from '@/api/admin';

interface Props {
  initial: AdminBlock | null;
  testId: number;
  onClose: () => void;
  onSave: (data: { title_uk: string; title_en: string; order_index: number }, id: number | null) => Promise<void>;
}

export default function AdminBlockModal({ initial, onClose, onSave }: Props) {
  const editing = !!initial;
  const [titleUk, setTitleUk] = useState(initial?.title_uk ?? '');
  const [titleEn, setTitleEn] = useState(initial?.title_en ?? '');
  const [orderIndex, setOrderIndex] = useState(initial?.order_index ?? 0);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!titleUk.trim() && !titleEn.trim()) { setError('Принаймні одна назва (UK або EN) є обовʼязковою'); return; }
    setBusy(true);
    try {
      await onSave(
        { title_uk: titleUk.trim(), title_en: titleEn.trim(), order_index: Number(orderIndex) || 0 },
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
        <h3>{editing ? 'Редагувати блок' : 'Додати блок'}</h3>

        <div className="admin-form-group">
          <label>Назва (UA) <small style={{ color: 'var(--text2)' }}>(макс. 255)</small></label>
          <input value={titleUk} maxLength={255} onChange={e => setTitleUk(e.target.value)} placeholder="напр.: Відповідність HR" autoFocus />
        </div>
        <div className="admin-form-group">
          <label>Назва (EN) <small style={{ color: 'var(--text2)' }}>(макс. 255)</small></label>
          <input value={titleEn} maxLength={255} onChange={e => setTitleEn(e.target.value)} placeholder="e.g.: HR Compliance" />
        </div>
        <div className="admin-form-group">
          <label>Порядок</label>
          <input type="number" min={0} max={9999} value={orderIndex} onChange={e => setOrderIndex(+e.target.value)} />
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
