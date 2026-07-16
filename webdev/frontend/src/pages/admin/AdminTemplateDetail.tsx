import { useEffect, useRef, useState, type ChangeEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { adminApi, adminFetch, type AdminTemplate, type AdminTemplateFile } from '@/api/admin';

function toBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result !== 'string') { reject(new Error('Invalid file')); return; }
      const [, b64] = result.split(',');
      resolve(b64 || '');
    };
    reader.onerror = () => reject(reader.error ?? new Error('Read error'));
    reader.readAsDataURL(file);
  });
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

export default function AdminTemplateDetail() {
  const { id } = useParams<{ id: string }>();
  const templateId = id ? parseInt(id, 10) : NaN;

  const [template, setTemplate] = useState<(AdminTemplate & { files: AdminTemplateFile[] }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function load() {
    if (!Number.isFinite(templateId)) { setError('Недійсний ID'); setLoading(false); return; }
    setLoading(true);
    try {
      const { template } = await adminApi.getTemplate(templateId);
      setTemplate(template);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, [templateId]);

  async function onFilesSelected(e: ChangeEvent<HTMLInputElement>) {
    const files = e.target.files ? Array.from(e.target.files) : [];
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const f of files) {
        if (f.type && f.type !== 'application/pdf') {
          alert(`Пропущено (не PDF): ${f.name}`);
          continue;
        }
        if (f.size > 20 * 1024 * 1024) {
          alert(`Пропущено (> 20 МБ): ${f.name}`);
          continue;
        }
        const b64 = await toBase64(f);
        await adminApi.uploadTemplateFile(templateId, f.name, b64);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      await load();
    }
  }

  async function deleteFile(file: AdminTemplateFile) {
    if (!confirm(`Видалити файл "${file.filename}"?`)) return;
    await adminApi.deleteTemplateFile(templateId, file.id);
    await load();
  }

  async function downloadSingle(file: AdminTemplateFile) {
    const res = await adminFetch(adminApi.templateFileDownloadUrl(templateId, file.id));
    if (!res.ok) { alert('Помилка завантаження'); return; }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = file.filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  async function downloadZip() {
    if (!template) return;
    const res = await adminFetch(adminApi.templateZipDownloadUrl(templateId));
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      alert('Помилка завантаження: ' + (err.error || res.status));
      return;
    }
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${template.slug}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  if (loading) return <div className="admin-empty">Завантаження...</div>;
  if (error || !template) return <div className="admin-error">⚠️ {error || 'Шаблон не знайдено'}</div>;

  const totalSize = template.files.reduce((acc, f) => acc + f.file_size, 0);

  return (
    <>
      <div className="admin-section-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
          <Link to="/admin_bizcheck_md_crowe/templates" className="admin-back-link">← Назад до шаблонів</Link>
          <h2 style={{ margin: 0 }}>📄 {template.title_uk}</h2>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            className="admin-btn admin-btn-accent"
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
          >
            {uploading ? '⏳ Завантаження...' : '📤 Додати PDF'}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            style={{ display: 'none' }}
            onChange={onFilesSelected}
          />
          {template.files.length > 0 && (
            <button className="admin-btn admin-btn-ghost" onClick={downloadZip}>📦 Завантажити ZIP</button>
          )}
        </div>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 12, flexWrap: 'wrap' }}>
        {template.is_coming_soon
          ? <span className="admin-badge admin-badge-blue">⏳ Незабаром</span>
          : template.is_active
          ? <span className="admin-badge admin-badge-green">✅ Активний</span>
          : <span className="admin-badge admin-badge-muted">⏸ Неактивний</span>}
        {template.is_paid
          ? <span className="admin-badge admin-badge-gold">
              💰 {template.price != null ? `${template.price} ${template.currency}` : 'Платно (ціну не задано)'}
            </span>
          : <span className="admin-badge admin-badge-blue">🆓 Безкоштовно</span>}
        <span className="admin-badge admin-badge-muted">{template.files.length} файл(ів) • {formatBytes(totalSize)}</span>
      </div>

      {template.files.length === 0 ? (
        <div className="admin-empty">
          Ще немає прикріплених PDF. Натисніть „📤 Додати PDF", щоб завантажити один або кілька файлів.
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Файл</th>
                <th>Розмір</th>
                <th>Завантажено</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {template.files.map((f, idx) => (
                <tr key={f.id}>
                  <td>{idx + 1}</td>
                  <td>📄 {f.filename}</td>
                  <td>{formatBytes(f.file_size)}</td>
                  <td>{new Date(f.created_at).toLocaleString()}</td>
                  <td style={{ textAlign: 'right' }}>
                    <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={() => downloadSingle(f)}>⬇️</button>
                    <button className="admin-btn admin-btn-danger admin-btn-sm" style={{ marginLeft: 4 }} onClick={() => deleteFile(f)}>🗑</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
