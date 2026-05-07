import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { createSinistre, deleteSinistre, getSinistres, updateSinistre } from "../api/api";
import { updateBienStatus } from "../api/biens";
import BienSelector from "../components/BienSelector";
import FileUpload from "../components/FileUpload";
import { useToast } from "../contexts/ToastContext";

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

const formatMoney = (value?: number) => `${Math.round(value || 0).toLocaleString("fr-FR")} FCFA`;

const normalizeSinistreStatus = (value?: string) => {
  if (value === "DÃ‰CLARÃ‰") return "DECLARE";
  if (value === "INDEMNISÃ‰") return "INDEMNISE";
  if (value === "REJETÃ‰") return "REJETE";
  if (value === "CLASSÃ‰") return "CLASSE";
  return value || "DECLARE";
};

function ErrorText({ message }: { message?: string }) {
  return message ? <span className="field-error">{message}</span> : null;
}

export default function SinistresPage() {
  const location = useLocation();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<"DECLARATIONS" | "ASSURANCE">("DECLARATIONS");
  const [view, setView] = useState<"LIST" | "FORM">("LIST");
  const [data, setData] = useState<Sinistre[]>([]);
  const [form, setForm] = useState<SinistreForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [followUp, setFollowUp] = useState<FollowUpForm>(null);
  const [savingFollowUp, setSavingFollowUp] = useState(false);

  const loadData = async () => {
    const response = await getSinistres().catch(() => []);
    setData(asSinistres(response));
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    const state = location.state as { prefillBien?: Bien } | null;
    if (!state?.prefillBien) return;
    setActiveTab("DECLARATIONS");
    setView("FORM");
    setForm((current) => ({ ...current, bien: state.prefillBien || null }));
    showToast({
      type: "info",
      title: "Bien preselectionne",
      message: `${state.prefillBien.designation} a ete injecte depuis la galerie des biens.`,
    });
  }, [location.state]);

  const updateForm = <K extends keyof SinistreForm>(key: K, value: SinistreForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validate = () => {
    const nextErrors: FormErrors = {};
    if (!form.bien?.id) nextErrors.bien = "Selectionnez le bien sinistre.";
    if (!form.dateSinistre || form.dateSinistre > today) nextErrors.dateSinistre = "La date doit etre inferieure ou egale a aujourd'hui.";
    if (form.description.trim().length < 100) nextErrors.description = "La description doit contenir au moins 100 caracteres.";
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
      showToast({ type: "success", title: "Sinistre declare", message: `Bien ${form.bien.iup} marque SINISTRE.` });
    } catch (error) {
      showToast({ type: "error", title: "Declaration impossible", message: error instanceof Error ? error.message : "Erreur API" });
    } finally {
      setSaving(false);
    }
  };

  const declarations = (
    <>
      {view === "FORM" ? (
        <div className="centered-form-card fade-in">
          <div className="form-header-premium">
            <h2>Nouvelle declaration</h2>
            <button type="button" className="btn-export" onClick={() => setView("LIST")}>Annuler</button>
          </div>
          <form className="premium-dynamic-form" onSubmit={submit}>
            <Field label="Bien concerne" error={errors.bien}>
              <BienSelector value={form.bien} onChange={(bien) => updateForm("bien", bien)} />
            </Field>
            {form.bien ? <div className="recap-card"><strong>{form.bien.iup} - {form.bien.designation}</strong><span>Valeur : {formatMoney(form.bien.valeur)} | VNC : {formatMoney(form.bien.valeurNetteComptable ?? form.bien.valeur)}</span></div> : null}
            <div className="grid-2">
              <Field label="Type">
                <select value={form.type} onChange={(event) => updateForm("type", event.target.value as SinistreType)}>
                  <option value="VOL">VOL</option>
                  <option value="INCENDIE">INCENDIE</option>
                  <option value="ACCIDENT">ACCIDENT</option>
                  <option value="DEGRADATION">DEGRADATION</option>
                  <option value="CATASTROPHE_NATURELLE">CATASTROPHE_NATURELLE</option>
                  <option value="AUTRE">AUTRE</option>
                </select>
              </Field>
              <Field label="Gravité">
                <select value={form.gravite} onChange={(event) => updateForm("gravite", event.target.value as Gravite)}>
                  <option value="MINEUR">MINEUR</option>
                  <option value="MAJEUR">MAJEUR</option>
                  <option value="PERTE_TOTALE">PERTE TOTALE (Entraine une réforme)</option>
                </select>
              </Field>
              <Field label="Date sinistre" error={errors.dateSinistre}>
                <input type="date" max={today} value={form.dateSinistre} onChange={(event) => updateForm("dateSinistre", event.target.value)} />
              </Field>
              <Field label="Montant dommages estime FCFA">
                <input type="number" min={0} value={form.montantEstime} onChange={(event) => updateForm("montantEstime", Number(event.target.value))} />
              </Field>
              <Field label="Reference police assurance">
                <input value={form.referencePolice} onChange={(event) => updateForm("referencePolice", event.target.value)} />
              </Field>
              <Field label="Description circonstances" error={errors.description} span>
                <textarea rows={4} value={form.description} onChange={(event) => updateForm("description", event.target.value)} />
              </Field>
              <Field label="Rapport de constat" error={errors.piecesJointes} span>
                <FileUpload onUploadSuccess={(url) => updateForm("piecesJointes", [...form.piecesJointes, url])} />
              </Field>
            </div>
            <button type="submit" className="primary danger-bg" disabled={saving}>{saving ? "Declaration..." : "Declarer le sinistre"}</button>
          </form>
        </div>
      ) : (
        <div className="table-card">
          <table className="patris-table">
            <thead><tr><th>Date</th><th>IUP</th><th>Designation</th><th>Type</th><th>Montant</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id}>
                  <td>{item.dateSinistre}</td>
                  <td className="monospace">{item.bien?.iup || "N/A"}</td>
                  <td>{item.bien?.designation || "-"}</td>
                  <td>{item.type}</td>
                  <td>{formatMoney(item.montantEstime)}</td>
                  <td><span className={`status-badge status-${String(normalizeSinistreStatus(item.statut)).toLowerCase()}`}>{normalizeSinistreStatus(item.statut)}</span></td>
                  <td><div className="table-actions"><button type="button" onClick={() => setFollowUp({ id: item.id, numeroDossierAssureur: item.numeroDossierAssureur || "", montantIndemnise: item.montantIndemnise || 0, datePaiement: item.datePaiement || "" })}>Suivi</button><button type="button" onClick={() => deleteSinistre(item.id).then(() => void loadData())}>Suppr.</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );

  return (
    <div className="sinistres-module fade-in">
      <header className="page-header-premium">
        <div className="header-meta">
          <span className="badge-pill-glow" style={{ borderColor: "var(--danger)", color: "var(--danger)" }}>Securite & assurance</span>
          <h1>Sinistres & incidents</h1>
        </div>
        {activeTab === "DECLARATIONS" && view === "LIST" ? <button className="primary danger-bg" type="button" onClick={() => setView("FORM")}>Declarer un sinistre</button> : null}
      </header>

      <div className="segmented-control">
        <button type="button" className={activeTab === "DECLARATIONS" ? "active" : ""} onClick={() => setActiveTab("DECLARATIONS")}>Declarations</button>
        <button type="button" className={activeTab === "ASSURANCE" ? "active" : ""} onClick={() => setActiveTab("ASSURANCE")}>Suivi assurance</button>
      </div>

      {activeTab === "DECLARATIONS" ? declarations : (
        <div className="asset-grid">
          {data.map((item) => (
            <article key={item.id} className="asset-card">
              <span className="badge-premium">{normalizeSinistreStatus(item.statut)}</span>
              <h3>{item.bien?.designation || "Sinistre"}</h3>
              <p>Dossier assureur : {item.numeroDossierAssureur || "Non renseigne"}</p>
              <p>Indemnisation : {formatMoney(item.montantIndemnise)}</p>
              <p>Gravité : <strong className={item.gravite === "PERTE_TOTALE" ? "danger-text" : ""}>{item.gravite || "NON DEFINIE"}</strong></p>
              <button type="button" className="btn-export" onClick={() => setFollowUp({ id: item.id, numeroDossierAssureur: item.numeroDossierAssureur || "", montantIndemnise: item.montantIndemnise || 0, datePaiement: item.datePaiement || "" })}>Mettre a jour suivi</button>
            </article>
          ))}
        </div>
      )}

      {followUp ? (
        <div 
          className="modal-overlay-premium" 
          style={{ 
            position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, 
            backgroundColor: 'rgba(15, 23, 42, 0.75)', zIndex: 9999,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px' 
          }}
        >
          <div 
            className="modal-card" 
            style={{ 
              background: '#ffffff', borderRadius: '16px', width: '100%', maxWidth: '500px',
              display: 'flex', flexDirection: 'column',
              maxHeight: '85vh', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.3)',
              overflow: 'hidden'
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '24px 24px 16px', borderBottom: '1px solid #e2e8f0', background: '#f8fafc' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', color: '#0f172a', fontWeight: 600 }}>Mise à jour du suivi assurance</h3>
            </div>

            {/* Modal Body (Scrollable) */}
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

            {/* Modal Footer (Fixed, Buttons Always Visible) */}
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
                className="primary"
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
                      await updateBienStatus(current.bien.id, { statutOperationnel: "REFORME" });
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
