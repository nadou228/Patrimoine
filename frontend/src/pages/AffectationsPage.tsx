import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import {
  AffectationPayload,
  ServiceDto,
  createAffectation,
  createService,
  getAffectations,
  getMouvementsByBien,
  getOrigineAffectation,
  getServices,
  getUserByMatricule,
  retournerAffectation,
  updateAffectation,
  validerAffectation,
  deleteAffectation,
} from "../api/api";
import { Trash2, FileText } from "lucide-react";
import SignatureModal from "../components/SignatureModal";
import { generateAffectationPdf } from "../utils/pdfExport";
import { validerAffectationAvecDocument } from "../api/api";
import MediaViewer from "../components/MediaViewer";
import { Bien, updateBienStatus } from "../api/biens";
import { getCurrentUser } from "../api/auth";
import BienSelector from "../components/BienSelector";
import FileUpload from "../components/FileUpload";
import MouvementTimeline from "../components/MouvementTimeline";
import { usePermissions } from "../contexts/PermissionsContext";
import { useToast } from "../contexts/ToastContext";
import { exportBordereauMutationExcel } from "../utils/exporters";

type BeneficiaryMode = "PERSONNE" | "SERVICE";

type Affectation = {
  id: number;
  bien?: Bien | null;
  detenteur?: string;
  detenteurA?: string;
  service?: string;
  dateAffectation?: string;
  statutValidation?: "EN_ATTENTE" | "VALIDE" | "VALIDÉ" | "TRANSFERE" | "TRANSFÉRÉ";
  motif?: string;
  signatureUrl?: string;
  ministere?: string;
  posteComptable?: string;
  documentsUrls?: string[];
  validePar?: string;
  dateValidation?: string;
  dateFin?: string;
};

type AffectationForm = {
  id?: number;
  bien: Bien | null;
  beneficiaryMode: BeneficiaryMode;
  matricule: string;
  nom: string;
  prenom: string;
  fonction: string;
  telephone: string;
  email: string;
  service: string;
  responsableReception: string;
  detenteurA: string;
  dateAffectation: string;
  motif: string;
  signatureUrl: string;
  documentsUrls: string[];
};

type ReturnModal = {
  affectation: Affectation;
  motif: string;
  dateRetour: string;
} | null;

type ServiceForm = {
  nomService: string;
  code: string;
  direction: string;
  responsable: string;
  localisation: string;
};

type FormErrors = Partial<Record<keyof AffectationForm | "serviceForm" | "retour", string>>;
type TimelineEntry = Record<string, unknown>;
type AffectationsLocationState = {
  prefillBien?: Bien;
  source?: string;
};

const today = new Date().toISOString().slice(0, 10);

const EMPTY_FORM: AffectationForm = {
  bien: null,
  beneficiaryMode: "SERVICE",
  matricule: "",
  nom: "",
  prenom: "",
  fonction: "",
  telephone: "",
  email: "",
  service: "",
  responsableReception: "",
  detenteurA: "MAGASIN CENTRAL",
  dateAffectation: today,
  motif: "",
  signatureUrl: "",
  documentsUrls: [],
};

const EMPTY_SERVICE: ServiceForm = {
  nomService: "",
  code: "",
  direction: "",
  responsable: "",
  localisation: "",
};

const serviceName = (service: ServiceDto) => service.nomService || service.nom || service.code;

const asServiceList = (value: unknown): ServiceDto[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is ServiceDto => typeof item === "object" && item !== null && "id" in item);
};

const asAffectationList = (value: unknown): Affectation[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Affectation => typeof item === "object" && item !== null && "id" in item);
};

const getFullUrl = (url?: string) => {
  if (!url) return "";
  if (url.startsWith("http")) return url;
  return `http://localhost:8082${url.startsWith('/') ? '' : '/'}${url}`;
};

const normalizeValidationStatus = (value?: Affectation["statutValidation"]) => {
  if (value === "VALIDÉ") return "VALIDE";
  if (value === "TRANSFÉRÉ") return "TRANSFERE";
  return value || "EN_ATTENTE";
};

const getAffectationStatusLabel = (value?: Affectation["statutValidation"]) => {
  const normalized = normalizeValidationStatus(value);
  const raw = String(normalized).trim().toUpperCase();
  if (normalized === "EN_ATTENTE") return "EN ATTENTE";
  if (normalized === "VALIDE") return "VALIDÉ";
  if (raw === "REJETE" || raw === "REJETÉ") return "REJETÉ";
  if (normalized === "TRANSFERE") return "TRANSFÉRÉ";
  return normalized;
};

function ErrorText({ message }: { message?: string }) {
  return message ? <span className="field-error">{message}</span> : null;
}

export default function AffectationsPage() {
  const location = useLocation();
  const { permissions, hasPermission } = usePermissions();
  const { showToast } = useToast();
  const user = getCurrentUser();
  const canValidate = hasPermission("VALIDATE_AFFECTATIONS");

  const [view, setView] = useState<"LIST" | "FORM">("LIST");
  const [data, setData] = useState<Affectation[]>([]);
  const [services, setServices] = useState<ServiceDto[]>([]);
  const [form, setForm] = useState<AffectationForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [savingService, setSavingService] = useState(false);
  const [returning, setReturning] = useState(false);
  const [loadingMatricule, setLoadingMatricule] = useState(false);
  const [matriculeMatched, setMatriculeMatched] = useState(false);
  const [showServiceModal, setShowServiceModal] = useState(false);
  const [serviceForm, setServiceForm] = useState<ServiceForm>(EMPTY_SERVICE);
  const [returnModal, setReturnModal] = useState<ReturnModal>(null);
  const [timelineData, setTimelineData] = useState<TimelineEntry[]>([]);
  const [showTimeline, setShowTimeline] = useState(false);
  const [viewerMedia, setViewerMedia] = useState<{ url: string; type: 'image' | 'pdf'; filename: string } | null>(null);

  const loadData = async () => {
    const [affectationsResponse, servicesResponse] = await Promise.all([
      getAffectations().catch(() => []),
      getServices().catch(() => []),
    ]);
    setData(asAffectationList(affectationsResponse));
    setServices(asServiceList(servicesResponse));
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    const state = location.state as AffectationsLocationState | null;
    if (!state?.prefillBien) return;

    setView("FORM");
    void handleBienChange(state.prefillBien);
    showToast({
      type: "info",
      title: "Bien preselectionne",
      message: `${state.prefillBien.designation} a ete injecte depuis le registre des biens.`,
    });
  }, [location.state]);

  const stats = useMemo(() => {
    const pending = data.filter((item) => normalizeValidationStatus(item.statutValidation) === "EN_ATTENTE").length;
    const validated = data.filter((item) => item.statutValidation === "VALIDE" || item.statutValidation === "VALIDÉ").length;
    return { total: data.length, pending, validated };
  }, [data]);

  const updateForm = <K extends keyof AffectationForm>(key: K, value: AffectationForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const resolveServiceLabel = (service: unknown) => {
    if (!service) return "";
    if (typeof service === "string") return service;
    if (typeof service === "object") {
      const candidate = service as { nomService?: string; nom?: string; code?: string };
      return candidate.nomService || candidate.nom || candidate.code || "";
    }
    return "";
  };

  const handleBienChange = async (bien: Bien | null) => {
    updateForm("bien", bien);
    if (!bien?.id) return;
    if (bien.statutOperationnel === "REFORME" || bien.statutOperationnel === "RÉFORMÉ") {
      setErrors((current) => ({ ...current, bien: "Ce bien est reforme et ne peut plus etre affecte." }));
      return;
    }
    const origine = await getOrigineAffectation(bien.id).catch(() => "MAGASIN CENTRAL");
    updateForm("detenteurA", String(origine || "MAGASIN CENTRAL"));
  };

  useEffect(() => {
    if (form.beneficiaryMode !== "PERSONNE") {
      setMatriculeMatched(false);
      return;
    }

    const matricule = form.matricule.trim();
    if (matricule.length < 3) {
      setMatriculeMatched(false);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        setLoadingMatricule(true);
        const userData = await getUserByMatricule(matricule);
        setForm((current) => ({
          ...current,
          nom: userData.nom || current.nom,
          prenom: userData.prenom || current.prenom,
          fonction: userData.fonction || current.fonction,
          telephone: userData.telephone || current.telephone,
          email: userData.email || current.email,
          service: resolveServiceLabel(userData.service) || current.service,
        }));
        setMatriculeMatched(true);
      } catch {
        setMatriculeMatched(false);
      } finally {
        setLoadingMatricule(false);
      }
    }, 350);

    return () => window.clearTimeout(timer);
  }, [form.beneficiaryMode, form.matricule]);

  const validateForm = () => {
    const nextErrors: FormErrors = {};
    if (!form.bien?.id) nextErrors.bien = "Selectionnez un bien.";
    if (form.bien?.statutOperationnel === "REFORME" || form.bien?.statutOperationnel === "RÉFORMÉ") {
      nextErrors.bien = "Ce bien est reforme et bloque pour affectation.";
    }
    if (!form.service.trim()) nextErrors.service = "Le service est obligatoire.";
    if (form.beneficiaryMode === "PERSONNE" && !form.nom.trim()) nextErrors.nom = "Le nom du beneficiaire est obligatoire.";
    if (form.beneficiaryMode === "SERVICE" && !form.responsableReception.trim()) {
      nextErrors.responsableReception = "Le responsable de reception est obligatoire.";
    }
    if (!form.motif.trim()) nextErrors.motif = "Le motif est obligatoire.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const beneficiaryLabel = () => {
    if (form.beneficiaryMode === "SERVICE") return form.responsableReception || form.service;
    return [form.prenom, form.nom].filter(Boolean).join(" ") || form.matricule;
  };

  const isTransferFlow = Boolean(form.id) || Boolean(form.bien?.service);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validateForm()) return;
    if (!form.bien?.id) return;

    console.log("Submitting Affectation Payload:", {
      bien: String(form.bien.id),
      detenteur: beneficiaryLabel(),
      service: form.service,
      documentsUrls: form.documentsUrls,
    });

    const payload: AffectationPayload = {
      bien: String(form.bien.id),
      bienId: form.bien.id,
      detenteur: beneficiaryLabel(),
      detenteurA: form.detenteurA,
      service: form.service,
      dateAffectation: form.dateAffectation,
      motif: form.motif,
      signatureUrl: form.signatureUrl,
      typeBeneficiaire: form.beneficiaryMode,
      responsableReception: form.responsableReception,
      documentsUrls: form.documentsUrls,
    };

    try {
      setSaving(true);
      if (form.id) {
        await updateAffectation(form.id, payload);
      } else {
        await createAffectation(payload);
      }
      
      let nextQuantite = form.bien.quantite;
      if (form.bien.quantite && form.bien.quantite > 1) {
        nextQuantite = form.bien.quantite - 1;
      }
      
      await updateBienStatus(form.bien.id, { 
        statutOperationnel: "AFFECTE", 
        service: form.service,
        quantite: nextQuantite 
      });
      await loadData();
      setForm(EMPTY_FORM);
      setView("LIST");
      showToast({ type: "success", title: `Bien ${form.bien.iup} affecte a ${form.service} avec succes` });
    } catch (error) {
      showToast({ type: "error", title: "Affectation impossible", message: error instanceof Error ? error.message : "Erreur API" });
    } finally {
      setSaving(false);
    }
  };

  const createServiceInline = async () => {
    if (!serviceForm.nomService.trim() || !serviceForm.code.trim()) {
      setErrors((current) => ({ ...current, serviceForm: "Nom du service et code obligatoires." }));
      return;
    }
    try {
      setSavingService(true);
      const created = await createService(serviceForm).catch(() => null);
      if (!created) {
        showToast({ type: "error", title: "Creation du service impossible" });
        return;
      }
      await loadData();
      updateForm("service", serviceForm.nomService);
      setServiceForm(EMPTY_SERVICE);
      setShowServiceModal(false);
      showToast({ type: "success", title: "Service cree" });
    } finally {
      setSavingService(false);
    }
  };

  const handleValidate = async (item: Affectation) => {
    if (!item.id) return;
    await validerAffectation(item.id, user?.username || "admin").catch(() => null);
    if (item.bien?.id) {
      await updateBienStatus(item.bien.id, { statutOperationnel: "AFFECTE", service: item.service || "" }).catch(() => null);
    }
    await loadData();
    showToast({ type: "success", title: "Affectation validee" });
  };

  const printAffectation = (item: Affectation) => {
    if (!item.bien) return;
    const html = `
      <html>
        <head>
          <title>Bordereau d'affectation ${item.id}</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 24px; color: #222; }
            h1 { margin-bottom: 0.5rem; }
            p, div { margin: 0.4rem 0; }
            .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; margin-top: 1rem; }
            .section { margin-top: 1.5rem; padding: 16px; border: 1px solid #ddd; border-radius: 12px; }
            .badge { display: inline-flex; padding: 6px 12px; border-radius: 999px; background: #4f46e5; color: white; font-weight: 700; margin-top: 0.5rem; }
            .signature { margin-top: 1rem; }
            img { max-width: 100%; border: 1px solid #ccc; border-radius: 8px; }
          </style>
        </head>
        <body>
          <h1>Bordereau d'affectation</h1>
          <div class="badge">${getAffectationStatusLabel(item.statutValidation)}</div>
          <div class="meta">
            <div><strong>Bien :</strong> ${item.bien.designation || "N/A"}</div>
            <div><strong>IUP :</strong> ${item.bien.iup || "N/A"}</div>
            <div><strong>Service :</strong> ${item.service || "N/A"}</div>
            <div><strong>Détenteur :</strong> ${item.detenteur || item.detenteurA || "N/A"}</div>
            <div><strong>Date d'affectation :</strong> ${item.dateAffectation ? new Date(item.dateAffectation).toLocaleDateString('fr-FR') : "N/A"}</div>
            <div><strong>Validé par :</strong> ${item.validePar || "—"}</div>
            <div><strong>Date validation :</strong> ${item.dateValidation ? new Date(item.dateValidation).toLocaleDateString('fr-FR') : "—"}</div>
          </div>
          <div class="section">
            <h2>Motif</h2>
            <p>${item.motif || "Aucun motif renseigné."}</p>
          </div>
          ${item.signatureUrl ? `<div class="section signature"><h2>Signature</h2><img src="${getFullUrl(item.signatureUrl)}" alt="Signature" /></div>` : ""}
        </body>
      </html>
    `;
    const win = window.open('', '_blank');
    if (win) {
      win.document.write(html);
      win.document.close();
      win.focus();
      win.print();
    }
  };

  const handleReturn = async () => {
    if (!returnModal) return;
    if (!returnModal.motif.trim()) {
      setErrors((current) => ({ ...current, retour: "Le motif de retour est obligatoire." }));
      return;
    }
    try {
      setReturning(true);
      await retournerAffectation(returnModal.affectation.id, {
        motif: returnModal.motif,
        dateRetour: returnModal.dateRetour,
      }).catch(() => null);
      if (returnModal.affectation.bien?.id) {
        await updateBienStatus(returnModal.affectation.bien.id, { statutOperationnel: "ACTIF", service: "" }).catch(() => null);
      }
      setReturnModal(null);
      await loadData();
      showToast({ type: "success", title: "Bien retourne au registre actif" });
    } finally {
      setReturning(false);
    }
  };

  const handleSignatureConfirm = async (dataUrl: string, validatorName: string) => {
    if (!signingAffectation) return;
    setSignatureModalOpen(false);
    try {
      showToast({ type: 'info', title: 'Génération du PDF signé...' });
      const pdfBlob = await generateAffectationPdf(signingAffectation, signingAffectation.bien, { signerName: validatorName, signatureDataUrl: dataUrl });
      await validerAffectationAvecDocument(signingAffectation.id!, pdfBlob, validatorName);
      showToast({ type: 'success', title: 'Affectation validée et PDF signé enregistré' });
      setSigningAffectation(null);
      await loadData();
    } catch (err) {
      console.error(err);
      showToast({ type: 'error', title: 'Erreur lors de l\'export/validation' });
    }
  };

  const handleDelete = async (item: Affectation) => {
    if (!item.id) return;
    if (!window.confirm("Êtes-vous sûr de vouloir supprimer cette affectation ? Cette action est irréversible.")) return;
    try {
      await deleteAffectation(item.id);
      showToast({ type: "success", title: "Affectation supprimée" });
      await loadData();
    } catch (error) {
      showToast({ type: "error", title: "Erreur lors de la suppression" });
    }
  };

  const showHistory = async (bienId?: number | null) => {
    if (!bienId) return;
    const history = await getMouvementsByBien(bienId).catch(() => []);
    setTimelineData(Array.isArray(history) ? history as TimelineEntry[] : []);
    setShowTimeline(true);
  };

  const openEdit = (item: Affectation) => {
    setForm({
      ...EMPTY_FORM,
      id: item.id,
      bien: item.bien || null,
      service: item.service || "",
      detenteurA: item.detenteurA || "MAGASIN CENTRAL",
      responsableReception: item.detenteur || "",
      dateAffectation: item.dateAffectation ? item.dateAffectation.slice(0, 10) : today,
      motif: item.motif || "",
      signatureUrl: item.signatureUrl || "",
      documentsUrls: item.documentsUrls || [],
    });
    setView("FORM");
  };

  const [search, setSearch] = useState("");
  const [signatureModalOpen, setSignatureModalOpen] = useState(false);
  const [signingAffectation, setSigningAffectation] = useState<Affectation | null>(null);
  const filtered = useMemo(() =>
    data.filter(item =>
      !search ||
      (item.bien?.designation || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.bien?.iup || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.service || "").toLowerCase().includes(search.toLowerCase()) ||
      (item.detenteur || "").toLowerCase().includes(search.toLowerCase())
    ), [data, search]);

  const statsExtra = useMemo(() => ({
    ...stats,
    transferred: data.filter(i => normalizeValidationStatus(i.statutValidation) === "TRANSFERE").length,
  }), [data, stats]);

  return (
    <div className="module-container fade-in" style={{ padding: "28px" }}>
      {showTimeline ? <MouvementTimeline mouvements={timelineData as never} onClose={() => setShowTimeline(false)} /> : null}
      {viewerMedia && (
        <MediaViewer 
          url={viewerMedia.url} 
          type={viewerMedia.type} 
          filename={viewerMedia.filename} 
          onClose={() => setViewerMedia(null)} 
        />
      )}

      <header className="page-header-premium" style={{ marginBottom: 28 }}>
        <div className="header-meta">
          <span className="badge-pill-glow">Traçabilité & Détention</span>
          <h1>Gestion des Affectations</h1>
          <p className="header-subtitle">Suivi en temps réel des mouvements de biens et affectations aux services</p>
        </div>
        {view === "LIST" ? (
          <button className="primary-premium" type="button" onClick={() => setView("FORM")} style={{ background: "var(--primary)", color: "white", padding: "10px 20px", borderRadius: "8px", fontWeight: 600, border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)" }}>
            ＋ Nouvelle affectation
          </button>
        ) : (
          <button className="btn-export" type="button" onClick={() => { setView("LIST"); setForm(EMPTY_FORM); }}>
            ← Retour à la liste
          </button>
        )}
      </header>

      {/* KPI BANNER */}
      <div className="affectation-kpi-banner">
        <div className="aff-kpi-card kpi-total">
          <div className="aff-kpi-icon">📋</div>
          <div className="aff-kpi-body">
            <span className="aff-kpi-value">{statsExtra.total}</span>
            <span className="aff-kpi-label">Total</span>
          </div>
        </div>
        <div className="aff-kpi-card kpi-valide">
          <div className="aff-kpi-icon">✅</div>
          <div className="aff-kpi-body">
            <span className="aff-kpi-value">{statsExtra.validated}</span>
            <span className="aff-kpi-label">Validées</span>
          </div>
        </div>
        <div className="aff-kpi-card kpi-attente">
          <div className="aff-kpi-icon">⏳</div>
          <div className="aff-kpi-body">
            <span className="aff-kpi-value">{statsExtra.pending}</span>
            <span className="aff-kpi-label">En attente</span>
          </div>
        </div>
        <div className="aff-kpi-card kpi-transfer">
          <div className="aff-kpi-icon">🔄</div>
          <div className="aff-kpi-body">
            <span className="aff-kpi-value">{statsExtra.transferred}</span>
            <span className="aff-kpi-label">Transférés</span>
          </div>
        </div>
      </div>

      {/* ===== FORM VIEW ===== */}
      {view === "FORM" ? (
        <div className="aff-form-wrapper fade-in">
          <div className="aff-form-hero">
            <div className="aff-form-hero-icon">{form.id ? "✏️" : "📦"}</div>
            <div>
              <h2>{form.id ? "Modifier l'affectation" : "Nouvelle affectation"}</h2>
              <p>Sélection du bien, bénéficiaire et service — mise à jour automatique du statut</p>
            </div>
          </div>

          <div className="aff-form-body">
            <form onSubmit={handleSubmit} className="premium-dynamic-form">

              {/* Bien selector */}
              <div className="form-group-modern">
                <label>Bien à affecter</label>
                <BienSelector value={form.bien} onChange={(bien) => void handleBienChange(bien)} />
                <ErrorText message={errors.bien} />
                {form.bien?.service ? (
                  <span className="field-hint">Ce bien est actuellement affecté à <strong>{form.bien.service}</strong>. La nouvelle affectation le rebasculera.</span>
                ) : null}
              </div>

              {/* Recap cards */}
              {form.bien ? (
                <div className="aff-recap-card">
                  <span className="recap-icon">🏷️</span>
                  <div>
                    <strong>{form.bien.designation || "Bien sélectionné"}</strong>
                    <br />
                    <span>{form.bien.iup || "Sans IUP"} · {form.bien.statutOperationnel || "ACTIF"} · {form.bien.service || "Non affecté"}</span>
                  </div>
                </div>
              ) : null}

              {isTransferFlow ? (
                <div className="aff-recap-card" style={{ background: "linear-gradient(135deg,#fff7ed,#ffedd5)", borderColor: "#fed7aa" }}>
                  <span className="recap-icon">🔄</span>
                  <div>
                    <strong style={{ color: "#9a3412" }}>Réaffectation / Transfert</strong>
                    <br />
                    <span style={{ color: "#c2410c" }}>Ce flux va basculer le bien vers un nouveau détenteur ou service.</span>
                  </div>
                </div>
              ) : null}

              {form.bien?.quantite && form.bien.quantite > 1 ? (
                <div className="aff-recap-card" style={{ background: "linear-gradient(135deg,#f0fdf4,#dcfce7)", borderColor: "#86efac" }}>
                  <span className="recap-icon">📊</span>
                  <div>
                    <strong style={{ color: "#14532d" }}>Bien géré en quantité</strong>
                    <br />
                    <span style={{ color: "#15803d" }}>{form.bien.quantite} unité(s) disponible(s) — l'affectation décrémente le stock.</span>
                  </div>
                </div>
              ) : null}

              {/* Segmented beneficiary mode */}
              <div className="aff-segmented">
                <button type="button" className={form.beneficiaryMode === "PERSONNE" ? "active" : ""} onClick={() => updateForm("beneficiaryMode", "PERSONNE")}>
                  👤 Affecter à une personne
                </button>
                <button type="button" className={form.beneficiaryMode === "SERVICE" ? "active" : ""} onClick={() => updateForm("beneficiaryMode", "SERVICE")}>
                  🏢 Affecter à un service
                </button>
              </div>

              {form.beneficiaryMode === "PERSONNE" ? (
                <div className="grid-2">
                  <Field label="Matricule">
                    <input value={form.matricule} onChange={(e) => updateForm("matricule", e.target.value)} placeholder="Ex: AGT-2024-001" />
                    <small className="field-hint">
                      {loadingMatricule ? "🔍 Recherche en cours..." : matriculeMatched ? "✅ Agent trouvé — champs auto-remplis" : "Saisir le matricule pour auto-complétion"}
                    </small>
                  </Field>
                  <Field label="Fonction"><input value={form.fonction} onChange={(e) => updateForm("fonction", e.target.value)} /></Field>
                  <Field label="Nom" error={errors.nom}><input value={form.nom} onChange={(e) => updateForm("nom", e.target.value)} /></Field>
                  <Field label="Prénom"><input value={form.prenom} onChange={(e) => updateForm("prenom", e.target.value)} /></Field>
                  <Field label="Téléphone"><input value={form.telephone} onChange={(e) => updateForm("telephone", e.target.value)} /></Field>
                  <Field label="Email"><input type="email" value={form.email} onChange={(e) => updateForm("email", e.target.value)} /></Field>
                </div>
              ) : (
                <div className="grid-2">
                  <Field label="Responsable de réception" error={errors.responsableReception}>
                    <input value={form.responsableReception} onChange={(e) => updateForm("responsableReception", e.target.value)} />
                  </Field>
                </div>
              )}

              <div className="grid-2">
                <Field label="Service de destination" error={errors.service}>
                  <div className="field-inline">
                    <select value={form.service} onChange={(e) => updateForm("service", e.target.value)}>
                      <option value="">— Choisir le service —</option>
                      {services.map((s) => { const n = serviceName(s); return <option key={s.id} value={n}>{n}</option>; })}
                    </select>
                    <button type="button" className="btn-export" onClick={() => setShowServiceModal(true)}>+ Service</button>
                  </div>
                </Field>
                <Field label="Origine (Détenteur précédent)">
                  <input value={form.detenteurA} onChange={(e) => updateForm("detenteurA", e.target.value)} />
                </Field>
                <Field label="Date d'affectation">
                  <input type="date" value={form.dateAffectation} onChange={(e) => updateForm("dateAffectation", e.target.value)} />
                </Field>
                <Field label="Bordereau signé">
                  <FileUpload onUploadSuccess={(url) => updateForm("signatureUrl", url)} />
                  {form.signatureUrl && (
                    <div style={{ marginTop: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span className="badge-pill-glow" onClick={() => setViewerMedia({ url: getFullUrl(form.signatureUrl), type: form.signatureUrl?.match(/\.(jpg|jpeg|png|webp)$/i) ? 'image' : 'pdf', filename: 'Signature' })} style={{ cursor: 'pointer' }}>👁️ Voir signature</span>
                    </div>
                  )}
                </Field>
                <Field label="Documents joints (PV, Rapport...)">
                  <FileUpload onUploadSuccess={(url) => setForm(prev => ({ ...prev, documentsUrls: [...prev.documentsUrls, url] }))} />
                  {form.documentsUrls.length > 0 && (
                    <div style={{ marginTop: 8, display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                      {form.documentsUrls.map((url, i) => (
                        <span key={i} className="badge-pill-glow" onClick={() => setViewerMedia({ url: getFullUrl(url), type: url.match(/\.(jpg|jpeg|png|webp)$/i) ? 'image' : 'pdf', filename: `Doc ${i+1}` })} style={{ cursor: 'pointer', fontSize: 10 }}>Doc {i+1}</span>
                      ))}
                    </div>
                  )}
                </Field>
                <Field label="Motif" error={errors.motif} span>
                  <textarea rows={3} value={form.motif} onChange={(e) => updateForm("motif", e.target.value)} placeholder="Motif de l'affectation ou du transfert..." />
                </Field>
              </div>

              <button type="submit" className="primary-premium" disabled={saving} style={{ width: "100%", marginTop: "2rem", display: "flex", justifyContent: "center", gap: "8px", alignItems: "center", padding: "14px", fontSize: "16px", borderRadius: "12px", background: "var(--primary)", color: "white", fontWeight: 600, border: "none", cursor: "pointer", boxShadow: "0 4px 12px rgba(37, 99, 235, 0.2)" }}>
                {saving ? "⏳ Enregistrement..." : form.id ? "💾 Mettre à jour l'affectation" : "✅ Valider l'affectation"}
              </button>
            </form>
          </div>
        </div>

      ) : (
        /* ===== LIST VIEW ===== */
        <div className="affectation-list-wrapper fade-in">
          <div className="affectation-list-toolbar">
            <h2>📋 Liste des affectations ({filtered.length})</h2>
            <input
              className="aff-search-input"
              placeholder="🔍 Rechercher par bien, service, agent..."
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>

          <div className="affectation-cards-grid">
            {filtered.length === 0 ? (
              <div style={{ gridColumn: "1/-1", textAlign: "center", padding: "60px 20px", color: "#94a3b8" }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
                <p style={{ fontWeight: 600 }}>Aucune affectation trouvée</p>
              </div>
            ) : filtered.map((item) => {
              const statut = normalizeValidationStatus(item.statutValidation);
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

                      {/* Badge documents style BiensPage */}
                      {((item.documentsUrls && item.documentsUrls.length > 0) || item.signatureUrl) && (
                        <div 
                          className="asset-docs-badge-premium" 
                          style={{ position: 'absolute', bottom: 4, right: 4, background: 'rgba(255,255,255,0.9)', padding: '2px 6px', borderRadius: 6, display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', border: '1px solid #e2e8f0' }}
                          onClick={(e) => {
                            e.stopPropagation();
                            const url = item.documentsUrls?.[0] || item.signatureUrl;
                            if (url) {
                              setViewerMedia({ 
                                url: getFullUrl(url), 
                                type: url.match(/\.(jpg|jpeg|png|webp)$/i) ? 'image' : 'pdf', 
                                filename: `Document - ${item.bien?.designation || 'Affectation'}` 
                              });
                            }
                          }}
                        >
                          <FileText size={12} color="var(--primary)" />
                          <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--primary)' }}>
                            {(item.documentsUrls?.length || 0) + (item.signatureUrl ? 1 : 0)}
                          </span>
                        </div>
                      )}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                        <span className="aff-card-iup">{item.bien?.iup || "N/A"}</span>
                        <span className={`aff-status-pill status-${statut.toLowerCase()}`}>{statut}</span>
                      </div>
                      <p className="aff-card-designation" style={{ marginTop: 4 }}>{item.bien?.designation || "Bien non renseigné"}</p>
                    </div>
                  </div>

                  <div className="aff-card-meta">
                    <div className="aff-meta-row">
                      <span>🏢</span><strong>Service</strong>{item.service || "—"}
                    </div>
                    <div className="aff-meta-row">
                      <span>👤</span><strong>Détenteur</strong>{item.detenteur || item.detenteurA || "—"}
                    </div>
                    <div className="aff-meta-row">
                      <span>📅</span><strong>Date</strong>{item.dateAffectation ? new Date(item.dateAffectation).toLocaleDateString("fr-FR") : "—"}
                    </div>
                    {item.documentsUrls && item.documentsUrls.length > 0 && (
                      <div className="aff-meta-row">
                        <span>📎</span><strong>Documents</strong>
                        <div style={{ display: 'flex', gap: 4 }}>
                          {item.documentsUrls.map((url, idx) => (
                            <button 
                              key={idx}
                              type="button"
                              className="badge-pill-glow" 
                              style={{ padding: '2px 8px', fontSize: 10, cursor: 'pointer' }}
                              onClick={() => setViewerMedia({ url: getFullUrl(url), type: url.match(/\.(jpg|jpeg|png|webp)$/i) ? 'image' : 'pdf', filename: `Document ${idx+1}` })}
                            >Doc {idx + 1}</button>
                          ))}
                        </div>
                      </div>
                    )}
                    {item.signatureUrl && (
                      <div className="aff-meta-row">
                        <span>✍️</span><strong>Signature</strong>
                        <button 
                          type="button"
                          className="badge-pill-glow" 
                          style={{ padding: '2px 8px', fontSize: 10, cursor: 'pointer', borderColor: 'var(--success)' }}
                          onClick={() => setViewerMedia({ url: getFullUrl(item.signatureUrl!), type: item.signatureUrl!.match(/\.(jpg|jpeg|png|webp)$/i) ? 'image' : 'pdf', filename: 'Signature' })}
                        >Voir</button>
                      </div>
                    )}
                  </div>

                  <div className="aff-card-actions">
                    <button className="aff-action-btn" type="button" onClick={() => openEdit(item)}>✏️ Modifier</button>
                    <button className="aff-action-btn" type="button" onClick={() => void showHistory(item.bien?.id)}>📜 Historique</button>
                    <button className="aff-action-btn btn-danger" type="button" onClick={() => setReturnModal({ affectation: item, motif: "", dateRetour: today })}>↩️ Retourner</button>
                    <button className="aff-action-btn" type="button" onClick={() => openEdit(item)}>🔄 Transfert</button>
                    {canValidate && statut === "EN_ATTENTE" ? (
                      <button className="aff-action-btn btn-success" type="button" onClick={() => void handleValidate(item)}>✅ Valider</button>
                    ) : null}
                    {canValidate && statut === "EN_ATTENTE" ? (
                      <button className="aff-action-btn" type="button" onClick={() => { setSigningAffectation(item); setSignatureModalOpen(true); }}>📎 Export & Sign</button>
                    ) : null}
                    <button className="aff-action-btn" type="button" onClick={() => printAffectation(item)}>
                      🖨️ Imprimer
                    </button>
                    <button
                      className="aff-action-btn"
                      type="button"
                      onClick={() => exportBordereauMutationExcel(item as unknown as Record<string, string | number | boolean | null | undefined>, `BM_${item.id}.xlsx`)}
                    >📊 XLS</button>
                    {canValidate && (
                      <button className="aff-action-btn" type="button" onClick={() => void handleDelete(item)} style={{ color: "#ef4444" }}>
                        <Trash2 size={14} style={{ marginRight: 4 }} /> Supprimer
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* MODAL — Créer un service */}
      {showServiceModal ? (
        <div className="aff-modal-overlay">
          <div className="aff-modal-card">
            <div className="aff-modal-header">
              <div className="aff-modal-header-icon">🏢</div>
              <div>
                <h3>Créer un nouveau service</h3>
                <p>Ajoutez un service à l'annuaire de l'organisation</p>
              </div>
            </div>
            <div className="aff-modal-body">
              <div className="grid-2">
                <Field label="Nom du service"><input value={serviceForm.nomService} onChange={(e) => setServiceForm(c => ({ ...c, nomService: e.target.value }))} /></Field>
                <Field label="Code"><input value={serviceForm.code} onChange={(e) => setServiceForm(c => ({ ...c, code: e.target.value }))} /></Field>
                <Field label="Direction"><input value={serviceForm.direction} onChange={(e) => setServiceForm(c => ({ ...c, direction: e.target.value }))} /></Field>
                <Field label="Responsable"><input value={serviceForm.responsable} onChange={(e) => setServiceForm(c => ({ ...c, responsable: e.target.value }))} /></Field>
                <Field label="Localisation" span><input value={serviceForm.localisation} onChange={(e) => setServiceForm(c => ({ ...c, localisation: e.target.value }))} /></Field>
              </div>
              <ErrorText message={errors.serviceForm} />
            </div>
            <div className="aff-modal-footer">
              <button className="btn-cancel" type="button" onClick={() => setShowServiceModal(false)}>Annuler</button>
              <button className="btn-confirm" type="button" onClick={() => void createServiceInline()} disabled={savingService}>
                {savingService ? "Création..." : "🏢 Créer le service"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* MODAL — Retourner le bien */}
      {returnModal ? (
        <div className="aff-modal-overlay">
          <div className="aff-modal-card">
            <div className="aff-modal-header">
              <div className="aff-modal-header-icon" style={{ background: "#fee2e2" }}>↩️</div>
              <div>
                <h3>Retourner le bien</h3>
                <p>Le bien sera remis au stock actif et désaffecté</p>
              </div>
            </div>
            <div className="aff-modal-body">
              <Field label="Date de retour">
                <input type="date" value={returnModal.dateRetour} onChange={(e) => setReturnModal({ ...returnModal, dateRetour: e.target.value })} />
              </Field>
              <Field label="Motif de retour (obligatoire)" error={errors.retour}>
                <textarea rows={3} value={returnModal.motif} onChange={(e) => setReturnModal({ ...returnModal, motif: e.target.value })} placeholder="Raison du retour du bien..." />
              </Field>
            </div>
            <div className="aff-modal-footer">
              <button className="btn-cancel" type="button" onClick={() => setReturnModal(null)}>Annuler</button>
              <button className="btn-confirm btn-danger-confirm" type="button" onClick={() => void handleReturn()} disabled={returning}>
                {returning ? "Traitement..." : "↩️ Confirmer le retour"}
              </button>
            </div>
          </div>
        </div>
      ) : null}
      {/* Signature modal for exporting signed PDF */}
      <SignatureModal open={signatureModalOpen} onClose={() => { setSignatureModalOpen(false); setSigningAffectation(null); }} onConfirm={handleSignatureConfirm} />
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

