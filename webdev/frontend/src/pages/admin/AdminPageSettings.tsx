import { useEffect, useState } from 'react';
import { adminApi, type AdminTest, type SiteSettings } from '@/api/admin';

/**
 * "Налаштування сторінки" — admin sets which test each landing-page CTA button opens.
 * Empty value = button keeps its old behavior (scrolls to the catalog).
 */

const CTA_FIELDS: Array<{ key: keyof SiteSettings; label: string; hint: string }> = [
  {
    key: 'cta_hero_test',
    label: 'Кнопка Hero — „Перевірте свою компанію зараз"',
    hint: 'Велика кнопка у верхній частині головної сторінки.',
  },
  {
    key: 'cta_about_test',
    label: 'Кнопка секції „Про платформу"',
    hint: 'Кнопка в блоці презентації платформи.',
  },
  {
    key: 'cta_final_test',
    label: 'Кнопка фінальної секції (Final CTA)',
    hint: 'Велика кнопка в кінці сторінки, перед футером.',
  },
  {
    key: 'cta_catalog_test',
    label: 'Кнопка зони Каталог (Marketplace)',
    hint: 'Червона кнопка у заголовку секції каталогу (Тести та шаблони).',
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
        <h2>⚙️ Налаштування сторінки</h2>
        <button className="admin-btn admin-btn-accent" onClick={onSave} disabled={saving || loading}>
          {saving ? '...' : 'Зберегти'}
        </button>
      </div>

      {error && <div className="admin-error">⚠️ {error}</div>}
      {loading && <div className="admin-empty">Завантаження...</div>}

      {!loading && (
        <div className="admin-test-card" style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <p style={{ fontSize: 13, color: 'var(--text2)', lineHeight: 1.5, margin: 0 }}>
            Оберіть, до якого тесту веде кожна кнопка „call to action" на головній сторінці.
            Якщо залишити „— без цілі —", кнопка прокручує до каталогу тестів, як раніше.
          </p>

          {CTA_FIELDS.map(field => (
            <div className="admin-form-group" key={field.key} style={{ margin: 0 }}>
              <label>{field.label}</label>
              <select
                value={settings[field.key]}
                onChange={e => setField(field.key, e.target.value)}
              >
                <option value="">— без цілі (прокрутити до каталогу) —</option>
                {tests.map(test => (
                  <option key={test.slug} value={test.slug}>
                    {test.name_uk || test.slug}
                    {test.is_paid ? ' (платний)' : ''}
                    {!test.is_active ? ' — неактивний' : ''}
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
              <span>Доставка через email активна (сторінка після тесту)</span>
            </label>
            <div style={{ fontSize: 12, color: 'var(--text2)', marginTop: 4 }}>
              Вимкнено → опція „Надіслати на email" відображається як „Незабаром", користувачі використовують Telegram.
              Вмикайте лише після того, як email доходить коректно (налаштовано SPF/DKIM/DMARC).
            </div>
          </div>

          {savedAt && (
            <div className="admin-badge admin-badge-green" style={{ alignSelf: 'flex-start' }}>
              ✅ Збережено
            </div>
          )}
        </div>
      )}
    </>
  );
}