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
    flexShrink: 0, width: 22, height: 22, borderRadius: '50%', background: 'var(--accent, #FDA100)',
    color: '#fff', fontWeight: 700, fontSize: 12, display: 'flex', alignItems: 'center', justifyContent: 'center',
  };
  return (
    <div className="admin-test-card" style={{ padding: 16, marginBottom: 20 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3 style={{ margin: 0 }}>📖 Cum funcționează (ghid)</h3>
        <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setOpen(o => !o)}>
          {open ? 'Ascunde' : 'Arată'}
        </button>
      </div>

      {open && (
        <div style={{ marginTop: 12, display: 'grid', gap: 14, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }}>
          <div style={card}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>✋ Manual — trimit eu acum</div>
            <div style={step}><span style={num}>1</span><span>Scrii/editezi <b>textul întrebării</b> (RO + RU) mai jos.</span></div>
            <div style={step}><span style={num}>2</span><span>În „Trimite la mai mulți" lipești <b>@username</b>, <b>ID Telegram</b> sau link <b>t.me/...</b> — câte unul pe linie.</span></div>
            <div style={step}><span style={num}>3</span><span>Apeși <b>Trimite</b>. Cine a folosit deja botul → primește mesajul <b>imediat</b>.</span></div>
            <div style={step}><span style={num}>4</span><span>Pentru cine nu poate fi contactat direct → primești un <b>link personal</b> de copiat și trimis manual.</span></div>
          </div>

          <div style={card}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>🤖 Automat — se trimite singur</div>
            <div style={step}><span style={num}>1</span><span>Activezi <b>„Trimitere automată"</b> și alegi <b>după câte minute</b> de la livrarea raportului în Telegram.</span></div>
            <div style={step}><span style={num}>2</span><span>Când un client își ia raportul în TG, sistemul programează automat întrebarea.</span></div>
            <div style={step}><span style={num}>3</span><span>După timpul setat, botul îi trimite singur aceeași întrebare presetată.</span></div>
            <div style={step}><span style={num}>4</span><span>Funcționează o singură dată per client (nu se repetă).</span></div>
          </div>

          <div style={card}>
            <div style={{ fontWeight: 700, marginBottom: 8 }}>💬 Răspunsul</div>
            <div style={step}><span style={num}>•</span><span>Îi cerem clientului să scrie tot <b>într-un singur mesaj</b> (adăugăm automat acest rând la text).</span></div>
            <div style={step}><span style={num}>•</span><span>Salvăm <b>primul mesaj</b> pe care îl scrie după întrebare.</span></div>
            <div style={step}><span style={num}>•</span><span>Apare în lista <b>„Răspunsuri primite"</b> de jos.</span></div>
            <div style={{ ...step, marginBottom: 0 }}><span style={num}>!</span><span>Nu păstrăm lista de destinatari — <b>doar răspunsurile</b>.</span></div>
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
      <h3 style={{ margin: '0 0 4px' }}>🤖 Trimitere automată</h3>
      <p style={{ color: 'var(--text2)', fontSize: 12, margin: '0 0 12px' }}>
        Trimite întrebarea singur, după ce un client își ia raportul în Telegram.
      </p>

      <label className="admin-checkbox-row" style={{ marginBottom: 14 }}>
        <input type="checkbox" checked={enabled} disabled={busy}
          onChange={e => { setEnabled(e.target.checked); save(e.target.checked, delay); }} />
        <b>{enabled ? '✅ Activă' : '⏸ Oprită'}</b>
      </label>

      <div className="admin-form-group" style={{ maxWidth: 360 }}>
        <label>După câte minute de la livrare se trimite?</label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <input type="number" min={1} max={10080} value={delay}
            onChange={e => setDelay(Math.max(1, Math.min(10080, +e.target.value || 1)))}
            style={{ width: 110 }} />
          <span style={{ color: 'var(--text2)', fontSize: 13 }}>minute</span>
          {[30, 60, 120, 1440].map(m => (
            <button key={m} type="button"
              className={`admin-btn admin-btn-sm ${delay === m ? 'admin-btn-accent' : 'admin-btn-ghost'}`}
              onClick={() => setDelay(m)}>
              {m === 1440 ? '1 zi' : m === 60 ? '1 oră' : `${m} min`}
            </button>
          ))}
          <button type="button" className="admin-btn admin-btn-accent admin-btn-sm" disabled={busy}
            onClick={() => save(enabled, delay)}>
            {busy ? '...' : 'Salvează'}
          </button>
          {saved && <span style={{ color: 'var(--success, #16A34A)', fontSize: 13 }}>✓</span>}
        </div>
        <small style={{ color: 'var(--text2)' }}>
          Acum: {enabled ? `activă, la ${delay} min după livrare` : 'oprită'}.
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
    if (!confirm('Ștergi acest răspuns?')) return;
    await adminApi.deleteFeedback(r.id);
    await load();
  }

  return (
    <>
      <div className="admin-section-header">
        <h2>✈️ Feedback Telegram</h2>
      </div>

      {error && <div className="admin-error">⚠️ {error}</div>}

      <Guide />

      <PromptEditor />

      <AutoSettings />

      <BulkSend contacts={contacts} onSent={load} />

      <div className="admin-section-header" style={{ marginTop: 28 }}>
        <h3 style={{ margin: 0 }}>💬 Răspunsuri primite</h3>
        <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={load}>↻ Reîncarcă</button>
      </div>

      {loading && <div className="admin-empty">Se încarcă...</div>}
      {!loading && replies.length === 0 && <div className="admin-empty">Niciun răspuns încă.</div>}

      {replies.map(r => (
        <div className="admin-test-card" key={r.id} style={{ padding: 16 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap', marginBottom: 6 }}>
                {r.username
                  ? <b style={{ fontSize: 14 }}>@{r.username}</b>
                  : <span style={{ fontSize: 13, color: 'var(--text2)' }}>(fără username)</span>}
                <span className="admin-badge admin-badge-muted">{(r.lang || 'ru').toUpperCase()}</span>
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
  const [ro, setRo] = useState('');
  const [ru, setRu] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    adminApi.getFeedbackPrompt()
      .then(p => { setRo(p.ro); setRu(p.ru); })
      .catch(e => setError(e instanceof Error ? e.message : 'Load failed'))
      .finally(() => setLoading(false));
  }, []);

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setSaved(false); setError('');
    try {
      const p = await adminApi.updateFeedbackPrompt({ ro, ru });
      setRo(p.ro); setRu(p.ru);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) { setError(e instanceof Error ? e.message : 'Save failed'); }
    finally { setBusy(false); }
  }

  if (loading) return <div className="admin-empty">Se încarcă textul...</div>;

  return (
    <form className="admin-test-card" style={{ padding: 16, marginBottom: 20 }} onSubmit={save}>
      <h3 style={{ margin: '0 0 4px' }}>📝 Textul întrebării (presetat)</h3>
      <p style={{ color: 'var(--text2)', fontSize: 12, margin: '0 0 12px' }}>
        Limba se alege automat după persoană (fallback RU). Emoji și liniile noi se păstrează.
      </p>
      <div className="admin-form-group">
        <label>Text (RO)</label>
        <textarea value={ro} maxLength={4000} onChange={e => setRo(e.target.value)} style={{ minHeight: 150 }} />
      </div>
      <div className="admin-form-group">
        <label>Text (RU)</label>
        <textarea value={ru} maxLength={4000} onChange={e => setRu(e.target.value)} style={{ minHeight: 150 }} />
      </div>
      {error && <div className="admin-error">⚠️ {error}</div>}
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <button type="submit" className="admin-btn admin-btn-accent" disabled={busy}>{busy ? '...' : 'Salvează textul'}</button>
        {saved && <span style={{ color: 'var(--success, #16A34A)', fontSize: 13 }}>✓ Salvat</span>}
      </div>
    </form>
  );
}

// ──────────────────────────────────────────────────────────────
// Bulk send
// ──────────────────────────────────────────────────────────────
function BulkSend({ contacts, onSent }: { contacts: TgContact[]; onSent: () => void }) {
  const [raw, setRaw] = useState('');
  const [lang, setLang] = useState<'auto' | 'ro' | 'ru'>('auto');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [results, setResults] = useState<FeedbackSendResult[] | null>(null);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(''); setResults(null);
    const targets = raw.split(/[\n,;]+/).map(s => s.trim()).filter(Boolean);
    if (targets.length === 0) { setError('Adăugați cel puțin un destinatar.'); return; }
    setBusy(true);
    try {
      const resp = await adminApi.sendFeedback({ targets, lang });
      setResults(resp.results);
      setRaw('');
      onSent();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Eroare');
    } finally { setBusy(false); }
  }

  const sent = results?.filter(r => r.status === 'sent') ?? [];
  const links = results?.filter(r => r.status === 'link') ?? [];
  const invalid = results?.filter(r => r.status === 'invalid') ?? [];

  return (
    <form className="admin-test-card" style={{ padding: 16 }} onSubmit={submit}>
      <h3 style={{ margin: '0 0 12px' }}>➕ Trimite la mai mulți</h3>

      <div className="admin-form-group">
        <label>Destinatari (câte unul pe linie — @username, ID Telegram sau link t.me)</label>
        <textarea
          value={raw}
          onChange={e => setRaw(e.target.value)}
          placeholder={'@ion_pop\n123456789\nhttps://t.me/maria_x'}
          style={{ minHeight: 120, fontFamily: 'monospace', fontSize: 13 }}
        />
        <small style={{ color: 'var(--text2)' }}>{contacts.length} contacte au folosit deja botul.</small>
      </div>

      <div className="admin-form-group">
        <label>Limba</label>
        <div style={{ display: 'flex', gap: 8 }}>
          {(['auto', 'ro', 'ru'] as const).map(l => (
            <label key={l} className={`admin-btn admin-btn-sm ${lang === l ? 'admin-btn-accent' : 'admin-btn-ghost'}`} style={{ cursor: 'pointer' }}>
              <input type="radio" name="fblang" checked={lang === l} onChange={() => setLang(l)} style={{ display: 'none' }} />
              {l === 'auto' ? 'Automat' : l.toUpperCase()}
            </label>
          ))}
        </div>
      </div>

      {error && <div className="admin-error">⚠️ {error}</div>}

      <button type="submit" className="admin-btn admin-btn-accent" disabled={busy}>
        {busy ? 'Se trimite...' : 'Trimite'}
      </button>

      {results && (
        <div style={{ marginTop: 14 }}>
          {sent.length > 0 && (
            <div style={{ color: 'var(--success, #16A34A)', fontSize: 13, marginBottom: 8 }}>
              ✓ Trimis către {sent.length}: {sent.map(r => r.username ? `@${r.username}` : r.target).join(', ')}
            </div>
          )}
          {links.length > 0 && (
            <div style={{ marginBottom: 8 }}>
              <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 6 }}>
                🔗 Linkuri personale de trimis manual ({links.length}):
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
            <div style={{ color: 'var(--danger, #DC2626)', fontSize: 13 }}>
              ⚠️ Invalide (ignorate): {invalid.map(r => r.target).join(', ')}
            </div>
          )}
        </div>
      )}
    </form>
  );
}
