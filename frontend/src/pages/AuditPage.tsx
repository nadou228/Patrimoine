import React, { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Download, Filter, History, RefreshCcw, Search, Shield, ShieldAlert, User, CalendarDays, Database, Trash2 } from "lucide-react";
import { AuditLogDto, exportAuditLogsExcel, getPagedAuditLogs, rollbackAuditAction, hardDeleteAuditAction } from "../api/api";
import { usePermissions } from "../contexts/PermissionsContext";
import { useToast } from "../contexts/ToastContext";

type Filters = {
  action: string;
  utilisateur: string;
  entite: string;
  dateDebut: string;
  dateFin: string;
};

const EMPTY_FILTERS: Filters = {
  action: "",
  utilisateur: "",
  entite: "",
  dateDebut: "",
  dateFin: "",
};

const formatDateTime = (value?: string) => (value ? new Date(value).toLocaleString("fr-FR") : "Date indisponible");
const formatTimeAgo = (value?: string) => {
  if (!value) return "Horodatage indisponible";
  const now = Date.now();
  const deltaMinutes = Math.max(0, Math.round((now - new Date(value).getTime()) / 60000));
  if (deltaMinutes < 1) return "À l'instant";
  if (deltaMinutes < 60) return `Il y a ${deltaMinutes} min`;
  const deltaHours = Math.round(deltaMinutes / 60);
  if (deltaHours < 24) return `Il y a ${deltaHours} h`;
  const deltaDays = Math.round(deltaHours / 24);
  return `Il y a ${deltaDays} j`;
};

const AuditPage: React.FC = () => {
  const { hasPermission, hasAnyRole, loading: permissionsLoading } = usePermissions();
  const { showToast } = useToast();
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(0);
  const [logs, setLogs] = useState<AuditLogDto[]>([]);
  const [totalPages, setTotalPages] = useState(0);
  const [totalElements, setTotalElements] = useState(0);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const canAccess = hasPermission("READ_AUDIT") || hasAnyRole("ADMIN", "SUPERADMIN", "AUDITEUR", "RESPONSABLE_PATRIMOINE");

  const queryParams = useMemo(() => ({
    page,
    size: 10,
    action: filters.action || undefined,
    utilisateur: filters.utilisateur || undefined,
    entite: filters.entite || undefined,
    dateDebut: filters.dateDebut || undefined,
    dateFin: filters.dateFin || undefined,
  }), [filters, page]);

  const loadLogs = async () => {
    setLoading(true);
    try {
      const response = await getPagedAuditLogs(queryParams);
      setLogs(response.content);
      setTotalPages(response.totalPages);
      setTotalElements(response.totalElements);
    } catch (error) {
      showToast({ type: "error", title: "Chargement impossible", message: "Le journal d'audit n'a pas pu être récupéré." });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!permissionsLoading && canAccess) {
      void loadLogs();
    }
  }, [permissionsLoading, canAccess, queryParams]);

  const timelineEvents = useMemo(() => logs.slice(0, 6), [logs]);
  const criticalCount = useMemo(() => logs.filter((log) => (log.action || "").toUpperCase().includes("DELETE")).length, [logs]);

  const updateFilter = (field: keyof Filters, value: string) => {
    setPage(0);
    setFilters((current) => ({ ...current, [field]: value }));
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const blob = await exportAuditLogsExcel({
        action: filters.action || undefined,
        utilisateur: filters.utilisateur || undefined,
        entite: filters.entite || undefined,
        dateDebut: filters.dateDebut || undefined,
        dateFin: filters.dateFin || undefined,
      });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = "journal_audit.xlsx";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast({ type: "success", title: "Export généré", message: "Le journal d'audit a été exporté en Excel." });
    } catch {
      showToast({ type: "error", title: "Export impossible", message: "L'export Excel du journal a échoué." });
    } finally {
      setExporting(false);
    }
  };

  const handleRollback = async (id: number) => {
    if (!window.confirm("Êtes-vous sûr de vouloir annuler cette action (Restauration Time Machine) ?")) return;
    try {
      await rollbackAuditAction(id);
      showToast({ type: "success", title: "Restauration réussie", message: "L'action a été annulée avec succès." });
      void loadLogs();
    } catch {
      showToast({ type: "error", title: "Erreur", message: "La restauration a échoué." });
    }
  };

  const handleHardDelete = async (id: number) => {
    if (!window.confirm("ATTENTION: Êtes-vous sûr de vouloir supprimer définitivement ce bien de la base de données ? Cette action est irréversible !")) return;
    try {
      await hardDeleteAuditAction(id);
      showToast({ type: "success", title: "Suppression définitive", message: "Le bien a été effacé de la base de données." });
      void loadLogs();
    } catch {
      showToast({ type: "error", title: "Erreur", message: "La suppression définitive a échoué." });
    }
  };

  if (!permissionsLoading && !canAccess) {
    return (
      <div className="audit-shell">
        <div className="audit-denied-card">
          <ShieldAlert size={42} />
          <h2>Accès restreint</h2>
          <p>Cette page est réservée aux rôles ADMIN, AUDITEUR et RESPONSABLE_PATRIMOINE.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="audit-shell">
      <div className="audit-background">
        <div className="audit-orb audit-orb-1" />
        <div className="audit-orb audit-orb-2" />
      </div>

      <div className="audit-content">
        <header className="audit-hero">
          <div>
            <span className="audit-kicker"><Shield size={14} /> JOURNAL D'AUDIT</span>
            <h1>Traçabilité institutionnelle</h1>
            <p>Visualisez les actions sensibles, les acteurs impliqués et les signaux de contrôle en un seul espace.</p>
          </div>
          <div className="audit-actions">
            <button className="audit-ghost-btn" onClick={() => { setFilters(EMPTY_FILTERS); setPage(0); }}>
              <Filter size={16} /> Réinitialiser
            </button>
            <button className="audit-primary-btn" onClick={() => void handleExport()} disabled={exporting}>
              <Download size={16} /> {exporting ? "Export..." : "Export Excel"}
            </button>
          </div>
        </header>

        <section className="audit-stats-grid">
          <div className="audit-stat-card">
            <span>Total filtré</span>
            <strong>{totalElements.toLocaleString("fr-FR")}</strong>
          </div>
          <div className="audit-stat-card">
            <span>Suppressions visibles</span>
            <strong>{criticalCount.toLocaleString("fr-FR")}</strong>
          </div>
          <div className="audit-stat-card">
            <span>Page courante</span>
            <strong>{(page + 1).toLocaleString("fr-FR")}</strong>
          </div>
        </section>

        <section className="audit-filter-card">
          <div className="audit-filter-grid">
            <label className="audit-field">
              <span><Search size={14} /> Action</span>
              <input value={filters.action} onChange={(event) => updateFilter("action", event.target.value)} placeholder="CREATE, UPDATE, DELETE..." />
            </label>
            <label className="audit-field">
              <span><User size={14} /> Utilisateur</span>
              <input value={filters.utilisateur} onChange={(event) => updateFilter("utilisateur", event.target.value)} placeholder="login ou nom..." />
            </label>
            <label className="audit-field">
              <span><Database size={14} /> Entité</span>
              <input value={filters.entite} onChange={(event) => updateFilter("entite", event.target.value)} placeholder="Bien, Utilisateur..." />
            </label>
            <label className="audit-field">
              <span><CalendarDays size={14} /> Date début</span>
              <input type="date" value={filters.dateDebut} onChange={(event) => updateFilter("dateDebut", event.target.value)} />
            </label>
            <label className="audit-field">
              <span><CalendarDays size={14} /> Date fin</span>
              <input type="date" value={filters.dateFin} onChange={(event) => updateFilter("dateFin", event.target.value)} />
            </label>
            <button className="audit-refresh-btn" onClick={() => void loadLogs()} disabled={loading}>
              <RefreshCcw size={16} /> Actualiser
            </button>
          </div>
        </section>

        <div className="audit-grid">
          <section className="audit-table-card">
            <div className="audit-section-head">
              <div>
                <h2>Journal paginé</h2>
                <p>Actions filtrables par utilisateur, date, entité et nature d'opération.</p>
              </div>
            </div>

            <div className="audit-table-wrap">
              <table className="audit-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Action</th>
                    <th>Entité</th>
                    <th>Utilisateur</th>
                    <th>IP</th>
                    <th>Détails</th>
                    <th>Actions (Time Machine)</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={6} className="audit-empty-cell">Chargement du journal...</td>
                    </tr>
                  ) : logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="audit-empty-cell">Aucun événement ne correspond aux filtres actuels.</td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id}>
                        <td>{formatDateTime(log.dateAction)}</td>
                        <td><span className={`audit-badge ${String(log.action || "").toLowerCase()}`}>{log.action || "N/A"}</span></td>
                        <td>
                          <strong>{log.entite || "N/A"}</strong>
                          <div className="audit-subline">ID: {log.entiteId ?? "N/A"}</div>
                        </td>
                        <td>
                          <strong>{log.utilisateurLogin || log.username || "system"}</strong>
                          <div className="audit-subline">{log.utilisateurNom || "Nom non renseigné"}</div>
                        </td>
                        <td>{log.ipAdresse || "N/A"}</td>
                        <td className="audit-details-cell">
                          {log.details || log.detail || "Aucun détail"}
                          {log.action === "BIEN_MODIFIE" && log.ancienneValeur && log.nouvelleValeur && (
                            <div className="audit-diff">
                              <div className="audit-diff-old"><strong>Avant:</strong> {log.ancienneValeur}</div>
                              <div className="audit-diff-new"><strong>Après:</strong> {log.nouvelleValeur}</div>
                            </div>
                          )}
                        </td>
                        <td>
                          {log.action === "BIEN_ARCHIVE" && (
                            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                              <button className="audit-action-btn restore" onClick={() => void handleRollback(log.id)}>
                                <RefreshCcw size={14} /> Restaurer
                              </button>
                              <button className="audit-action-btn delete-hard" onClick={() => void handleHardDelete(log.id)}>
                                <Trash2 size={14} /> Vider
                              </button>
                            </div>
                          )}
                          {log.action === "BIEN_MODIFIE" && (
                            <button className="audit-action-btn undo" onClick={() => void handleRollback(log.id)}>
                              <History size={14} /> Annuler
                            </button>
                          )}
                          {(log.action?.endsWith("_RESTORED") || log.action === "BIEN_SUPPRIME_DEFINITIVEMENT") && (
                            <span className="audit-badge restored">
                                {log.action === "BIEN_SUPPRIME_DEFINITIVEMENT" ? "Effacé" : "Annulé"}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="audit-pagination">
              <button onClick={() => setPage((current) => Math.max(0, current - 1))} disabled={page === 0 || loading}>Précédent</button>
              <span>Page {page + 1} / {Math.max(totalPages, 1)}</span>
              <button onClick={() => setPage((current) => (current + 1 < totalPages ? current + 1 : current))} disabled={loading || totalPages === 0 || page + 1 >= totalPages}>Suivant</button>
            </div>
          </section>

          <aside className="audit-timeline-card">
            <div className="audit-section-head">
              <div>
                <h2>Timeline récente</h2>
                <p>Derniers événements visibles avec repère temporel rapide.</p>
              </div>
            </div>
            <div className="audit-timeline">
              {timelineEvents.length === 0 ? (
                <div className="audit-empty-timeline">
                  <History size={30} />
                  <p>La timeline se remplira dès que des événements seront chargés.</p>
                </div>
              ) : (
                timelineEvents.map((log, index) => (
                  <motion.div
                    key={log.id}
                    initial={{ opacity: 0, x: 12 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.05 }}
                    className="audit-timeline-item"
                  >
                    <div className="audit-timeline-dot" />
                    <div className="audit-timeline-body">
                      <strong>{log.action || "ACTION"}</strong>
                      <span>{log.utilisateurNom || log.utilisateurLogin || log.username || "Système"}</span>
                      <p>{log.entite || "Entité"} #{log.entiteId ?? "-"}</p>
                      <time>{formatTimeAgo(log.dateAction)}</time>
                    </div>
                  </motion.div>
                ))
              )}
            </div>
          </aside>
        </div>
      </div>

      <style>{`
        .audit-shell {
          min-height: 100vh;
          background: linear-gradient(180deg, #f5f7fb 0%, #eef4ff 100%);
          position: relative;
          overflow: hidden;
        }

        .audit-background {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }

        .audit-orb {
          position: absolute;
          border-radius: 999px;
          filter: blur(90px);
          opacity: 0.25;
        }

        .audit-orb-1 {
          width: 320px;
          height: 320px;
          background: #0ea5e9;
          top: -80px;
          right: 8%;
        }

        .audit-orb-2 {
          width: 260px;
          height: 260px;
          background: #4f46e5;
          bottom: -40px;
          left: 4%;
        }

        .audit-content {
          position: relative;
          z-index: 1;
          padding: 32px;
        }

        .audit-hero,
        .audit-filter-card,
        .audit-table-card,
        .audit-timeline-card,
        .audit-stat-card {
          background: rgba(255, 255, 255, 0.82);
          backdrop-filter: blur(16px);
          border: 1px solid rgba(148, 163, 184, 0.18);
          box-shadow: 0 20px 40px rgba(15, 23, 42, 0.05);
        }

        .audit-hero {
          border-radius: 28px;
          padding: 28px;
          display: flex;
          justify-content: space-between;
          gap: 24px;
          margin-bottom: 24px;
        }

        .audit-kicker {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 8px 14px;
          border-radius: 999px;
          background: rgba(79, 70, 229, 0.08);
          color: #4338ca;
          font-size: 11px;
          font-weight: 800;
          letter-spacing: 0.08em;
        }

        .audit-hero h1 {
          margin: 14px 0 8px;
          font-size: 2.6rem;
          line-height: 1;
          color: #0f172a;
        }

        .audit-hero p {
          margin: 0;
          max-width: 760px;
          color: #475569;
          font-size: 1.02rem;
        }

        .audit-actions {
          display: flex;
          align-items: flex-start;
          gap: 12px;
        }

        .audit-primary-btn,
        .audit-ghost-btn,
        .audit-refresh-btn,
        .audit-pagination button {
          border: none;
          border-radius: 16px;
          padding: 12px 16px;
          font-weight: 700;
          display: inline-flex;
          align-items: center;
          gap: 8px;
          cursor: pointer;
        }

        .audit-primary-btn {
          background: linear-gradient(135deg, #1d4ed8, #4f46e5);
          color: white;
        }

        .audit-ghost-btn,
        .audit-refresh-btn,
        .audit-pagination button {
          background: white;
          color: #334155;
          border: 1px solid #dbe4f0;
        }

        .audit-stats-grid {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 18px;
          margin-bottom: 24px;
        }

        .audit-stat-card {
          border-radius: 22px;
          padding: 22px;
        }

        .audit-stat-card span {
          display: block;
          color: #64748b;
          font-size: 0.92rem;
          margin-bottom: 10px;
        }

        .audit-stat-card strong {
          font-size: 2rem;
          color: #0f172a;
        }

        .audit-filter-card,
        .audit-table-card,
        .audit-timeline-card,
        .audit-denied-card {
          border-radius: 24px;
          padding: 24px;
        }

        .audit-filter-card {
          margin-bottom: 24px;
        }

        .audit-filter-grid {
          display: grid;
          grid-template-columns: repeat(6, minmax(0, 1fr));
          gap: 14px;
          align-items: end;
        }

        .audit-field {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .audit-field span {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 0.85rem;
          color: #475569;
          font-weight: 700;
        }

        .audit-field input {
          height: 46px;
          border-radius: 14px;
          border: 1px solid #d8e1ec;
          background: white;
          padding: 0 14px;
          font-size: 0.95rem;
        }

        .audit-grid {
          display: grid;
          grid-template-columns: 1.7fr 0.9fr;
          gap: 24px;
        }

        .audit-section-head {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 18px;
        }

        .audit-section-head h2 {
          margin: 0 0 4px;
          font-size: 1.25rem;
          color: #0f172a;
        }

        .audit-section-head p {
          margin: 0;
          color: #64748b;
          font-size: 0.92rem;
        }

        .audit-table-wrap {
          overflow: auto;
        }

        .audit-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 860px;
        }

        .audit-table th,
        .audit-table td {
          text-align: left;
          padding: 14px 12px;
          border-bottom: 1px solid #edf2f7;
          vertical-align: top;
        }

        .audit-table th {
          color: #64748b;
          font-size: 0.82rem;
          font-weight: 800;
          text-transform: uppercase;
          letter-spacing: 0.06em;
        }

        .audit-subline {
          margin-top: 5px;
          color: #64748b;
          font-size: 0.82rem;
        }

        .audit-details-cell {
          min-width: 280px;
          color: #334155;
          font-size: 0.9rem;
          word-break: break-word;
        }

        .audit-badge {
          display: inline-flex;
          align-items: center;
          padding: 6px 10px;
          border-radius: 999px;
          font-size: 0.76rem;
          font-weight: 800;
          background: #e2e8f0;
          color: #334155;
        }

        .audit-badge.create { background: rgba(34, 197, 94, 0.12); color: #15803d; }
        .audit-badge.update { background: rgba(59, 130, 246, 0.12); color: #1d4ed8; }
        .audit-badge.delete { background: rgba(239, 68, 68, 0.12); color: #b91c1c; }
        .audit-badge.restored { background: #e2e8f0; color: #64748b; text-decoration: line-through; }

        .audit-action-btn {
          border: none;
          padding: 6px 12px;
          border-radius: 8px;
          font-size: 0.8rem;
          font-weight: 700;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 6px;
          transition: all 0.2s;
        }

        .audit-action-btn.restore {
          background: rgba(16, 185, 129, 0.1);
          color: #059669;
        }
        .audit-action-btn.restore:hover {
          background: #10b981;
          color: white;
        }

        .audit-action-btn.undo {
          background: rgba(245, 158, 11, 0.1);
          color: #d97706;
        }
        .audit-action-btn.undo:hover {
          background: #f59e0b;
          color: white;
        }

        .audit-action-btn.delete-hard {
          background: rgba(239, 68, 68, 0.1);
          color: #dc2626;
        }
        .audit-action-btn.delete-hard:hover {
          background: #ef4444;
          color: white;
        }

        .audit-diff {
          margin-top: 8px;
          font-size: 0.8rem;
          background: #f8fafc;
          border-radius: 6px;
          padding: 8px;
          border: 1px solid #e2e8f0;
        }
        .audit-diff-old { color: #dc2626; margin-bottom: 4px; }
        .audit-diff-new { color: #16a34a; }

        .audit-empty-cell,
        .audit-empty-timeline {
          text-align: center;
          color: #64748b;
          padding: 28px 12px;
        }

        .audit-pagination {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-top: 18px;
          gap: 12px;
        }

        .audit-timeline {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .audit-timeline-item {
          display: flex;
          gap: 14px;
          padding: 14px;
          border-radius: 18px;
          background: linear-gradient(180deg, rgba(248, 250, 252, 0.95), rgba(241, 245, 249, 0.9));
          border: 1px solid rgba(148, 163, 184, 0.16);
        }

        .audit-timeline-dot {
          width: 12px;
          height: 12px;
          border-radius: 999px;
          background: linear-gradient(135deg, #4f46e5, #06b6d4);
          margin-top: 8px;
          flex-shrink: 0;
        }

        .audit-timeline-body strong {
          display: block;
          color: #0f172a;
        }

        .audit-timeline-body span,
        .audit-timeline-body p,
        .audit-timeline-body time {
          display: block;
          margin-top: 4px;
          color: #64748b;
          font-size: 0.88rem;
        }

        .audit-denied-card {
          max-width: 560px;
          margin: 120px auto;
          text-align: center;
          color: #334155;
        }

        @media (max-width: 1200px) {
          .audit-filter-grid {
            grid-template-columns: repeat(3, minmax(0, 1fr));
          }

          .audit-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 900px) {
          .audit-content {
            padding: 20px;
          }

          .audit-hero,
          .audit-stats-grid {
            grid-template-columns: 1fr;
            display: grid;
          }

          .audit-hero {
            gap: 18px;
          }

          .audit-actions {
            flex-wrap: wrap;
          }

          .audit-filter-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default AuditPage;
