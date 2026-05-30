import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { annulerReforme, createReforme, getReformes, validerReforme, deleteReforme } from "../api/api";
import { Bien, updateBien, updateBienStatus } from "../api/biens";
import BienSelector from "../components/BienSelector";
import FileUpload from "../components/FileUpload";
import { useToast } from "../contexts/ToastContext";
import AnimatedNumber from "../components/AnimatedNumber";
import { usePermissions } from "../contexts/PermissionsContext";
import {
  Archive, History, PlusCircle, CheckCircle2,
  Download, XCircle, FileMinus, Info, Eye, Trash2
} from "lucide-react";
import MediaViewer from "../components/MediaViewer";
import SignatureModal from "../components/SignatureModal";
import { generateReformePdf } from "../utils/pdfExport";
import { uploadReformeRapport } from "../api/api";

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
  rapportTechniqueUrl?: string;
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

const getFullUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `http://localhost:8082${url.startsWith('/') ? '' : '/'}${url}`;
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
  if (!message) return null;
  return <span className="field-error">{message}</span>;
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

export default function ReformePage() {
  const location = useLocation();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const canValidate = hasPermission("VALIDATE_REFORMES");
  const [view, setView] = useState<"LIST" | "FORM">("LIST");
  const [data, setData] = useState<Reforme[]>([]);
  const [form, setForm] = useState<ReformeForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [filterType, setFilterType] = useState("TOUS");
  const [period, setPeriod] = useState({ from: "", to: "" });
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerType, setViewerType] = useState<"image" | "pdf">("pdf");
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [signingReforme, setSigningReforme] = useState<Reforme | null>(null);

  const openViewer = (url: string) => {
    const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null;
    setViewerType(isImage ? "image" : "pdf");
    setViewerUrl(url);
  };

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

  const printReforme = (item: Reforme) => {
    if (!item) return;
    const html = `
      <html>
        <head>
          <title>Dossier de réforme ${item.id}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #222 }
            h1 { margin-bottom: 0.5rem }
            .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
            .section { margin-top: 1rem; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px }
            .badge { display: inline-block; padding: 6px 12px; border-radius: 999px; background: #ef4444; color: white; font-weight: 700 }
          </style>
        </head>
        <body>
          <h1>Dossier de réforme</h1>
          <div class="meta">
            <div><strong>Bien :</strong> ${item.bien?.designation || 'N/A'}</div>
            <div><strong>IUP :</strong> ${item.bien?.iup || 'N/A'}</div>
            <div><strong>Type :</strong> ${item.typeReforme || '—'}</div>
            <div><strong>Date :</strong> ${item.dateSortie || item.dateReforme || '—'}</div>
          </div>
          <div class="section"><h3>Motif</h3><p>${item.motif || '—'}</p></div>
          <div class="section"><h3>Valeur résiduelle</h3><p>${formatMoney(item.valeurResiduelle)}</p></div>
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); win.focus(); win.print(); }
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

  const handleDelete = async (item: Reforme) => {
    if (!item.id) return;
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette réforme ? Cette action est irréversible.")) return;
    try {
      await deleteReforme(item.id);
      showToast({ type: "success", title: "Réforme supprimée avec succès" });
      await loadData();
    } catch (error) {
      showToast({ type: "error", title: "Erreur lors de la suppression" });
    }
  };

  const handleReformeSignatureConfirm = async (dataUrl: string, validatorName: string) => {
    if (!signingReforme) return;
    setSignatureModalOpen(false);
    try {
      showToast({ type: 'info', title: 'Génération du PDF signé...' });
      const pdfBlob = await generateReformePdf(signingReforme, signingReforme.bien, { signerName: validatorName, signatureDataUrl: dataUrl });
      await uploadReformeRapport(signingReforme.id!, pdfBlob);
      await validerReforme(signingReforme.id!, { validateur: validatorName }).catch(() => null);
      showToast({ type: 'success', title: 'Réforme validée et PDF signé enregistré' });
      setSigningReforme(null);
      await loadData();
    } catch (err) {
      console.error(err);
      showToast({ type: 'error', title: 'Erreur lors de l\'export/validation' });
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
      {viewerUrl && (
        <MediaViewer
          url={viewerUrl}
          type={viewerType}
          filename="Dossier de réforme"
          onClose={() => setViewerUrl(null)}
        />
      )}
      <SignatureModal
        open={signatureModalOpen}
        onClose={() => { setSignatureModalOpen(false); setSigningReforme(null); }}
        onConfirm={handleReformeSignatureConfirm}
      />

      <div className="aff-header-premium glass-card" style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 24 }}>
          <div>
            <span className="badge-pill-glow">SORTIE DÉFINITIVE DU REGISTRE</span>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1e293b', margin: '8px 0' }}>Réforme du patrimoine</h1>
            <p style={{ color: '#64748b', fontSize: '1.1rem' }}>Gestion des procédures de déclassement, rebut et cession des actifs</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
            <button
              className={`pill-filter ${view === "LIST" ? "active" : ""}`}
              onClick={() => setView("LIST")}
              style={{ height: 60, padding: '0 24px' }}
            >
              <History size={18} /> Registre
            </button>
            <button
              className="primary-premium"
              onClick={() => setView("FORM")}
              style={{ height: 60, padding: '0 32px', fontSize: '1.1rem' }}
            >
              <PlusCircle size={20} /> Nouvelle réforme
            </button>
          </div>
        </div>
      </div>

      {/* KPI BANNER */}
      <div className="affectation-kpi-banner">
        <div className="aff-kpi-card kpi-total">
          <div className="aff-kpi-icon">📦</div>
          <div className="aff-kpi-body">
            <span className="aff-kpi-value"><AnimatedNumber value={stats.total} /></span>
            <span className="aff-kpi-label">Total réformes</span>
          </div>
        </div>
        <div className="aff-kpi-card kpi-valide">
          <div className="aff-kpi-icon">✅</div>
          <div className="aff-kpi-body">
            <span className="aff-kpi-value"><AnimatedNumber value={stats.validated} /></span>
            <span className="aff-kpi-label">Validées</span>
          </div>
        </div>
        <div className="aff-kpi-card kpi-attente">
          <div className="aff-kpi-icon">⏳</div>
          <div className="aff-kpi-body">
            <span className="aff-kpi-value"><AnimatedNumber value={stats.pending} /></span>
            <span className="aff-kpi-label">En attente</span>
          </div>
        </div>
        <div className="aff-kpi-card kpi-transfer" style={{ background: "linear-gradient(135deg,#fef2f2,#fee2e2)", borderColor: "#fca5a5" }}>
          <div className="aff-kpi-icon" style={{ color: "#ef4444", background: "rgba(239,68,68,0.15)" }}>❌</div>
          <div className="aff-kpi-body">
            <span className="aff-kpi-value" style={{ color: "#b91c1c" }}><AnimatedNumber value={stats.canceled} /></span>
            <span className="aff-kpi-label" style={{ color: "#b91c1c" }}>Annulées</span>
          </div>
        </div>
      </div>

      {view === "FORM" ? (
        <div className="aff-form-wrapper fade-in">
          <div className="aff-form-hero">
            <div className="aff-form-hero-icon">🗑️</div>
            <div>
              <h2>Procédure de sortie</h2>
              <p>Sélection du bien, type de réforme et évaluation de la valeur résiduelle</p>
            </div>
          </div>

          <div className="aff-form-body">
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

              <button
                className="primary-premium"
                type="submit"
                disabled={saving}
                style={{ width: "100%", marginTop: "2rem", display: "flex", justifyContent: "center", gap: "8px", alignItems: "center", padding: "14px", fontSize: "16px", borderRadius: "12px", background: "var(--primary)", color: "white", fontWeight: 600, border: "none", cursor: "pointer", boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)" }}
              >
                {saving ? (
                  <>⏳ Patientez...</>
                ) : (
                  <>
                    <PlusCircle size={20} />
                    Soumettre le dossier de réforme
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      ) : (
        /* ===== LIST VIEW ===== */
        <div className="affectation-list-wrapper fade-in">
          <div className="affectation-list-toolbar" style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center", justifyContent: "space-between" }}>
            <h2>📋 Registre des réformes ({filtered.length})</h2>

            <div style={{ display: 'flex', gap: '8px', width: 'auto', flexWrap: "nowrap", alignItems: "center" }}>
              <select value={filterType} onChange={(e) => setFilterType(e.target.value)} style={{ width: 'auto', minWidth: '150px', border: "1px solid #e2e8f0", background: "#fff", outline: "none", padding: "8px 12px", borderRadius: "8px", color: "#475569", fontWeight: 500, height: "40px" }}>
                <option value="TOUS">Tous types</option>
                <option value="MISE_AU_REBUT">Mise au rebut</option>
                <option value="VENTE_CESSION">Vente / Cession</option>
                <option value="TRANSFERT_INTER_MINISTERE">Transfert inter-ministères</option>
                <option value="DON">Don</option>
                <option value="PERTE_SINISTRE">Perte / Sinistre</option>
              </select>
              <input type="date" value={period.from} onChange={(e) => setPeriod(cur => ({ ...cur, from: e.target.value }))} style={{ width: 'auto', border: "1px solid #e2e8f0", padding: "8px 12px", borderRadius: "8px", height: "40px" }} title="Du" />
              <input type="date" value={period.to} onChange={(e) => setPeriod(cur => ({ ...cur, to: e.target.value }))} style={{ width: 'auto', border: "1px solid #e2e8f0", padding: "8px 12px", borderRadius: "8px", height: "40px" }} title="Au" />
              <button type="button" className="btn-export" onClick={exportCsv} style={{ width: 'auto', height: "40px", padding: "0 16px", display: "flex", alignItems: "center", gap: "6px", background: "#f8fafc", cursor: "pointer", whiteSpace: "nowrap" }}>
                <Download size={16} /> Excel
              </button>
            </div>
          </div>

          <div className="affectation-cards-grid">
            {filtered.length === 0 ? (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
                <p style={{ fontWeight: 600 }}>Aucune réforme trouvée pour ces critères</p>
              </div>
            ) : filtered.map((item) => {
              const statut = normalizeReformeStatus(item);
              const isPending = statut === "EN_ATTENTE_VALIDATION";
              const isCanceled = statut === "ANNULEE" || statut === "ANNULÉ";

              let statusClass = "status-en_attente";
              if (statut === "VALIDE" || statut === "VALIDÉ") statusClass = "status-valide";
              if (isCanceled) statusClass = "status-transfere";

              const firstJustificatif = item.rapportTechniqueUrl;

              return (
                <div className="aff-card" key={item.id}>
                  <div className="aff-card-header" style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                    <div style={{ width: "48px", height: "48px", borderRadius: "8px", overflow: "hidden", flexShrink: 0, background: "#f1f5f9" }}>
                      {item.bien?.photoUrl ? (
                        <img
                          src={getFullUrl(item.bien.photoUrl)}
                          alt="Bien"
                          style={{ width: "100%", height: "100%", objectFit: "cover" }}
                          onError={(e) => {
                            (e.target as HTMLImageElement).style.display = 'none';
                            (e.target as HTMLImageElement).parentElement!.innerHTML = '<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; font-size: 20px;">📦</div>';
                          }}
                        />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>📦</div>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <span className="aff-card-iup">{item.bien?.iup || "N/A"}</span>
                        <span className={`aff-status-pill ${statusClass}`}>
                          {statut === "EN_ATTENTE_VALIDATION" ? "EN ATTENTE" : statut}
                        </span>
                      </div>
                      <p className="aff-card-designation" style={{ marginTop: 4 }}>{item.bien?.designation || "Bien non renseigné"}</p>
                    </div>
                  </div>

                  <div className="aff-card-meta">
                    <div className="aff-meta-row">
                      <span>🏷️</span><strong>Type</strong>{item.typeReforme || "—"}
                    </div>
                    <div className="aff-meta-row">
                      <span>💰</span><strong>VNC</strong>{formatMoney(item.valeurResiduelle)}
                    </div>
                    <div className="aff-meta-row">
                      <span>📅</span><strong>Date</strong>{item.dateSortie || item.dateReforme ? new Date(item.dateSortie || item.dateReforme || "").toLocaleDateString("fr-FR") : "—"}
                    </div>
                    {firstJustificatif && (
                      <div className="aff-meta-row" style={{ gridColumn: "1/-1", marginTop: "4px" }}>
                        <span>📎</span><strong>Dossier joint</strong>
                        <button
                          type="button"
                          onClick={() => openViewer(getFullUrl(firstJustificatif))}
                          className="btn-export"
                          style={{ padding: "4px 10px", fontSize: "12px", display: "flex", alignItems: "center", gap: "4px", background: "rgba(59,130,246,0.1)", color: "#2563eb", border: "1px solid rgba(59,130,246,0.2)" }}
                        >
                          <Eye size={14} /> Lire le document
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="aff-card-actions">
                    {isPending ? (
                      canValidate ? (
                        <>
                          <button
                            className="aff-action-btn btn-success"
                            type="button"
                            disabled={actionLoadingId === item.id}
                            onClick={() => void validateReforme(item)}
                          >
                            ✅ Valider
                          </button>
                          <button
                            className="aff-action-btn btn-danger"
                            type="button"
                            disabled={actionLoadingId === item.id}
                            onClick={() => void cancelReforme(item)}
                          >
                            ❌ Annuler
                          </button>
                          <button className="aff-action-btn" type="button" onClick={() => { setSigningReforme(item); setSignatureModalOpen(true); }}>
                            📎 Export & Sign
                          </button>
                        </>
                      ) : (
                        <div className="aff-status-pill status-en_attente" style={{ width: "100%", justifyContent: "center", fontStyle: "italic", padding: "8px" }}>
                          ⏳ En attente de validation administrative
                        </div>
                      )
                    ) : (
                      <button
                        className="aff-action-btn"
                        type="button"
                        style={{ opacity: 0.7, cursor: "default" }}
                        disabled
                      >
                        🔒 Dossier clôturé
                      </button>
                    )}
                    <button className="aff-action-btn" type="button" onClick={() => printReforme(item)}>🖨️ Imprimer</button>
                    <button
                      className="aff-action-btn"
                      type="button"
                      onClick={() => void handleDelete(item)}
                      style={{ color: "#ef4444" }}
                      title="Supprimer la réforme"
                    >
                      <Trash2 size={14} style={{ marginRight: 4 }} /> Supprimer
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}