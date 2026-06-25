import { useEffect, useState } from 'react';
import { Navigate, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { adminApi, hasAdminSessionHint } from '@/api/admin';
import './admin.css';

type AuthState = 'checking' | 'authed' | 'anon';

export default function AdminLayout() {
  const navigate = useNavigate();
  const [auth, setAuth] = useState<AuthState>(hasAdminSessionHint() ? 'checking' : 'anon');

  // Confirm the session is still alive on the server. Cookie may have expired
  // while the SPA was idle.
  useEffect(() => {
    if (auth !== 'checking') return;
    let cancelled = false;
    adminApi.session()
      .then(() => { if (!cancelled) setAuth('authed'); })
      .catch(() => { if (!cancelled) setAuth('anon'); });
    return () => { cancelled = true; };
  }, [auth]);

  if (auth === 'checking') return null;
  if (auth === 'anon') return <Navigate to="/admin_bizcheck_md_crowe/login" replace />;

  async function logout() {
    try { await adminApi.logout(); } catch { /* ignore */ }
    navigate('/admin_bizcheck_md_crowe/login', { replace: true });
  }

  return (
    <div className="admin-root">
      <div className="admin-header">
        <h1><span>BizCheck</span> Admin</h1>
        <div className="admin-header-right">
          <span>admin</span>
          <button className="admin-btn admin-btn-ghost admin-btn-sm" onClick={logout}>Logout</button>
        </div>
      </div>
      <div className="admin-layout">
        <nav className="admin-sidebar">
          <NavLink to="/admin_bizcheck_md_crowe" end className={({ isActive }) => isActive ? 'active' : ''}>📊 Dashboard</NavLink>
          <NavLink to="/admin_bizcheck_md_crowe/tests" className={({ isActive }) => isActive ? 'active' : ''}>🧪 Teste</NavLink>
          <NavLink to="/admin_bizcheck_md_crowe/templates" className={({ isActive }) => isActive ? 'active' : ''}>📄 Șabloane de acte</NavLink>
          <NavLink to="/admin_bizcheck_md_crowe/testimonials" className={({ isActive }) => isActive ? 'active' : ''}>💬 Testimoniale</NavLink>
          <NavLink to="/admin_bizcheck_md_crowe/faq" className={({ isActive }) => isActive ? 'active' : ''}>❓ Întrebări frecvente</NavLink>
          <NavLink to="/admin_bizcheck_md_crowe/submissions" className={({ isActive }) => isActive ? 'active' : ''}>📋 Submissions</NavLink>
          <NavLink to="/admin_bizcheck_md_crowe/users" className={({ isActive }) => isActive ? 'active' : ''}>👥 Utilizatori</NavLink>
          <NavLink to="/admin_bizcheck_md_crowe/page-settings" className={({ isActive }) => isActive ? 'active' : ''}>⚙️ Setări pagină</NavLink>
        </nav>
        <div className="admin-main">
          <Outlet />
        </div>
      </div>
    </div>
  );
}
