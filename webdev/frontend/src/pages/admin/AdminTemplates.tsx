import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { adminApi, adminFetch, type AdminTemplate, type AdminTemplateInput } from '@/api/admin';
import AdminTemplateModal from './AdminTemplateModal';

export default function AdminTemplates() {
  const [templates, setTemplates] = useState<AdminTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState<AdminTemplate | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const { templates } = await adminApi.listTemplates();
      setTemplates(templates);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  async function onSave(input: AdminTemplateInput, id: number | null) {
    if (id === null) await adminApi.createTemplate(input);
    else await adminApi.updateTemplate(id, input);
    setEditing(null);
    setCreating(false);
    await load();
  }

  async function onDelete(t: AdminTemplate) {
    if (!confirm(`Delete template "${t.title_uk}"? All attached PDF files will be deleted.`)) return;
    await adminApi.deleteTemplate(t.id);
    await load();
  }

  async function downloadZip(t: AdminTemplate) {
    const res = await adminFetch(adminApi.templateZipDownloadUrl(t.id));
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert('Download failed: ' + (err.error || res.status));
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${t.slug}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <div className="admin-section-header">
        <h2>📄 Document templates</h2>
        <button className="admin-btn admin-btn-accent" onClick={() => setCreating(true)}>+ Add Template</button>
      </div>

      {error && <div className="admin-error">⚠️ {error}</div>}
      {loading && <div className="admin-empty">Loading...</div>}
      {!loading && templates.length === 0 && (
        <div className="admin-empty">No templates yet. Click "+ Add Template" to create one.</div>
      )}

      {templates.map(t => (
        <div className="admin-test-card" key={t.id}>
          <div className="admin-test-card__head">
            <div style={{ flex: 1, minWidth: 260 }}>
              <div className="admin-test-card__title">📄 {t.title_uk}</div>
              {t.title_en && <div className="admin-test-card__subtitle">{t.title_en}</div>}
              {t.description_uk && <div className="admin-test-card__desc">{t.description_uk}</div>}
            </div>
            <div className="admin-test-card__actions">
              <Link to={`/admin_bizcheck_md_crowe/templates/${t.id}`} className="admin-btn admin-btn-accent admin-btn-sm" style={{ textDecoration: 'none' }}>📂 Open</Link>
              <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => downloadZip(t)}>📦 ZIP</button>
              <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => setEditing(t)}>✏️</button>
              <button className="admin-btn admin-btn-danger admin-btn-sm" onClick={() => onDelete(t)}>🗑</button>
            </div>
          </div>

          <div className="admin-test-card__meta">
            {t.is_coming_soon
              ? <span className="admin-badge admin-badge-blue">⏳ Coming soon</span>
              : t.is_active
              ? <span className="admin-badge admin-badge-green">✅ Active</span>
              : <span className="admin-badge admin-badge-muted">⏸ Inactive</span>}
            {t.is_paid
              ? <span className="admin-badge admin-badge-gold">
                  💰 {t.price != null ? `${t.price} ${t.currency}` : 'Paid (price not set)'}
                </span>
              : <span className="admin-badge admin-badge-blue">🆓 Free</span>}
            <span className="admin-badge admin-badge-muted">slug: {t.slug}</span>
          </div>
        </div>
      ))}

      {(creating || editing) && (
        <AdminTemplateModal
          initial={editing}
          onClose={() => { setCreating(false); setEditing(null); }}
          onSave={onSave}
        />
      )}
    </>
  );
}
