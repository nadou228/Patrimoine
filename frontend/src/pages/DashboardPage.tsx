import React, { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, PieChart, Pie, Cell, Legend } from "recharts";
import { motion, AnimatePresence } from "framer-motion";
import { 
  TrendingUp, ShieldAlert, Package, Activity, 
  Download, Calendar, User, LayoutDashboard,
  ArrowUpRight, AlertTriangle, CheckCircle2, Info,
  Sparkles, Layers, History, ChevronRight
} from "lucide-react";
import { DashboardStatsResponse, deleteAuditLog, getBiens } from "../api/api";
import { getCurrentUser } from "../api/auth";
import { useConfirm } from "../contexts/ConfirmContext";
import { usePermissions } from "../contexts/PermissionsContext";
import { useToast } from "../contexts/ToastContext";
import { useApi } from "../hooks/useApi";
import { exportGrandLivrePremiumExcel, exportLivreJournalPremiumExcel, exportPdf } from "../utils/exporters";

type LooseRecord = Record<string, unknown>;
type Primitive = string | number | boolean | null | undefined;

type DashboardMetric = {
  label: string;
  value: number;
  suffix?: string;
  tone: "neutral" | "success" | "warning" | "danger";
  status: string;
  detail: string;
  icon: React.ReactNode;
  emptyLabel?: string;
};

type AlertTone = "success" | "warning" | "danger";

const formatCurrency = (value: number) => `${Math.round(value).toLocaleString("fr-FR")} FCFA`;

const formatDateTime = (value?: unknown) => {
  if (!value) return "-";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("fr-FR");
};

/* ─── Innovative Counter Component ─── */
const AnimatedCounter = ({ value, suffix }: { value: number; suffix?: string }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const end = value;
    const duration = 1500;
    const startTime = performance.now();

    const update = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOutExpo = 1 - Math.pow(2, -10 * progress);
      const current = Math.floor(easeOutExpo * end);
      
      setDisplayValue(current);

      if (progress < 1) {
        requestAnimationFrame(update);
      }
    };

    requestAnimationFrame(update);
  }, [value]);

  const formatted = suffix === "FCFA" 
    ? formatCurrency(displayValue) 
    : `${displayValue.toLocaleString("fr-FR")}${suffix ? ` ${suffix}` : ""}`;

  return <span>{formatted}</span>;
};

const DashboardPage: React.FC = () => {
  const [biens, setBiens] = useState<LooseRecord[]>([]);
  const { data: statsData, loading: statsLoading } = useApi<DashboardStatsResponse>("/dashboard/stats", []);
  const currentUser = getCurrentUser();
  const { confirm } = useConfirm();
  const { permissions } = usePermissions();
  const { showToast } = useToast();
  const isAdmin = permissions?.role === "ADMIN";

  useEffect(() => {
    const load = async () => {
      try {
        const [biensData] = await Promise.all([
          getBiens().catch(() => []),
        ]);
        setBiens((biensData as LooseRecord[]) ?? []);
      } finally {}
    };
    void load();
  }, []);

  const metrics = useMemo(() => {
    const totalValue = Number(statsData?.valeurTotale || 0);
    const totalNetValue = Number(statsData?.valeurNette || 0);
    const maintenanceAlerts = Number(statsData?.prochainesMaintenance?.filter((item) => item.typeAlerte === "MAINTENANCE").length || 0);
    const visiteAlerts = Number(statsData?.prochainesMaintenance?.filter((item) => item.typeAlerte === "VISITE_TECHNIQUE").length || 0);
    const lowStock = Number(statsData?.stocksEnAlerte || 0);
    const criticalCount = maintenanceAlerts + visiteAlerts + lowStock;
    const recentlyAdded = [...biens]
      .filter((bien) => bien.dateAcquisition)
      .sort((a, b) => String(b.dateAcquisition || "").localeCompare(String(a.dateAcquisition || "")))
      .slice(0, 5);

    const typeDistribution = [
      { name: 'Immobilier', value: biens.filter(b => b.type === 'immobilier').length, color: '#6366f1' },
      { name: 'Mobilier', value: biens.filter(b => b.type === 'mobilier').length, color: '#10b981' },
      { name: 'Véhicules', value: biens.filter(b => b.type === 'roulant').length, color: '#f59e0b' },
    ].filter(d => d.value > 0);

    return {
      totalValue, totalNetValue, maintenanceAlerts, visiteAlerts, lowStock, 
      criticalCount, recentlyAdded, typeDistribution,
      emptyPortfolio: biens.length === 0 && Number(statsData?.totalBiens || 0) === 0,
    };
  }, [biens, statsData]);

  const chartData = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("fr-FR", { month: "short" });
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date();
      date.setMonth(date.getMonth() - (5 - index));
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: formatter.format(date),
        value: 0,
      };
    });

    biens.forEach((bien) => {
      const acqDate = bien.dateAcquisition ? new Date(String(bien.dateAcquisition)) : null;
      if (!acqDate || isNaN(acqDate.getTime())) return;
      const key = `${acqDate.getFullYear()}-${acqDate.getMonth()}`;
      const month = months.find((m) => m.key === key);
      if (month) month.value += Number(bien.valeur || 0);
    });

    let cumulative = 0;
    return months.map((m) => {
      cumulative += m.value;
      return { label: m.label, cumulativeValue: Math.round(cumulative) };
    });
  }, [biens]);

  const metricCards: DashboardMetric[] = useMemo(() => [
    {
      label: "Valeur Patrimoine",
      value: metrics.totalValue,
      suffix: "FCFA",
      tone: "success",
      icon: <TrendingUp />,
      status: `${statsData?.totalBiens || biens.length} actifs`,
      detail: "Évaluation brute consolidée du portefeuille national.",
    },
    {
      label: "Valeur Nette (VNC)",
      value: metrics.totalNetValue,
      suffix: "FCFA",
      tone: "neutral",
      icon: <Layers />,
      status: `${statsData?.biensAffectes || 0} affectations`,
      detail: "Valeur nette après amortissement linéaire des actifs.",
    },
    {
      label: "Alertes Critiques",
      value: metrics.criticalCount,
      tone: metrics.criticalCount > 0 ? "warning" : "success",
      icon: <ShieldAlert />,
      status: metrics.maintenanceAlerts > 0 ? `${metrics.maintenanceAlerts} maintenances` : "Système stable",
      detail: "Points de vigilance technique et seuils de stock.",
    },
    {
      label: "Activité Mensuelle",
      value: Number(statsData?.mouvementsThisMois || 0),
      tone: "neutral",
      icon: <Activity />,
      status: `${statsData?.stocksEnAlerte || 0} alertes stock`,
      detail: "Mouvements journalisés sur les 30 derniers jours.",
    }
  ], [metrics, statsData, biens]);

  const executiveAlerts = useMemo(() => {
    const alerts: Array<{ tone: AlertTone; title: string; detail: string; icon: React.ReactNode }> = [];
    if (metrics.maintenanceAlerts > 0) alerts.push({ tone: "warning", title: "Maintenance", detail: `${metrics.maintenanceAlerts} interventions à engager.`, icon: <AlertTriangle /> });
    if (metrics.visiteAlerts > 0) alerts.push({ tone: "danger", title: "Contrôles", detail: `${metrics.visiteAlerts} visites techniques dépassées.`, icon: <Activity /> });
    if (metrics.lowStock > 0) alerts.push({ tone: "warning", title: "Stocks", detail: `${metrics.lowStock} seuils critiques atteints.`, icon: <Package /> });
    if (alerts.length === 0) alerts.push({ tone: "success", title: "Opérationnel", detail: "Aucun risque majeur détecté.", icon: <CheckCircle2 /> });
    return alerts;
  }, [metrics]);

  const exportActions = [
    { title: "Livre Journal", icon: <History />, action: () => exportLivreJournalPremiumExcel(biens as any, "livre_journal.xlsx", currentUser || undefined) },
    { title: "Grand Livre", icon: <Layers />, action: () => exportGrandLivrePremiumExcel(biens as any, "grand_livre.xlsx", currentUser || undefined) },
    { title: "Rapport PDF", icon: <Download />, action: () => exportPdf(biens as any, "Rapport Patrimoine", "rapport.pdf", currentUser || undefined, []) }
  ];

  return (
    <div className="dashboard-module premium-glass-bg fade-in" style={{ position: 'relative', overflow: 'hidden', paddingBottom: 60 }}>
      {/* Decorative innovative background elements */}
      <div className="innovative-blob blob-1" />
      <div className="innovative-blob blob-2" />

      {/* ─── HEADER ─── */}
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="page-header-premium"
      >
        <div className="header-meta">
          <motion.span 
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="badge-pill-glow"
          >
            <Sparkles size={12} style={{ marginRight: 6 }} />
            Intelligence Patrimoniale & Pilotage Stratégique
          </motion.span>
          <h1 style={{ fontSize: 36, fontWeight: 900, letterSpacing: '-1px' }}>Command Center</h1>
          <p className="card-subtitle" style={{ fontSize: 16 }}>Vision holistique et prédictive de vos actifs immobilisés.</p>
        </div>
        <div className="dashboard-header-aside">
          <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 20px' }}>
            <div className="user-avatar-glow"><User size={20} /></div>
            <div>
              <div style={{ fontWeight: 800, fontSize: 14 }}>{currentUser?.nom || "Directeur"}</div>
              <div style={{ fontSize: 11, opacity: 0.6 }}>{new Date().toLocaleDateString("fr-FR", { weekday: 'long', day: 'numeric', month: 'short' })}</div>
            </div>
          </div>
        </div>
      </motion.header>

      {statsLoading ? (
        <div className="loading-container"><div className="premium-spinner" /></div>
      ) : (
        <div className="dashboard-grid-innovative">
          
          {/* ─── TOP KPI GRID ─── */}
          <section className="kpi-grid-innovative">
            {metricCards.map((metric, idx) => (
              <motion.div
                key={metric.label}
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1, type: "spring", stiffness: 100 }}
                whileHover={{ y: -8, scale: 1.02 }}
                className={`kpi-card-innovative ${metric.tone}`}
              >
                <div className="kpi-glass-effect" />
                <div className="kpi-content">
                  <div className="kpi-icon-box">{metric.icon}</div>
                  <div className="kpi-main">
                    <span className="kpi-label">{metric.label}</span>
                    <div className="kpi-value-container">
                      <AnimatedCounter value={metric.value} suffix={metric.suffix} />
                    </div>
                    <div className="kpi-status-pill">
                      <ArrowUpRight size={14} />
                      {metric.status}
                    </div>
                  </div>
                </div>
                <div className="kpi-detail-footer">{metric.detail}</div>
              </motion.div>
            ))}
          </section>

          {/* ─── MAIN ANALYTICS SECTION ─── */}
          <div className="main-content-row">
            
            {/* Chart Column */}
            <motion.section 
              initial={{ opacity: 0, x: -30 }}
              animate={{ opacity: 1, x: 0 }}
              className="analytics-column"
            >
              <div className="premium-card chart-glass-card">
                <div className="card-header-premium">
                  <div className="icon-box-premium"><TrendingUp /></div>
                  <div>
                    <h3 className="card-title-premium">Trajectoire de Valeur</h3>
                    <p className="card-subtitle">Évolution du capital immobilisé sur 6 mois</p>
                  </div>
                </div>
                
                <div style={{ height: 320, marginTop: 24 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="var(--primary)" stopOpacity={0.3}/>
                          <stop offset="95%" stopColor="var(--primary)" stopOpacity={0}/>
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(255,255,255,0.05)" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: 'var(--text-dim)', fontSize: 12 }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fill: 'var(--text-dim)', fontSize: 11 }} tickFormatter={(v) => `${v/1000000}M`} />
                      <Tooltip 
                        contentStyle={{ background: 'rgba(15, 23, 42, 0.9)', border: '1px solid var(--glass-border)', borderRadius: '12px', backdropFilter: 'blur(10px)' }}
                        itemStyle={{ color: '#fff', fontWeight: 700 }}
                      />
                      <Area 
                        type="monotone" 
                        dataKey="cumulativeValue" 
                        stroke="var(--primary)" 
                        strokeWidth={4} 
                        fillOpacity={1} 
                        fill="url(#colorVal)" 
                        animationDuration={2000}
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </motion.section>

            {/* Alert & Side Column */}
            <motion.section 
              initial={{ opacity: 0, x: 30 }}
              animate={{ opacity: 1, x: 0 }}
              className="side-column"
            >
              <div className="premium-card alert-center-card">
                <div className="card-header-premium">
                  <div className="icon-box-premium" style={{ color: '#ef4444' }}><Activity /></div>
                  <h3 className="card-title-premium">Alertes & Risques</h3>
                </div>
                <div className="alert-stack">
                  <AnimatePresence>
                    {executiveAlerts.map((alert, idx) => (
                      <motion.div
                        key={alert.title}
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + idx * 0.1 }}
                        className={`alert-item-innovative ${alert.tone}`}
                      >
                        <div className="alert-icon-mini">{alert.icon}</div>
                        <div className="alert-text">
                          <strong>{alert.title}</strong>
                          <p>{alert.detail}</p>
                        </div>
                        <ChevronRight size={16} className="alert-arrow" />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              </div>

              <div className="premium-card distribution-card" style={{ marginTop: 24 }}>
                <div className="card-header-premium">
                  <div className="icon-box-premium" style={{ color: '#10b981' }}><LayoutDashboard /></div>
                  <h3 className="card-title-premium">Répartition</h3>
                </div>
                <div style={{ height: 200, position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={metrics.typeDistribution}
                        innerRadius={60}
                        outerRadius={80}
                        paddingAngle={8}
                        dataKey="value"
                        animationBegin={500}
                        animationDuration={1500}
                      >
                        {metrics.typeDistribution.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="pie-center-value">
                    <strong>{biens.length}</strong>
                    <span>Biens</span>
                  </div>
                </div>
              </div>
            </motion.section>
          </div>

          {/* ─── BOTTOM ROW: ACTIVITIES & EXPORTS ─── */}
          <section className="bottom-row-innovative">
            
            {/* Recent Activity */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="premium-card activity-glass-card"
            >
              <div className="card-header-premium">
                <div className="icon-box-premium"><History /></div>
                <h3 className="card-title-premium">Flux d'Activité</h3>
              </div>
              <div className="activity-list-modern">
                {(statsData?.activiteRecente || []).slice(0, 5).map((act, idx) => (
                  <motion.div 
                    key={act.id} 
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.6 + idx * 0.05 }}
                    className="activity-row-modern"
                  >
                    <div className="activity-time-pill">{new Date(act.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                    <div className="activity-main-info">
                      <strong>{act.action}</strong>
                      <span>{act.acteur} • {act.entite}</span>
                    </div>
                    {isAdmin && (
                      <button className="clean-btn" onClick={() => handleDeleteActivity(act.id)}>Nettoyer</button>
                    )}
                  </motion.div>
                ))}
              </div>
            </motion.div>

            {/* Quick Actions / Exports */}
            <motion.div 
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              className="premium-card export-grid-card"
            >
              <div className="card-header-premium">
                <div className="icon-box-premium"><Download /></div>
                <h3 className="card-title-premium">Actions Rapides</h3>
              </div>
              <div className="export-buttons-innovative">
                {exportActions.map((exp, idx) => (
                  <motion.button
                    key={exp.title}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={exp.action}
                    className="export-btn-innovative"
                  >
                    <div className="exp-icon">{exp.icon}</div>
                    <span>{exp.title}</span>
                  </motion.button>
                ))}
              </div>
            </motion.div>
          </section>

        </div>
      )}

      {/* Innovative CSS Styles */}
      <style>{`
        .dashboard-grid-innovative { display: flex; flex-direction: column; gap: 32px; padding: 0 40px; }
        
        .innovative-blob { position: absolute; border-radius: 50%; filter: blur(80px); opacity: 0.15; z-index: -1; pointer-events: none; animation: float 15s infinite alternate; }
        .blob-1 { width: 400px; height: 400px; background: var(--primary); top: -100px; left: -100px; }
        .blob-2 { width: 300px; height: 300px; background: #10b981; bottom: -50px; right: -50px; animation-delay: -5s; }
        
        @keyframes float { 0% { transform: translate(0, 0) scale(1); } 100% { transform: translate(30px, 50px) scale(1.1); } }
        
        .kpi-grid-innovative { display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 24px; }
        .kpi-card-innovative { position: relative; border-radius: 24px; padding: 24px; overflow: hidden; border: 1.5px solid var(--glass-border); background: rgba(255,255,255,0.03); backdrop-filter: blur(12px); }
        .kpi-glass-effect { position: absolute; inset: 0; background: linear-gradient(135deg, rgba(255,255,255,0.1), transparent); pointer-events: none; }
        .kpi-icon-box { width: 48px; height: 48px; border-radius: 14px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; color: var(--primary); margin-bottom: 20px; border: 1px solid var(--glass-border); }
        .kpi-card-innovative.success .kpi-icon-box { color: #10b981; }
        .kpi-card-innovative.warning .kpi-icon-box { color: #f59e0b; }
        .kpi-label { font-size: 13px; font-weight: 700; color: var(--text-dim); text-transform: uppercase; letter-spacing: 1px; }
        .kpi-value-container { font-size: 28px; font-weight: 900; margin: 8px 0; color: var(--text-main); }
        .kpi-status-pill { display: inline-flex; align-items: center; gap: 6px; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 20px; background: rgba(255,255,255,0.05); color: var(--text-dim); }
        .kpi-detail-footer { font-size: 11px; color: var(--text-dim); margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--glass-border); line-height: 1.4; }
        
        .main-content-row { display: grid; grid-template-columns: 1.8fr 1fr; gap: 32px; }
        .chart-glass-card { background: rgba(255,255,255,0.02); border-radius: 30px; }
        
        .alert-item-innovative { display: flex; align-items: center; gap: 16px; padding: 16px; border-radius: 16px; background: rgba(255,255,255,0.03); border: 1.5px solid var(--glass-border); margin-bottom: 12px; transition: all 0.3s; }
        .alert-item-innovative:hover { background: rgba(255,255,255,0.06); transform: translateX(8px); }
        .alert-item-innovative.warning { border-color: rgba(245, 158, 11, 0.3); }
        .alert-item-innovative.danger { border-color: rgba(239, 68, 68, 0.3); }
        .alert-icon-mini { width: 36px; height: 36px; border-radius: 10px; background: rgba(255,255,255,0.05); display: flex; align-items: center; justify-content: center; }
        .alert-item-innovative.warning .alert-icon-mini { color: #f59e0b; }
        .alert-item-innovative.danger .alert-icon-mini { color: #ef4444; }
        .alert-text strong { display: block; font-size: 14px; }
        .alert-text p { font-size: 12px; color: var(--text-dim); margin: 2px 0 0; }
        .alert-arrow { margin-left: auto; opacity: 0.3; }
        
        .pie-center-value { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; pointer-events: none; }
        .pie-center-value strong { display: block; font-size: 24px; font-weight: 900; line-height: 1; }
        .pie-center-value span { font-size: 10px; color: var(--text-dim); text-transform: uppercase; font-weight: 700; }
        
        .bottom-row-innovative { display: grid; grid-template-columns: 2fr 1fr; gap: 32px; }
        .activity-row-modern { display: flex; align-items: center; gap: 16px; padding: 14px 0; border-bottom: 1px solid var(--glass-border); }
        .activity-time-pill { font-size: 10px; font-weight: 800; background: var(--primary); color: white; padding: 3px 8px; border-radius: 8px; }
        .activity-main-info strong { display: block; font-size: 13px; }
        .activity-main-info span { font-size: 11px; color: var(--text-dim); }
        .clean-btn { margin-left: auto; font-size: 11px; font-weight: 700; color: var(--text-dim); background: none; border: 1px solid var(--glass-border); padding: 4px 10px; border-radius: 8px; cursor: pointer; transition: all 0.2s; }
        .clean-btn:hover { background: #ef4444; color: white; border-color: #ef4444; }
        
        .export-buttons-innovative { display: grid; grid-template-columns: 1fr; gap: 12px; }
        .export-btn-innovative { display: flex; align-items: center; gap: 16px; padding: 16px; border-radius: 16px; background: var(--primary); color: white; border: none; font-weight: 700; cursor: pointer; box-shadow: 0 10px 20px var(--primary-glow); }
        .exp-icon { width: 32px; height: 32px; border-radius: 8px; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; }
      `}</style>
    </div>
  );
};

export default DashboardPage;
