import React, { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { deleteAuditLog, getAuditLogs, getBiens, getStocks, getUsers } from "../api/api";
import { getCurrentUser } from "../api/auth";
import { usePermissions } from "../contexts/PermissionsContext";
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
  emptyLabel?: string;
};

type AlertTone = "success" | "warning" | "danger";

const formatCurrency = (value: number) => `${Math.round(value).toLocaleString("fr-FR")} FCFA`;

const formatDateTime = (value?: unknown) => {
  if (!value) return "-";
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleString("fr-FR");
};

const useAnimatedValue = (target: number, duration = 1200) => {
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setValue(target);
      return;
    }

    let frame = 0;
    const startedAt = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(target * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [duration, target]);

  return value;
};

const MetricValue = ({ metric }: { metric: DashboardMetric }) => {
  if (metric.value <= 0 && metric.emptyLabel) {
    return <strong className="executive-kpi-value empty">{metric.emptyLabel}</strong>;
  }

  const animated = useAnimatedValue(metric.value);
  const formatted =
    metric.suffix === "FCFA"
      ? formatCurrency(animated)
      : `${Math.round(animated).toLocaleString("fr-FR")}${metric.suffix ? ` ${metric.suffix}` : ""}`;

  return <strong className="executive-kpi-value">{formatted}</strong>;
};

const DashboardPage: React.FC = () => {
  const [biens, setBiens] = useState<LooseRecord[]>([]);
  const [users, setUsers] = useState<LooseRecord[]>([]);
  const [stocks, setStocks] = useState<LooseRecord[]>([]);
  const [activities, setActivities] = useState<LooseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUser = getCurrentUser();
  const { permissions } = usePermissions();
  const isAdmin = permissions?.role === "ADMIN";

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [biensData, usersData, stocksData, auditData] = await Promise.all([
          getBiens().catch(() => []),
          getUsers().catch(() => []),
          getStocks().catch(() => []),
          isAdmin ? getAuditLogs().catch(() => []) : Promise.resolve([]),
        ]);

        setBiens((biensData as LooseRecord[]) ?? []);
        setUsers((usersData as LooseRecord[]) ?? []);
        setStocks((stocksData as LooseRecord[]) ?? []);
        setActivities(((auditData as LooseRecord[]) ?? []).slice().reverse());
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, [isAdmin]);

  const isSoon = (value?: unknown, days = 30) => {
    if (!value) return false;
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return false;
    const limit = new Date();
    limit.setDate(limit.getDate() + days);
    return date <= limit;
  };

  const metrics = useMemo(() => {
    const totalValue = biens.reduce((sum, bien) => sum + Number(bien.valeur || 0), 0);
    const totalStockValue = stocks.reduce(
      (sum, stock) =>
        sum +
        Number(stock.quantite || 0) * Number(stock.prixUnitaireMoyen || (stock.consommable as LooseRecord | undefined)?.prixMoyenPondere || 0),
      0
    );
    const maintenanceAlerts = biens.filter((bien) => isSoon(bien.dateProchaineMaintenance, 30)).length;
    const visiteAlerts = biens.filter((bien) => isSoon(bien.dateProchaineVisiteTechnique, 30)).length;
    const lowStock = stocks.filter(
      (stock) =>
        Number(stock.quantite || 0) <= Number(stock.seuilAlerte || (stock.consommable as LooseRecord | undefined)?.seuilAlerte || 0)
    ).length;
    const criticalCount = maintenanceAlerts + visiteAlerts + lowStock;
    const recentlyAdded = [...biens]
      .filter((bien) => bien.dateAcquisition)
      .sort((a, b) => String(b.dateAcquisition || "").localeCompare(String(a.dateAcquisition || "")))
      .slice(0, 5);

    return {
      totalValue,
      totalStockValue,
      maintenanceAlerts,
      visiteAlerts,
      lowStock,
      criticalCount,
      recentlyAdded,
      emptyPortfolio: biens.length === 0 && stocks.length === 0,
    };
  }, [biens, stocks]);

  const chartData = useMemo(() => {
    const formatter = new Intl.DateTimeFormat("fr-FR", { month: "short" });
    const now = new Date();
    const months = Array.from({ length: 6 }, (_, index) => {
      const date = new Date(now.getFullYear(), now.getMonth() - (5 - index), 1);
      return {
        key: `${date.getFullYear()}-${date.getMonth()}`,
        label: formatter.format(date),
        value: 0,
      };
    });

    biens.forEach((bien) => {
      const acquisitionDate = bien.dateAcquisition ? new Date(String(bien.dateAcquisition)) : null;
      if (!acquisitionDate || Number.isNaN(acquisitionDate.getTime())) return;
      const key = `${acquisitionDate.getFullYear()}-${acquisitionDate.getMonth()}`;
      const month = months.find((entry) => entry.key === key);
      if (month) month.value += Number(bien.valeur || 0);
    });

    let cumulative = 0;
    return months.map((month) => {
      cumulative += month.value;
      return { label: month.label, cumulativeValue: Math.round(cumulative) };
    });
  }, [biens]);

  const metricCards: DashboardMetric[] = useMemo(
    () => [
      {
        label: "Valeur patrimoine",
        value: metrics.totalValue,
        suffix: "FCFA",
        tone: metrics.totalValue > 0 ? "success" : "neutral",
        status: metrics.totalValue > 0 ? `${biens.length} biens actifs` : "Aucun actif comptabilise",
        detail:
          metrics.totalValue > 0
            ? "Lecture consolidee de la valeur brute du portefeuille national."
            : "Le cockpit est pret a suivre vos premiers enregistrements patrimoniaux.",
        emptyLabel: "Portefeuille vide",
      },
      {
        label: "Valeur stock",
        value: metrics.totalStockValue,
        suffix: "FCFA",
        tone: metrics.lowStock > 0 ? "warning" : "neutral",
        status: metrics.lowStock > 0 ? `${metrics.lowStock} seuil(s) critiques` : "Aucune tension stock",
        detail:
          metrics.totalStockValue > 0
            ? "Estimation valorisee des consommables disponibles."
            : "Initialisez les lignes magasin pour activer le suivi logistique.",
        emptyLabel: "Stock non initialise",
      },
      {
        label: "Echeances proches",
        value: metrics.maintenanceAlerts + metrics.visiteAlerts,
        suffix: "echeance(s)",
        tone: metrics.maintenanceAlerts + metrics.visiteAlerts > 0 ? "warning" : "success",
        status:
          metrics.maintenanceAlerts > 0
            ? `${metrics.maintenanceAlerts} maintenances a traiter`
            : "Calendrier technique sous controle",
        detail:
          metrics.visiteAlerts > 0
            ? `${metrics.visiteAlerts} visite(s) technique(s) approchent.`
            : "Aucun controle technique urgent detecte.",
        emptyLabel: "Aucune alerte",
      },
      {
        label: "Adoption applicative",
        value: users.length,
        suffix: "utilisateur(s)",
        tone: users.length > 0 ? "success" : "neutral",
        status: users.length > 0 ? `${users.length} comptes actifs` : "Aucun utilisateur visible",
        detail:
          users.length > 0
            ? "Le reseau d'utilisateurs alimente la trace de gestion."
            : "Les comptes apparaitront ici des leur activation.",
        emptyLabel: "Aucun compte",
      },
    ],
    [biens.length, metrics.lowStock, metrics.maintenanceAlerts, metrics.totalStockValue, metrics.totalValue, metrics.visiteAlerts, users.length]
  );

  const executiveAlerts = useMemo<Array<{ tone: AlertTone; title: string; detail: string }>>(() => {
    const alerts: Array<{ tone: AlertTone; title: string; detail: string }> = [];

    if (metrics.maintenanceAlerts > 0) {
      alerts.push({
        tone: "warning",
        title: "Maintenance a engager",
        detail: `${metrics.maintenanceAlerts} bien(s) demandent une intervention sous 30 jours.`,
      });
    }
    if (metrics.visiteAlerts > 0) {
      alerts.push({
        tone: "danger",
        title: "Visites techniques proches",
        detail: `${metrics.visiteAlerts} controle(s) techniques arrivent a echeance.`,
      });
    }
    if (metrics.lowStock > 0) {
      alerts.push({
        tone: "warning",
        title: "Reapprovisionnement recommande",
        detail: `${metrics.lowStock} ligne(s) de stock ont atteint leur seuil d'alerte.`,
      });
    }
    if (alerts.length === 0) {
      alerts.push({
        tone: "success",
        title: metrics.emptyPortfolio ? "Cockpit pret a etre initialise" : "Aucune alerte critique aujourd'hui",
        detail: metrics.emptyPortfolio
          ? "Commencez par enregistrer vos premiers biens ou vos premiers stocks."
          : "Les principaux signaux de risque restent stables sur la periode.",
      });
    }

    return alerts;
  }, [metrics.emptyPortfolio, metrics.lowStock, metrics.maintenanceAlerts, metrics.visiteAlerts]);

  const exportActions = useMemo(
    () => [
      {
        title: "Livre journal",
        subtitle: "Chronologie des ecritures et mouvements patrimoniaux.",
        action: () =>
          exportLivreJournalPremiumExcel(
            biens as unknown as Record<string, Primitive>[],
            "livre_journal_premium.xlsx",
            currentUser || undefined
          ),
      },
      {
        title: "Grand livre",
        subtitle: "Lecture comptable par compte pour l'audit et le controle.",
        action: () =>
          exportGrandLivrePremiumExcel(
            biens as unknown as Record<string, Primitive>[],
            "grand_livre_premium.xlsx",
            currentUser || undefined
          ),
      },
      {
        title: "Rapport PDF",
        subtitle: "Synthese executive pour arbitrage et diffusion institutionnelle.",
        action: () =>
          exportPdf(
            biens.map((bien) => ({
              IUP: String(bien.iup || ""),
              Code: String(bien.codeSousCategorie || bien.codeBien || ""),
              Designation: String(bien.designation || ""),
              Categorie: String(bien.categoriePrincipale || bien.categorie || ""),
              Valeur: formatCurrency(Number(bien.valeur || 0)),
              Service: String(bien.service || bien.localisation || ""),
            })),
            "Rapport executif patrimoine",
            "rapport_executif.pdf",
            currentUser || undefined,
            [
              { label: "Valeur patrimoine", value: formatCurrency(metrics.totalValue) },
              { label: "Valeur stock", value: formatCurrency(metrics.totalStockValue) },
              { label: "Alertes", value: String(metrics.criticalCount) },
            ]
          ),
      },
    ],
    [biens, currentUser, metrics.criticalCount, metrics.totalStockValue, metrics.totalValue]
  );

  const visibleActivities = useMemo(() => activities.slice(0, 8), [activities]);

  const handleDeleteActivity = async (id: number) => {
    if (!window.confirm("Supprimer cette activite du journal ?")) return;
    await deleteAuditLog(id);
    setActivities((previous) => previous.filter((activity) => Number(activity.id) !== id));
  };

  return (
    <div className="dashboard-module dashboard-executive fade-in">
      <header className="page-header-premium dashboard-header-executive">
        <div className="header-meta">
          <span className="badge-pill-glow">Pilotage patrimoine & comptabilite matiere</span>
          <h1>Tableau de bord executif</h1>
          <p className="header-subtitle">
            Priorisation des risques, trajectoire de valeur et lecture immediate des decisions a prendre.
          </p>
        </div>
        <div className="dashboard-header-aside">
          <span className="dashboard-date-chip">
            {new Date().toLocaleDateString("fr-FR", {
              weekday: "long",
              day: "numeric",
              month: "long",
              year: "numeric",
            })}
          </span>
          <strong>{currentUser?.nom || currentUser?.username || "Session active"}</strong>
        </div>
      </header>

      {loading ? (
        <div className="empty-state-modern skeleton-block" aria-live="polite">
          Chargement du cockpit patrimoine...
        </div>
      ) : (
        <>
          <section className="executive-alert-banner card">
            <div>
              <span className="executive-kicker">Vue immediate</span>
              <h2>Ce qui merite une decision maintenant.</h2>
            </div>
            <div className="executive-alert-list">
              {executiveAlerts.map((alert) => (
                <article key={alert.title} className={`executive-alert-card ${alert.tone}`}>
                  <strong>{alert.title}</strong>
                  <p>{alert.detail}</p>
                </article>
              ))}
            </div>
          </section>

          <section className="executive-kpi-grid">
            {metricCards.map((metric, index) => (
              <article
                key={metric.label}
                className={`executive-kpi-card ${metric.tone}`}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="executive-kpi-head">
                  <span className="executive-kpi-label">{metric.label}</span>
                  <span className={`executive-kpi-badge ${metric.tone}`}>{metric.status}</span>
                </div>
                <MetricValue metric={metric} />
                <p>{metric.detail}</p>
              </article>
            ))}
          </section>

          <section className="executive-main-grid">
            <article className="asset-card executive-chart-card card">
              <div className="section-header-inline">
                <div>
                  <span className="executive-kicker">Tendance</span>
                  <h3>Evolution de la valeur du patrimoine</h3>
                  <p className="muted-paragraph">Cumul des acquisitions visibles sur les six derniers mois.</p>
                </div>
                <div className="executive-chart-summary">
                  <strong>{formatCurrency(metrics.totalValue)}</strong>
                  <span>{biens.length} biens traces</span>
                </div>
              </div>
              <div className="executive-chart-shell">
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="executiveArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#6366f1" stopOpacity={0.55} />
                        <stop offset="100%" stopColor="#6366f1" stopOpacity={0.02} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(148, 163, 184, 0.18)" vertical={false} />
                    <XAxis dataKey="label" stroke="var(--text-secondary)" tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="var(--text-secondary)"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${Math.round(Number(value) / 1000000)}M`}
                    />
                    <Tooltip
                      formatter={(value) => [formatCurrency(Number(value || 0)), "Valeur cumulee"]}
                      contentStyle={{
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border-color)",
                        borderRadius: "16px",
                        color: "var(--text-primary)",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="cumulativeValue"
                      stroke="#6366f1"
                      strokeWidth={3}
                      fill="url(#executiveArea)"
                      isAnimationActive
                      animationDuration={1500}
                    />
                  </AreaChart>
                </ResponsiveContainer>
                {metrics.emptyPortfolio && (
                  <div className="executive-inline-empty">
                    <strong>Le graphique s'activera des la premiere acquisition.</strong>
                    <p>Enregistrez votre premier bien pour visualiser la trajectoire patrimoniale.</p>
                  </div>
                )}
              </div>
            </article>

            <article className="asset-card executive-actions-card card">
              <div className="section-header-inline">
                <div>
                  <span className="executive-kicker">Registres</span>
                  <h3>Exports comptables et reporting</h3>
                  <p className="muted-paragraph">
                    Les editions de controle sont disponibles ici avec un rendu natif Excel et un PDF institutionnel.
                  </p>
                </div>
              </div>
              <div className="executive-action-list">
                {exportActions.map((action) => (
                  <button key={action.title} type="button" className="executive-action-card" onClick={action.action}>
                    <div>
                      <strong>{action.title}</strong>
                      <span>{action.subtitle}</span>
                    </div>
                    <span className="executive-action-arrow">Exporter</span>
                  </button>
                ))}
              </div>
            </article>
          </section>

          <section className="executive-secondary-grid">
            {isAdmin && (
              <section className="asset-card executive-activity-card card activity-journal">
                <div className="section-header-inline">
                  <div>
                    <span className="executive-kicker">Tracabilite</span>
                    <h3>Journal d'activite recent</h3>
                    <p className="muted-paragraph">
                      Bloc reserve a l'administration pour l'audit, la supervision et le nettoyage des entrees.
                    </p>
                  </div>
                </div>

                <div className="executive-activity-list">
                  {visibleActivities.length === 0 ? (
                    <div className="executive-inline-empty">
                      <strong>Aucune activite recente exploitable.</strong>
                      <p>Le journal se remplira au fil des operations metier.</p>
                    </div>
                  ) : (
                    visibleActivities.map((activity) => (
                      <div key={String(activity.id)} className="executive-activity-row">
                        <span className={`executive-activity-dot ${String(activity.action || "").toLowerCase()}`}>
                          {String(activity.action || "A").slice(0, 1)}
                        </span>
                        <div className="executive-activity-copy">
                          <strong>
                            {String(activity.action || "ACTION")} sur {String(activity.entite || "element")}
                          </strong>
                          <span>
                            {String(activity.username || "Systeme")} - {formatDateTime(activity.dateAction)}
                          </span>
                        </div>
                        <button
                          type="button"
                          className="btn-export"
                          onClick={() => handleDeleteActivity(Number(activity.id))}
                          aria-label="Supprimer cette entree du journal"
                        >
                          Nettoyer
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </section>
            )}

            <article className="asset-card executive-side-stack card">
              <div className="section-header-inline">
                <div>
                  <span className="executive-kicker">Derniers mouvements</span>
                  <h3>Ajouts patrimoniaux recents</h3>
                  <p className="muted-paragraph">Repere immediat sur les enregistrements les plus recents du registre.</p>
                </div>
              </div>

              <div className="dashboard-mini-list">
                {metrics.recentlyAdded.length === 0 ? (
                  <div className="executive-inline-empty">
                    <strong>Aucun bien encore enregistre.</strong>
                    <p>Enregistrez votre premier bien pour alimenter cette veille operationnelle.</p>
                  </div>
                ) : (
                  metrics.recentlyAdded.map((item) => (
                    <div key={String(item.id)} className="dashboard-mini-row">
                      <div>
                        <strong>{String(item.designation || "Sans designation")}</strong>
                        <span>{String(item.codeSousCategorie || item.iup || "Reference a completer")}</span>
                      </div>
                      <div>
                        <strong>{formatCurrency(Number(item.valeur || 0))}</strong>
                        <span>
                          {item.dateAcquisition
                            ? new Date(String(item.dateAcquisition)).toLocaleDateString("fr-FR")
                            : "Date inconnue"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="executive-status-grid">
                <div className="executive-status-card success">
                  <span>Valeur du stock</span>
                  <strong>{formatCurrency(metrics.totalStockValue)}</strong>
                </div>
                <div className="executive-status-card warning">
                  <span>Risque operationnel</span>
                  <strong>{metrics.criticalCount} point(s)</strong>
                </div>
              </div>
            </article>
          </section>
        </>
      )}
    </div>
  );
};

export default DashboardPage;
