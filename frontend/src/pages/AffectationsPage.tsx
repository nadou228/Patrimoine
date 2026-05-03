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
} from "../api/api";
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

const normalizeValidationStatus = (value?: Affectation["statutValidation"]) => {
  if (value === "VALIDÉ") return "VALIDE";
  if (value === "TRANSFÉRÉ") return "TRANSFERE";
  return value || "EN_ATTENTE";
};

function ErrorText({ message }: { message?: string }) {
  return message ? <span className="field-error">{message}</span> : null;
}

export default function AffectationsPage() {
  const location = useLocation();
  const { permissions } = usePermissions();
  const { showToast } = useToast();
  const user = getCurrentUser();
  const canValidate = permissions?.role === "ADMIN" || permissions?.role === "SUPERVISOR";

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

    const payload: AffectationPayload = {
      bien: { id: form.bien.id },
      bienId: form.bien.id,
      detenteur: beneficiaryLabel(),
      detenteurA: form.detenteurA,
      service: form.service,
      dateAffectation: form.dateAffectation,
      motif: form.motif,
      signatureUrl: form.signatureUrl,
      typeBeneficiaire: form.beneficiaryMode,
      responsableReception: form.responsableReception,
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
    });
    setView("FORM");
  };

  return (
    <div className="module-container fade-in" style={{ padding: "24px" }}>
      {showTimeline ? <MouvementTimeline mouvements={timelineData as never} onClose={() => setShowTimeline(false)} /> : null}

      <header className="page-header-premium">
        <div className="header-meta">
          <span className="badge-pill-glow">Tracabilite & detention</span>
          <h1>Affectations des biens</h1>
          <p className="header-subtitle">{stats.total} affectations | {stats.validated} validees | {stats.pending} en attente</p>
        </div>
        {view === "LIST" ? (
          <button className="primary" type="button" onClick={() => setView("FORM")}>Nouvelle affectation</button>
        ) : (
          <button className="btn-export" type="button" onClick={() => { setView("LIST"); setForm(EMPTY_FORM); }}>Retour</button>
        )}
      </header>

      {view === "FORM" ? (
        <div className="centered-form-card fade-in">
          <div className="form-header-premium">
            <div>
              <h2>{form.id ? "Modifier l'affectation" : "Nouvelle affectation"}</h2>
              <p className="form-subtitle">Selection du bien, beneficiaire, service API et mise a jour automatique du statut.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="premium-dynamic-form">
            <div className="form-group-modern">
              <label>Bien a affecter</label>
              <BienSelector value={form.bien} onChange={(bien) => void handleBienChange(bien)} />
              <ErrorText message={errors.bien} />
              {form.bien?.service ? (
                <span className="field-hint">Ce bien est actuellement affecte a {form.bien.service}. La nouvelle affectation le rebasculera.</span>
              ) : null}
            </div>

            {form.bien ? (
              <div className="recap-card" style={{ marginBottom: 20 }}>
                <strong>{form.bien.designation || "Bien selectionne"}</strong>
                <span>{form.bien.iup || "Sans IUP"} - {form.bien.statutOperationnel || "ACTIF"} - {form.bien.service || "Non affecte"}</span>
              </div>
            ) : null}

            {isTransferFlow ? (
              <div className="recap-card" style={{ marginBottom: 20 }}>
                <strong>Reaffectation / transfert</strong>
                <span>Ce flux va basculer le bien vers un nouveau detenteur ou un nouveau service.</span>
              </div>
            ) : null}

            {form.bien?.quantite && form.bien.quantite > 1 ? (
              <div className="recap-card" style={{ marginBottom: 20 }}>
                <strong>Bien gere en quantite</strong>
                <span>{form.bien.quantite} unite(s) disponible(s) sur ce bien. L'affectation doit etre suivie avec vigilance tant que la decrementaion back n'est pas specialisee.</span>
              </div>
            ) : null}

            <div className="segmented-control">
              <button type="button" className={form.beneficiaryMode === "PERSONNE" ? "active" : ""} onClick={() => updateForm("beneficiaryMode", "PERSONNE")}>
                Affecter a une personne
              </button>
              <button type="button" className={form.beneficiaryMode === "SERVICE" ? "active" : ""} onClick={() => updateForm("beneficiaryMode", "SERVICE")}>
                Affecter a un service
              </button>
            </div>

            {form.beneficiaryMode === "PERSONNE" ? (
              <div className="grid-2">
                <Field label="Matricule">
                  <input value={form.matricule} onChange={(event) => updateForm("matricule", event.target.value)} />
                  <small className="field-hint">
                    {loadingMatricule
                      ? "Recherche du matricule en cours..."
                      : matriculeMatched
                      ? "Utilisateur trouve et informations auto-remplies."
                      : "Si aucun agent n'est trouve, complete les champs manuellement."}
                  </small>
                </Field>
                <Field label="Fonction"><input value={form.fonction} onChange={(event) => updateForm("fonction", event.target.value)} /></Field>
                <Field label="Nom" error={errors.nom}><input value={form.nom} onChange={(event) => updateForm("nom", event.target.value)} /></Field>
                <Field label="Prenom"><input value={form.prenom} onChange={(event) => updateForm("prenom", event.target.value)} /></Field>
                <Field label="Telephone"><input value={form.telephone} onChange={(event) => updateForm("telephone", event.target.value)} /></Field>
                <Field label="Email"><input type="email" value={form.email} onChange={(event) => updateForm("email", event.target.value)} /></Field>
              </div>
            ) : (
              <div className="grid-2">
                <Field label="Responsable de reception" error={errors.responsableReception}>
                  <input value={form.responsableReception} onChange={(event) => updateForm("responsableReception", event.target.value)} />
                </Field>
              </div>
            )}

            <div className="grid-2">
              <Field label="Service de destination" error={errors.service}>
                <div className="field-inline">
                  <select value={form.service} onChange={(event) => updateForm("service", event.target.value)}>
                    <option value="">-- Choisir le service --</option>
                    {services.map((service) => {
                      const name = serviceName(service);
                      return <option key={service.id} value={name}>{name}</option>;
                    })}
                  </select>
                  <button type="button" className="btn-export" onClick={() => setShowServiceModal(true)}>+ Service</button>
                </div>
              </Field>
              <Field label="Origine">
                <input value={form.detenteurA} onChange={(event) => updateForm("detenteurA", event.target.value)} />
              </Field>
              <Field label="Date d'affectation">
                <input type="date" value={form.dateAffectation} onChange={(event) => updateForm("dateAffectation", event.target.value)} />
              </Field>
              <Field label="Bordereau signe">
                <FileUpload onUploadSuccess={(url) => updateForm("signatureUrl", url)} />
              </Field>
              <Field label="Motif" error={errors.motif} span>
                <textarea rows={3} value={form.motif} onChange={(event) => updateForm("motif", event.target.value)} />
              </Field>
            </div>

            <button type="submit" className="primary" disabled={saving}>
              {saving ? "Enregistrement..." : "Valider l'affectation"}
            </button>
          </form>
        </div>
      ) : (
        <div className="table-card">
          <table className="patris-table">
            <thead>
              <tr>
                <th>IUP</th>
                <th>Designation</th>
                <th>Affecte a</th>
                <th>Service</th>
                <th>Date</th>
                <th>Statut</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id}>
                  <td className="monospace">{item.bien?.iup || "N/A"}</td>
                  <td>{item.bien?.designation || "Bien non renseigne"}</td>
                  <td>{item.detenteur || item.detenteurA || "-"}</td>
                  <td>{item.service || "-"}</td>
                  <td>{item.dateAffectation ? new Date(item.dateAffectation).toLocaleDateString("fr-FR") : "-"}</td>
                  <td><span className={`status-badge status-${String(normalizeValidationStatus(item.statutValidation)).toLowerCase()}`}>{normalizeValidationStatus(item.statutValidation)}</span></td>
                  <td>
                    <div className="table-actions">
                      <button type="button" onClick={() => openEdit(item)}>Modifier</button>
                      <button type="button" onClick={() => void showHistory(item.bien?.id)}>Historique</button>
                      <button type="button" onClick={() => setReturnModal({ affectation: item, motif: "", dateRetour: today })}>Retourner</button>
                      <button type="button" onClick={() => openEdit(item)}>Transfert</button>
                      {canValidate && normalizeValidationStatus(item.statutValidation) === "EN_ATTENTE" ? <button type="button" onClick={() => void handleValidate(item)}>Valider</button> : null}
                      <button
                        type="button"
                        onClick={() => exportBordereauMutationExcel(item as Record<string, string | number | boolean | null | undefined>, `BM_${item.id}.xlsx`)}
                      >
                        XLS
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {showServiceModal ? (
        <div className="modal-overlay-premium">
          <div className="modal-card compact-modal">
            <h3>Créer un service</h3>
            <div className="grid-2">
              <Field label="Nom service"><input value={serviceForm.nomService} onChange={(event) => setServiceForm((current) => ({ ...current, nomService: event.target.value }))} /></Field>
              <Field label="Code"><input value={serviceForm.code} onChange={(event) => setServiceForm((current) => ({ ...current, code: event.target.value }))} /></Field>
              <Field label="Direction"><input value={serviceForm.direction} onChange={(event) => setServiceForm((current) => ({ ...current, direction: event.target.value }))} /></Field>
              <Field label="Responsable"><input value={serviceForm.responsable} onChange={(event) => setServiceForm((current) => ({ ...current, responsable: event.target.value }))} /></Field>
              <Field label="Localisation" span><input value={serviceForm.localisation} onChange={(event) => setServiceForm((current) => ({ ...current, localisation: event.target.value }))} /></Field>
            </div>
            <ErrorText message={errors.serviceForm} />
            <div className="modal-actions">
              <button type="button" className="primary" onClick={() => void createServiceInline()}>Créer</button>
              <button type="button" className="btn-export" onClick={() => setShowServiceModal(false)}>Annuler</button>
            </div>
          </div>
        </div>
      ) : null}

      {returnModal ? (
        <div className="modal-overlay-premium">
          <div className="modal-card compact-modal">
            <h3>Retourner le bien</h3>
            <Field label="Date retour">
              <input type="date" value={returnModal.dateRetour} onChange={(event) => setReturnModal({ ...returnModal, dateRetour: event.target.value })} />
            </Field>
            <Field label="Motif obligatoire" error={errors.retour}>
              <textarea rows={3} value={returnModal.motif} onChange={(event) => setReturnModal({ ...returnModal, motif: event.target.value })} />
            </Field>
            <div className="modal-actions">
              <button type="button" className="primary" onClick={() => void handleReturn()}>Confirmer le retour</button>
              <button type="button" className="btn-export" onClick={() => setReturnModal(null)}>Annuler</button>
            </div>
          </div>
        </div>
      ) : null}
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
