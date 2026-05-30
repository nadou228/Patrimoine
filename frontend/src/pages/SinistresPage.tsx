import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { createSinistre, deleteSinistre, getSinistres, updateSinistre } from "../api/api";
import { updateBienStatus, Bien } from "../api/biens";
import BienSelector from "../components/BienSelector";
import FileUpload from "../components/FileUpload";
import MediaViewer from "../components/MediaViewer";
import { useToast } from "../contexts/ToastContext";
import SignatureModal from "../components/SignatureModal";
import { generateSinistrePdf } from "../utils/pdfExport";
import { uploadSinistreRapport, validerSinistre } from "../api/api";
import { PlusCircle, ShieldAlert, ShieldCheck, Eye, Trash2, Shield, CheckCircle2 } from "lucide-react";

type SinistreType = "VOL" | "INCENDIE" | "ACCIDENT" | "DEGRADATION" | "CATASTROPHE_NATURELLE" | "AUTRE";
type SinistreStatut = "DECLARE" | "DÉCLARÉ" | "EN_INSTRUCTION" | "INDEMNISE" | "INDEMNISÉ" | "REJETE" | "REJETÉ" | "CLASSE" | "CLASSÉ";
type Gravite = "MINEUR" | "MAJEUR" | "PERTE_TOTALE";

type Sinistre = {
  id: number;
  bien?: Bien | null;
  dateSinistre?: string;
  type?: SinistreType | string;
  description?: string;
  montantEstime?: number;
  referencePolice?: string;
  statut?: SinistreStatut | string;
  numeroDossierAssureur?: string;
  montantIndemnise?: number;
  datePaiement?: string;
  gravite?: Gravite | string;
  piecesJointes?: string[];
};

type SinistreForm = {
  bien: Bien | null;
  type: SinistreType;
  dateSinistre: string;
  description: string;
  montantEstime: number;
  referencePolice: string;
  piecesJointes: string[];
  gravite: Gravite;
};

type FollowUpForm = {
  id: number;
  numeroDossierAssureur: string;
  montantIndemnise: number;
  datePaiement: string;
} | null;

type FormErrors = Partial<Record<keyof SinistreForm, string>>;

const today = new Date().toISOString().slice(0, 10);

const EMPTY_FORM: SinistreForm = {
  bien: null,
  type: "ACCIDENT",
  dateSinistre: today,
  description: "",
  montantEstime: 0,
  referencePolice: "",
  piecesJointes: [],
  gravite: "MAJEUR",
};

const asSinistres = (value: unknown): Sinistre[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Sinistre => typeof item === "object" && item !== null && "id" in item);
};

const getFullUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `http://localhost:8082${url.startsWith('/') ? '' : '/'}${url}`;
};

const getAttachments = (piecesJointes?: string | string[]) => {
  if (!piecesJointes) return [];
  if (Array.isArray(piecesJointes)) return piecesJointes;
  if (typeof piecesJointes === "string") return piecesJointes.split(",");
  return [];
};

const formatMoney = (value?: number) => `${Math.round(value || 0).toLocaleString("fr-FR")} FCFA`;

const normalizeSinistreStatus = (value?: string) => {
  if (value === "DÉCLARÉ" || value === "DÃ‰CLARÃ‰" || value === "DECLARE") return "DECLARE";
  if (value === "INDEMNISÉ" || value === "INDEMNISÃ‰" || value === "INDEMNISE") return "INDEMNISE";
  if (value === "REJETÉ" || value === "REJETÃ‰" || value === "REJETE") return "REJETE";
  if (value === "CLASSÉ" || value === "CLASSÃ‰" || value === "CLASSE") return "CLASSE";
  return value || "DECLARE";
};

function ErrorText({ message }: { message?: string }) {
  return message ? <span className="field-error">{message}</span> : null;
}

export default function SinistresPage() {
  const location = useLocation();
  const { showToast } = useToast();
  const [view, setView] = useState<"LIST" | "FORM">("LIST");
  const [data, setData] = useState<Sinistre[]>([]);
  const [form, setForm] = useState<SinistreForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [followUp, setFollowUp] = useState<FollowUpForm>(null);
  const [savingFollowUp, setSavingFollowUp] = useState(false);
  
  const [viewerUrl, setViewerUrl] = useState<string | null>(null);
  const [viewerType, setViewerType] = useState<"image" | "pdf">("pdf");

  const openViewer = (url: string) => {
    const isImage = url.match(/\.(jpeg|jpg|gif|png|webp)$/i) != null;
    setViewerType(isImage ? "image" : "pdf");
    setViewerUrl(url);
  };

  const loadData = async () => {
    const response = await getSinistres().catch(() => []);
    setData(asSinistres(response));
  };

  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [signingSinistre, setSigningSinistre] = useState<Sinistre | null>(null);

  const handleSinistreSignatureConfirm = async (dataUrl: string, validatorName: string) => {
    if (!signingSinistre) return;
    setSignatureModalOpen(false);
    try {
      showToast({ type: 'info', title: 'Génération du PDF signé...' });
      const pdfBlob = await generateSinistrePdf(signingSinistre, signingSinistre.bien, { signerName: validatorName, signatureDataUrl: dataUrl });
      await uploadSinistreRapport(signingSinistre.id!, pdfBlob);
      await validerSinistre(signingSinistre.id!, { validateur: validatorName }).catch(() => null);
      showToast({ type: 'success', title: 'Sinistre validé et PDF signé enregistré' });
      setSigningSinistre(null);
      await loadData();
    } catch (err) {
      console.error(err);
      showToast({ type: 'error', title: 'Erreur lors de l\'export/validation' });
    }
  };

  const printSinistre = (item: Sinistre) => {
    if (!item) return;
    const html = `
      <html>
        <head>
          <title>Déclaration de sinistre ${item.id}</title>
          <style>body{font-family:Arial,sans-serif;margin:24px;color:#222}h1{margin-bottom:.5rem}.meta{display:grid;grid-template-columns:1fr 1fr;gap:12px}.section{margin-top:1rem;padding:12px;border:1px solid #e5e7eb;border-radius:8px}</style>
        </head>
        <body>
          <h1>Déclaration de sinistre</h1>
          <div class="meta">
            <div><strong>Bien :</strong> ${item.bien?.designation || 'N/A'}</div>
            <div><strong>IUP :</strong> ${item.bien?.iup || 'N/A'}</div>
            <div><strong>Type :</strong> ${item.type || '—'}</div>
            <div><strong>Date :</strong> ${item.dateSinistre || '—'}</div>
          </div>
          <div class="section"><h3>Description</h3><p>${item.description || '—'}</p></div>
          <div class="section"><h3>Montant estimé</h3><p>${formatMoney(item.montantEstime)}</p></div>
        </body>
      </html>
    `;
    const win = window.open('', '_blank'); if (win) { win.document.write(html); win.document.close(); win.focus(); win.print(); }
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
      title: "Bien préselectionné",
      message: `${state.prefillBien.designation} a été injecté depuis la galerie des biens.`,
    });
  }, [location.state]);

  const updateForm = <K extends keyof SinistreForm>(key: K, value: SinistreForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validate = () => {
    const nextErrors: FormErrors = {};
    if (!form.bien?.id) nextErrors.bien = "Sélectionnez le bien sinistré.";
    if (!form.dateSinistre || form.dateSinistre > today) nextErrors.dateSinistre = "La date doit être inférieure ou égale à aujourd'hui.";
    if (form.description.trim().length < 50) nextErrors.description = "La description doit contenir au moins 50 caractères.";
    if (form.piecesJointes.length === 0) nextErrors.piecesJointes = "Le rapport de constat est obligatoire.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate() || !form.bien?.id) return;
    try {
      setSaving(true);
      await createSinistre({
        bien: { id: form.bien.id },
        bienId: form.bien.id,
        type: form.type,
        dateSinistre: form.dateSinistre,
        description: form.description,
        montantEstime: form.montantEstime,
        referencePolice: form.referencePolice,
        piecesJointes: form.piecesJointes,
        statut: "DECLARE",
        gravite: form.gravite,
      });
      await updateBienStatus(form.bien.id, { statutOperationnel: "SINISTRE", service: form.bien.service || "" });
      await loadData();
      setForm(EMPTY_FORM);
      setView("LIST");
      showToast({ type: "success", title: "Sinistre déclaré", message: `Bien ${form.bien.iup} marqué SINISTRE.` });
    } catch (error) {
      showToast({ type: "error", title: "Déclaration impossible", message: error instanceof Error ? error.message : "Erreur API" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (item: Sinistre) => {
    if (!item.id) return;
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette déclaration de sinistre ? Cette action est irréversible.")) return;
    try {
      await deleteSinistre(item.id);
      showToast({ type: "success", title: "Sinistre supprimé avec succès" });
      await loadData();
    } catch (error) {
      showToast({ type: "error", title: "Erreur lors de la suppression" });
    }
  };

  const stats = useMemo(() => {
    const total = data.length;
    const pending = data.filter(d => normalizeSinistreStatus(d.statut) === "DECLARE" || normalizeSinistreStatus(d.statut) === "EN_INSTRUCTION").length;
    const indemnises = data.filter(d => normalizeSinistreStatus(d.statut) === "INDEMNISE").length;
    const rejetes = data.filter(d => normalizeSinistreStatus(d.statut) === "REJETE" || normalizeSinistreStatus(d.statut) === "CLASSE").length;
    return { total, pending, indemnises, rejetes };
  }, [data]);

  return (
    <div className="dashboard-container reforme-page-shell fade-in">
      {viewerUrl && (
        <MediaViewer 
          url={viewerUrl} 
          type={viewerType} 
          filename="Pièce justificative" 
          onClose={() => setViewerUrl(null)} 
        />
      )}

      <div className="aff-header-premium glass-card" style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 24 }}>
          <div>
            <span className="badge-pill-glow" style={{ color: '#ef4444', borderColor: '#fecaca', background: '#fef2f2' }}>SÉCURITÉ & ASSURANCE</span>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1e293b', margin: '8px 0' }}>Sinistres & Incidents</h1>
            <p style={{ color: '#64748b', fontSize: '1.1rem' }}>Gestion des déclarations, expertises et indemnisations du patrimoine</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
             <button 
                className={`pill-filter ${view === "LIST" ? "active" : ""}`} 
                onClick={() => setView("LIST")}
                style={{ height: 60, padding: '0 24px' }}
              >
                <Shield size={18} /> Registre
             </button>
             <button 
                className="primary-premium" 
                onClick={() => { setView("FORM"); setForm(EMPTY_FORM); }} 
                style={{ height: 60, padding: '0 32px', fontSize: '1.1rem', background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)', borderColor: 'transparent' }}
              >
                <PlusCircle size={20} /> Déclarer un sinistre
             </button>
          </div>
        </div>
      </div>

      {/* KPI BANNER */}
      {view === "LIST" && (
        <div className="affectation-kpi-banner fade-in">
          <div className="aff-kpi-card kpi-total">
            <div className="aff-kpi-icon">📋</div>
            <div className="aff-kpi-body">
              <span className="aff-kpi-value">{stats.total}</span>
              <span className="aff-kpi-label">TOTAL SINISTRES</span>
            </div>
          </div>
          <div className="aff-kpi-card kpi-valide">
            <div className="aff-kpi-icon">✅</div>
            <div className="aff-kpi-body">
              <span className="aff-kpi-value">{stats.indemnises}</span>
              <span className="aff-kpi-label">INDEMNISÉS</span>
            </div>
          </div>
          <div className="aff-kpi-card kpi-attente">
            <div className="aff-kpi-icon">⏳</div>
            <div className="aff-kpi-body">
              <span className="aff-kpi-value">{stats.pending}</span>
              <span className="aff-kpi-label">EN INSTRUCTION</span>
            </div>
          </div>
          <div className="aff-kpi-card kpi-annule">
            <div className="aff-kpi-icon">❌</div>
            <div className="aff-kpi-body">
              <span className="aff-kpi-value">{stats.rejetes}</span>
              <span className="aff-kpi-label">REJETÉS / CLASSÉS</span>
            </div>
          </div>
        </div>
      )}

      {view === "FORM" ? (
        <div className="aff-form-wrapper fade-in" style={{ marginTop: 24 }}>
          <div className="aff-form-hero" style={{ background: "linear-gradient(135deg, var(--danger) 0%, #b91c1c 100%)" }}>
            <div className="aff-form-hero-icon">🚨</div>
            <div>
              <h2>Déclaration de sinistre</h2>
              <p>Signalez un vol, incendie, accident ou tout dommage affectant un bien de l'État</p>
            </div>
          </div>
          
          <div className="aff-form-body">
            <form className="premium-dynamic-form" onSubmit={submit}>
              <Field label="Bien concerné" error={errors.bien}>
                <BienSelector value={form.bien} onChange={(bien) => updateForm("bien", bien)} />
              </Field>
              {form.bien ? (
                <div className="recap-card" style={{ marginTop: "-12px", marginBottom: "20px" }}>
                  <strong>{form.bien.iup} - {form.bien.designation}</strong>
                  <span>Valeur d'acquisition : {formatMoney(form.bien.valeur)} | VNC : {formatMoney(form.bien.valeurNetteComptable ?? form.bien.valeur)}</span>
                </div>
              ) : null}

              <div className="grid-2">
                <Field label="Type d'incident">
                  <select value={form.type} onChange={(event) => updateForm("type", event.target.value as SinistreType)}>
                    <option value="VOL">VOL</option>
                    <option value="INCENDIE">INCENDIE</option>
                    <option value="ACCIDENT">ACCIDENT</option>
                    <option value="DEGRADATION">DÉGRADATION</option>
                    <option value="CATASTROPHE_NATURELLE">CATASTROPHE NATURELLE</option>
                    <option value="AUTRE">AUTRE</option>
                  </select>
                </Field>
                <Field label="Gravité">
                  <select value={form.gravite} onChange={(event) => updateForm("gravite", event.target.value as Gravite)}>
                    <option value="MINEUR">MINEUR (Réparable, n'affecte pas l'usage)</option>
                    <option value="MAJEUR">MAJEUR (Nécessite des réparations lourdes)</option>
                    <option value="PERTE_TOTALE">PERTE TOTALE (Irréparable, entraîne une réforme)</option>
                  </select>
                </Field>
                <Field label="Date du sinistre" error={errors.dateSinistre}>
                  <input type="date" max={today} value={form.dateSinistre} onChange={(event) => updateForm("dateSinistre", event.target.value)} />
                </Field>
                <Field label="Montant estimé des dommages (FCFA)">
                  <input type="number" min={0} value={form.montantEstime} onChange={(event) => updateForm("montantEstime", Number(event.target.value))} />
                </Field>
                <Field label="Référence police assurance (Optionnel)">
                  <input value={form.referencePolice} onChange={(event) => updateForm("referencePolice", event.target.value)} placeholder="Ex: POL-123456" />
                </Field>
                <Field label="Description & Circonstances détaillées" error={errors.description} span>
                  <textarea rows={4} value={form.description} onChange={(event) => updateForm("description", event.target.value)} placeholder="Décrivez les circonstances exactes du sinistre..." />
                </Field>
                <Field label="Rapport de constat (Photos, PV, Plainte)" error={errors.piecesJointes} span>
                  <FileUpload onUploadSuccess={(url) => updateForm("piecesJointes", [...form.piecesJointes, url])} />
                  {form.piecesJointes.length > 0 && (
                    <small className="field-hint" style={{ marginTop: 8, display: "block", color: "var(--primary)" }}>
                      <CheckCircle2 size={12} style={{ display: "inline", marginRight: 4 }} />
                      {form.piecesJointes.length} document(s) attaché(s).
                    </small>
                  )}
                </Field>
              </div>
              <button 
                type="submit" 
                className="primary-premium" 
                disabled={saving} 
                style={{ width: "100%", marginTop: "2rem", display: "flex", justifyContent: "center", gap: "8px", alignItems: "center", padding: "14px", fontSize: "16px", borderRadius: "12px", background: "var(--danger)", color: "white", fontWeight: 600, border: "none", cursor: "pointer", boxShadow: "0 4px 12px rgba(239, 68, 68, 0.2)" }}
              >
                {saving ? "⏳ Déclaration en cours..." : "🚨 Valider la déclaration de sinistre"}
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="affectation-list-wrapper fade-in" style={{ marginTop: 24 }}>
          <div className="affectation-list-toolbar" style={{ display: "flex", flexWrap: "wrap", gap: "16px", alignItems: "center", justifyContent: "space-between" }}>
            <h2>📋 Registre des sinistres & assurance ({data.length})</h2>
          </div>

          <div className="affectation-cards-grid">
            {data.length === 0 ? (
              <div className="empty-state" style={{ gridColumn: "1/-1" }}>
                <ShieldCheck size={48} color="#94a3b8" />
                <p>Aucun sinistre déclaré à ce jour.</p>
              </div>
            ) : (
              data.map((item) => {
                const statut = normalizeSinistreStatus(item.statut);
                let statusClass = "status-en_attente";
                if (statut === "INDEMNISE") statusClass = "status-valide";
                if (statut === "REJETE" || statut === "CLASSE") statusClass = "status-transfere";
                
                const attachments = getAttachments(item.piecesJointes as any);
                const firstAttachment = attachments.length > 0 ? attachments[0] : null;

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
                            {statut}
                          </span>
                        </div>
                        <p className="aff-card-designation" style={{ marginTop: 4 }}>{item.bien?.designation || "Bien non renseigné"}</p>
                      </div>
                    </div>

                    <div className="aff-card-meta">
                      <div className="aff-meta-row">
                        <span>🚨</span><strong>Type</strong>{item.type || "—"}
                      </div>
                      <div className="aff-meta-row">
                        <span>⚠️</span><strong>Gravité</strong><strong className={item.gravite === "PERTE_TOTALE" ? "danger-text" : ""}>{item.gravite || "—"}</strong>
                      </div>
                      <div className="aff-meta-row">
                        <span>💰</span><strong>Estima.</strong>{formatMoney(item.montantEstime)}
                      </div>
                      <div className="aff-meta-row">
                        <span>📅</span><strong>Date</strong>{item.dateSinistre ? new Date(item.dateSinistre).toLocaleDateString("fr-FR") : "—"}
                      </div>
                      <div className="aff-meta-row" style={{ gridColumn: "1/-1" }}>
                         <span>🏢</span><strong>Assurance</strong>{item.numeroDossierAssureur ? `Dossier: ${item.numeroDossierAssureur} | Indemnisé: ${formatMoney(item.montantIndemnise)}` : "Dossier non renseigné"}
                      </div>
                      {firstAttachment && (
                        <div className="aff-meta-row" style={{ gridColumn: "1/-1", marginTop: "4px" }}>
                          <span>📎</span><strong>Constat joint</strong>
                          <button 
                             type="button" 
                             onClick={() => openViewer(getFullUrl(firstAttachment))} 
                             style={{ padding: "6px 12px", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", background: "linear-gradient(135deg, rgba(59,130,246,0.1), rgba(37,99,235,0.05))", color: "#2563eb", border: "1px solid rgba(59,130,246,0.3)", borderRadius: "6px", fontWeight: 500, cursor: "pointer", transition: "all 0.2s ease" }}
                             onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(59,130,246,0.15)"; e.currentTarget.style.borderColor = "rgba(59,130,246,0.5)"; }}
                             onMouseLeave={(e) => { e.currentTarget.style.background = "linear-gradient(135deg, rgba(59,130,246,0.1), rgba(37,99,235,0.05))"; e.currentTarget.style.borderColor = "rgba(59,130,246,0.3)"; }}
                          >
                             <Eye size={16} /> Lire le document
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="aff-card-actions">
                      <button 
                        className="aff-action-btn" 
                        type="button" 
                        onClick={() => setFollowUp({ id: item.id, numeroDossierAssureur: item.numeroDossierAssureur || "", montantIndemnise: item.montantIndemnise || 0, datePaiement: item.datePaiement || "" })}
                        style={{ color: "var(--primary)" }}
                      >
                        <ShieldAlert size={14} style={{ marginRight: 4 }} /> Suivi Assurance
                      </button>
                      <button className="aff-action-btn" type="button" onClick={() => printSinistre(item)}>🖨️ Imprimer</button>
                      <button className="aff-action-btn" type="button" onClick={() => { setSigningSinistre(item); setSignatureModalOpen(true); }}>📎 Export & Sign</button>
                      <button 
                        className="aff-action-btn" 
                        type="button" 
                        onClick={() => void handleDelete(item)} 
                        style={{ color: "#ef4444" }}
                        title="Supprimer la déclaration"
                      >
                        <Trash2 size={14} style={{ marginRight: 4 }} /> Supprimer
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {followUp ? (
        <div 
          className="modal-overlay-premium fade-in" 
          style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' 
          }}
        >
          <div 
            className="modal-card scale-in" 
            style={{ 
              background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '500px',
              display: 'flex', flexDirection: 'column',
              maxHeight: '85vh', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
              overflow: 'hidden'
            }}
          >
            <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 600 }}>Mise à jour du suivi assurance</h3>
            </div>

            <div style={{ padding: '24px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <Field label="Numéro dossier assureur">
                <input 
                  value={followUp.numeroDossierAssureur} 
                  onChange={(event) => setFollowUp({ ...followUp, numeroDossierAssureur: event.target.value })} 
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </Field>
              <Field label="Montant indemnisé (FCFA)">
                <input 
                  type="number" 
                  value={followUp.montantIndemnise} 
                  onChange={(event) => setFollowUp({ ...followUp, montantIndemnise: Number(event.target.value) })} 
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </Field>
              <Field label="Date de paiement">
                <input 
                  type="date" 
                  value={followUp.datePaiement} 
                  onChange={(event) => setFollowUp({ ...followUp, datePaiement: event.target.value })} 
                  style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid #cbd5e1' }}
                />
              </Field>
              <div style={{ background: '#f0fdf4', color: '#166534', padding: '14px', borderRadius: '8px', fontSize: '0.9rem', border: '1px solid #bbf7d0', marginTop: '8px' }}>
                <strong>Information :</strong> À l'indemnisation, planifiez une remise en état ou lancez une réforme si le bien est irréparable.
              </div>
            </div>

            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', background: '#f8fafc', display: 'flex', justifyContent: 'flex-end', gap: '12px' }}>
              <button 
                type="button" 
                onClick={() => setFollowUp(null)} 
                style={{ padding: '10px 20px', borderRadius: '8px', background: '#e2e8f0', color: '#475569', border: 'none', fontWeight: 600, cursor: 'pointer' }}
              >
                Annuler
              </button>
              <button
                type="button"
                className="primary-premium"
                disabled={savingFollowUp}
                style={{ padding: '10px 24px', borderRadius: '8px', fontWeight: 600, boxShadow: '0 4px 6px -1px rgba(59, 130, 246, 0.5)', border: 'none', cursor: 'pointer', background: 'var(--primary, #3b82f6)', color: 'white' }}
                onClick={async () => {
                  if (!followUp) return;
                  try {
                    setSavingFollowUp(true);
                    const current = data.find((item) => item.id === followUp.id);
                    await updateSinistre(followUp.id, {
                      bien: current?.bien?.id ? { id: current.bien.id } : current?.bien,
                      dateSinistre: current?.dateSinistre,
                      type: current?.type,
                      description: current?.description,
                      montantEstime: current?.montantEstime,
                      referencePolice: current?.referencePolice,
                      numeroDossierAssureur: followUp.numeroDossierAssureur,
                      montantIndemnise: followUp.montantIndemnise,
                      montantRembourse: followUp.montantIndemnise,
                      datePaiement: followUp.datePaiement,
                      statut: followUp.montantIndemnise > 0 ? "INDEMNISE" : current?.statut || "EN_INSTRUCTION",
                      gravite: current?.gravite,
                    });
                    
                    if (followUp.montantIndemnise > 0 && current?.gravite === "PERTE_TOTALE" && current?.bien?.id) {
                      try {
                        // The backend throws a 500 error (LazyInitializationException) when serializing the updated Bien,
                        // but the database transaction commits successfully. We can safely ignore this error.
                        await updateBienStatus(current.bien.id, { statutOperationnel: "REFORME" });
                      } catch (err: any) {
                        if (err?.response?.status !== 500) {
                          console.error("Erreur auto-réforme:", err);
                        }
                      }
                      showToast({ type: "info", title: "Bien réformé", message: "Le bien a été automatiquement réformé suite à la perte totale." });
                    }
                    
                    await loadData();
                    setFollowUp(null);
                    showToast({ type: "success", title: "Suivi assurance mis à jour" });
                  } catch {
                    showToast({ type: "error", title: "Mise à jour impossible" });
                  } finally {
                    setSavingFollowUp(false);
                  }
                }}
              >
                {savingFollowUp ? "Enregistrement..." : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <SignatureModal open={signatureModalOpen} onClose={() => { setSignatureModalOpen(false); setSigningSinistre(null); }} onConfirm={handleSinistreSignatureConfirm} />
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
