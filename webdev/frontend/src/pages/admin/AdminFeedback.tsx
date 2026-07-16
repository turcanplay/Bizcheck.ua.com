import { useEffect, useState, type FormEvent, type CSSProperties } from 'react';
import { adminApi, type TgReply, type TgContact, type FeedbackSendResult } from '@/api/admin';

// ──────────────────────────────────────────────────────────────
// Visual guide — explains how the whole thing works, at a glance.
// ──────────────────────────────────────────────────────────────
function Guide() {
  const [open, setOpen] = useState(true);
  const card: CSSProperties = {
    background: 'var(--surface2, #f6f7fb)', borderRadius: 12, padding: 14,
    fontSize: 13, lineHeight: 1.55,
  };
  const step: CSSProperties = { display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 8 };
  const num: CSSProperties = {
    flexShrink: 0, width: 22, height: 22, borderRadius: '50%', background: 'var(--accent, #F5A800)',
    color: '#fff', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
  return (
    <div className="admin-test-card" style={{ padding: 16, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>📖 Як це працює (інструкція)</h3>
        <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setOpen(o => !o)}>
          {open ? 'Сховати' : 'Показати'}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 12, display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          <div style={card}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>✋ Вручну — надсилаю зараз сам</div>
            <div style={step}><span style={num}>1</span><span>Пишете/редагуєте <b>текст запитання</b> (UA + RU) нижче.</span></div>
            <div style={step}><span style={num}>2</span><span>У „Надіслати кільком" вставляєте <b>@username</b>, <b>ID Telegram</b> або посилання <b>t.me/...</b> — по одному на рядок.</span></div>
            <div style={step}><span style={num}>3</span><span>Натискаєте <b>Надіслати</b>. Хто вже користувався ботом → отримає повідомлення <b>одразу</b>.</span></div>
            <div style={step}><span style={num}>4</span><span>Для тих, з ким не можна зв'язатися напряму → отримаєте <b>персональне посилання</b>, щоб скопіювати й надіслати вручну.</span></div>
          </div>

          <div style={card}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>🤖 Автоматично — надсилається саме</div>
            <div style={step}><span style={num}>1</span><span>Вмикаєте <b>„Автоматичне надсилання"</b> і обираєте, <b>через скільки хвилин</b> після доставки звіту в Telegram.</span></div>
            <div style={step}><span style={num}>2</span><span>Коли клієнт отримує свій звіт у TG, система автоматично планує запитання.</span></div>
            <div style={step}><span style={num}>3</span><span>Після заданого часу бот сам надсилає йому те саме передвстановлене запитання.</span></div>
            <div style={step}><span style={num}>4</span><span>Спрацьовує лише один раз на клієнта (не повторюється).</span></div>
          </div>

          <div style={card}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>💬 Відповідь</div>
            <div style={step}><span style={num}>•</span><span>Просимо клієнта написати все <b>одним повідомленням</b> (цей рядок додаємо до тексту автоматично).</span></div>
            <div style={step}><span style={num}>•</span><span>Зберігаємо <b>перше повідомлення</b>, яке він напише після запитання.</span></div>
            <div style={step}><span style={num}>•</span><span>Воно з'являється у списку <b>„Отримані відповіді"</b> нижче.</span></div>
            <div style={{ ...step, marginBottom: 0 }}><span style={num}>!</span><span>Ми не зберігаємо список одержувачів — <b>лише відповіді</b>.</span></div>
          </div>
        </div>
      )}
    </div>
  );
}

// ──────────────────────────────────────────────────────────────
// Automatic-send settings: toggle + delay (minutes)
// ──────────────────────────────────────────────────────────────
function AutoSettings() {
  const [enabled, setEnabled] = useState(false);
  const [delay, setDelay] = useState(60);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.getFeedbackAuto()
      .then(a => { setEnabled(a.enabled); setDelay(a.delay_min); })
      .catch(e => setError(e instanceof Error ? e.message : 'Load failed'))
      .finally(() => setLoading(false));
  }, []);

  async function save(nextEnabled = enabled, nextDelay = delay) {
    setBusy(true); setSaved(false); setError('');
    try {
      const a = await adminApi.updateFeedbackAuto({ enabled: nextEnabled, delay_min: nextDelay });
      setEnabled(a.enabled); setDelay(a.delay_min);
      setSaved(true); setTimeout(() => setSaved(false), 2500);
    } catch (e) { setError(e instanceof Error ? e.message : 'Save failed'); }
    finally { setBusy(false); }
  }

  if (loading) return null;

  return (
    <div className="admin-test-card" style={{ padding: 16, marginBottom: 20 }}>
      <h3 style={{ margin: '0 0 4px' }}>🤖 Автоматичне надсилання</h3>
      <p style={{ color: 'var(--text2)', fontSize: 12, margin: '0 0 12px' }}>
        Надсилає запитання самостійно після того, як клієнт отримає свій звіт у Telegram.
      </p>

      <label className="admin-checkbox-row" style={{ marginBottom: 14 }}>
        <input type="checkbox" checked={enabled} disabled={busy}
          onChange={e => { setEnabled(e.target.checked); save(e.target.checked, delay); }} />
        <b>{enabled ? '✅ Увімкнено' : '⏸ Вимкнено'}</b>
      </label>

      <div className="admin-form-group" style={{ maxWidth: 360 }}>
        <label>Через скільки хвилин після доставки надсилати?</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="number" min={1} max={10080} value={delay}
            onChange={e => setDelay(Math.max(1, Math.min(10080, +e.target.value || 1)))}
            style={{ width: 110 }} />
          <span style={{ color: 'var(--text2)', fontSize: 13 }}>хвилин</span>
          {[30, 60, 120, 1440].map(m => (
            <button key={m} type="button"
              className={`admin-btn admin-btn-sm ${delay === m ? 'admin-btn-accent' : 'admin-btn-ghost'}`}
              onClick={() => setDelay(m)}>
              {m === 1440 ? '1 день' : m === 60 ? '1 година' : `${m} хв`}
            </button>
          ))}
          <button type="button" className="admin-btn admin-btn-accent admin-btn-sm" disabled={busy}
            onClick={() => save(enabled, delay)}>
            {busy ? '...' : 'Зберегти'}
          </button>
          {saved && <span style={{ color: 'var(--success, #05AB8C)', fontSize: 13 }}>✓</span>}
        </div>
        <small style={{ color: 'var(--text2)' }}>
          Зараз: {enabled ? `увімкнено, через ${delay} хв після доставки` : 'вимкнено'}.
        </small>
      </div>

      {error && <div className="admin-error">⚠️ {error}</div>}
    </div>
  );
}

export default function AdminFeedback() {
  const [replies, setReplies] = useState<TgReply[]>([]);
  const [contacts, setContacts] = useState<TgContact[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function load() {
    setLoading(true);
    try {
      const [{ items }, { contacts }] = await Promise.all([
        adminApi.listFeedback(),
        adminApi.feedbackContacts(),
      ]);
      setReplies(items);
      setContacts(contacts);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  async function onDelete(r: TgReply) {
    if (!confirm('Видалити цю відповідь?')) return;
    await adminApi.deleteFeedback(r.id);
    await load();
  }

  return (
    <>
      <div className="admin-section-header">
        <h2>✈️ Відгуки в Telegram</h2>
      </div>

      {error && <div className="admin-error">⚠️ {error}</div>}

      <Guide />

      <PromptEditor />

      <AutoSettings />

      <BulkSend contacts={contacts} onSent={load} />

      <div className="admin-section-header" style={{ marginTop: 28 }}>
        <h3 style={{ margin: 0 }}>💬 Отримані відповіді</h3>
        <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={load}>↻ Оновити</button>
      </div>

      {loading && <div className="admin-empty">Завантаження...</div>}
      {!loading && replies.length === 0 && <div className="admin-empty">Ще немає відповідей.</div>}

      {replies.map(r => (
        <div className="admin-test-card" key={r.id} style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                {r.username
                  ? <b style={{ fontSize: 14 }}>@{r.username}</b>
                  : <span style={{ fontSize: 13, color: 'var(--text2)' }}>(без username)</span>}
                <span className="admin-badge admin-badge-muted">{(r.lang || 'en').toUpperCase()}</span>
                {r.answered_at && (
                  <span style={{ fontSize: 12, color: 'var(--text2)' }}>{r.answered_at.slice(0, 16).replace('T', ' ')}</span>
                )}
              </div>
              <div style={{
                background: 'var(--surface2, #f6f7fb)', borderRadius: 10, padding: '10px 12px',
                fontSize: 13, lineHeight: 1.5, whiteSpace: 'pre-wrap',
              }}>
                {r.reply_text}
              </div>
            </div>
            <div style={{ display: 'flex', gap: 4, flexShrink: 0 }}>
              <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => onDelete(r)}>🗑</button>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}

// ──────────────────────────────────────────────────────────────
// Editable bilingual prompt
// ──────────────────────────────────────────────────────────────
function PromptEditor() {
  const [uk, setUk] = useState('');
  const [en, setEn] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.getFeedbackPrompt()
      .then(p => { setUk(p.uk); setEn(p.en); })
      .catch(e => setError(e instanceof Error ? e.message : 'Load failed'))
      .finally(() => setLoading(false));
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setSaved(false); setError('');
    try {
      const p = await adminApi.updateFeedbackPrompt({ uk, en });
      setUk(p.uk); setEn(p.en);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { setError(e instanceof Error ? e.message : 'Save failed'); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="admin-empty">Завантаження тексту...</div>;

  return (
    <form className="admin-test-card" style={{ padding: 16, marginBottom: 20 }} onSubmit={save}>
      <h3 style={{ margin: '0 0 4px' }}>📝 Текст запитання (передвстановлений)</h3>
      <p style={{ color: 'var(--text2)', fontSize: 12, margin: '0 0 12px' }}>
        Мова обирається автоматично за особою (запасний варіант — EN). Емодзі та нові рядки зберігаються.
      </p>
      <div className="admin-form-group">
        <label>Текст (UA)</label>
        <textarea value={uk} maxLength={4000} onChange={e => setUk(e.target.value)} style={{ minHeight: 150 }} />
      </div>
      <div className="admin-form-group">
        <label>Текст (EN)</label>
        <textarea value={en} maxLength={4000} onChange={e => setEn(e.target.value)} style={{ minHeight: 150 }} />
      </div>
      {error && <div className="admin-error">⚠️ {error}</div>}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button type="submit" className="admin-btn admin-btn-accent" disabled={busy}>{busy ? '...' : 'Зберегти текст'}</button>
        {saved && <span style={{ color: 'var(--success, #05AB8C)', fontSize: 13 }}>✓ Збережено</span>}
      </div>
    </form>
  );
}

// ──────────────────────────────────────────────────────────────
// Bulk send
// ──────────────────────────────────────────────────────────────
function BulkSend({ contacts, onSent }: { contacts: TgContact[]; onSent: () => void }) {
  const [raw, setRaw] = useState('');
  const [lang, setLang] = useState<'auto' | 'uk' | 'en'>('auto');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<FeedbackSendResult[] | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(''); setResults(null);
    const targets = raw.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    if (targets.length === 0) { setError('Додайте щонайменше одного одержувача.'); return; }
    setBusy(true);
    try {
      const resp = await adminApi.sendFeedback({ targets, lang });
      setResults(resp.results);
      setRaw('');
      onSent();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Помилка');
    } finally { setBusy(false); }
  }

  const sent = results?.filter(r => r.status === 'sent') ?? [];
  const links = results?.filter(r => r.status === 'link') ?? [];
  const invalid = results?.filter(r => r.status === 'invalid') ?? [];

  return (
    <form className="admin-test-card" style={{ padding: 16 }} onSubmit={submit}>
      <h3 style={{ margin: '0 0 12px' }}>➕ Надіслати кільком</h3>

      <div className="admin-form-group">
        <label>Одержувачі (по одному на рядок — @username, ID Telegram або посилання t.me)</label>
        <textarea
          value={raw}
          onChange={e => setRaw(e.target.value)}
          placeholder={'@ion_pop\n123456789\nhttps://t.me/maria_x'}
          style={{ minHeight: 120, fontFamily: 'monospace', fontSize: 13 }}
        />
        <small style={{ color: 'var(--text2)' }}>{contacts.length} контактів уже користувалися ботом.</small>
      </div>

      <div className="admin-form-group">
        <label>Мова</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['auto', 'uk', 'en'] as const).map(l => (
            <label key={l} className={`admin-btn admin-btn-sm ${lang === l ? 'admin-btn-accent' : 'admin-btn-ghost'}`} style={{ cursor: 'pointer' }}>
              <input type="radio" name="fblang" checked={lang === l} onChange={() => setLang(l)} style={{ display: 'none' }} />
              {l === 'auto' ? 'Авто' : l.toUpperCase()}
            </label>
          ))}
        </div>
      </div>

      {error && <div className="admin-error">⚠️ {error}</div>}

      <button type="submit" className="admin-btn admin-btn-accent" disabled={busy}>
        {busy ? 'Надсилання...' : 'Надіслати'}
      </button>

      {results && (
        <div style={{ marginTop: 14 }}>
          {sent.length > 0 && (
            <div style={{ color: 'var(--success, #05AB8C)', fontSize: 13, marginBottom: 8 }}>
              ✓ Надіслано до {sent.length}: {sent.map(r => r.username ? `@${r.username}` : r.target).join(', ')}
            </div>
          )}
          {links.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                🔗 Персональні посилання для надсилання вручну ({links.length}):
              </div>
              {links.map((r, i) => (
                <div key={i} style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', marginBottom: 4 }}>
                  <span style={{ fontSize: 12, color: 'var(--text2)', minWidth: 90 }}>{r.target}</span>
                  <code style={{ fontSize: 11, wordBreak: 'break-all' }}>{r.link}</code>
                  <button type="button" className="admin-btn admin-btn-ghost admin-btn-sm"
                    onClick={() => navigator.clipboard?.writeText(r.link!)}>📋</button>
                </div>
              ))}
            </div>
          )}
          {invalid.length > 0 && (
            <div style={{ color: 'var(--danger, #D64535)', fontSize: 13 }}>
              ⚠️ Недійсні (пропущено): {invalid.map(r => r.target).join(', ')}
            </div>
          )}
        </div>
      )}
    </form>
  );
}
