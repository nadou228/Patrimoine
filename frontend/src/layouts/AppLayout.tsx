import React, { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "../api/auth";
import { usePermissions } from "../contexts/PermissionsContext";

type NavItem = {
  path: string;
  label: string;
  icon: string;
  requiredPermission: string;
};

const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getCurrentUser();
  const { hasPermission, loading, permissions } = usePermissions();

  const [theme, setTheme] = useState<"light" | "dark">(() => {
    return (localStorage.getItem("theme") as "light" | "dark") || "dark";
  });

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  const primaryItems: NavItem[] = [
    { path: "/", label: "Tableau de bord", icon: "◆", requiredPermission: "VIEW_DASHBOARD" },
    { path: "/biens", label: "Gestion des biens", icon: "◼", requiredPermission: "READ_BIENS" },
    { path: "/stocks", label: "Stocks", icon: "▣", requiredPermission: "READ_STOCKS" },
    { path: "/inventaire", label: "Inventaire", icon: "▤", requiredPermission: "READ_INVENTAIRES" },
  ];

  const secondaryItems: NavItem[] = [
    { path: "/affectations", label: "Affectations", icon: "↔", requiredPermission: "READ_AFFECTATIONS" },
    { path: "/reforme", label: "Reforme", icon: "△", requiredPermission: "READ_REFORMES" },
    { path: "/sinistres", label: "Sinistres", icon: "!", requiredPermission: "READ_SINISTRES" },
    { path: "/entretiens", label: "Maintenance", icon: "•", requiredPermission: "READ_ENTRETIENS" },
    { path: "/utilisateurs", label: "Administration", icon: "⌘", requiredPermission: "READ_USERS" },
  ];

  const visiblePrimaryItems = primaryItems.filter((item) => hasPermission(item.requiredPermission));
  const visibleSecondaryItems = secondaryItems.filter((item) => hasPermission(item.requiredPermission));

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-dot"></div>
          <div className="brand-copy">
            <h1 className="brand-name">PATRIS</h1>
            <span className="brand-subtitle">Pilotage patrimonial</span>
          </div>
        </div>

        <div className="sidebar-account">
          <div className="sidebar-account-meta">
            <div className="user-avatar">{user?.nom?.slice(0, 2).toUpperCase() || "??"}</div>
            <div className="user-info">
              <p>{user?.nom || "Session active"}</p>
              <span>{permissions?.role || "Profil en chargement"}</span>
            </div>
          </div>
          <button className="theme-toggle compact" onClick={() => setTheme((prev) => (prev === "light" ? "dark" : "light"))}>
            {theme === "light" ? "Mode nuit" : "Mode jour"}
          </button>
        </div>

        <nav className="sidebar-nav">
          {loading ? (
            <div className="sidebar-state">Chargement des permissions...</div>
          ) : permissions ? (
            <>
              <div className="nav-group">
                <span className="nav-group-title">Principal</span>
                {visiblePrimaryItems.map((item) => (
                  <Link key={item.path} to={item.path} className={location.pathname === item.path ? "active" : ""}>
                    <span className="nav-icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>

              <div className="nav-group">
                <span className="nav-group-title">Operations</span>
                {visibleSecondaryItems.map((item) => (
                  <Link key={item.path} to={item.path} className={location.pathname === item.path ? "active" : ""}>
                    <span className="nav-icon">{item.icon}</span>
                    <span>{item.label}</span>
                  </Link>
                ))}
              </div>

              {visiblePrimaryItems.length + visibleSecondaryItems.length === 0 && (
                <div className="sidebar-state danger">Aucune permission accordee pour ce profil.</div>
              )}
            </>
          ) : (
            <div className="sidebar-state danger">Erreur de chargement du profil.</div>
          )}
        </nav>

        <div className="sidebar-footer">
          <button onClick={handleLogout} className="sidebar-logout">
            Deconnexion
          </button>
        </div>
      </aside>

      <main className="content">
        <Outlet />
      </main>
    </div>
  );
};

export default AppLayout;
