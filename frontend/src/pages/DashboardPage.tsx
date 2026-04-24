import React, { useEffect, useMemo, useState } from "react";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { deleteAuditLog, getAuditLogs, getBiens, getStocks, getUsers } from "../api/api";
import { getCurrentUser } from "../api/auth";
import { exportGrandLivrePremiumExcel, exportLivreJournalPremiumExcel, exportPdf } from "../utils/exporters";

type DashboardMetric = {
  label: string;
  value: string;
  tone: "neutral" | "success" | "warning" | "danger";
  status: string;
  detail: string;
};

const currency = (value: number) =>
  `${Math.round(value).toLocaleString("fr-FR")} FCFA`;

const dayLabel = (value?: string) => {
  if (!value) return "Non planifie";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Date invalide" : date.toLocaleDateString("fr-FR");
};

const DashboardPage: React.FC = () => {
  const [biens, setBiens] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const currentUser = getCurrentUser();

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        const [biensData, usersData, stocksData, auditData] = await Promise.all([
          getBiens().catch(() => []),
          getUsers().catch(() => []),
          getStocks().catch(() => []),
          getAuditLogs().catch(() => []),
        ]);

        setBiens(biensData || []);
        setUsers(usersData || []);
        setStocks(stocksData || []);
        setActivities((auditData || []).reverse());
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const addDays = (days: number) => {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  };

  const isSoon = (value?: string, days = 30) => {
    if (!value) return false;
    const date = new Date(value);
    return !Number.isNaN(date.getTime()) && date <= addDays(days);
  };

  const metrics = useMemo(() => {
    const totalValue = biens.reduce((sum, bien) => sum + Number(bien.valeur || 0), 0);
    const totalStockValue = stocks.reduce(
      (sum, stock) =>
        sum +
        Number(stock.quantite || 0) *
          Number(stock.prixUnitaireMoyen || stock.consommable?.prixMoyenPondere || 0),
      0
    );
    const maintenanceAlerts = biens.filter((bien) => isSoon(bien.dateProchaineMaintenance, 30)).length;
    const visiteAlerts = biens.filter((bien) => isSoon(bien.dateProchaineVisiteTechnique, 30)).length;
    const lowStock = stocks.filter(
      (stock) =>
        Number(stock.quantite || 0) <= Number(stock.seuilAlerte || stock.consommable?.seuilAlerte || 0)
    ).length;
    const criticalCount = maintenanceAlerts + visiteAlerts + lowStock;
    const recentlyAdded = [...biens]
      .filter((bien) => bien.dateAcquisition)
      .sort((a, b) => String(b.dateAcquisition).localeCompare(String(a.dateAcquisition)))
      .slice(0, 5);
    const emptyPortfolio = biens.length === 0 && stocks.length === 0;

    return {
      totalValue,
      totalStockValue,
      maintenanceAlerts,
      visiteAlerts,
      lowStock,
      criticalCount,
      recentlyAdded,
      emptyPortfolio,
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
        count: 0,
      };
    });

    biens.forEach((bien) => {
      if (!bien.dateAcquisition) return;
      const date = new Date(bien.dateAcquisition);
      if (Number.isNaN(date.getTime())) return;

      const key = `${date.getFullYear()}-${date.getMonth()}`;
      const target = months.find((month) => month.key === key);
      if (!target) return;

      target.value += Number(bien.valeur || 0);
      target.count += 1;
    });

    let cumulative = 0;
    return months.map((month) => {
      cumulative += month.value;
      return {
        label: month.label,
        cumulativeValue: Math.round(cumulative),
        acquisitions: month.count,
      };
    });
  }, [biens]);

  const metricsCards: DashboardMetric[] = useMemo(
    () => [
      {
        label: "Valeur patrimoine",
        value: metrics.totalValue > 0 ? currency(metrics.totalValue) : "Portefeuille vide",
        tone: metrics.totalValue > 0 ? "success" : "neutral",
        status: metrics.totalValue > 0 ? `${biens.length} biens capitalises` : "Aucun bien enregistre",
        detail:
          metrics.totalValue > 0
            ? "Lecture executive de la valeur brute consolidee."
            : "Enregistrez votre premier bien pour initialiser la trajectoire patrimoniale.",
      },
      {
        label: "Stocks sous controle",
        value: stocks.length > 0 ? `${stocks.length} lignes actives` : "Aucun stock suivi",
        tone: metrics.lowStock > 0 ? "warning" : "neutral",
        status:
          metrics.lowStock > 0 ? `${metrics.lowStock} alerte${metrics.lowStock > 1 ? "s" : ""}` : "Aucune tension critique",
        detail:
          metrics.lowStock > 0
            ? "Certains seuils de reapprovisionnement sont deja atteints."
            : "Le magasin reste stable sur les seuils parametres.",
      },
      {
        label: "Maintenance & visites",
        value:
          metrics.maintenanceAlerts + metrics.visiteAlerts > 0
            ? `${metrics.maintenanceAlerts + metrics.visiteAlerts} echeances`
            : "Aucune echeance proche",
        tone: metrics.maintenanceAlerts + metrics.visiteAlerts > 0 ? "warning" : "success",
        status:
          metrics.maintenanceAlerts > 0
            ? `${metrics.maintenanceAlerts} maintenances a planifier`
            : "Calendrier stable sur 30 jours",
        detail:
          metrics.visiteAlerts > 0
            ? `${metrics.visiteAlerts} visites techniques approchent.`
            : "Aucun incident de conformite detecte a court terme.",
      },
      {
        label: "Traction applicative",
        value: users.length > 0 ? `${users.length} utilisateurs` : "Aucun utilisateur charge",
        tone: activities.length > 0 ? "success" : "neutral",
        status:
          activities.length > 0
            ? `${Math.min(activities.length, 20)} evenements recents exploites`
            : "Pas encore d'historique d'activite",
        detail:
          activities.length > 0
            ? "Le journal remonte les actions recentes du dispositif."
            : "Le journal s'alimentera des prochaines operations metier.",
      },
    ],
    [activities.length, biens.length, metrics.lowStock, metrics.maintenanceAlerts, metrics.totalValue, metrics.visiteAlerts, stocks.length, users.length]
  );

  const executiveAlerts = useMemo(() => {
    const alerts = [];
    if (metrics.maintenanceAlerts > 0) {
      alerts.push({
        tone: "warning",
        title: "Maintenance a engager",
        detail: `${metrics.maintenanceAlerts} bien${metrics.maintenanceAlerts > 1 ? "s" : ""} demandent une action sous 30 jours.`,
      });
    }
    if (metrics.visiteAlerts > 0) {
      alerts.push({
        tone: "danger",
        title: "Visites techniques proches",
        detail: `${metrics.visiteAlerts} controle${metrics.visiteAlerts > 1 ? "s" : ""} technique${metrics.visiteAlerts > 1 ? "s" : ""} approchent.`,
      });
    }
    if (metrics.lowStock > 0) {
      alerts.push({
        tone: "warning",
        title: "Stocks a reapprovisionner",
        detail: `${metrics.lowStock} ligne${metrics.lowStock > 1 ? "s" : ""} sont au seuil d'alerte.`,
      });
    }
    if (alerts.length === 0) {
      alerts.push({
        tone: "success",
        title: metrics.emptyPortfolio ? "Cockpit pret a etre initialise" : "Aucune alerte critique aujourd'hui",
        detail: metrics.emptyPortfolio
          ? "Commencez par enregistrer votre premier bien ou initialiser votre stock pour alimenter les indicateurs."
          : "Les principaux signaux de risque sont sous controle sur la periode.",
      });
    }
    return alerts;
  }, [metrics.emptyPortfolio, metrics.lowStock, metrics.maintenanceAlerts, metrics.visiteAlerts]);

  const exportActions = useMemo(
    () => [
      {
        title: "Livre journal",
        subtitle: "Chronologie des ecritures et mouvements patrimoniaux.",
        action: () => exportLivreJournalPremiumExcel(biens, "livre_journal_premium.xlsx", currentUser),
      },
      {
        title: "Grand livre",
        subtitle: "Lecture par compte pour audit et verification comptable.",
        action: () => exportGrandLivrePremiumExcel(biens, "grand_livre_premium.xlsx", currentUser),
      },
      {
        title: "Rapport PDF",
        subtitle: "Synthese executive pour diffusion et arbitrage.",
        action: () =>
          exportPdf(
            biens.map((bien) => ({
              IUP: bien.iup,
              Code: bien.codeSousCategorie || bien.codeBien,
              Designation: bien.designation,
              Categorie: bien.categoriePrincipale || bien.categorie,
              Valeur: Number(bien.valeur || 0).toLocaleString("fr-FR"),
              Service: bien.service || "",
              Maintenance: bien.dateProchaineMaintenance || "",
            })),
            "Rapport executif patrimoine",
            "rapport_executif.pdf",
            currentUser,
            [
              { label: "Valeur patrimoine", value: currency(metrics.totalValue) },
              { label: "Valeur stock", value: currency(metrics.totalStockValue) },
              { label: "Alertes", value: String(metrics.criticalCount) },
            ]
          ),
      },
    ],
    [biens, currentUser, metrics.criticalCount, metrics.totalStockValue, metrics.totalValue]
  );

  const visibleActivities = useMemo(
    () =>
      activities
        .filter((activity) => !currentUser?.username || activity.username === currentUser.username || currentUser.role === "ADMIN")
        .slice(0, 8),
    [activities, currentUser]
  );

  const handleDeleteActivity = async (id: number) => {
    if (!window.confirm("Supprimer cette activite du journal ?")) return;
    await deleteAuditLog(id);
    setActivities((previous) => previous.filter((activity) => activity.id !== id));
  };

  return (
    <div className="dashboard-module dashboard-executive fade-in">
      <header className="page-header-premium dashboard-header-executive">
        <div className="header-meta">
          <span className="badge-pill-glow">Pilotage patrimoine & comptabilite matiere</span>
          <h1>Tableau de bord executif</h1>
          <p className="header-subtitle">
            Priorisation des risques, trajectoire de valeur et trace des operations recentes.
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
          <strong>{currentUser?.nom || "Session active"}</strong>
        </div>
      </header>

      {loading ? (
        <div className="empty-state-modern">Chargement du cockpit patrimoine...</div>
      ) : (
        <>
          <section className="executive-alert-banner">
            <div>
              <span className="executive-kicker">Point de vigilance</span>
              <h2>Vue immediate sur ce qui merite une decision.</h2>
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
            {metricsCards.map((metric) => (
              <article key={metric.label} className={`executive-kpi-card ${metric.tone}`}>
                <div className="executive-kpi-head">
                  <span className="executive-kpi-label">{metric.label}</span>
                  <span className={`executive-kpi-badge ${metric.tone}`}>{metric.status}</span>
                </div>
                <strong className="executive-kpi-value">{metric.value}</strong>
                <p>{metric.detail}</p>
              </article>
            ))}
          </section>

          <section className="executive-main-grid">
            <article className="asset-card executive-chart-card">
              <div className="section-header-inline">
                <div>
                  <span className="executive-kicker">Tendance</span>
                  <h3>Evolution de la valeur du patrimoine</h3>
                  <p className="muted-paragraph">
                    Cumul des acquisitions visibles sur les six derniers mois.
                  </p>
                </div>
                <div className="executive-chart-summary">
                  <strong>{currency(metrics.totalValue)}</strong>
                  <span>{biens.length} biens traces</span>
                </div>
              </div>
              <div className="executive-chart-shell">
                <ResponsiveContainer width="100%" height={320}>
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="executiveArea" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#3dd9b8" stopOpacity={0.65} />
                        <stop offset="100%" stopColor="#3dd9b8" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="rgba(148, 163, 184, 0.18)" vertical={false} />
                    <XAxis dataKey="label" stroke="#94a3b8" tickLine={false} axisLine={false} />
                    <YAxis
                      stroke="#94a3b8"
                      tickLine={false}
                      axisLine={false}
                      tickFormatter={(value) => `${Math.round(Number(value) / 1000000)}M`}
                    />
                    <Tooltip
                      formatter={(value: number, name: string) =>
                        name === "cumulativeValue"
                          ? [currency(value), "Valeur cumulee"]
                          : [String(value), "Acquisitions"]
                      }
                      contentStyle={{
                        background: "rgba(9, 14, 28, 0.95)",
                        border: "1px solid rgba(148, 163, 184, 0.2)",
                        borderRadius: "16px",
                        color: "#f8fafc",
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="cumulativeValue"
                      stroke="#3dd9b8"
                      strokeWidth={3}
                      fill="url(#executiveArea)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
                {metrics.emptyPortfolio && (
                  <div className="executive-inline-empty">
                    <strong>Le graphe s'activera des la premiere acquisition.</strong>
                    <p>Enregistrez votre premier bien pour visualiser la trajectoire patrimoniale.</p>
                  </div>
                )}
              </div>
            </article>

            <article className="asset-card executive-actions-card">
              <div className="section-header-inline">
                <div>
                  <span className="executive-kicker">Registres</span>
                  <h3>Exports comptables et reporting</h3>
                  <p className="muted-paragraph">
                    Les editions de controle sont disponibles ici, au bon endroit du parcours.
                  </p>
                </div>
              </div>
              <div className="executive-action-list">
                {exportActions.map((action) => (
                  <button key={action.title} className="executive-action-card" onClick={action.action}>
                    <div>
                      <strong>{action.title}</strong>
                      <span>{action.subtitle}</span>
                    </div>
                    <span className="executive-action-arrow">Ouvrir</span>
                  </button>
                ))}
              </div>
            </article>
          </section>

          <section className="executive-secondary-grid">
            <article className="asset-card executive-activity-card">
              <div className="section-header-inline">
                <div>
                  <span className="executive-kicker">Traçabilite</span>
                  <h3>Journal d'activite recent</h3>
                  <p className="muted-paragraph">
                    Qui a fait quoi, et quand. Ce bloc remonte volontairement dans la zone de lecture principale.
                  </p>
                </div>
              </div>

              <div className="executive-activity-list">
                {visibleActivities.length === 0 ? (
                  <div className="executive-inline-empty">
                    <strong>Aucune activite recente exploitable.</strong>
                    <p>Le journal apparaitra ici au fil des operations metier.</p>
                  </div>
                ) : (
                  visibleActivities.map((activity) => (
                    <div key={activity.id} className="executive-activity-row">
                      <span className={`executive-activity-dot ${(activity.action || "").toLowerCase()}`}>
                        {(activity.action || "A").slice(0, 1)}
                      </span>
                      <div className="executive-activity-copy">
                        <strong>
                          {activity.action || "ACTION"} sur {activity.entite || "element"}
                        </strong>
                        <span>
                          {activity.username || "Systeme"} ·{" "}
                          {activity.dateAction
                            ? new Date(activity.dateAction).toLocaleString("fr-FR")
                            : "Date inconnue"}
                        </span>
                      </div>
                      {currentUser?.role === "ADMIN" && (
                        <button className="btn-export" onClick={() => handleDeleteActivity(activity.id)}>
                          Nettoyer
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </article>

            <article className="asset-card executive-side-stack">
              <div className="section-header-inline">
                <div>
                  <span className="executive-kicker">Derniers mouvements</span>
                  <h3>Ajouts patrimoniaux les plus recents</h3>
                  <p className="muted-paragraph">
                    Repere immediat sur les entrees les plus recentes du registre.
                  </p>
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
                    <div key={item.id} className="dashboard-mini-row">
                      <div>
                        <strong>{item.designation}</strong>
                        <span>{item.codeSousCategorie || item.iup || "Reference a completer"}</span>
                      </div>
                      <div>
                        <strong>{currency(Number(item.valeur || 0))}</strong>
                        <span>{dayLabel(item.dateAcquisition)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>

              <div className="executive-status-grid">
                <div className="executive-status-card success">
                  <span>Valeur du stock</span>
                  <strong>{currency(metrics.totalStockValue)}</strong>
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
