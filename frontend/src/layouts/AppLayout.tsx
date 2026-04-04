import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { usePermissions } from '../contexts/PermissionsContext';

const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const { hasPermission, loading, permissions } = usePermissions();

  useEffect(() => {
    if (!loading) {
      console.log('Permissions chargées:', permissions);
      console.log('Items affichés:', navItems.filter(item => hasPermission(item.requiredPermission)).map(i => i.label));
    }
  }, [loading, permissions, hasPermission]);

  const handleLogout = () => {
    localStorage.removeItem('user');
    navigate('/login');
  };

  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    return (localStorage.getItem('theme') as 'light' | 'dark') || 'dark';
  });

  useEffect(() => {
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => setTheme((prev: 'light' | 'dark') => prev === 'light' ? 'dark' : 'light');

  const navItems = [
    { path: '/', label: 'Tableau de Bord', icon: '📊', requiredPermission: 'VIEW_DASHBOARD' },
    { path: '/biens', label: 'Gestion des Biens', icon: '📦', requiredPermission: 'READ_BIENS' },
    { path: '/affectations', label: 'Affectations', icon: '👤', requiredPermission: 'READ_AFFECTATIONS' },
    { path: '/inventaire', label: 'Inventaire', icon: '📝', requiredPermission: 'READ_INVENTAIRES' },
    { path: '/reforme', label: 'Réforme', icon: '♻️', requiredPermission: 'READ_REFORMES' },
    { path: '/sinistres', label: 'Sinistres', icon: '🚑', requiredPermission: 'READ_SINISTRES' },
    { path: '/entretiens', label: 'Maintenance', icon: '🛠️', requiredPermission: 'READ_ENTRETIENS' },
    { path: '/stocks', label: 'Stocks', icon: '🔋', requiredPermission: 'READ_STOCKS' },
    { path: '/utilisateurs', label: 'Administration', icon: '⚙️', requiredPermission: 'READ_USERS' },
  ];

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-dot"></div>
          <h1 className="brand-name">PATRIS</h1>
        </div>

        <nav className="sidebar-nav">
          {loading ? (
            <div style={{padding: '16px', textAlign: 'center', color: 'var(--text-dim)', fontSize: '12px'}}>
              Chargement des permissions...
            </div>
          ) : (
            <>
              {permissions ? (
                <>
                  <div style={{padding: '8px 16px', fontSize: '10px', color: 'var(--text-dim)', fontWeight: '500'}}>
                    Rôle: {permissions.role}
                  </div>
                  {navItems
                    .filter(item => hasPermission(item.requiredPermission))
                    .map((item) => (
                      <Link 
                        key={item.path} 
                        to={item.path} 
                        className={location.pathname === item.path ? 'active' : ''}
                      >
                        <span>{item.icon}</span> {item.label}
                      </Link>
                    ))}
                  {navItems.filter(item => hasPermission(item.requiredPermission)).length === 0 && (
                    <div style={{padding: '24px 16px', textAlign: 'center', color: 'var(--danger)', fontSize: '12px'}}>
                      ⚠️ Aucune permission accordée pour votre rôle
                    </div>
                  )}
                </>
              ) : (
                <div style={{padding: '16px', textAlign: 'center', color: 'var(--danger)', fontSize: '12px'}}>
                  ❌ Erreur chargement permissions
                </div>
              )}
            </>
          )}
        </nav>

        <div className="sidebar-footer" style={{padding: '24px', borderTop: '1px solid var(--glass-border)'}}>
          <button className="theme-toggle" onClick={toggleTheme} style={{width: '100%', justifyContent: 'center'}}>
            {theme === 'light' ? '🌙 Mode Nuit' : '☀️ Mode Jour'}
          </button>
          
          <div className="user-pill" style={{display: 'flex', gap: '12px', alignItems: 'center'}}>
            <div className="user-avatar" style={{width: '32px', height: '32px', background: 'var(--primary)', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold'}}>
              {user?.nom?.slice(0, 2).toUpperCase() || '??'}
            </div>
            <div className="user-info">
              <p style={{fontSize: '13px', fontWeight: '800', color: 'var(--text-main)'}}>{user?.nom || 'Admin'}</p>
              <button 
                onClick={handleLogout} 
                style={{background: 'none', border: 'none', padding: 0, color: 'var(--text-dim)', fontSize: '11px', cursor: 'pointer', marginTop: '4px'}}
              >
                Déconnexion
              </button>
            </div>
          </div>
        </div>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
