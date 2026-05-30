import React, { useEffect, useMemo, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { 
  LayoutDashboard, Package, Warehouse, ClipboardList, 
  ArrowLeftRight, Trash2, AlertTriangle, Wrench, 
  Settings, ChevronDown, LogOut, Shield,
  Circle, FileSpreadsheet, TrendingUp, Smartphone
} from "lucide-react";
import { getCurrentUser, logout } from "../api/auth";
import { usePermissions } from "../contexts/PermissionsContext";
import { CopilotWidget } from "../components/CopilotWidget";

type NavItem = {
  path: string;
  label: string;
  requiredPermission: string;
  icon: React.ReactNode;
  inOperations?: boolean;
};

const BrandLogo = () => (
  <svg className="brand-icon-premium" viewBox="0 0 64 64" fill="none">
    <rect width="64" height="64" rx="16" fill="url(#brandGrad)" />
    <path d="M22 18h12a8 8 0 1 1 0 16h-8v12h-4V18Zm4 4v8h8a4 4 0 0 0 0-8h-8Z" fill="white" />
    <defs>
      <linearGradient id="brandGrad" x1="0" y1="0" x2="64" y2="64" gradientUnits="userSpaceOnUse">
        <stop stopColor="#4f46e5" />
        <stop offset="1" stopColor="#0ea5e9" />
      </linearGradient>
    </defs>
  </svg>
);

const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getCurrentUser();
  const { hasPermission, hasAnyRole, loading, permissions } = usePermissions();
  const [operationsOpen, setOperationsOpen] = useState(true);
  const [online, setOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleStatus = () => setOnline(navigator.onLine);
    window.addEventListener("online", handleStatus);
    window.addEventListener("offline", handleStatus);
    return () => {
      window.removeEventListener("online", handleStatus);
      window.removeEventListener("offline", handleStatus);
    };
  }, []);

  const navItems = useMemo<NavItem[]>(() => [
    { path: "/", label: "Tableau de bord", requiredPermission: "VIEW_DASHBOARD", icon: <LayoutDashboard size={20} /> },
    { path: "/analytics", label: "Analyses & IA", requiredPermission: "VIEW_DASHBOARD", icon: <TrendingUp size={20} /> },
    { path: "/biens", label: "Gestion des biens", requiredPermission: "READ_BIENS", icon: <Package size={20} /> },
    { path: "/stocks", label: "Stocks", requiredPermission: "READ_STOCKS", icon: <Warehouse size={20} /> },
    { path: "/inventaire", label: "Inventaire", requiredPermission: "READ_INVENTAIRES", icon: <ClipboardList size={20} /> },
    { path: "/terrain", label: "Mode Terrain", requiredPermission: "READ_INVENTAIRES", icon: <Smartphone size={20} /> },
    { path: "/audit", label: "Journal d'Audit", requiredPermission: "READ_AUDIT", icon: <Shield size={20} /> },
    { path: "/rapports", label: "États & Annexes", requiredPermission: "VIEW_DASHBOARD", icon: <FileSpreadsheet size={20} /> },
    { path: "/affectations", label: "Affectations", requiredPermission: "READ_AFFECTATIONS", icon: <ArrowLeftRight size={20} />, inOperations: true },
    { path: "/reforme", label: "Reforme", requiredPermission: "READ_REFORMES", icon: <Trash2 size={20} />, inOperations: true },
    { path: "/sinistres", label: "Sinistres", requiredPermission: "READ_SINISTRES", icon: <AlertTriangle size={20} />, inOperations: true },
    { path: "/entretiens", label: "Maintenance", requiredPermission: "READ_ENTRETIENS", icon: <Wrench size={20} />, inOperations: true },
    { path: "/utilisateurs", label: "Comptes", requiredPermission: "READ_USERS", icon: <Settings size={20} /> },
    { path: "/admin", label: "Système", requiredPermission: "ADMIN_SYSTEM", icon: <Shield size={20} /> },
  ], []);

  const visibleItems = navItems.filter(item =>
    item.path === "/audit"
      ? hasPermission(item.requiredPermission) || hasAnyRole("ADMIN", "SUPERADMIN", "AUDITEUR", "RESPONSABLE_PATRIMOINE")
      : hasPermission(item.requiredPermission)
  );
  const primaryItems = visibleItems.filter(item => !item.inOperations && item.path !== "/utilisateurs" && item.path !== "/admin");
  const operationItems = visibleItems.filter(item => item.inOperations);
  const adminItems = visibleItems.filter(item => item.path === "/utilisateurs" || item.path === "/admin");

  const isPathActive = (path: string) => 
    path === "/" ? location.pathname === "/" : location.pathname.startsWith(path);

  const handleLogout = () => { logout(); navigate("/login"); };

  return (
    <div className="executive-shell">
      <aside className="executive-sidebar">
        {/* --- BRAND --- */}
        <div className="sidebar-header-premium">
          <BrandLogo />
          <div className="brand-text-premium">
            <h2>PATRIS</h2>
            <span>ERP Patrimonial du Togo</span>
          </div>
        </div>

        {/* --- USER CARD --- */}
        <div className="user-executive-card">
          <div className="status-indicator-premium">
            <Circle size={8} fill={online ? "#10b981" : "#ef4444"} stroke="none" />
            <span>{online ? "En ligne" : "Hors ligne"}</span>
          </div>
          <div className="user-profile-flex">
            <div className="executive-avatar">
              {user?.nom?.slice(0, 2).toUpperCase() || "AD"}
              <div className="avatar-glow" />
            </div>
            <div className="executive-info">
              <h3>{user?.nom || "Admin User"}</h3>
              <span>{permissions?.role || "Direction"}</span>
            </div>
          </div>
        </div>

        {/* --- NAVIGATION --- */}
        <nav className="executive-nav">
          <div className="nav-group-premium">
            <span className="group-title">Principal</span>
            {primaryItems.map(item => (
              <Link key={item.path} to={item.path} className={`nav-link-premium ${isPathActive(item.path) ? 'active' : ''}`}>
                <span className="nav-icon-box">{item.icon}</span>
                <span className="nav-label">{item.label}</span>
                {isPathActive(item.path) && <motion.div layoutId="nav-active" className="nav-active-pill" />}
              </Link>
            ))}
          </div>

          {operationItems.length > 0 && (
            <div className="nav-group-premium">
              <button className="group-toggle-premium" onClick={() => setOperationsOpen(!operationsOpen)}>
                <span className="group-title">Opérations</span>
                <ChevronDown size={14} className={operationsOpen ? 'rotate-180' : ''} />
              </button>
              <AnimatePresence>
                {operationsOpen && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="group-panel">
                    {operationItems.map(item => (
                      <Link key={item.path} to={item.path} className={`nav-link-premium ${isPathActive(item.path) ? 'active' : ''}`}>
                        <span className="nav-icon-box">{item.icon}</span>
                        <span className="nav-label">{item.label}</span>
                      </Link>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          )}

          {adminItems.length > 0 && (
            <div className="nav-group-premium">
              <span className="group-title">Paramètres</span>
              {adminItems.map(item => (
                <Link key={item.path} to={item.path} className={`nav-link-premium ${isPathActive(item.path) ? 'active' : ''}`}>
                  <span className="nav-icon-box">{item.icon}</span>
                  <span className="nav-label">{item.label}</span>
                </Link>
              ))}
            </div>
          )}
        </nav>

        {/* --- LOGOUT --- */}
        <div className="sidebar-footer-premium">
          <button onClick={handleLogout} className="logout-btn-premium">
            <LogOut size={18} />
            <span>Se déconnecter</span>
          </button>
        </div>
      </aside>

      <main className="executive-main">
        <Outlet />
        <CopilotWidget />
      </main>

      <style>{`
        .executive-shell { display: flex; min-height: 100vh; background: #f8fafc; }
        .executive-sidebar { 
          width: 280px; 
          background: white; 
          border-right: 1px solid #e2e8f0; 
          display: flex; 
          flex-direction: column;
          padding: 30px 20px;
          position: sticky;
          top: 0;
          height: 100vh;
        }

        .sidebar-header-premium { display: flex; align-items: center; gap: 15px; margin-bottom: 40px; padding: 0 10px; }
        .brand-icon-premium { width: 42px; height: 42px; }
        .brand-text-premium h2 { margin: 0; font-size: 1.5rem; font-weight: 800; color: #0f172a; letter-spacing: -1px; }
        .brand-text-premium span { font-size: 10px; color: #64748b; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }

        .user-executive-card {
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 15px;
          margin-bottom: 30px;
        }

        .status-indicator-premium { display: flex; align-items: center; gap: 8px; margin-bottom: 12px; }
        .status-indicator-premium span { font-size: 10px; font-weight: 800; color: #64748b; text-transform: uppercase; }

        .user-profile-flex { display: flex; align-items: center; gap: 12px; }
        .executive-avatar {
          width: 44px;
          height: 44px;
          background: #4f46e5;
          color: white;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          position: relative;
        }
        .avatar-glow { position: absolute; inset: 0; background: #4f46e5; filter: blur(10px); opacity: 0.2; z-index: -1; }
        .executive-info h3 { margin: 0; font-size: 13px; font-weight: 800; color: #0f172a; }
        .executive-info span { font-size: 11px; color: #64748b; font-weight: 600; }

        .executive-nav { flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 25px; }
        .nav-group-premium { display: flex; flex-direction: column; gap: 5px; }
        .group-title { font-size: 11px; font-weight: 800; color: #94a3b8; text-transform: uppercase; letter-spacing: 1px; padding: 0 15px 10px; }
        .group-toggle-premium { display: flex; align-items: center; justify-content: space-between; width: 100%; border: none; background: none; cursor: pointer; padding-right: 15px; }
        
        .nav-link-premium {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 10px 15px;
          border-radius: 12px;
          color: #64748b;
          text-decoration: none;
          font-size: 14px;
          font-weight: 600;
          transition: all 0.2s;
          position: relative;
        }
        .nav-link-premium:hover { background: #f1f5f9; color: #0f172a; }
        .nav-link-premium.active { color: #4f46e5; background: rgba(79, 70, 229, 0.05); }
        .nav-icon-box { display: flex; align-items: center; justify-content: center; width: 24px; }
        .nav-active-pill { position: absolute; left: -20px; top: 12px; bottom: 12px; width: 4px; background: #4f46e5; border-radius: 0 4px 4px 0; }

        .group-panel { display: flex; flex-direction: column; gap: 2px; padding-left: 10px; }

        .sidebar-footer-premium { margin-top: 30px; border-top: 1px solid #f1f5f9; padding-top: 20px; }
        .logout-btn-premium {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          width: 100%;
          padding: 12px;
          border: 1px solid #fee2e2;
          background: white;
          color: #ef4444;
          border-radius: 14px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .logout-btn-premium:hover { background: #fee2e2; }

        .executive-main { flex: 1; overflow-y: auto; background: #f8fafc; }
        .rotate-180 { transform: rotate(180deg); }
      `}</style>
    </div>
  );
};

export default AppLayout;
