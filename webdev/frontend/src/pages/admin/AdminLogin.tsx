import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { adminApi, hasAdminSessionHint } from '@/api/admin';
import './admin.css';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [checking, setChecking] = useState(true);

  // If a session cookie is still valid, skip the form. We can't read the
  // httpOnly cookie directly, so probe /admin/session.
  useEffect(() => {
    let cancelled = false;
    if (!hasAdminSessionHint()) { setChecking(false); return; }
    adminApi.session()
      .then(() => { if (!cancelled) navigate('/admin_bizcheck_md_crowe', { replace: true }); })
      .catch(() => { if (!cancelled) setChecking(false); });
    return () => { cancelled = true; };
  }, [navigate]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      await adminApi.login(username, password);
      navigate('/admin_bizcheck_md_crowe', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to log in');
    } finally {
      setBusy(false);
    }
  }

  if (checking) return null;

  return (
    <div className="admin-root">
      <div className="admin-login-wrap">
        <form className="admin-login-card" onSubmit={onSubmit}>
          <h2>Administrator login</h2>
          <div className="admin-form-group">
            <label>Username</label>
            <input value={username} onChange={e => setUsername(e.target.value)} autoFocus />
          </div>
          <div className="admin-form-group">
            <label>Password</label>
            <input type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          {error && <div className="admin-error">{error}</div>}
          <button
            type="submit"
            className="admin-btn admin-btn-accent"
            style={{ width: '100%', marginTop: 12 }}
            disabled={busy}
          >
            {busy ? '...' : 'Log in'}
          </button>
        </form>
      </div>
    </div>
  );
}
