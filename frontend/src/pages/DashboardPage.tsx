import React, { useEffect, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { motion } from "framer-motion";
import {
  Activity,
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  ChevronRight,
  Clock,
  Download,
  FileText,
  History,
  Layers,
  Package,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  TrendingUp,
  User,
  Zap,
} from "lucide-react";
import {
  DashboardCategoryDistribution,
  DashboardMaintenanceAlert,
  DashboardStatsResponse,
  getBiens,
} from "../api/api";
import { getCurrentUser } from "../api/auth";
import { usePermissions } from "../contexts/PermissionsContext";
import { useApi } from "../hooks/useApi";
import { exportGrandLivrePremiumExcel, exportLivreJournalPremiumExcel, exportPdf } from "../utils/exporters";

type LooseRecord = Record<string, unknown>;

type DashboardDistributionItem = {
  name: string;
  value: number;
  amount: number;
  color: string;
};

const categoryColors: Record<string, string> = {
  IMMOBILIER: "#4f46e5",
  MOBILIER: "#9333ea",
  INFORMATIQUE: "#06b6d4",
  MATERIEL_ROULANT: "#059669",
  MATERIEL_TECHNIQUE: "#f59e0b",
  INCORPORELS: "#ec4899",
  OEUVRES_COLLECTIONS: "#14b8a6",
  CHEPTELS: "#84cc16",
};

const formatCurrency = (value: number) => `${Math.round(value).toLocaleString("fr-FR")} FCFA`;
const formatShortDate = (value?: string) => (value ? new Date(value).toLocaleDateString("fr-FR", { day: 'numeric', month: 'short' }) : 'N/A');
const formatTime = (value?: string) => (value ? new Date(value).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "--:--");
const formatCategoryName = (name: string) =>
  name
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

const HolographicMetric = ({ label, value, suffix, tone, icon, status, delay }: any) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.92, y: 20 }}
    animate={{ opacity: 1, scale: 1, y: 0 }}
    transition={{ delay, type: "spring", stiffness: 100 }}
    whileHover={{ y: -8, transition: { duration: 0.2 } }}
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
          <Zap size={12} />
          {status}
        </div>
      </div>
    </div>
    <div className="holo-progress-track">
      <motion.div
        initial={{ width: 0 }}
        animate={{ width: "72%" }}
        transition={{ delay: delay + 0.3, duration: 1.2 }}
        className="holo-progress-bar"
      />
    </div>
  </motion.div>
);

const AnimatedCounter = ({ value, suffix }: { value: number; suffix?: string }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    const duration = 1600;
    const startTime = performance.now();

    const update = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(2, -10 * progress);
      setDisplayValue(Math.floor(eased * value));
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
  const { data: evolutionData, loading: evolutionLoading } = useApi<{ label: string; value: number }[]>("/dashboard/evolution-mensuelle", []);
  const { data: categoryData, loading: categoryLoading } = useApi<DashboardCategoryDistribution[]>("/dashboard/repartition-categories", []);
  const { data: topAlertesData, loading: topAlertesLoading } = useApi<DashboardMaintenanceAlert[]>("/dashboard/top-alertes", []);
  const currentUser = getCurrentUser();
  const { permissions } = usePermissions();

  useEffect(() => {
    const load = async () => {
      try {
        const biensData = await getBiens().catch(() => []);
        setBiens((biensData as LooseRecord[]) ?? []);
      } catch {}
    };
    void load();
  }, []);

  const dashboardLoading = statsLoading || evolutionLoading || categoryLoading || topAlertesLoading;

  const typeDistribution = useMemo<DashboardDistributionItem[]>(
    () =>
      (categoryData || []).map((item) => ({
        name: formatCategoryName(item.name),
        value: item.count,
        amount: item.value,
        color: categoryColors[item.name] || "#3b82f6",
      })),
    [categoryData]
  );

  const topAlertes = useMemo(() => topAlertesData || [], [topAlertesData]);
  const chartData = useMemo(() => evolutionData || [], [evolutionData]);

  const metrics = useMemo(() => {
    const totalBiens = biens.length;
    const maintenanceAlerts = topAlertes.filter((item) => item.typeAlerte === "MAINTENANCE" || item.typeAlerte === "VISITE_TECHNIQUE").length;
    const lowStock = Number(statsData?.stocksEnAlerte || 0);
    const tauxVetuste = Math.round(Number(statsData?.tauxVetusteGlobal || 0));
    const tauxDisponibilite = totalBiens === 0 ? 0 : Math.round((biens.filter((b) => b.service).length / totalBiens) * 100);
    const tauxConformite = totalBiens === 0 ? 0 : Math.round((biens.filter((b) => b.statutValidation === "VALIDE").length / totalBiens) * 100);
    const biensSansAffectation = biens.filter((b) => !b.service).length;
    const biensSousUtilises = biens.filter((b) => b.statutOperationnel && b.statutOperationnel !== "OPERATIONNEL").length;

    return {
      totalValue: Number(statsData?.valeurTotale || 0),
      totalNetValue: Number(statsData?.valeurNette || 0),
      criticalCount: topAlertes.length + lowStock,
      tauxVetuste,
      tauxDisponibilite,
      coutEntretien: Number(statsData?.coutEntretienAnnuel || 0),
      ecartInventaire: Number(statsData?.ecartInventaireComptabilite || 0),
      tauxConformite,
      biensSansAffectation,
      biensSousUtilises,
      healthScore: Math.max(
        0,
        Math.min(
          100,
          100 - Math.min(tauxVetuste, 100) * 0.35 - Math.min(maintenanceAlerts * 6, 24) - Math.min(lowStock * 4, 20) - Math.min(biensSansAffectation * 2, 20)
        )
      ),
    };
  }, [biens, statsData, topAlertes]);

  const exportActions = [
    { title: "Livre Journal", icon: <FileText size={18} />, action: () => exportLivreJournalPremiumExcel(biens as any, "livre_journal.xlsx", currentUser || undefined) },
    { title: "Grand Livre", icon: <Layers size={18} />, action: () => exportGrandLivrePremiumExcel(biens as any, "grand_livre.xlsx", currentUser || undefined) },
    { title: "Rapport PDF", icon: <Download size={18} />, action: () => exportPdf(biens as any, "Rapport", "rapport.pdf", currentUser || undefined, []) },
  ];

  return (
    <div className="dashboard-light-root">
      <div className="light-bg">
        <div className="aura-1" />
        <div className="aura-2" />
        <div className="pattern-overlay" />
      </div>

      <div className="dashboard-content-wrapper">
        <header className="command-header-light">
          <motion.div initial={{ opacity: 0, x: -30 }} animate={{ opacity: 1, x: 0 }} className="command-title-block">
            <div className="command-badge-light">
              <Sparkles size={14} />
              <span>PILOTAGE PATRIS v5.0 GOLD</span>
            </div>
            <h1>Tableau de Bord</h1>
            <p>Vision consolidée, auditable et stratégique du patrimoine institutionnel.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} className="command-user-node-light">
            <div className="node-profile-light">
              <div className="profile-avatar-light">{currentUser?.nom?.slice(0, 1) || "A"}</div>
              <div className="profile-meta-light">
                <strong>{currentUser?.nom || "Administrateur"}</strong>
                <span>{permissions?.role || "Direction Générale"}</span>
              </div>
            </div>
          </motion.div>
        </header>

        {dashboardLoading ? (
          <div className="loading-light">
            <div className="spinner-light" />
            <p>Chargement des indicateurs réels...</p>
          </div>
        ) : (
          <div className="command-layout">
            <section className="command-kpi-row">
              <HolographicMetric label="Valeur Totale" value={metrics.totalValue} suffix="FCFA" tone="indigo" icon={<TrendingUp size={24} />} status="Vision patrimoniale globale" delay={0.1} />
              <HolographicMetric label="Valeur Nette Consolidée" value={metrics.totalNetValue} suffix="FCFA" tone="purple" icon={<ShieldCheck size={24} />} status="Amortissement intégré" delay={0.2} />
              <HolographicMetric label="Alertes Prioritaires" value={metrics.criticalCount} tone="rose" icon={<ShieldAlert size={24} />} status={metrics.criticalCount > 0 ? "Points de vigilance réels" : "Alerte maîtrisée"} delay={0.3} />
              <HolographicMetric label="Mouvements du Mois" value={Number(statsData?.mouvementsThisMois || 0)} tone="emerald" icon={<Activity size={24} />} status="Flux opérationnels observés" delay={0.4} />
              <HolographicMetric label="Taux de Vétusté" value={metrics.tauxVetuste} suffix="%" tone="indigo" icon={<Zap size={24} />} status="Mesure réelle du parc" delay={0.5} />
              <HolographicMetric label="Taux de Disponibilité" value={metrics.tauxDisponibilite} suffix="%" tone="purple" icon={<Clock size={24} />} status="Affectation et usage" delay={0.6} />
              <HolographicMetric label="Coût d'Entretien" value={metrics.coutEntretien} suffix="FCFA" tone="emerald" icon={<FileText size={24} />} status="Année courante" delay={0.7} />
              <HolographicMetric label="Écart Inventaire" value={metrics.ecartInventaire} suffix="FCFA" tone="rose" icon={<BarChart3 size={24} />} status="Inventaire vs comptabilité" delay={0.8} />
              <HolographicMetric label="Taux de Conformité" value={metrics.tauxConformite} suffix="%" tone="indigo" icon={<ShieldCheck size={24} />} status="Suivi de validation" delay={0.9} />
              <HolographicMetric label="Biens Sans Affectation" value={metrics.biensSansAffectation} tone="purple" icon={<User size={24} />} status="Réserve à traiter" delay={1.0} />
              <HolographicMetric label="Biens Sous-utilisés" value={metrics.biensSousUtilises} tone="emerald" icon={<Activity size={24} />} status="Potentiel d'optimisation" delay={1.1} />
            </section>

            <div className="command-main-grid">
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.45 }} className="card-light chart-card-light">
                <div className="card-header-light">
                  <div className="header-icon-light"><BarChart3 size={20} /></div>
                  <div className="header-text-light">
                    <h3>Évolution Mensuelle</h3>
                    <span>12 mois glissants sur données réelles du patrimoine</span>
                  </div>
                </div>
                <div className="chart-container">
                  <ResponsiveContainer width="100%" height={300}>
                    <AreaChart data={chartData}>
                      <defs>
                        <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.14} />
                          <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                      <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#94a3b8", fontSize: 11 }} dy={10} />
                      <YAxis hide />
                      <Tooltip formatter={(value) => [formatCurrency(Number(value || 0)), "Valeur"]} contentStyle={{ background: "#fff", border: "1px solid rgba(0,0,0,0.05)", borderRadius: "12px", boxShadow: "0 10px 25px rgba(0,0,0,0.05)" }} />
                      <Area type="monotone" dataKey="value" stroke="#4f46e5" strokeWidth={3} fill="url(#areaGradient)" animationDuration={1800} />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.55 }} className="card-light activity-card-light">
                <div className="card-header-light">
                  <div className="header-icon-light"><History size={20} /></div>
                  <div className="header-text-light">
                    <h3>Journal des Opérations</h3>
                    <span>Dernières actions tracées dans le système</span>
                  </div>
                </div>
                <div className="activity-stream-light">
                  {(statsData?.activiteRecente || []).slice(0, 6).map((act) => (
                    <div key={act.id} className="stream-item-light">
                      <div className="stream-dot" />
                      <div className="stream-time-light">{formatTime(act.timestamp)}</div>
                      <div className="stream-info-light">
                        <strong>{act.action}</strong>
                        <span>{act.acteur}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </motion.div>
            </div>

            <div className="command-alerts-grid">
              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="card-light alertes-card-light">
                <div className="card-header-light">
                  <div className="header-icon-light alertes-icon-red"><ShieldAlert size={20} /></div>
                  <div className="header-text-light">
                    <h3>Top 5 Alertes</h3>
                    <span>Biens les plus exposés aux risques opérationnels</span>
                  </div>
                </div>
                <div className="alertes-list-light">
                  {topAlertes.length === 0 ? (
                    <div className="empty-alert-state">
                      <CheckCircle2 size={32} className="check-success-icon" />
                      <p>Aucune alerte majeure détectée sur le parc.</p>
                    </div>
                  ) : (
                    topAlertes.map((alert, index) => (
                      <div key={`${alert.id}-${index}`} className="alert-item-light animate-alert-item">
                        <div className="priority-rank">{index + 1}</div>
                        <div className="alert-body-light">
                          <div className="alert-title-light">
                            <strong>{alert.designation}</strong>
                            <span className="badge-alert-type">{alert.typeAlerte || "Surveillance"}</span>
                          </div>
                          <div className="alert-meta-light">
                            <span>IUP: {alert.iup || "N/A"}</span>
                            <span>Catégorie: {alert.categorie || "N/A"}</span>
                            <span>Service: {alert.service || "Non affecté"}</span>
                            <span className="alert-date-light">Échéance: {formatShortDate(alert.dateEcheance)}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }} className="card-light alertes-card-light">
                <div className="card-header-light">
                  <div className="header-icon-light alertes-icon-orange"><Package size={20} /></div>
                  <div className="header-text-light">
                    <h3>Alertes de Stocks</h3>
                    <span>Consommables sous le seuil critique</span>
                  </div>
                </div>
                <div className="alertes-list-light">
                  {(!statsData?.alertesStock || statsData.alertesStock.length === 0) ? (
                    <div className="empty-alert-state">
                      <CheckCircle2 size={32} className="check-success-icon" />
                      <p>Tous les stocks de consommables sont à niveau.</p>
                    </div>
                  ) : (
                    statsData.alertesStock.slice(0, 5).map((stock, idx) => (
                      <div key={stock.stockId || idx} className="alert-item-light animate-alert-item">
                        <div className="alert-icon-dot orange-pulse" />
                        <div className="alert-body-light">
                          <div className="alert-title-light">
                            <strong>{stock.nomProduit}</strong>
                            <span className="badge-alert-qty">{stock.quantite} {stock.unite} restants</span>
                          </div>
                          <div className="alert-meta-light">
                            <span>Réf: {stock.codeArticle}</span>
                            <span>Magasin: {stock.magasin || "Principal"}</span>
                            <span className="alert-seuil-light">Seuil: {stock.seuilAlerte}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </motion.div>
            </div>

            <div className="command-bottom-grid">
              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.72 }} className="card-light distribution-card-light">
                <div className="card-header-light">
                  <div className="header-icon-light"><Layers size={20} /></div>
                  <div className="header-text-light">
                    <h3>Répartition par Catégorie</h3>
                    <span>Lecture croisée volume et valeur des actifs</span>
                  </div>
                </div>
                <div className="dist-flex">
                  <div className="pie-box-light">
                    <ResponsiveContainer width="100%" height={170}>
                      <PieChart>
                        <Pie data={typeDistribution} innerRadius={50} outerRadius={70} paddingAngle={5} dataKey="value">
                          {typeDistribution.map((entry, index) => (
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
                    {typeDistribution.map((item) => (
                      <div key={item.name} className="legend-row-light">
                        <div className="dot-light" style={{ backgroundColor: item.color }} />
                        <span>{item.name}</span>
                        <strong>{item.value}</strong>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="bar-zone-light">
                  <ResponsiveContainer width="100%" height={220}>
                    <BarChart data={typeDistribution}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(0,0,0,0.05)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: "#64748b", fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={60} />
                      <YAxis hide />
                      <Tooltip formatter={(value, name) => name === "amount" ? [formatCurrency(Number(value || 0)), "Valeur"] : [Number(value || 0).toLocaleString("fr-FR"), "Volume"]} />
                      <Bar dataKey="amount" radius={[10, 10, 0, 0]}>
                        {typeDistribution.map((entry, index) => (
                          <Cell key={`bar-${index}`} fill={entry.color} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.78 }} className="card-light pulse-card-light">
                <div className="card-header-light">
                  <div className="header-icon-light"><AlertTriangle size={20} /></div>
                  <div className="header-text-light">
                    <h3>Indice de Santé du Parc</h3>
                    <span>Lecture synthétique issue des indicateurs réels</span>
                  </div>
                </div>
                <div className="health-score-shell">
                  <div className="health-score-ring" style={{ background: `conic-gradient(#4f46e5 0deg, #06b6d4 ${3.6 * Math.round(metrics.healthScore)}deg, #e2e8f0 0deg)` }}>
                    <strong>{Math.round(metrics.healthScore)}</strong>
                    <span>/100</span>
                  </div>
                  <div className="health-score-copy">
                    <p>{metrics.healthScore >= 80 ? "Parc globalement maîtrisé" : metrics.healthScore >= 55 ? "Parc à surveiller de près" : "Parc en zone de tension opérationnelle"}</p>
                    <div className="health-tags">
                      <span>Vétusté: {metrics.tauxVetuste}%</span>
                      <span>Alertes: {metrics.criticalCount}</span>
                      <span>Sans affectation: {metrics.biensSansAffectation}</span>
                    </div>
                  </div>
                </div>
              </motion.div>

              <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.85 }} className="card-light actions-card-light">
                <div className="card-header-light">
                  <div className="header-icon-light"><Download size={20} /></div>
                  <div className="header-text-light">
                    <h3>Exports Stratégiques</h3>
                    <span>Sorties prêtes pour pilotage et contrôle</span>
                  </div>
                </div>
                <div className="actions-flex-light">
                  {exportActions.map((action) => (
                    <motion.button key={action.title} whileHover={{ scale: 1.02, background: "#f8fafc" }} whileTap={{ scale: 0.98 }} onClick={action.action} className="action-btn-light">
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
          opacity: 0.45;
        }

        .dashboard-content-wrapper {
          position: relative;
          z-index: 1;
          padding: 40px;
          max-width: 1480px;
          margin: 0 auto;
        }

        .command-header-light {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          gap: 24px;
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
          font-size: 1.05rem;
          margin-top: 8px;
          max-width: 760px;
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

        .profile-meta-light strong { display: block; font-size: 14px; color: #0f172a; }
        .profile-meta-light span { font-size: 11px; color: #64748b; font-weight: 600; }

        .command-kpi-row {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
          gap: 22px;
          margin-bottom: 32px;
        }

        .holo-card-light {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 4px 20px rgba(0,0,0,0.02);
          transition: all 0.3s ease;
        }

        .holo-card-light:hover {
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
        .indigo .holo-progress-bar { background: #4f46e5; height: 100%; }
        .purple .holo-progress-bar { background: #9333ea; height: 100%; }
        .rose .holo-progress-bar { background: #e11d48; height: 100%; }
        .emerald .holo-progress-bar { background: #059669; height: 100%; }

        .command-main-grid {
          display: grid;
          grid-template-columns: 2fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        .command-alerts-grid {
          display: grid;
          grid-template-columns: 1.2fr 1fr;
          gap: 24px;
          margin-bottom: 24px;
        }

        .command-bottom-grid {
          display: grid;
          grid-template-columns: 1.3fr 1fr 1fr;
          gap: 24px;
        }

        .card-light {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 30px;
          padding: 28px;
          box-shadow: 0 4px 25px rgba(0,0,0,0.02);
        }

        .card-header-light { display: flex; align-items: center; gap: 15px; margin-bottom: 24px; }
        .header-icon-light { width: 44px; height: 44px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #4f46e5; }
        .header-text-light h3 { margin: 0; font-size: 1.1rem; font-weight: 800; color: #0f172a; }
        .header-text-light span { font-size: 12px; color: #64748b; font-weight: 600; }

        .activity-stream-light { display: flex; flex-direction: column; gap: 18px; }
        .stream-item-light { display: flex; align-items: center; gap: 15px; }
        .stream-dot { width: 8px; height: 8px; border-radius: 50%; background: #4f46e5; }
        .stream-time-light { font-size: 11px; font-weight: 700; color: #94a3b8; min-width: 45px; }
        .stream-info-light strong { display: block; font-size: 13px; color: #1e293b; }
        .stream-info-light span { font-size: 11px; color: #94a3b8; }

        .alertes-list-light { display: flex; flex-direction: column; gap: 16px; }
        .alert-item-light {
          display: flex;
          align-items: flex-start;
          gap: 16px;
          padding: 16px;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 16px;
          transition: all 0.2s ease;
        }

        .alert-item-light:hover {
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.03);
          background: #f1f5f9;
        }

        .priority-rank {
          min-width: 30px;
          height: 30px;
          border-radius: 999px;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 12px;
          font-weight: 800;
          color: white;
          background: linear-gradient(135deg, #dc2626, #f97316);
          box-shadow: 0 10px 20px rgba(239, 68, 68, 0.2);
        }

        .alert-icon-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          margin-top: 6px;
        }

        .red-pulse {
          background: #ef4444;
          box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7);
          animation: pulse-red 2s infinite;
        }

        .orange-pulse {
          background: #f97316;
          box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.7);
          animation: pulse-orange 2s infinite;
        }

        .alert-body-light { flex: 1; }
        .alert-title-light { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 4px; }
        .alert-title-light strong { font-size: 14px; color: #0f172a; }
        .badge-alert-type,
        .badge-alert-qty {
          font-size: 10px;
          font-weight: 800;
          padding: 3px 8px;
          border-radius: 12px;
        }

        .badge-alert-type { color: #ef4444; background: rgba(239, 68, 68, 0.1); }
        .badge-alert-qty { color: #f97316; background: rgba(249, 115, 22, 0.1); }
        .alert-meta-light { display: flex; flex-wrap: wrap; gap: 12px; font-size: 12px; color: #64748b; }
        .alert-date-light, .alert-seuil-light { font-weight: 700; color: #475569; }

        .alertes-icon-red {
          color: #ef4444 !important;
          background: rgba(239, 68, 68, 0.08) !important;
          border-color: rgba(239, 68, 68, 0.15) !important;
        }

        .alertes-icon-orange {
          color: #f97316 !important;
          background: rgba(249, 115, 22, 0.08) !important;
          border-color: rgba(249, 115, 22, 0.15) !important;
        }

        .empty-alert-state {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 32px 16px;
          gap: 12px;
          text-align: center;
          color: #64748b;
          border: 1px dashed #cbd5e1;
          border-radius: 16px;
          background: #f8fafc;
        }

        .check-success-icon { color: #10b981; }

        .dist-flex { display: flex; align-items: center; gap: 30px; margin-bottom: 18px; }
        .pie-box-light { width: 160px; position: relative; }
        .pie-center-light { position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); text-align: center; }
        .pie-center-light strong { font-size: 20px; font-weight: 800; display: block; }
        .pie-center-light span { font-size: 10px; color: #94a3b8; text-transform: uppercase; font-weight: 700; }
        .dist-legend-light { flex: 1; }
        .legend-row-light { display: flex; align-items: center; gap: 10px; font-size: 12px; margin-bottom: 8px; }
        .dot-light { width: 8px; height: 8px; border-radius: 2px; }
        .bar-zone-light { margin-top: 12px; }

        .pulse-card-light {
          background: radial-gradient(circle at top right, rgba(79, 70, 229, 0.08), transparent 35%), linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
        }

        .health-score-shell { display: flex; align-items: center; gap: 20px; }
        .health-score-ring {
          min-width: 120px;
          height: 120px;
          border-radius: 999px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          position: relative;
          color: #0f172a;
          font-weight: 800;
        }

        .health-score-ring::after {
          content: "";
          position: absolute;
          inset: 12px;
          border-radius: inherit;
          background: white;
          z-index: 0;
        }

        .health-score-ring strong,
        .health-score-ring span {
          position: relative;
          z-index: 1;
        }

        .health-score-ring strong { font-size: 2rem; line-height: 1; }
        .health-score-ring span { font-size: 0.8rem; color: #64748b; }
        .health-score-copy p { margin: 0 0 10px; font-size: 14px; color: #334155; font-weight: 700; }
        .health-tags { display: flex; flex-wrap: wrap; gap: 8px; }
        .health-tags span {
          font-size: 11px;
          font-weight: 700;
          color: #475569;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 999px;
          padding: 6px 10px;
        }

        .actions-flex-light { display: grid; grid-template-columns: 1fr; gap: 15px; }
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

        .action-icon-light {
          width: 36px;
          height: 36px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #4f46e5;
        }

        .action-btn-light span { flex: 1; text-align: left; }

        .loading-light {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 100px;
          gap: 20px;
        }

        .spinner-light {
          width: 50px;
          height: 50px;
          border: 3px solid #f1f5f9;
          border-top-color: #4f46e5;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }

        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse-red {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(239, 68, 68, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(239, 68, 68, 0); }
        }

        @keyframes pulse-orange {
          0% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(249, 115, 22, 0.7); }
          70% { transform: scale(1); box-shadow: 0 0 0 6px rgba(249, 115, 22, 0); }
          100% { transform: scale(0.95); box-shadow: 0 0 0 0 rgba(249, 115, 22, 0); }
        }

        @media (max-width: 1100px) {
          .command-main-grid,
          .command-alerts-grid,
          .command-bottom-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 768px) {
          .dashboard-content-wrapper { padding: 24px; }
          .command-header-light,
          .health-score-shell,
          .dist-flex {
            flex-direction: column;
            align-items: stretch;
          }

          .command-title-block h1 {
            font-size: 2.2rem;
          }
        }
      `}</style>
    </div>
  );
};

export default DashboardPage;
