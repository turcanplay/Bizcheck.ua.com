import { useEffect, useState } from 'react';
import { adminApi, type AdminTest, type SiteSettings } from '@/api/admin';

/**
 * "Setări pagină" — admin sets which test each landing-page CTA button opens.
 * Empty value = button keeps its old behavior (scrolls to the catalog).
 */

const CTA_FIELDS: Array<{ key: keyof SiteSettings; label: string; hint: string }> = [
  {
    key: 'cta_hero_test',
    label: 'Buton Hero — „Testează-ți compania acum"',
    hint: 'Butonul mare din partea de sus a paginii principale.',
  },
  {
    key: 'cta_about_test',
    label: 'Buton secțiunea „Despre platformă"',
    hint: 'Butonul din blocul de prezentare a platformei.',
  },
  {
    key: 'cta_final_test',
    label: 'Buton secțiunea finală (Final CTA)',
    hint: 'Butonul mare de la finalul paginii, înainte de footer.',
  },
  {
    key: 'cta_catalog_test',
    label: 'Buton zona Catalog (Marketplace)',
    hint: 'Butonul roșu din capul secțiunii de catalog (Teste și șabloane).',
  },
];

const EMPTY: SiteSettings = {
  cta_hero_test: '', cta_about_test: '', cta_final_test: '', cta_catalog_test: '',
  email_delivery_enabled: '0',
};

export default function AdminPageSettings() {
  const [tests, setTests] = useState<AdminTest[]>([]);
  const [settings, setSettings] = useState<SiteSettings>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function load() {
    setLoading(true);
    try {
      const [t, s] = await Promise.all([adminApi.listTests(), adminApi.getSiteSettings()]);
      setTests(t.tests);
      setSettings({ ...EMPTY, ...s.settings });
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Load failed');
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { load(); }, []);

  function setField(key: keyof SiteSettings, value: string) {
    setSettings(prev => ({ ...prev, [key]: value }));
    setSavedAt(null);
  }

  async function onSave() {
    setSaving(true);
    setError('');
    try {
      const { settings: fresh } = await adminApi.updateSiteSettings(settings);
      setSettings({ ...EMPTY, ...fresh });
      setSavedAt(Date.now());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div className="admin-section-header">
        <h2>⚙️ Setări pagină</h2>
        <button className="admin-btn admin-btn-accent" onClick={onSave} disabled={saving || loading}>
          {saving ? '...' : 'Salvează'}
        </button>
      </div>

      {error && <div className="admin-error">⚠️ {error}</div>}
      {loading && <div className="admin-empty">Se încarcă...</div>}

      {!loading && (
        <div className="admin-test-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5, margin: 0 }}>
            Alege la ce test duce fiecare buton „call to action" de pe pagina principală.
            Dacă lași „— fără țintă —", butonul derulează la catalogul de teste, ca înainte.
          </p>

          {CTA_FIELDS.map(field => (
            <div className="admin-form-group" key={field.key} style={{ margin: 0 }}>
              <label>{field.label}</label>
              <select
                value={settings[field.key]}
                onChange={e => setField(field.key, e.target.value)}
              >
                <option value="">— fără țintă (derulează la catalog) —</option>
                {tests.map(test => (
                  <option key={test.slug} value={test.slug}>
                    {test.name_ro || test.slug}
                    {test.is_paid ? ' (cu plată)' : ''}
                    {!test.is_active ? ' — inactiv' : ''}
                  </option>
                ))}
              </select>
              <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>{field.hint}</div>
            </div>
          ))}

          {/* Feature flag — email delivery on the post-test page */}
          <div className="admin-form-group" style={{ margin: 0, borderTop: '1px solid var(--border)', paddingTop: 16 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={settings.email_delivery_enabled === '1'}
                onChange={e => setField('email_delivery_enabled', e.target.checked ? '1' : '0')}
                style={{ width: 18, height: 18 }}
              />
              <span>Livrare prin email activă (pagina de după test)</span>
            </label>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
              Dezactivat → opțiunea „Trimite pe email" apare ca „În curând", utilizatorii folosesc Telegram.
              Activează doar după ce emailul ajunge corect (SPF/DKIM/DMARC configurate).
            </div>
          </div>

          {savedAt && (
            <div className="admin-badge admin-badge-green" style={{ alignSelf: 'flex-start' }}>
              ✅ Salvat
            </div>
          )}
        </div>
      )}
    </>
  );
}