import React, { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { getCurrentUser, logout } from "../api/auth";
import { usePermissions } from "../contexts/PermissionsContext";

type NavItem = {
  path: string;
  label: string;
  requiredPermission: string;
  icon: React.ReactNode;
  inOperations?: boolean;
};

type IconProps = {
  className?: string;
};

const IconBase = ({ children, className }: React.PropsWithChildren<IconProps>) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.8"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {children}
  </svg>
);

const LayoutDashboardIcon = ({ className }: IconProps) => (
  <IconBase className={className}>
    <rect x="3" y="3" width="8" height="8" rx="2" />
    <rect x="13" y="3" width="8" height="5" rx="2" />
    <rect x="13" y="10" width="8" height="11" rx="2" />
    <rect x="3" y="13" width="8" height="8" rx="2" />
  </IconBase>
);

const PackageIcon = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M12 3 4 7l8 4 8-4-8-4Z" />
    <path d="M4 7v10l8 4 8-4V7" />
    <path d="M12 11v10" />
  </IconBase>
);

const WarehouseIcon = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M3 10 12 4l9 6" />
    <path d="M5 10v10h14V10" />
    <path d="M9 20v-5h6v5" />
  </IconBase>
);

const ClipboardListIcon = ({ className }: IconProps) => (
  <IconBase className={className}>
    <rect x="5" y="4" width="14" height="17" rx="2" />
    <path d="M9 4.5h6" />
    <path d="M8 10h8" />
    <path d="M8 14h8" />
    <path d="M8 18h5" />
  </IconBase>
);

const ArrowLeftRightIcon = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M7 7H3l4-4" />
    <path d="M17 17h4l-4 4" />
    <path d="M3 7h12" />
    <path d="M21 17H9" />
  </IconBase>
);

const TrashIcon = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M4 7h16" />
    <path d="M9 7V4h6v3" />
    <path d="M7 7l1 13h8l1-13" />
  </IconBase>
);

const AlertTriangleIcon = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M12 3 2.8 19a1.2 1.2 0 0 0 1 2h16.4a1.2 1.2 0 0 0 1-2L12 3Z" />
    <path d="M12 9v5" />
    <path d="M12 18h.01" />
  </IconBase>
);

const WrenchIcon = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="M14 6a4 4 0 0 0 5 5l-8 8a2 2 0 0 1-3-3l8-8a4 4 0 0 0-2-7Z" />
  </IconBase>
);

const SettingsIcon = ({ className }: IconProps) => (
  <IconBase className={className}>
    <circle cx="12" cy="12" r="3.5" />
    <path d="M19 12a7 7 0 0 0-.12-1.27l2-1.56-2-3.46-2.45 1a7.3 7.3 0 0 0-2.2-1.28L13.9 3h-3.8l-.34 2.43a7.3 7.3 0 0 0-2.2 1.28l-2.45-1-2 3.46 2 1.56A7 7 0 0 0 5 12c0 .43.04.85.12 1.27l-2 1.56 2 3.46 2.45-1a7.3 7.3 0 0 0 2.2 1.28L10.1 21h3.8l.34-2.43a7.3 7.3 0 0 0 2.2-1.28l2.45 1 2-3.46-2-1.56c.08-.42.12-.84.12-1.27Z" />
  </IconBase>
);

const ChevronIcon = ({ className }: IconProps) => (
  <IconBase className={className}>
    <path d="m8 10 4 4 4-4" />
  </IconBase>
);

const BrandMark = () => (
  <svg className="brand-mark" viewBox="0 0 64 64" aria-hidden="true">
    <defs>
      <linearGradient id="brandGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#818cf8" />
        <stop offset="100%" stopColor="#22d3ee" />
      </linearGradient>
    </defs>
    <path
      d="M32 4 54 17v30L32 60 10 47V17L32 4Z"
      fill="url(#brandGradient)"
      stroke="rgba(255,255,255,0.18)"
      strokeWidth="1"
    />
    <path d="M26 18h10a8 8 0 1 1 0 16h-6v10h-4V18Zm4 4v8h6a4 4 0 0 0 0-8Z" fill="#ffffff" />
  </svg>
);

const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getCurrentUser();
  const { hasPermission, loading, permissions } = usePermissions();
  const [theme, setTheme] = useState<"light" | "dark">(
    () => (localStorage.getItem("theme") as "light" | "dark") || "light"
  );
  const [operationsOpen, setOperationsOpen] = useState<boolean>(() => {
    const stored = localStorage.getItem("sidebar-ops-open");
    return stored ? stored === "true" : true;
  });
  const [online, setOnline] = useState<boolean>(() => navigator.onLine);

  useEffect(() => {
    document.body.setAttribute("data-theme", theme);
    localStorage.setItem("theme", theme);
  }, [theme]);

  useEffect(() => {
    localStorage.setItem("sidebar-ops-open", String(operationsOpen));
  }, [operationsOpen]);

  useEffect(() => {
    const setConnected = () => setOnline(true);
    const setDisconnected = () => setOnline(false);
    window.addEventListener("online", setConnected);
    window.addEventListener("offline", setDisconnected);
    return () => {
      window.removeEventListener("online", setConnected);
      window.removeEventListener("offline", setDisconnected);
    };
  }, []);

  const navItems = useMemo<NavItem[]>(
    () => [
      { path: "/", label: "Tableau de bord", requiredPermission: "VIEW_DASHBOARD", icon: <LayoutDashboardIcon /> },
      { path: "/biens", label: "Gestion des biens", requiredPermission: "READ_BIENS", icon: <PackageIcon /> },
      { path: "/stocks", label: "Stocks", requiredPermission: "READ_STOCKS", icon: <WarehouseIcon /> },
      {
        path: "/inventaire",
        label: "Inventaire",
        requiredPermission: "READ_INVENTAIRES",
        icon: <ClipboardListIcon />,
      },
      {
        path: "/affectations",
        label: "Affectations",
        requiredPermission: "READ_AFFECTATIONS",
        icon: <ArrowLeftRightIcon />,
        inOperations: true,
      },
      {
        path: "/reforme",
        label: "Reforme",
        requiredPermission: "READ_REFORMES",
        icon: <TrashIcon />,
        inOperations: true,
      },
      {
        path: "/sinistres",
        label: "Sinistres",
        requiredPermission: "READ_SINISTRES",
        icon: <AlertTriangleIcon />,
        inOperations: true,
      },
      {
        path: "/entretiens",
        label: "Maintenance",
        requiredPermission: "READ_ENTRETIENS",
        icon: <WrenchIcon />,
        inOperations: true,
      },
      {
        path: "/utilisateurs",
        label: "Comptes",
        requiredPermission: "READ_USERS",
        icon: <SettingsIcon />,
      },
      {
        path: "/admin",
        label: "Système",
        requiredPermission: "ADMIN_SYSTEM",
        icon: <SettingsIcon />,
      },
    ],
    []
  );

  const visibleItems = navItems.filter((item) => hasPermission(item.requiredPermission));
  const primaryItems = visibleItems.filter(
    (item) => !item.inOperations && item.path !== "/utilisateurs" && item.path !== "/admin"
  );
  const operationItems = visibleItems.filter((item) => item.inOperations);
  const adminItems = visibleItems.filter((item) => item.path === "/utilisateurs" || item.path === "/admin");

  const isPathActive = (path: string) =>
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <div className="app-shell page-wrapper">
      <aside className="sidebar" aria-label="Navigation principale">
        <div className="brand">
          <BrandMark />
          <div className="brand-copy">
            <h1 className="brand-name">PATRIS</h1>
            <span className="brand-subtitle">ERP patrimonial du Togo</span>
          </div>
        </div>

        <div className="sidebar-account">
          <div className={`connectivity-indicator ${online ? "online" : "offline"}`}>
            <span aria-hidden="true" />
            {online ? "En ligne" : "Hors ligne"}
          </div>
          <div className="sidebar-account-meta">
            <div className="user-avatar" aria-hidden="true">
              {user?.nom?.slice(0, 2).toUpperCase() || "PT"}
            </div>
            <div className="user-info">
              <p>{user?.nom || user?.username || "Session active"}</p>
              <span>{permissions?.role || "Profil en chargement"}</span>
            </div>
          </div>
          <button
            type="button"
            className="theme-toggle compact"
            onClick={() => setTheme((previous) => (previous === "light" ? "dark" : "light"))}
            aria-label={theme === "light" ? "Activer le mode sombre" : "Activer le mode clair"}
          >
            {theme === "light" ? "Mode sombre" : "Mode clair"}
          </button>
        </div>

        <nav className="sidebar-nav">
          {loading ? (
            <div className="sidebar-state">Chargement des permissions...</div>
          ) : permissions ? (
            <>
              <div className="nav-group">
                <span className="nav-group-title">Principal</span>
                {primaryItems.map((item) => (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`sidebar-link ${isPathActive(item.path) ? "active" : ""}`}
                    aria-label={item.label}
                    title={item.label}
                  >
                    <span className="nav-icon">{item.icon}</span>
                    <span className="nav-label">{item.label}</span>
                  </Link>
                ))}
              </div>

              {operationItems.length > 0 && (
                <div className="nav-group">
                  <button
                    type="button"
                    className="nav-group-toggle"
                    onClick={() => setOperationsOpen((previous) => !previous)}
                    aria-expanded={operationsOpen}
                    aria-controls="sidebar-operations"
                  >
                    <span className="nav-group-title">Operations</span>
                    <ChevronIcon className={operationsOpen ? "chevron open" : "chevron"} />
                  </button>
                  <div id="sidebar-operations" className={operationsOpen ? "nav-group-panel open" : "nav-group-panel"}>
                    {operationItems.map((item) => (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`sidebar-link ${isPathActive(item.path) ? "active" : ""}`}
                        aria-label={item.label}
                        title={item.label}
                      >
                        <span className="nav-icon">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              {adminItems.length > 0 && (
                <div className="nav-group">
                  <span className="nav-group-title">Administration</span>
                  {adminItems.map((item) => (
                    <Link
                      key={item.path}
                      to={item.path}
                      className={`sidebar-link ${isPathActive(item.path) ? "active" : ""}`}
                      aria-label={item.label}
                      title={item.label}
                    >
                      <span className="nav-icon">{item.icon}</span>
                      <span className="nav-label">{item.label}</span>
                    </Link>
                  ))}
                </div>
              )}

              {visibleItems.length === 0 && (
                <div className="sidebar-state danger">Aucune permission accordee pour ce profil.</div>
              )}
            </>
          ) : (
            <div className="sidebar-state danger">Erreur de chargement du profil.</div>
          )}
        </nav>

        <div className="sidebar-footer">
          <button type="button" onClick={handleLogout} className="sidebar-logout" aria-label="Se deconnecter">
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
