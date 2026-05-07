import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { annulerReforme, createReforme, getReformes, validerReforme } from "../api/api";
import { Bien, updateBien, updateBienStatus } from "../api/biens";
import BienSelector from "../components/BienSelector";
import FileUpload from "../components/FileUpload";
import { useToast } from "../contexts/ToastContext";
import AnimatedNumber from "../components/AnimatedNumber";
import {
  Archive, History, PlusCircle, CheckCircle2,
  Download, XCircle, FileMinus, Info
} from "lucide-react";
type TypeReforme = "MISE_AU_REBUT" | "VENTE_CESSION" | "TRANSFERT_INTER_MINISTERE" | "DON" | "PERTE_SINISTRE";
type StatutValidation = "EN_ATTENTE_VALIDATION" | "EN_ATTENTE" | "VALIDE" | "VALIDÉ" | "ANNULE" | "ANNULÉ";

type Reforme = {
  id: number;
  bien?: Bien | null;
  dateSortie?: string;
  dateReforme?: string;
  typeReforme?: TypeReforme | string;
  motif?: string;
  valeurResiduelle?: number;
  prixCession?: number;
  acheteur?: string;
  referenceActe?: string;
  ministereDestinataire?: string;
  ordreTransfert?: string;
  statutValidation?: StatutValidation;
  statut?: string;
  agent?: string;
};

type ReformeForm = {
  bien: Bien | null;
  typeReforme: TypeReforme;
  dateSortie: string;
  motif: string;
  valeurResiduelle: number;
  prixCession: number;
  acheteur: string;
  referenceActe: string;
  ministereDestinataire: string;
  ordreTransfert: string;
  justificatifs: string[];
};

type FormErrors = Partial<Record<keyof ReformeForm, string>>;

const today = new Date().toISOString().slice(0, 10);

const EMPTY_FORM: ReformeForm = {
  bien: null,
  typeReforme: "MISE_AU_REBUT",
  dateSortie: today,
  motif: "",
  valeurResiduelle: 0,
  prixCession: 0,
  acheteur: "",
  referenceActe: "",
  ministereDestinataire: "",
  ordreTransfert: "",
  justificatifs: [],
};

const asReformes = (value: unknown): Reforme[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Reforme => typeof item === "object" && item !== null && "id" in item);
};

const formatMoney = (value?: number) => `${Math.round(value || 0).toLocaleString("fr-FR")} FCFA`;

const normalizeReformeStatus = (item: Reforme) => {
  const raw = item.statutValidation || item.statut || "EN_ATTENTE_VALIDATION";
  if (raw === "VALIDÃ‰" || raw === "VALIDE") return "VALIDE";
  if (raw === "ANNULÃ‰" || raw === "ANNULE" || raw === "ANNULEE") return "ANNULEE";
  if (raw === "EN_ATTENTE") return "EN_ATTENTE_VALIDATION";
  return raw;
};

const yearsOfService = (date?: string) => {
  if (!date) return 0;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return 0;
  return Math.max(0, Math.floor((Date.now() - parsed.getTime()) / (1000 * 60 * 60 * 24 * 365.25)));
};

function ErrorText({ message }: { message?: string }) {
  return message ? <span className="field-error">{message}</span> : null;
}

export default function ReformePage() {
  const location = useLocation();
  const { showToast } = useToast();
  const [view, setView] = useState<"LIST" | "FORM">("LIST");
  const [data, setData] = useState<Reforme[]>([]);
  const [form, setForm] = useState<ReformeForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState("TOUS");
  const [period, setPeriod] = useState({ from: "", to: "" });

  const loadData = async () => {
    const response = await getReformes().catch(() => []);
    setData(asReformes(response));
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    const state = location.state as { prefillBien?: Bien } | null;
    if (!state?.prefillBien) return;
    setView("FORM");
    setForm((current) => ({ ...current, bien: state.prefillBien || null }));
    showToast({
      type: "info",
      title: "Bien preselectionne",
      message: `${state.prefillBien.designation} a ete injecte depuis la galerie des biens.`,
    });
  }, [location.state]);

  const filtered = useMemo(() => {
    return data.filter((item) => {
      const date = item.dateSortie || item.dateReforme || "";
      const typeOk = filterType === "TOUS" || item.typeReforme === filterType;
      const fromOk = !period.from || date >= period.from;
      const toOk = !period.to || date <= period.to;
      return typeOk && fromOk && toOk;
    });
  }, [data, filterType, period]);

  const updateForm = <K extends keyof ReformeForm>(key: K, value: ReformeForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validate = () => {
    const nextErrors: FormErrors = {};
    if (!form.bien?.id) nextErrors.bien = "Selectionnez le bien a reformer.";
    if (!form.dateSortie) nextErrors.dateSortie = "La date de sortie est obligatoire.";
    if (form.dateSortie && form.bien?.dateAcquisition && form.dateSortie < form.bien.dateAcquisition) {
      nextErrors.dateSortie = "La date de sortie ne peut pas preceder la date d'acquisition.";
    }
    if (form.motif.trim().length < 50) nextErrors.motif = "Le motif doit contenir au moins 50 caracteres.";
    if (form.justificatifs.length === 0) nextErrors.justificatifs = "Au moins une piece justificative est obligatoire.";
    if (form.valeurResiduelle < 0) nextErrors.valeurResiduelle = "La valeur residuelle ne peut pas etre negative.";
    if (form.typeReforme === "MISE_AU_REBUT" && form.valeurResiduelle !== 0) {
      nextErrors.valeurResiduelle = "La valeur residuelle doit etre egale a 0 pour une mise au rebut.";
    }
    if (form.typeReforme === "VENTE_CESSION" && (!form.prixCession || !form.acheteur.trim() || !form.referenceActe.trim())) {
      nextErrors.prixCession = "Prix, acheteur et reference acte sont obligatoires pour une vente.";
    }
    if (form.typeReforme === "TRANSFERT_INTER_MINISTERE" && (!form.ministereDestinataire.trim() || !form.ordreTransfert.trim())) {
      nextErrors.ministereDestinataire = "Ministere destinataire et ordre de transfert obligatoires.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate() || !form.bien?.id) return;

    try {
      setSaving(true);
      await createReforme({
        bien: { id: form.bien.id },
        bienId: form.bien.id,
        typeReforme: form.typeReforme,
        dateSortie: form.dateSortie,
        dateReforme: form.dateSortie,
        motif: form.motif,
        valeurResiduelle: form.valeurResiduelle,
        prixCession: form.prixCession,
        acheteur: form.acheteur,
        referenceActe: form.referenceActe,
        ministereDestinataire: form.ministereDestinataire,
        ordreTransfert: form.ordreTransfert,
        justificatifs: form.justificatifs,
        rapportTechniqueUrl: form.justificatifs[0],
        statutValidation: "EN_ATTENTE_VALIDATION",
        statut: "EN_ATTENTE_VALIDATION",
      });
      await loadData();
      setForm(EMPTY_FORM);
      setView("LIST");
      showToast({ type: "success", title: "Procedure de reforme soumise" });
    } catch (error) {
      showToast({ type: "error", title: "Soumission impossible", message: error instanceof Error ? error.message : "Erreur API" });
    } finally {
      setSaving(false);
    }
  };

  const validateReforme = async (item: Reforme) => {
    try {
      setActionLoadingId(item.id);
      await validerReforme(item.id).catch(() => null);
      if (item.bien?.id) {
        await updateBienStatus(item.bien.id, { statutOperationnel: "REFORME", service: item.bien.service || "" }).catch(() => null);
        await updateBien(item.bien.id, { archived: true, statutOperationnel: "REFORME" }).catch(() => null);
      }
      await loadData();
      showToast({ type: "success", title: "Reforme validee", message: "Le bien est archive et sort de la galerie active." });
    } finally {
      setActionLoadingId(null);
    }
  };

  const cancelReforme = async (item: Reforme) => {
    try {
      setActionLoadingId(item.id);
      await annulerReforme(item.id).catch(() => null);
      if (item.bien?.id) {
        await updateBien(item.bien.id, { archived: false, statutOperationnel: "ACTIF" }).catch(() => null);
      }
      await loadData();
      showToast({ type: "success", title: "Reforme annulee" });
    } finally {
      setActionLoadingId(null);
    }
  };

  const exportCsv = () => {
    const rows = filtered.map((item) => [
      item.bien?.iup || "",
      item.bien?.designation || "",
      item.typeReforme || "",
      item.dateSortie || item.dateReforme || "",
      item.valeurResiduelle || 0,
      item.statutValidation || "",
      item.agent || "",
    ]);
    const csv = [["IUP", "Designation", "Type", "Date sortie", "Valeur residuelle", "Statut", "Agent"], ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "reformes.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  const stats = useMemo(() => {
    const total = data.length;
    const pending = data.filter(d => normalizeReformeStatus(d) === "EN_ATTENTE_VALIDATION").length;
    const validated = data.filter(d => normalizeReformeStatus(d) === "VALIDE").length;
    const canceled = data.filter(d => normalizeReformeStatus(d) === "ANNULEE").length;
    return { total, pending, validated, canceled };
  }, [data]);

  return (
    <div className="dashboard-container reforme-page-shell fade-in">
      <header className="page-header-modern">
        <div className="header-meta">
          <span className="badge-pill-glow">Sortie définitive du registre</span>
          <h1>Réforme du patrimoine</h1>
        </div>
        <div className="toolbar-filters">
          <button
            className={`pill-filter ${view === "LIST" ? "active" : ""}`}
            onClick={() => setView("LIST")}
          >
            <History size={16} />
            Registre & Historique
          </button>
          <button
            className={`pill-filter ${view === "FORM" ? "active" : ""}`}
            onClick={() => setView("FORM")}
          >
            <PlusCircle size={16} />
            Nouvelle réforme
          </button>
        </div>
      </header>

      <div className="stats-dashboard">
        <div className="stat-card-premium">
          <span className="stat-label">Total réformes</span>
          <span className="stat-value"><AnimatedNumber value={stats.total} /></span>
          <p className="stat-hint">Dossiers créés</p>
        </div>
        <div className="stat-card-premium">
          <span className="stat-label">En attente</span>
          <span className="stat-value text-warning"><AnimatedNumber value={stats.pending} /></span>
          <p className="stat-hint">À valider</p>
        </div>
        <div className="stat-card-premium">
          <span className="stat-label">Validées</span>
          <span className="stat-value text-success"><AnimatedNumber value={stats.validated} /></span>
          <p className="stat-hint">Sorties effectives</p>
        </div>
        <div className="stat-card-premium">
          <span className="stat-label">Annulées</span>
          <span className="stat-value text-danger"><AnimatedNumber value={stats.canceled} /></span>
          <p className="stat-hint">Dossiers rejetés</p>
        </div>
      </div>

      {view === "FORM" ? (
        <div className="dashboard-shell-grid" style={{ gridTemplateColumns: '1fr' }}>
          <section className="glass-card premium-card">
            <div className="card-header-premium">
              <div className="icon-box-premium">
                <FileMinus size={20} />
              </div>
              <div>
                <h3>Procédure de sortie</h3>
                <p className="card-subtitle">Retrait définitif de l'inventaire actif</p>
              </div>
            </div>

            <form className="form-content-premium" onSubmit={submit}>
              <div className="form-group-modern" style={{ gridColumn: "span 2", marginBottom: "1rem" }}>
                <label>Bien à réformer</label>
                <BienSelector value={form.bien} onChange={(bien) => updateForm("bien", bien)} />
                <ErrorText message={errors.bien} />
              </div>

              {form.bien && (
                <div className="recap-card" style={{ gridColumn: "span 2", display: "flex", flexDirection: "column", gap: "8px", background: "var(--background)", padding: "16px", borderRadius: "12px", border: "1px solid var(--border)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <Info size={16} className="text-primary" />
                    <strong>{form.bien.iup} - {form.bien.designation}</strong>
                  </div>
                  <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", fontSize: "0.85rem", color: "var(--text-muted)" }}>
                    <span><strong>Valeur init. :</strong> {formatMoney(form.bien.valeur)}</span>
                    <span><strong>VNC :</strong> {formatMoney(form.bien.valeurNetteComptable ?? form.bien.valeur)}</span>
                    <span><strong>État :</strong> {form.bien.etat}</span>
                    <span><strong>Ancienneté :</strong> {yearsOfService(form.bien.dateAcquisition)} ans</span>
                    <span><strong>Service :</strong> {form.bien.service || "Non renseigné"}</span>
                  </div>
                </div>
              )}

              <div className="grid-2" style={{ marginTop: "1rem" }}>
                <Field label="Type de réforme">
                  <select
                    value={form.typeReforme}
                    onChange={(event) => {
                      const nextType = event.target.value as TypeReforme;
                      updateForm("typeReforme", nextType);
                      if (nextType === "MISE_AU_REBUT") updateForm("valeurResiduelle", 0);
                    }}
                  >
                    <option value="MISE_AU_REBUT">Mise au rebut (Destruction)</option>
                    <option value="VENTE_CESSION">Vente / Cession</option>
                    <option value="TRANSFERT_INTER_MINISTERE">Transfert inter-ministères</option>
                    <option value="DON">Don</option>
                    <option value="PERTE_SINISTRE">Perte / Sinistre</option>
                  </select>
                </Field>
                <Field label="Date de sortie" error={errors.dateSortie}>
                  <input type="date" value={form.dateSortie} onChange={(e) => updateForm("dateSortie", e.target.value)} />
                </Field>
                <Field label="Valeur résiduelle (FCFA)" error={errors.valeurResiduelle}>
                  <input type="number" min={0} value={form.valeurResiduelle} onChange={(e) => updateForm("valeurResiduelle", Number(e.target.value))} />
                </Field>

                {form.typeReforme === "VENTE_CESSION" && (
                  <>
                    <Field label="Prix de cession (FCFA)" error={errors.prixCession}>
                      <input type="number" min={0} value={form.prixCession} onChange={(e) => updateForm("prixCession", Number(e.target.value))} />
                    </Field>
                    <Field label="Acheteur">
                      <input value={form.acheteur} onChange={(e) => updateForm("acheteur", e.target.value)} />
                    </Field>
                    <Field label="Référence acte">
                      <input value={form.referenceActe} onChange={(e) => updateForm("referenceActe", e.target.value)} />
                    </Field>
                  </>
                )}

                {form.typeReforme === "TRANSFERT_INTER_MINISTERE" && (
                  <>
                    <Field label="Ministère destinataire" error={errors.ministereDestinataire}>
                      <input value={form.ministereDestinataire} onChange={(e) => updateForm("ministereDestinataire", e.target.value)} />
                    </Field>
                    <Field label="N° Ordre de transfert">
                      <input value={form.ordreTransfert} onChange={(e) => updateForm("ordreTransfert", e.target.value)} />
                    </Field>
                  </>
                )}

                <Field label="Motif détaillé" error={errors.motif} span>
                  <textarea rows={4} value={form.motif} onChange={(e) => updateForm("motif", e.target.value)} placeholder="Décrivez les raisons de la réforme..." />
                </Field>

                <Field label="Pièces justificatives" error={errors.justificatifs} span>
                  <FileUpload onUploadSuccess={(url) => updateForm("justificatifs", [...form.justificatifs, url])} />
                  {form.justificatifs.length > 0 && (
                    <small className="field-hint" style={{ marginTop: 8, display: "block", color: "var(--primary)" }}>
                      <CheckCircle2 size={12} style={{ display: "inline", marginRight: 4 }} />
                      {form.justificatifs.length} pièce(s) jointe(s).
                    </small>
                  )}
                </Field>
              </div>

              <button className="primary-premium" type="submit" disabled={saving} style={{ width: "100%", marginTop: "2rem" }}>
                {saving ? (
                  <>Patientez...</>
                ) : (
                  <>
                    <PlusCircle size={18} />
                    Soumettre le dossier de réforme
                  </>
                )}
              </button>
            </form>
          </section>
        </div>
      ) : (
        <div className="dashboard-shell-grid" style={{ gridTemplateColumns: '1fr' }}>
          <section className="glass-card premium-card">
            <div className="card-header-premium" style={{ flexWrap: "wrap", gap: "16px" }}>
              <div style={{ display: "flex", gap: "16px", alignItems: "center" }}>
                <div className="icon-box-premium">
                  <Archive size={20} />
                </div>
                <div>
                  <h3>Registre des réformes</h3>
                  <p className="card-subtitle">Historique et suivi des dossiers</p>
                </div>
              </div>

              <div className="gallery-toolbar" style={{ marginLeft: "auto", border: "none", padding: 0, background: "transparent", marginBottom: 0 }}>
                <div className="search-box-premium" style={{ maxWidth: 200 }}>
                  <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ border: "none", background: "transparent", outline: "none", width: "100%", color: "inherit", padding: "8px" }}>
                    <option value="TOUS">Tous types</option>
                    <option value="MISE_AU_REBUT">Mise au rebut</option>
                    <option value="VENTE_CESSION">Vente / Cession</option>
                    <option value="TRANSFERT_INTER_MINISTERE">Transfert inter-ministères</option>
                    <option value="DON">Don</option>
                    <option value="PERTE_SINISTRE">Perte / Sinistre</option>
                  </select>
                </div>
                <div className="search-box-premium" style={{ padding: "4px 12px" }}>
                  <input type="date" value={period.from} onChange={(e) => setPeriod(cur => ({ ...cur, from: e.target.value }))} style={{ width: "auto" }} title="Du" />
                  <span style={{ color: "var(--text-muted)" }}>-</span>
                  <input type="date" value={period.to} onChange={(e) => setPeriod(cur => ({ ...cur, to: e.target.value }))} style={{ width: "auto" }} title="Au" />
                </div>
                <button type="button" className="btn-export" onClick={exportCsv} style={{ padding: "8px 16px", display: "flex", alignItems: "center", gap: "6px", height: "100%" }}>
                  <Download size={16} />
                  Excel
                </button>
              </div>
            </div>

            <div style={{ padding: "0 24px 24px" }} className="table-responsive">
              <table className="patris-table">
                <thead>
                  <tr>
                    <th>IUP</th>
                    <th>Désignation</th>
                    <th>Type</th>
                    <th>Date sortie</th>
                    <th>VNC</th>
                    <th>Statut</th>
                    <th>Agent</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: "center", padding: "32px", color: "var(--text-muted)" }}>
                        Aucune réforme ne correspond à ces critères.
                      </td>
                    </tr>
                  ) : filtered.map((item) => (
                    <tr key={item.id}>
                      <td className="monospace"><strong>{item.bien?.iup || "N/A"}</strong></td>
                      <td>{item.bien?.designation || "Bien inconnu"}</td>
                      <td><span className="badge-outline">{item.typeReforme}</span></td>
                      <td>{item.dateSortie || item.dateReforme ? new Date(item.dateSortie || item.dateReforme || "").toLocaleDateString("fr-FR") : "-"}</td>
                      <td>{formatMoney(item.valeurResiduelle)}</td>
                      <td>
                        <span className={`status-badge status-${String(normalizeReformeStatus(item)).toLowerCase()}`}>
                          {normalizeReformeStatus(item)}
                        </span>
                      </td>
                      <td>{item.agent || "-"}</td>
                      <td>
                        <div className="table-actions">
                          {normalizeReformeStatus(item) === "EN_ATTENTE_VALIDATION" && (
                            <>
                              <button
                                type="button"
                                className="action-btn-mini text-success"
                                title="Valider la réforme"
                                disabled={actionLoadingId === item.id}
                                onClick={() => void validateReforme(item)}
                              >
                                <CheckCircle2 size={16} />
                              </button>
                              <button
                                type="button"
                                className="action-btn-mini text-danger"
                                title="Annuler la réforme"
                                disabled={actionLoadingId === item.id}
                                onClick={() => void cancelReforme(item)}
                              >
                                <XCircle size={16} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}

function Field({ label, error, span = false, children }: React.PropsWithChildren<{ label: string; error?: string; span?: boolean }>) {
  return (
    <div className="form-group-modern" style={span ? { gridColumn: "span 2" } : undefined}>
      <label>{label}</label>
      {children}
      <ErrorText message={error} />
    </div>
  );
}
