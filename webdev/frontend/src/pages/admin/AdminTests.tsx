import { useEffect, useState, type DragEvent } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, type AdminTest, type AdminTestInput } from '@/api/admin';
import AdminTestModal from './AdminTestModal';

/** Display order: active tests first, then inactive — each group by saved
 *  order_index (then id as a stable tie-breaker). */
function sortForDisplay(list: AdminTest[]): AdminTest[] {
  return [...list].sort((a, b) => {
    if (a.is_active !== b.is_active) return a.is_active ? -1 : 1;
    if ((a.order_index ?? 0) !== (b.order_index ?? 0)) return (a.order_index ?? 0) - (b.order_index ?? 0);
    return a.id - b.id;
  });
}

export default function AdminTests() {
  const [tests, setTests] = useState<AdminTest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<AdminTest | null>(null);
  const [creating, setCreating] = useState(false);
  const [draggedId, setDraggedId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const { tests } = await adminApi.listTests();
      setTests(sortForDisplay(tests));
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  // --- Drag & drop reordering (active-first invariant preserved) ------------
  function onDragStart(e: DragEvent, id: number) {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(id));
  }
  function onDragEnd() {
    setDraggedId(null);
    setDragOverId(null);
  }
  function onDragOver(e: DragEvent, targetId: number) {
    if (draggedId == null) return;
    const dragged = tests.find(t => t.id === draggedId);
    const target = tests.find(t => t.id === targetId);
    // Only allow dropping within the same active/inactive group.
    if (!dragged || !target || dragged.is_active !== target.is_active) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverId !== targetId) setDragOverId(targetId);
  }
  async function onDrop(targetId: number) {
    const dragged = tests.find(t => t.id === draggedId);
    const target = tests.find(t => t.id === targetId);
    setDraggedId(null);
    setDragOverId(null);
    if (!dragged || !target || dragged.id === target.id) return;
    if (dragged.is_active !== target.is_active) return; // can't mix groups

    // Move `dragged` to sit just before `target` in the rendered order.
    const without = tests.filter(t => t.id !== dragged.id);
    const ti = without.findIndex(t => t.id === target.id);
    without.splice(ti, 0, dragged);

    setTests(without);                       // optimistic
    const items = without.map((t, i) => ({ id: t.id, order_index: i }));
    try {
      await adminApi.reorderTests(items);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reorder failed');
      await load();                          // revert to server truth on failure
    }
  }

  async function onSave(input: AdminTestInput, id: number | null) {
    if (id === null) await adminApi.createTest(input);
    else await adminApi.updateTest(id, input);
    setEditing(null);
    setCreating(false);
    await load();
  }

  async function onDelete(t: AdminTest) {
    if (!confirm(`Видалити тест "${t.name_uk}"? Усі пов'язані блоки та запитання буде видалено.`)) return;
    await adminApi.deleteTest(t.id);
    await load();
  }

  function copyLink(slug: string) {
    const url = `${window.location.origin}/test/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      // Lightweight feedback without extra deps
      // eslint-disable-next-line no-alert
      alert(`Посилання скопійовано: ${url}`);
    });
  }

  return (
    <>
      <div className="admin-section-header">
        <h2>🧪 Тести</h2>
        <button className="admin-btn admin-btn-accent" onClick={() => setCreating(true)}>+ Додати тест</button>
      </div>

      {error && <div className="admin-error">⚠️ {error}</div>}
      {loading && <div className="admin-empty">Завантаження...</div>}
      {!loading && tests.length === 0 && (
        <div className="admin-empty">Ще немає тестів. Натисніть „+ Додати тест", щоб створити.</div>
      )}

      {!loading && tests.length > 0 && (
        <div className="admin-empty" style={{ textAlign: 'left', padding: '4px 2px 10px', opacity: 0.75 }}>
          ⠿ Перетягуйте тести за маркер, щоб змінити порядок. Активні відображаються першими, неактивні — після них.
        </div>
      )}

      {tests.map(t => {
        const url = `${window.location.origin}/test/${t.slug}`;
        const zones = t.scoring_zones || { safe: 80, developing: 70, warn: 65 };
        return (
          <div
            className={`admin-test-card${draggedId === t.id ? ' admin-test-card--dragging' : ''}${dragOverId === t.id ? ' admin-test-card--dragover' : ''}`}
            key={t.id}
            onDragOver={e => onDragOver(e, t.id)}
            onDrop={() => onDrop(t.id)}
            onDragEnd={onDragEnd}
          >
            <div className="admin-test-card__head">
              <span
                className="admin-test-card__drag"
                draggable
                onDragStart={e => onDragStart(e, t.id)}
                onDragEnd={onDragEnd}
                title="Перетягніть, щоб змінити порядок"
                aria-label="Перетягніть, щоб змінити порядок"
              >
                ⠿
              </span>
              <div style={{ flex: 1, minWidth: 260 }}>
                <div className="admin-test-card__title">{t.name_uk}</div>
                {t.name_ru && <div className="admin-test-card__subtitle">{t.name_ru}</div>}
                {t.description_uk && <div className="admin-test-card__desc">{t.description_uk}</div>}
              </div>
              <div className="admin-test-card__actions">
                <Link to={`/admin_bizcheck_md_crowe/tests/${t.slug}`} className="admin-btn admin-btn-accent admin-btn-sm" style={{ textDecoration: 'none' }}>📂 Відкрити</Link>
                <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setEditing(t)}>✏️ Редагувати</button>
                <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => onDelete(t)}>🗑 Видалити</button>
              </div>
            </div>

            <div className="admin-test-card__link-bar">
              <span>🔗 Посилання:</span>
              <code>{url}</code>
              <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => copyLink(t.slug)}>📋 Копіювати</button>
              <a href={url} target="_blank" rel="noreferrer" className="admin-btn admin-btn-accent admin-btn-sm" style={{ textDecoration: 'none' }}>🚀 Відкрити тест</a>
            </div>

            <div className="admin-test-card__meta">
              <span>🟢 Безпечно: ≥{zones.safe}%</span>
              <span>🟡 Середній: ≥{zones.developing}%</span>
              <span>🟠 Низький: ≥{zones.warn}%</span>
              {t.is_coming_soon
                ? <span className="admin-badge admin-badge-blue">⏳ Незабаром</span>
                : t.is_active
                ? <span className="admin-badge admin-badge-green">✅ Активний</span>
                : <span className="admin-badge admin-badge-muted">⏸ Неактивний</span>}
              {t.is_paid
                ? (
                  <span className="admin-badge admin-badge-gold">
                    💰 {t.price != null ? `${t.price} ${t.currency}` : 'Платний (ціну не вказано)'}
                  </span>
                )
                : <span className="admin-badge admin-badge-blue">🆓 Безкоштовний</span>}
              <span className="admin-badge admin-badge-muted">slug: {t.slug}</span>
            </div>
          </div>
        );
      })}

      {(creating || editing) && (
        <AdminTestModal
          initial={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSave={onSave}
        />
      )}
    </>
  );
}
