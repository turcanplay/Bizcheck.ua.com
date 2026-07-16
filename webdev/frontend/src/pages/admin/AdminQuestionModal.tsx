import { useMemo, useState, type FormEvent } from 'react';
import type { AdminAnswerInput, AdminBlock, AdminQuestion, AdminQuestionInput } from '@/api/admin';

interface Props {
  initial: AdminQuestion | null;
  blocks: AdminBlock[];
  allQuestions: AdminQuestion[];
  defaultBlockId: number;
  onClose: () => void;
  onSave: (data: AdminQuestionInput, id: number | null) => Promise<void>;
}

export default function AdminQuestionModal({ initial, blocks, allQuestions, defaultBlockId, onClose, onSave }: Props) {
  const editing = !!initial;
  const [blockId, setBlockId] = useState<number>(initial?.block_id ?? defaultBlockId);
  const [textUk, setTextUk] = useState(initial?.text_uk ?? '');
  const [textRu, setTextRu] = useState(initial?.text_ru ?? '');
  const [noteUk, setNoteUk] = useState(initial?.note_uk ?? '');
  const [noteRu, setNoteRu] = useState(initial?.note_ru ?? '');
  // Order can be typed as "1", "1.1", "2,3" — comma auto-converted to dot.
  // Stored DB column is INTEGER, so "1.1" means: sub-question of question at main-index 1, in 1st sub slot.
  const [orderText, setOrderText] = useState(String(initial?.order_index ?? 0));
  const [parentId, setParentId] = useState<number | null>(initial?.parent_question_id ?? null);
  const [answers, setAnswers] = useState<AdminAnswerInput[]>(() => {
    if (initial?.answers && initial.answers.length > 0) {
      return initial.answers.map(a => ({
        text_uk: a.text_uk, text_ru: a.text_ru,
        score: a.score, next_question_id: a.next_question_id,
      }));
    }
    return [
      { text_uk: 'Так', text_ru: 'Да', score: 1, next_question_id: null },
      { text_uk: 'Ні', text_ru: 'Нет', score: 0, next_question_id: null },
    ];
  });
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function updateAnswer(i: number, patch: Partial<AdminAnswerInput>) {
    setAnswers(prev => prev.map((a, idx) => (idx === i ? { ...a, ...patch } : a)));
  }
  function removeAnswer(i: number) {
    setAnswers(prev => prev.filter((_, idx) => idx !== i));
  }
  function addAnswer() {
    setAnswers(prev => [...prev, { text_uk: '', text_ru: '', score: 0, next_question_id: null }]);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!blockId) { setError('Оберіть блок'); return; }
    if (!textUk.trim() && !textRu.trim()) { setError('Обов\'язковий щонайменше один текст (UA або RU)'); return; }
    if (answers.length < 2) { setError('Мінімум 2 варіанти відповіді'); return; }
    for (const a of answers) {
      if (!a.text_uk.trim() && !a.text_ru.trim()) { setError('Кожна відповідь повинна мати текст (UA або RU)'); return; }
    }
    setBusy(true);
    try {
      // Parse order text. "1"/"2" = simple order. "1.1"/"2,3" = sub-question of that main position.
      const normalized = orderText.replace(',', '.').trim();
      let order_index = 0;
      let parent_override: number | null | undefined = undefined;
      if (normalized.includes('.')) {
        const [mainStr, subStr] = normalized.split('.');
        const mainPos = parseInt(mainStr, 10);
        const subPos = parseInt(subStr, 10);
        if (Number.isFinite(mainPos) && Number.isFinite(subPos)) {
          // Find top-level question at main position (mainPos is 1-based index) inside the same block.
          const tops = allQuestions
            .filter(q => q.block_id === blockId && q.parent_question_id == null && q.id !== initial?.id)
            .sort((a, b) => a.order_index - b.order_index || a.id - b.id);
          const parent = tops[mainPos - 1];
          if (parent) {
            parent_override = parent.id;
            order_index = Math.max(0, subPos - 1);
          }
        }
      } else {
        order_index = Math.max(0, (parseInt(normalized, 10) || 1) - 1);
      }
      const data: AdminQuestionInput = {
        block_id: blockId,
        text_uk: textUk.trim(),
        text_ru: textRu.trim(),
        note_uk: noteUk.trim() || null,
        note_ru: noteRu.trim() || null,
        order_index,
        parent_question_id: parent_override !== undefined ? parent_override : parentId,
        answers: answers.map(a => ({
          text_uk: a.text_uk.trim(), text_ru: a.text_ru.trim(),
          score: Number(a.score) || 0,
          next_question_id: a.next_question_id ?? null,
        })),
      };
      await onSave(data, initial?.id ?? null);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setBusy(false);
    }
  }

  const candidateParents = allQuestions.filter(q => q.id !== initial?.id);
  const candidateNext = allQuestions.filter(q => q.id !== initial?.id);

  // Local-position label per question: "1", "2.1" … prefixed with block when
  // the test has multiple blocks ("B1.1", "B2.3.1"). Replaces exposing DB ids.
  const questionNumberById = useMemo(() => {
    const map = new Map<number, string>();
    blocks.forEach((block, blockIdx) => {
      const blockQuestions = allQuestions.filter(q => q.block_id === block.id);
      const tops = blockQuestions
        .filter(q => q.parent_question_id == null)
        .sort((a, b) => a.order_index - b.order_index || a.id - b.id);
      const blockPrefix = blocks.length > 1 ? `B${blockIdx + 1}.` : '';
      tops.forEach((q, i) => {
        const num = `${blockPrefix}${i + 1}`;
        map.set(q.id, num);
        const subs = blockQuestions
          .filter(sq => sq.parent_question_id === q.id)
          .sort((a, b) => a.order_index - b.order_index || a.id - b.id);
        subs.forEach((sq, j) => {
          map.set(sq.id, `${num}.${j + 1}`);
        });
      });
    });
    return map;
  }, [blocks, allQuestions]);

  const labelFor = (q: AdminQuestion) => {
    const num = questionNumberById.get(q.id) ?? `#${q.id}`;
    const preview = (q.text_uk || q.text_ru || '').slice(0, 50);
    return `${num}: ${preview}`;
  };

  return (
    <div className="admin-modal-overlay" onClick={onClose}>
      <form className="admin-modal" style={{ width: 760 }} onClick={e => e.stopPropagation()} onSubmit={onSubmit}>
        <h3>{editing ? 'Редагувати запитання' : 'Додати запитання'}</h3>

        <div className="admin-form-group">
          <label>Блок *</label>
          <select value={blockId} onChange={e => setBlockId(+e.target.value)}>
            {blocks.map(b => <option key={b.id} value={b.id}>{b.title_uk || b.title_ru}</option>)}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="admin-form-group">
            <label>Текст запитання (UA)</label>
            <textarea value={textUk} onChange={e => setTextUk(e.target.value)} />
          </div>
          <div className="admin-form-group">
            <label>Текст запитання (RU)</label>
            <textarea value={textRu} onChange={e => setTextRu(e.target.value)} />
          </div>
          <div className="admin-form-group">
            <label>Примітка (UA) — необов'язково</label>
            <textarea value={noteUk} onChange={e => setNoteUk(e.target.value)} />
          </div>
          <div className="admin-form-group">
            <label>Примітка (RU) — необов'язково</label>
            <textarea value={noteRu} onChange={e => setNoteRu(e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
          <div className="admin-form-group">
            <label>Порядок (1, 2, 1.1, 2.3… — „,"→ „.")</label>
            <input
              type="text"
              inputMode="decimal"
              value={orderText}
              maxLength={10}
              onChange={e => setOrderText(e.target.value.replace(/[^0-9.,]/g, '').replace(',', '.'))}
              placeholder="напр.: 1  або  2.1"
            />
          </div>
          <div className="admin-form-group">
            <label>Підзапитання до… (необов'язково)</label>
            <select value={parentId ?? ''} onChange={e => setParentId(e.target.value ? +e.target.value : null)}>
              <option value="">— Головне запитання —</option>
              {candidateParents.map(q => (
                <option key={q.id} value={q.id}>{labelFor(q)}</option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ marginTop: 20, marginBottom: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h4 style={{ margin: 0 }}>Варіанти відповіді (мін. 2)</h4>
          <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm" onClick={addAnswer}>+ Додати варіант</button>
        </div>

        {answers.map((a, i) => (
          <div key={i} style={{ background: 'var(--surface2)', border: '1px solid var(--border)', borderRadius: 8, padding: 12, marginBottom: 10 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <span style={{ fontWeight: 600, color: 'var(--accent)' }}>Варіант #{i + 1}</span>
              {answers.length > 2 && (
                <button type="button" className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => removeAnswer(i)}>🗑</button>
              )}
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
              <input placeholder="Текст (UA)" value={a.text_uk} onChange={e => updateAnswer(i, { text_uk: e.target.value })} style={inputStyle} />
              <input placeholder="Текст (RU)" value={a.text_ru} onChange={e => updateAnswer(i, { text_ru: e.target.value })} style={inputStyle} />
            </div>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
              <label style={{ fontSize: 12, color: 'var(--text2)' }}>Бал:</label>
              <input
                type="number" step="0.1" value={a.score}
                onChange={e => updateAnswer(i, { score: +e.target.value })}
                style={{ ...inputStyle, width: 80 }}
              />
              <label style={{ fontSize: 12, color: 'var(--text2)', marginLeft: 8 }}>→ Перейти до:</label>
              <select
                value={a.next_question_id ?? ''}
                onChange={e => updateAnswer(i, { next_question_id: e.target.value ? +e.target.value : null })}
                style={{ ...inputStyle, flex: 1, minWidth: 180 }}
              >
                <option value="">— Наступне за порядком —</option>
                {candidateNext.map(q => (
                  <option key={q.id} value={q.id}>{labelFor(q)}</option>
                ))}
              </select>
            </div>
          </div>
        ))}

        {error && <div className="admin-error">⚠️ {error}</div>}

        <div className="admin-modal-actions">
          <button type="button" className="admin-btn admin-btn-ghost" onClick={onClose} disabled={busy}>Скасувати</button>
          <button type="submit" className="admin-btn admin-btn-accent" disabled={busy}>{busy ? '...' : 'Зберегти'}</button>
        </div>
      </form>
    </div>
  );
}

const inputStyle: React.CSSProperties = {
  padding: '8px 12px',
  background: 'var(--bg)',
  border: '1px solid var(--border)',
  borderRadius: 6,
  color: 'var(--text)',
  fontSize: 14,
  fontFamily: 'inherit',
};
