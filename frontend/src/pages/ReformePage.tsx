import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { annulerReforme, createReforme, getReformes, validerReforme } from "../api/api";
import { Bien, updateBien, updateBienStatus } from "../api/biens";
import BienSelector from "../components/BienSelector";
import FileUpload from "../components/FileUpload";
import { useToast } from "../contexts/ToastContext";

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

  return (
    <div className="reforme-module fade-in">
      <header className="page-header-premium">
        <div className="header-meta">
          <span className="badge-pill-glow">Sortie definitive du registre</span>
          <h1>Reforme du patrimoine</h1>
          <p className="header-subtitle">Workflow de soumission, validation responsable et archivage automatique du bien.</p>
        </div>
        {view === "LIST" ? (
          <button className="primary" type="button" onClick={() => setView("FORM")}>Nouvelle reforme</button>
        ) : (
          <button className="btn-export" type="button" onClick={() => setView("LIST")}>Retour</button>
        )}
      </header>

      {view === "FORM" ? (
        <div className="centered-form-card fade-in">
          <div className="form-header-premium">
            <h2>Procedure de sortie</h2>
          </div>
          <form className="premium-dynamic-form" onSubmit={submit}>
            <Field label="Bien selectionne" error={errors.bien}>
              <BienSelector value={form.bien} onChange={(bien) => updateForm("bien", bien)} />
            </Field>

            {form.bien ? (
              <div className="recap-card">
                <strong>{form.bien.iup} - {form.bien.designation}</strong>
                <span>Valeur initiale : {formatMoney(form.bien.valeur)} | VNC : {formatMoney(form.bien.valeurNetteComptable ?? form.bien.valeur)}</span>
                <span>Etat : {form.bien.etat} | Annees de service : {yearsOfService(form.bien.dateAcquisition)}</span>
                <span>Service : {form.bien.service || "Non renseigne"} | Localisation : {form.bien.localisation || "Non renseignee"}</span>
              </div>
            ) : null}

            <div className="recap-card">
              <strong>Controle reforme</strong>
              <span>{form.justificatifs.length} piece(s) justificative(s) jointe(s)</span>
              <span>{form.typeReforme === "MISE_AU_REBUT" ? "Valeur residuelle attendue : 0 FCFA." : "Renseigne les champs specifiques du type de reforme choisi."}</span>
            </div>

            <div className="grid-2">
              <Field label="Type de reforme">
                <select
                  value={form.typeReforme}
                  onChange={(event) => {
                    const nextType = event.target.value as TypeReforme;
                    updateForm("typeReforme", nextType);
                    if (nextType === "MISE_AU_REBUT") {
                      updateForm("valeurResiduelle", 0);
                    }
                  }}
                >
                  <option value="MISE_AU_REBUT">MISE_AU_REBUT - destruction physique</option>
                  <option value="VENTE_CESSION">VENTE_CESSION - cession a tiers</option>
                  <option value="TRANSFERT_INTER_MINISTERE">TRANSFERT_INTER_MINISTERE</option>
                  <option value="DON">DON - institution</option>
                  <option value="PERTE_SINISTRE">PERTE_SINISTRE</option>
                </select>
              </Field>
              <Field label="Date de sortie" error={errors.dateSortie}>
                <input type="date" value={form.dateSortie} onChange={(event) => updateForm("dateSortie", event.target.value)} />
              </Field>
              <Field label="Valeur residuelle FCFA" error={errors.valeurResiduelle}>
                <input type="number" min={0} value={form.valeurResiduelle} onChange={(event) => updateForm("valeurResiduelle", Number(event.target.value))} />
              </Field>
              {form.typeReforme === "VENTE_CESSION" ? (
                <>
                  <Field label="Prix de cession" error={errors.prixCession}><input type="number" min={0} value={form.prixCession} onChange={(event) => updateForm("prixCession", Number(event.target.value))} /></Field>
                  <Field label="Acheteur"><input value={form.acheteur} onChange={(event) => updateForm("acheteur", event.target.value)} /></Field>
                  <Field label="Reference acte"><input value={form.referenceActe} onChange={(event) => updateForm("referenceActe", event.target.value)} /></Field>
                </>
              ) : null}
              {form.typeReforme === "TRANSFERT_INTER_MINISTERE" ? (
                <>
                  <Field label="Ministere destinataire" error={errors.ministereDestinataire}><input value={form.ministereDestinataire} onChange={(event) => updateForm("ministereDestinataire", event.target.value)} /></Field>
                  <Field label="Numero ordre transfert"><input value={form.ordreTransfert} onChange={(event) => updateForm("ordreTransfert", event.target.value)} /></Field>
                </>
              ) : null}
              <Field label="Motif detaille" error={errors.motif} span>
                <textarea rows={4} value={form.motif} onChange={(event) => updateForm("motif", event.target.value)} />
              </Field>
              <Field label="Pieces justificatives" error={errors.justificatifs} span>
                <FileUpload onUploadSuccess={(url) => updateForm("justificatifs", [...form.justificatifs, url])} />
                {form.justificatifs.length > 0 ? <small className="field-hint">{form.justificatifs.length} piece(s) deja ajoutee(s).</small> : null}
              </Field>
            </div>

            <button type="submit" className="primary" disabled={saving}>
              {saving ? "Soumission..." : "Soumettre pour validation"}
            </button>
          </form>
        </div>
      ) : (
        <div className="table-card">
          <div className="gallery-filters">
            <select value={filterType} onChange={(event) => setFilterType(event.target.value)}>
              <option value="TOUS">Tous types</option>
              <option value="MISE_AU_REBUT">Mise au rebut</option>
              <option value="VENTE_CESSION">Vente / cession</option>
              <option value="TRANSFERT_INTER_MINISTERE">Transfert inter-ministere</option>
              <option value="DON">Don</option>
              <option value="PERTE_SINISTRE">Perte / sinistre</option>
            </select>
            <input type="date" value={period.from} onChange={(event) => setPeriod((current) => ({ ...current, from: event.target.value }))} />
            <input type="date" value={period.to} onChange={(event) => setPeriod((current) => ({ ...current, to: event.target.value }))} />
            <button type="button" className="btn-export" onClick={exportCsv}>Export Excel</button>
          </div>
          <table className="patris-table">
            <thead>
              <tr>
                <th>IUP</th>
                <th>Designation</th>
                <th>Type reforme</th>
                <th>Date sortie</th>
                <th>Valeur residuelle</th>
                <th>Statut validation</th>
                <th>Agent</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => (
                <tr key={item.id}>
                  <td className="monospace">{item.bien?.iup || "N/A"}</td>
                  <td>{item.bien?.designation || "Bien inconnu"}</td>
                  <td>{item.typeReforme}</td>
                  <td>{item.dateSortie || item.dateReforme}</td>
                  <td>{formatMoney(item.valeurResiduelle)}</td>
                  <td><span className={`status-badge status-${String(normalizeReformeStatus(item)).toLowerCase()}`}>{normalizeReformeStatus(item)}</span></td>
                  <td>{item.agent || "-"}</td>
                  <td>
                    <div className="table-actions">
                      {normalizeReformeStatus(item) === "EN_ATTENTE_VALIDATION" ? (
                        <>
                          <button type="button" disabled={actionLoadingId === item.id} onClick={() => void validateReforme(item)}>
                            {actionLoadingId === item.id ? "Validation..." : "Valider"}
                          </button>
                          <button type="button" disabled={actionLoadingId === item.id} onClick={() => void cancelReforme(item)}>
                            {actionLoadingId === item.id ? "Annulation..." : "Annuler"}
                          </button>
                        </>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
