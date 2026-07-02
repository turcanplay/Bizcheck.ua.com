import { useCallback, useEffect, useMemo, useRef, useState, type DragEvent } from 'react';
import {
  adminApi,
  type AdminBlock, type AdminQuestion, type AdminQuestionInput,
} from '@/api/admin';
import AdminBlockModal from './AdminBlockModal';
import AdminQuestionModal from './AdminQuestionModal';

interface Props {
  testId: number;
}

/** Build the visible tree per block: top-level questions with their sub-questions, both sorted. */
function buildTree(blockQuestions: AdminQuestion[]) {
  const tops = blockQuestions
    .filter(q => q.parent_question_id == null)
    .sort((a, b) => a.order_index - b.order_index || a.id - b.id);
  const subsByParent: Record<number, AdminQuestion[]> = {};
  blockQuestions.forEach(q => {
    if (q.parent_question_id != null) {
      (subsByParent[q.parent_question_id] ??= []).push(q);
    }
  });
  Object.keys(subsByParent).forEach(k => {
    subsByParent[+k].sort((a, b) => a.order_index - b.order_index || a.id - b.id);
  });
  return { tops, subsByParent };
}

export default function AdminTestQuestions({ testId }: Props) {
  const [blocks, setBlocks] = useState<AdminBlock[]>([]);
  const [questions, setQuestions] = useState<AdminQuestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [blockModal, setBlockModal] = useState<{ initial: AdminBlock | null } | null>(null);
  const [questionModal, setQuestionModal] = useState<{ initial: AdminQuestion | null; defaultBlockId: number } | null>(null);

  // Drag state
  const [draggedId, setDraggedId] = useState<number | null>(null);
  // Hover target is kept in a ref so mouse-over doesn't re-render on every pixel.
  // State only mirrors the ref when the target ACTUALLY changes.
  const hoverTargetRef = useRef<string | null>(null);
  const [hoverTarget, setHoverTargetState] = useState<string | null>(null);
  const setHoverTarget = useCallback((next: string | null) => {
    if (hoverTargetRef.current === next) return;
    hoverTargetRef.current = next;
    setHoverTargetState(next);
  }, []);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved'>('idle');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [b, q] = await Promise.all([adminApi.listBlocks(testId), adminApi.listQuestions(testId)]);
      setBlocks(b.blocks.sort((x, y) => x.order_index - y.order_index || x.id - y.id));
      setQuestions(q.questions);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }, [testId]);

  useEffect(() => { load(); }, [load]);

  const questionsByBlock = useMemo(() => {
    const map: Record<number, AdminQuestion[]> = {};
    questions.forEach(q => { (map[q.block_id] ??= []).push(q); });
    return map;
  }, [questions]);

  // Local-position label per question: "1", "2", "2.1" …
  // When multiple blocks exist, prefixed with block position: "B1.Q1", "B2.Q3.1".
  const questionNumberById = useMemo(() => {
    const map = new Map<number, string>();
    blocks.forEach((block, blockIdx) => {
      const blockQuestions = questionsByBlock[block.id] ?? [];
      const { tops, subsByParent } = buildTree(blockQuestions);
      const blockPrefix = blocks.length > 1 ? `B${blockIdx + 1}.` : '';
      tops.forEach((q, i) => {
        const num = `${blockPrefix}${i + 1}`;
        map.set(q.id, num);
        (subsByParent[q.id] ?? []).forEach((sq, j) => {
          map.set(sq.id, `${num}.${j + 1}`);
        });
      });
    });
    return map;
  }, [blocks, questionsByBlock]);

  async function saveBlock(data: { title_ro: string; title_ru: string; order_index: number }, id: number | null) {
    if (id === null) await adminApi.createBlock({ test_id: testId, ...data });
    else await adminApi.updateBlock(id, data);
    setBlockModal(null);
    await load();
  }
  async function deleteBlock(b: AdminBlock) {
    if (!confirm(`Ștergi blocul "${b.title_ro || b.title_ru}"? Toate întrebările din el se vor șterge.`)) return;
    await adminApi.deleteBlock(b.id);
    await load();
  }
  async function saveQuestion(data: AdminQuestionInput, id: number | null) {
    if (id === null) await adminApi.createQuestion(data);
    else await adminApi.updateQuestion(id, data);
    setQuestionModal(null);
    await load();
  }
  async function deleteQuestion(q: AdminQuestion) {
    if (!confirm('Ștergi această întrebare?')) return;
    await adminApi.deleteQuestion(q.id);
    await load();
  }

  // --- Drag & drop ----------------------------------------------------------

  function onDragStart(e: DragEvent, id: number) {
    setDraggedId(id);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(id));
  }
  function onDragEnd() {
    setDraggedId(null);
    setHoverTarget(null);
  }
  // Fires continuously while the cursor is over a target; we must preventDefault
  // to allow drop, but we do NOT update state here (that would flicker).
  function onDragOver(e: DragEvent) {
    if (draggedId == null) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  }
  // Fires once when cursor enters a target — cheap to compare and only updates state
  // when target actually changes. stopPropagation prevents the parent (block zone)
  // from taking over when we enter a child question.
  function onDragEnter(e: DragEvent, targetKey: string) {
    if (draggedId == null) return;
    e.preventDefault();
    e.stopPropagation();
    setHoverTarget(targetKey);
  }

  /**
   * Drop ON a question => the dragged question becomes that question's sub-question.
   * Drop on block top-level area => the dragged question becomes a top-level question in that block.
   */
  async function onDrop(kind: 'onQuestion' | 'onTopArea', targetId: number) {
    if (draggedId == null) { setHoverTarget(null); return; }
    const dragged = questions.find(q => q.id === draggedId);
    if (!dragged) { setHoverTarget(null); setDraggedId(null); return; }

    let newBlockId = dragged.block_id;
    let newParentId: number | null = null;
    let newOrder = 0;

    if (kind === 'onQuestion') {
      const target = questions.find(q => q.id === targetId);
      if (!target) return;
      if (target.id === dragged.id) { setHoverTarget(null); setDraggedId(null); return; }
      // target cannot be a sub of its own descendant (simple guard)
      if (target.parent_question_id === dragged.id) { setHoverTarget(null); setDraggedId(null); return; }
      newBlockId = target.block_id;
      newParentId = target.id;
      const subs = questions.filter(q => q.parent_question_id === target.id && q.id !== dragged.id);
      newOrder = subs.length;
    } else {
      // onTopArea: targetId is block id, becomes top-level in that block
      newBlockId = targetId;
      newParentId = null;
      const tops = questions.filter(q => q.block_id === targetId && q.parent_question_id == null && q.id !== dragged.id);
      newOrder = tops.length;
    }

    // Optimistic local update
    setQuestions(prev => prev.map(q => q.id === dragged.id
      ? { ...q, block_id: newBlockId, parent_question_id: newParentId, order_index: newOrder }
      : q));
    setDraggedId(null);
    setHoverTarget(null);
    setSaveStatus('saving');
    try {
      await adminApi.reorderQuestions([{
        id: dragged.id,
        block_id: newBlockId,
        order_index: newOrder,
        parent_question_id: newParentId,
      }]);
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 1500);
      await load(); // reconcile with server truth
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Reorder failed');
      setSaveStatus('idle');
      await load();
    }
  }

  // --------------------------------------------------------------------------

  if (loading) return <div className="admin-empty">Se încarcă...</div>;
  if (error) return <div className="admin-error">⚠️ {error}</div>;

  const nextQuestionLookup = (id: number | null) => {
    if (!id) return null;
    const num = questionNumberById.get(id);
    return num ? `→ întrebarea ${num}` : `→ #${id}`;
  };

  return (
    <>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, gap: 12, flexWrap: 'wrap' }}>
        <p style={{ color: 'var(--text2)', fontSize: 13, margin: 0 }}>
          ⬍ Trage întrebarea cu mouse-ul: pe <b>zona liberă a unui bloc</b> → devine întrebare simplă; <b>peste altă întrebare</b> → devine sub-întrebare.
        </p>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {saveStatus === 'saving' && <span style={{ fontSize: 12, color: 'var(--text2)' }}>💾 Se salvează...</span>}
          {saveStatus === 'saved' && <span style={{ fontSize: 12, color: 'var(--green)' }}>✓ Salvat</span>}
          <button className="admin-btn admin-btn-ghost" onClick={() => setBlockModal({ initial: null })}>+ Adaugă Bloc</button>
          {blocks.length > 0 && (
            <button className="admin-btn admin-btn-accent" onClick={() => setQuestionModal({ initial: null, defaultBlockId: blocks[0].id })}>
              + Adaugă Întrebare
            </button>
          )}
        </div>
      </div>

      {blocks.length === 0 && (
        <div className="admin-empty">Acest test nu are niciun bloc. Adaugă primul bloc pentru a putea introduce întrebări.</div>
      )}

      {blocks.map(b => {
        const blockQuestions = questionsByBlock[b.id] ?? [];
        const { tops, subsByParent } = buildTree(blockQuestions);
        const isDropTarget = hoverTarget === `top:${b.id}`;

        return (
          <div key={b.id} className="admin-test-card" style={{ padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8, marginBottom: 12 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 600 }}>
                  📦 {b.title_ro || b.title_ru}
                  <span className="admin-badge admin-badge-muted" style={{ marginLeft: 8 }}>{blockQuestions.length} întrebări</span>
                </div>
                {b.title_ru && b.title_ro && (
                  <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 2 }}>{b.title_ru}</div>
                )}
              </div>
              <div style={{ display: 'flex', gap: 6 }}>
                <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setQuestionModal({ initial: null, defaultBlockId: b.id })}>+ Întrebare</button>
                <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setBlockModal({ initial: b })}>✏️</button>
                <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => deleteBlock(b)}>🗑</button>
              </div>
            </div>

            <div
              onDragEnter={e => onDragEnter(e, `top:${b.id}`)}
              onDragOver={onDragOver}
              onDrop={() => onDrop('onTopArea', b.id)}
              style={{
                minHeight: tops.length === 0 ? 90 : 'auto',
                border: isDropTarget ? '2px dashed var(--accent)' : '2px dashed transparent',
                borderRadius: 8,
                padding: 6,
                transition: 'border-color .15s, background .15s',
                background: isDropTarget ? 'rgba(253,161,0,.06)' : 'transparent',
              }}
            >
              {tops.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text2)', fontSize: 13 }}>
                  Niciun întrebare în acest bloc. {draggedId != null ? 'Elibereză aici pentru a muta ca întrebare principală.' : ''}
                </div>
              )}

              {tops.map((q, i) => {
                const subs = subsByParent[q.id] ?? [];
                return (
                  <QuestionRow
                    key={q.id}
                    q={q}
                    number={`${i + 1}`}
                    level={0}
                    subs={subs}
                    subsBuilder={(subQ, j) => (
                      <QuestionRow
                        key={subQ.id}
                        q={subQ}
                        number={`${i + 1}.${j + 1}`}
                        level={1}
                        subs={[]}
                        subsBuilder={() => null}
                        nextQuestionLookup={nextQuestionLookup}
                        onEdit={() => setQuestionModal({ initial: subQ, defaultBlockId: subQ.block_id })}
                        onDelete={() => deleteQuestion(subQ)}
                        onDragStart={e => onDragStart(e, subQ.id)}
                        onDragEnd={onDragEnd}
                        onDragEnter={e => onDragEnter(e, `q:${subQ.id}`)}
                        onDragOver={onDragOver}
                        onDrop={() => onDrop('onQuestion', subQ.id)}
                        isHover={hoverTarget === `q:${subQ.id}`}
                        isDragging={draggedId === subQ.id}
                      />
                    )}
                    nextQuestionLookup={nextQuestionLookup}
                    onEdit={() => setQuestionModal({ initial: q, defaultBlockId: q.block_id })}
                    onDelete={() => deleteQuestion(q)}
                    onDragStart={e => onDragStart(e, q.id)}
                    onDragEnd={onDragEnd}
                    onDragEnter={e => onDragEnter(e, `q:${q.id}`)}
                    onDragOver={onDragOver}
                    onDrop={() => onDrop('onQuestion', q.id)}
                    isHover={hoverTarget === `q:${q.id}`}
                    isDragging={draggedId === q.id}
                  />
                );
              })}
            </div>
          </div>
        );
      })}

      {blockModal && (
        <AdminBlockModal
          initial={blockModal.initial}
          testId={testId}
          onClose={() => setBlockModal(null)}
          onSave={saveBlock}
        />
      )}

      {questionModal && blocks.length > 0 && (
        <AdminQuestionModal
          initial={questionModal.initial}
          blocks={blocks}
          allQuestions={questions}
          defaultBlockId={questionModal.defaultBlockId}
          onClose={() => setQuestionModal(null)}
          onSave={saveQuestion}
        />
      )}
    </>
  );
}

// ---- Single question row (top-level or sub) --------------------------------

interface RowProps {
  q: AdminQuestion;
  number: string;
  level: 0 | 1;
  subs: AdminQuestion[];
  subsBuilder: (sub: AdminQuestion, j: number) => React.ReactNode;
  nextQuestionLookup: (id: number | null) => string | null;
  onEdit: () => void;
  onDelete: () => void;
  onDragStart: (e: DragEvent) => void;
  onDragEnd: () => void;
  onDragEnter: (e: DragEvent) => void;
  onDragOver: (e: DragEvent) => void;
  onDrop: () => void;
  isHover: boolean;
  isDragging: boolean;
}

function QuestionRow({
  q, number, level, subs, subsBuilder, nextQuestionLookup,
  onEdit, onDelete,
  onDragStart, onDragEnd, onDragEnter, onDragOver, onDrop,
  isHover, isDragging,
}: RowProps) {
  return (
    <>
      <div
        draggable
        onDragStart={onDragStart}
        onDragEnd={onDragEnd}
        onDragEnter={onDragEnter}
        onDragOver={onDragOver}
        onDrop={(e) => { e.stopPropagation(); onDrop(); }}
        style={{
          marginLeft: level * 32,
          marginBottom: 8,
          padding: 12,
          borderRadius: 8,
          background: level === 1 ? 'rgba(253,161,0,.04)' : 'var(--bg)',
          border: isHover
            ? '2px solid var(--accent)'
            : level === 1 ? '1px solid rgba(253,161,0,.35)' : '1px solid var(--border)',
          borderLeft: level === 1 ? '4px solid var(--accent)' : isHover ? '2px solid var(--accent)' : '3px solid var(--border)',
          // Don't flash opacity while dragging — causes tremor as browser repaints.
          // Instead, show a subtle ghost outline.
          boxShadow: isDragging ? 'inset 0 0 0 2px rgba(139,143,167,.3)' : 'none',
          cursor: 'grab',
          transition: 'border-color .12s, background .12s',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 4, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ color: 'var(--text2)', fontFamily: 'monospace', userSelect: 'none' }}>⋮⋮</span>
              <span style={{
                color: level === 1 ? 'var(--accent)' : 'var(--text2)',
                fontFamily: 'monospace',
                fontWeight: 700,
                minWidth: 32,
              }}>{number}.</span>
              <span>{q.text_ro || q.text_ru}</span>
              {level === 1 && (
                <span className="admin-badge admin-badge-gold">sub-întrebare</span>
              )}
            </div>
            {q.text_ru && q.text_ro && (
              <div style={{ fontSize: 12, color: 'var(--text2)', marginBottom: 6, marginLeft: 52 }}>{q.text_ru}</div>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginLeft: 52 }}>
              {q.answers.map(a => (
                <span
                  key={a.id}
                  style={{
                    padding: '3px 10px', borderRadius: 20, fontSize: 12,
                    background: 'var(--surface2)', border: '1px solid var(--border)',
                  }}
                >
                  {a.text_ro || a.text_ru}
                  <span style={{ color: 'var(--accent)', marginLeft: 6, fontWeight: 600 }}>{a.score}</span>
                  {a.next_question_id && (
                    <span style={{ color: 'var(--blue)', marginLeft: 6, fontSize: 11 }}>
                      {nextQuestionLookup(a.next_question_id)}
                    </span>
                  )}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
            <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={onEdit}>✏️</button>
            <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={onDelete}>🗑</button>
          </div>
        </div>
      </div>
      {subs.map((s, j) => subsBuilder(s, j))}
    </>
  );
}
