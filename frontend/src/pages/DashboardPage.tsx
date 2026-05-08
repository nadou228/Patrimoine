import React, { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, ShieldAlert, Activity, 
  Download, Calendar, User, 
  ArrowUpRight, CheckCircle2,
  Sparkles, Layers, History, ChevronRight,
  Globe, Zap, ShieldCheck, Clock, FileText,
  BarChart3
} from "lucide-react";
import { DashboardStatsResponse, getBiens } from "../api/api";
import { getCurrentUser } from "../api/auth";
import { usePermissions } from "../contexts/PermissionsContext";
import { useApi } from "../hooks/useApi";
import { exportGrandLivrePremiumExcel, exportLivreJournalPremiumExcel, exportPdf } from "../utils/exporters";

type LooseRecord = Record<string, unknown>;

const formatCurrency = (value: number) => `${Math.round(value).toLocaleString("fr-FR")} FCFA`;

const HolographicMetric = ({ label, value, suffix, tone, icon, status, delay }: any) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.9, y: 20 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    transition={{ delay, type: "spring", stiffness: 100 }}
    whileHover={{ y: -10, transition: { duration: 0.2 } }}
    className={`holo-card-light ${tone}`}
  >
    <div className="holo-content">
      <div className="holo-icon-wrapper">
        <div className="holo-icon-aura" />
        {icon}
      </div>
      <div className="holo-data">
        <span className="holo-label">{label}</span>
        <div className="holo-value">
          <AnimatedCounter value={value} suffix={suffix} />
        </div>
        <div className="holo-status">
          <Zap size={12} className="pulse-zap" />
          {status}
        </div>
      </div>
    </div>
    <div className="holo-progress-track">
      <motion.div 
        initial={{ width: 0 }}
        animate={{ width: "70%" }}
        transition={{ delay: delay + 0.5, duration: 1.5 }}
        className="holo-progress-bar" 
      />
    </div>
  </motion.div>
);

const AnimatedCounter = ({ value, suffix }: { value: number; suffix?: string }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    const duration = 2000;
    const startTime = performance.now();

    const update = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutExpo = 1 - Math.pow(2, -10 * progress);
      const current = Math.floor(easeOutExpo * end);
      setDisplayValue(current);
      if (progress < 1) requestAnimationFrame(update);
    };
    requestAnimationFrame(update);
  }, [value]);

  return (
    <span className="counter-text">
      {suffix === "FCFA" ? formatCurrency(displayValue) : displayValue.toLocaleString("fr-FR")}
      {suffix && suffix !== "FCFA" && <span className="counter-suffix"> {suffix}</span>}
    </span>
  );
};

const DashboardPage: React.FC = () => {
  const [biens, setBiens] = useState<LooseRecord[]>([]);
  const { data: statsData, loading: statsLoading } = useApi<DashboardStatsResponse>("/dashboard/stats", []);
  const currentUser = getCurrentUser();
  const { permissions } = usePermissions();

  useEffect(() => {
    const load = async () => {
      try {
        const biensData = await getBiens().catch(() => []);
        setBiens((biensData as LooseRecord[]) ?? []);
      } catch (e) {}
    };
    void load();
  }, []);

  const metrics = useMemo(() => {
    const totalValue = Number(statsData?.valeurTotale || 0);
    const totalNetValue = Number(statsData?.valeurNette || 0);
    const maintenanceAlerts = Number(statsData?.prochainesMaintenance?.filter((item) => item.typeAlerte === "MAINTENANCE").length || 0);
    const lowStock = Number(statsData?.stocksEnAlerte || 0);
    
    return {
      totalValue, totalNetValue, criticalCount: maintenanceAlerts + lowStock,
      typeDistribution: [
        { name: 'Immobilier', value: biens.filter(b => b.type === 'immobilier').length, color: '#4f46e5' },
        { name: 'Mobilier', value: biens.filter(b => b.type === 'mobilier').length, color: '#9333ea' },
        { name: 'Roulant', value: biens.filter(b => b.type === 'roulant').length, color: '#059669' },
      ].filter(d => d.value > 0)
    };
  }, [biens, statsData]);

  const chartData = useMemo(() => {
    const months = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil"];
    return months.map(m => ({ label: m, value: Math.random() * 5000000 + 10000000 }));
  }, []);

  const exportActions = [
    { title: "Livre Journal", icon: <FileText size={18} />, action: () => exportLivreJournalPremiumExcel(biens as any, "livre_journal.xlsx", currentUser || undefined) },
    { title: "Grand Livre", icon: <Layers size={18} />, action: () => exportGrandLivrePremiumExcel(biens as any, "grand_livre.xlsx", currentUser || undefined) },
    { title: "Rapport PDF", icon: <Download size={18} />, action: () => exportPdf(biens as any, "Rapport", "rapport.pdf", currentUser || undefined, []) }
  ];

  return (
    <div className="dashboard-light-root">
      {/* 🌤️ Soft Light Background Elements */}
      <div className="light-bg">
        <div className="aura-1" />
        <div className="aura-2" />
        <div className="pattern-overlay" />
      </div>

      <div className="dashboard-content-wrapper">
        <header className="command-header-light">
          <motion.div 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            className="command-title-block"
          >
            <div className="command-badge-light">
              <Sparkles size={14} />
              <span>PILOTAGE PATRIS v5.0 GOLD</span>
            </div>
            <h1>Tableau de Bord</h1>
            <p>Vision consolidée et stratégique de vos actifs nationaux.</p>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, x: 30 }}
            animate={{ opacity: 1, x: 0 }}
            className="command-user-node-light"
          >
            <div className="node-profile-light">
              <div className="profile-avatar-light">
                {currentUser?.nom?.slice(0, 1) || "A"}
              </div>
              <div className="profile-meta-light">
                <strong>{currentUser?.nom || "Administrateur"}</strong>
                <span>{permissions?.role || "Direction Générale"}</span>
              </div>
            </div>
          </motion.div>
        </header>

        {statsLoading ? (
          <div className="loading-light">
            <div className="spinner-light" />
            <p>Chargement des indicateurs...</p>
          </div>
        ) : (
          <div className="command-layout">
            
            <section className="command-kpi-row">
              <HolographicMetric 
                label="Valeur Totale" 
                value={metrics.totalValue} 
                suffix="FCFA" 
                tone="indigo" 
                icon={<TrendingUp size={24} />} 
                status="+12% cette année"
                delay={0.1}
              />
              <HolographicMetric 
                label="Valeur Nette Consolidée" 
                value={metrics.totalNetValue} 
                suffix="FCFA" 
                tone="purple" 
                icon={<ShieldCheck size={24} />} 
                status="Amortissement à jour"
                delay={0.2}
              />
              <HolographicMetric 
                label="Alertes de Gestion" 
                value={metrics.criticalCount} 
                tone="rose" 
                icon={<ShieldAlert size={24} />} 
                status={metrics.criticalCount > 0 ? "Points de vigilance" : "Gestion optimale"}
                delay={0.3}
              />
              <HolographicMetric 
                label="Activités Mouvements" 
                value={Number(statsData?.mouvementsThisMois || 0)} 
                tone="emerald" 
                icon={<Activity size={24} />} 
                status="Flux de stock stable"
                delay={0.4}
              />
            </section>

            <div className="command-main-grid">
              
              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="card-light chart-card-light"
              >
                <div className="card-header-light">
                  <div className="header-icon-light"><BarChart3 size={20} /></div>
                  <div className="header-text-light">
                    <h3>Évolution du Capital Immobilisé</h3>
                    <span>Trajectoire financière sur les 7 derniers mois</span>
                  </div>
                </div>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1}/>
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: '#94a3b8', fontSize: 11 }} dy={10} />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ background: '#fff', border: '1px solid rgba(0,0,0,0.05)', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.05)' }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="value" 
                        stroke="#4f46e5" 
                        strokeWidth={3} 
                        fill="url(#areaGradient)" 
                        animationDuration={2000}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="card-light activity-card-light"
              >
                <div className="card-header-light">
                  <div className="header-icon-light"><History size={20} /></div>
                  <div className="header-text-light">
                    <h3>Journal des Opérations</h3>
                    <span>Suivi en temps réel des flux</span>
                  </div>
                </div>
                <div className="activity-stream-light">
                  {(statsData?.activiteRecente || []).slice(0, 6).map((act, idx) => (
                    <div key={act.id} className="stream-item-light">
                      <div className="stream-dot" />
                      <div className="stream-time-light">{new Date(act.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                      <div className="stream-info-light">
                        <strong>{act.action}</strong>
                        <span>{act.acteur}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>

            </div>

            <div className="command-bottom-grid">
              
              <motion.div 
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.7 }}
                className="card-light distribution-card-light"
              >
                <div className="dist-flex">
                  <div className="pie-box-light">
                    <ResponsiveContainer width="100%" height={160}>
                      <PieChart>
                        <Pie
                          data={metrics.typeDistribution}
                          innerRadius={50}
                          outerRadius={70}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {metrics.typeDistribution.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="pie-center-light">
                      <strong>{biens.length}</strong>
                      <span>Actifs</span>
                    </div>
                  </div>
                  <div className="dist-legend-light">
                    {metrics.typeDistribution.map(d => (
                      <div key={d.name} className="legend-row-light">
                        <div className="dot-light" style={{ backgroundColor: d.color }} />
                        <span>{d.name}</span>
                        <strong>{d.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </motion.div>

              <motion.div 
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.8 }}
                className="card-light actions-card-light"
              >
                <div className="actions-flex-light">
                  {exportActions.map((action, idx) => (
                    <motion.button
                      key={action.title}
                      whileHover={{ scale: 1.02, background: '#f8fafc' }}
                      whileTap={{ scale: 0.98 }}
                      onClick={action.action}
                      className="action-btn-light"
                    >
                      <div className="action-icon-light">{action.icon}</div>
                      <span>{action.title}</span>
                      <ChevronRight size={16} />
                    </motion.button>
                  ))}
                </div>
              </motion.div>

            </div>
          </div>
        )}
      </div>

      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap');

        .dashboard-light-root {
          min-height: 100vh;
          background: #f8fafc;
          color: #1e293b;
          font-family: 'Plus Jakarta Sans', sans-serif;
          position: relative;
          overflow-x: hidden;
        }

        /* --- 🌤️ Light Background --- */
        .light-bg {
          position: fixed;
          inset: 0;
          z-index: 0;
          pointer-events: none;
        }

        .aura-1 {
          position: absolute;
          width: 800px;
          height: 800px;
          background: radial-gradient(circle, rgba(79, 70, 229, 0.05) 0%, transparent 70%);
          top: -200px;
          left: -200px;
        }

        .aura-2 {
          position: absolute;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(14, 165, 233, 0.05) 0%, transparent 70%);
          bottom: -100px;
          right: -100px;
        }

        .pattern-overlay {
          position: absolute;
          inset: 0;
          background-image: radial-gradient(#e2e8f0 1px, transparent 1px);
          background-size: 40px 40px;
          opacity: 0.5;
        }

        .dashboard-content-wrapper {
          position: relative;
          z-index: 1;
          padding: 40px;
          max-width: 1440px;
          margin: 0 auto;
        }

        /* --- 🏁 Header --- */
        .command-header-light {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 40px;
        }

        .command-badge-light {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          background: white;
          border: 1px solid #e2e8f0;
          padding: 6px 14px;
          border-radius: 20px;
          color: #4f46e5;
          font-size: 11px;
          font-weight: 800;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          margin-bottom: 15px;
        }

        .command-title-block h1 {
          font-size: 3rem;
          font-weight: 800;
          color: #0f172a;
          letter-spacing: -1.5px;
          margin: 0;
        }

        .command-title-block p {
          color: #64748b;
          font-size: 1.1rem;
          margin-top: 5px;
        }

        .profile-avatar-light {
          width: 44px;
          height: 44px;
          background: #4f46e5;
          color: white;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 800;
          font-size: 1.2rem;
          box-shadow: 0 10px 15px -3px rgba(79, 70, 229, 0.3);
        }

        .node-profile-light {
          display: flex;
          align-items: center;
          gap: 15px;
          background: white;
          padding: 8px 20px;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }

        .profile-meta-light strong { display: block; font-size: 14px; color: #0f172a; }
        .profile-meta-light span { font-size: 11px; color: #64748b; font-weight: 600; }

        /* --- 💎 KPI Cards --- */
        .command-kpi-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
          gap: 24px;
          margin-bottom: 32px;
        }

        .holo-card-light {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          padding: 24px;
          position: relative;
          box-shadow: 0 4px 20px rgba(0,0,0,0.02);
          transition: all 0.3s ease;
        }

        .holo-card-light:hover {
          transform: translateY(-5px);
          box-shadow: 0 15px 35px rgba(0,0,0,0.05);
        }

        .holo-icon-wrapper {
          width: 48px;
          height: 48px;
          border-radius: 14px;
          display: flex;
          align-items: center;
          justify-content: center;
          margin-bottom: 20px;
          position: relative;
        }

        .holo-icon-aura {
          position: absolute;
          inset: 0;
          border-radius: inherit;
          opacity: 0.1;
        }

        .indigo .holo-icon-wrapper { color: #4f46e5; }
        .indigo .holo-icon-aura { background: #4f46e5; }
        .purple .holo-icon-wrapper { color: #9333ea; }
        .purple .holo-icon-aura { background: #9333ea; }
        .rose .holo-icon-wrapper { color: #e11d48; }
        .rose .holo-icon-aura { background: #e11d48; }
        .emerald .holo-icon-wrapper { color: #059669; }
        .emerald .holo-icon-aura { background: #059669; }

        .holo-label { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.5px; }
        .holo-value { font-size: 24px; font-weight: 800; color: #0f172a; margin: 8px 0; }
        .holo-status { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 700; color: #64748b; background: #f1f5f9; padding: 4px 10px; border-radius: 20px; }

        .holo-progress-track { height: 4px; background: #f1f5f9; border-radius: 2px; margin-top: 20px; overflow: hidden; }
        .holo-progress-bar { height: 100%; }
        .indigo .holo-progress-bar { background: #4f46e5; }
        .purple .holo-progress-bar { background: #9333ea; }
        .rose .holo-progress-bar { background: #e11d48; }
        .emerald .holo-progress-bar { background: #059669; }

        /* --- 📊 Main Content --- */
        .command-main-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        .card-light {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 30px;
          padding: 30px;
          box-shadow: 0 4px 25px rgba(0,0,0,0.02);
        }

        .card-header-light { display: flex; align-items: center; gap: 15px; margin-bottom: 30px; }
        .header-icon-light { width: 44px; height: 44px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #4f46e5; }
        .header-text-light h3 { margin: 0; font-size: 1.1rem; font-weight: 800; color: #0f172a; }
        .header-text-light span { font-size: 12px; color: #64748b; font-weight: 600; }

        .activity-stream-light { display: flex; flex-direction: column; gap: 18px; }
        .stream-item-light { display: flex; align-items: center; gap: 15px; }
        .stream-dot { width: 8px; height: 8px; border-radius: 50%; background: #4f46e5; }
        .stream-time-light { font-size: 11px; font-weight: 700; color: #94a3b8; min-width: 45px; }
        .stream-info-light strong { display: block; font-size: 13px; color: #1e293b; }
        .stream-info-light span { font-size: 11px; color: #94a3b8; }

        /* --- 🥧 Bottom Grid --- */
        .command-bottom-grid {
          display: grid;
          grid-template-columns: 1fr 1.5fr;
          gap: 24px;
        }

        .dist-flex { display: flex; align-items: center; gap: 30px; }
        .pie-box-light { width: 140px; position: relative; }
        .pie-center-light { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; }
        .pie-center-light strong { font-size: 20px; font-weight: 800; display: block; }
        .pie-center-light span { font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 700; }

        .legend-row-light { display: flex; align-items: center; gap: 10px; font-size: 12px; margin-bottom: 8px; }
        .dot-light { width: 8px; height: 8px; border-radius: 2px; }

        .actions-flex-light { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 15px; }
        .action-btn-light {
          display: flex;
          align-items: center;
          gap: 15px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          padding: 18px;
          border-radius: 20px;
          color: #1e293b;
          font-weight: 700;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-icon-light { width: 36px; height: 36px; background: white; border: 1px solid #e2e8f0; border-radius: 10px; display: flex; align-items: center; justify-content: center; color: #4f46e5; }
        .action-btn-light span { flex: 1; text-align: left; }

        .loading-light { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 100px; gap: 20px; }
        .spinner-light { width: 50px; height: 50px; border: 3px solid #f1f5f9; border-top-color: #4f46e5; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default DashboardPage;
