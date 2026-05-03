import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { cloturerEntretien, createEntretien, deleteEntretien, getEntretiens } from "../api/api";
import { Bien, updateBien, updateBienStatus } from "../api/biens";
import BienSelector from "../components/BienSelector";
import FileUpload from "../components/FileUpload";
import { useToast } from "../contexts/ToastContext";

type EntretienType = "PREVENTIF" | "CURATIF" | "REGLEMENTAIRE" | "CONTROLE";
type EntretienStatut = "PLANIFIEE" | "EN_COURS" | "TERMINEE" | "EN_RETARD";
type ViewKey = "PLANNING" | "LISTE" | "ALERTES";

type Entretien = {
  id: number;
  bien?: Bien | null;
  type?: EntretienType | string;
  datePrevue?: string;
  dateRealisee?: string;
  prestataire?: string;
  cout?: number;
  observation?: string;
  description?: string;
  statut?: EntretienStatut | string;
};

type EntretienForm = {
  bien: Bien | null;
  type: EntretienType;
  datePrevue: string;
  dateRealisee: string;
  prestataire: string;
  cout: number;
  description: string;
  rapportUrl: string;
};

type FormErrors = Partial<Record<keyof EntretienForm, string>>;

const today = new Date().toISOString().slice(0, 10);

const EMPTY_FORM: EntretienForm = {
  bien: null,
  type: "PREVENTIF",
  datePrevue: today,
  dateRealisee: "",
  prestataire: "",
  cout: 0,
  description: "",
  rapportUrl: "",
};

const asEntretiens = (value: unknown): Entretien[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is Entretien => typeof item === "object" && item !== null && "id" in item);
};

const formatMoney = (value?: number) => `${Math.round(value || 0).toLocaleString("fr-FR")} FCFA`;

const addDays = (days: number) => {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
};

function ErrorText({ message }: { message?: string }) {
  return message ? <span className="field-error">{message}</span> : null;
}

export default function EntretiensPage() {
  const location = useLocation();
  const { showToast } = useToast();
  const [activeView, setActiveView] = useState<ViewKey>("PLANNING");
  const [showForm, setShowForm] = useState(false);
  const [data, setData] = useState<Entretien[]>([]);
  const [form, setForm] = useState<EntretienForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<Entretien | null>(null);

  const loadData = async () => {
    const response = await getEntretiens().catch(() => []);
    setData(asEntretiens(response));
  };

  useEffect(() => {
    void loadData();
  }, []);

  useEffect(() => {
    const state = location.state as { prefillBien?: Bien } | null;
    if (!state?.prefillBien) return;
    setActiveView("LISTE");
    setShowForm(true);
    setForm((current) => ({ ...current, bien: state.prefillBien || null }));
    showToast({
      type: "info",
      title: "Bien preselectionne",
      message: `${state.prefillBien.designation} a ete injecte depuis la galerie des biens.`,
    });
  }, [location.state]);

  const alerts = useMemo(() => {
    const limit = addDays(30);
    return data
      .filter((item) => item.datePrevue && item.datePrevue <= limit && item.statut !== "TERMINEE")
      .sort((a, b) => String(a.datePrevue).localeCompare(String(b.datePrevue)));
  }, [data]);

  const updateForm = <K extends keyof EntretienForm>(key: K, value: EntretienForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const validate = () => {
    const nextErrors: FormErrors = {};
    if (!form.bien?.id) nextErrors.bien = "Selectionnez le bien.";
    if (!form.datePrevue) nextErrors.datePrevue = "La date prevue est obligatoire.";
    if (form.dateRealisee && form.datePrevue && form.dateRealisee < form.datePrevue) {
      nextErrors.dateRealisee = "La date realisee ne peut pas preceder la date prevue.";
    }
    if (!form.prestataire.trim()) nextErrors.prestataire = "Le prestataire est obligatoire.";
    if (!form.description.trim()) nextErrors.description = "La description des travaux est obligatoire.";
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate() || !form.bien?.id) return;
    const nextMaintenance = addDays(180);
    try {
      setSaving(true);
      await createEntretien({
        bien: { id: form.bien.id },
        bienId: form.bien.id,
        type: form.type,
        datePrevue: form.datePrevue,
        dateRealisee: form.dateRealisee,
        prestataire: form.prestataire,
        cout: form.cout,
        observation: form.description,
        description: form.description,
        rapportUrl: form.rapportUrl,
        statut: form.dateRealisee ? "TERMINEE" : form.datePrevue === today ? "EN_COURS" : "PLANIFIEE",
      });
      await updateBien(form.bien.id, {
        dateDernierEntretien: form.dateRealisee || form.datePrevue,
        dateProchaineMaintenance: nextMaintenance,
      }).catch(() => null);
      await updateBienStatus(form.bien.id, {
        statutOperationnel: form.dateRealisee ? "ACTIF" : form.datePrevue === today ? "EN_MAINTENANCE" : form.bien.statutOperationnel || "ACTIF",
        service: form.bien.service || "",
      }).catch(() => null);
      await loadData();
      setForm(EMPTY_FORM);
      setShowForm(false);
      showToast({ type: "success", title: "Entretien enregistre" });
    } catch (error) {
      showToast({ type: "error", title: "Enregistrement impossible", message: error instanceof Error ? error.message : "Erreur API" });
    } finally {
      setSaving(false);
    }
  };

  const closeEntretien = async (item: Entretien) => {
    try {
      await cloturerEntretien(item.id).catch(() => null);
      if (item.bien?.id) {
        await updateBien(item.bien.id, {
          dateDernierEntretien: today,
        }).catch(() => null);
        await updateBienStatus(item.bien.id, { statutOperationnel: "ACTIF", service: item.bien.service || "" }).catch(() => null);
      }
      await loadData();
      showToast({ type: "success", title: "Entretien cloture", message: "Le bien est repasse en statut ACTIF." });
    } catch {
      showToast({ type: "error", title: "Cloture impossible" });
    }
  };

  const planning = (
    <div className="planning-board">
      {["Semaine 1", "Semaine 2", "Semaine 3", "Semaine 4"].map((week, index) => (
        <div key={week} className="planning-week">
          <h3>{week}</h3>
          {data.filter((item) => new Date(item.datePrevue || today).getDate() % 4 === index).map((item) => (
            <button key={item.id} type="button" className={`maintenance-block status-${String(item.statut || "PLANIFIEE").toLowerCase()}`} onClick={() => setSelected(item)}>
              <strong>{item.bien?.iup || "IUP"}</strong>
              <span>{item.datePrevue} - {item.type}</span>
            </button>
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div className="entretiens-module fade-in">
      <header className="page-header-premium">
        <div className="header-meta">
          <span className="badge-pill-glow">Maintenance proactive</span>
          <h1>Maintenance & entretiens</h1>
          <p className="header-subtitle">{alerts.length} alerte(s) dans les 30 prochains jours</p>
        </div>
        <button className="primary" type="button" onClick={() => setShowForm(true)}>Planifier</button>
      </header>

      <div className="segmented-control">
        <button type="button" className={activeView === "PLANNING" ? "active" : ""} onClick={() => setActiveView("PLANNING")}>Planning</button>
        <button type="button" className={activeView === "LISTE" ? "active" : ""} onClick={() => setActiveView("LISTE")}>Liste des entretiens</button>
        <button type="button" className={activeView === "ALERTES" ? "active" : ""} onClick={() => setActiveView("ALERTES")}>Alertes maintenance</button>
      </div>

      {activeView === "PLANNING" ? planning : null}

      {activeView === "LISTE" ? (
        <div className="table-card">
          <table className="patris-table">
            <thead><tr><th>IUP bien</th><th>Designation</th><th>Type</th><th>Date prevue</th><th>Date realisee</th><th>Prestataire</th><th>Cout</th><th>Statut</th><th>Actions</th></tr></thead>
            <tbody>
              {data.map((item) => (
                <tr key={item.id}>
                  <td className="monospace">{item.bien?.iup || "N/A"}</td>
                  <td>{item.bien?.designation || "-"}</td>
                  <td>{item.type}</td>
                  <td>{item.datePrevue}</td>
                  <td>{item.dateRealisee || "-"}</td>
                  <td>{item.prestataire}</td>
                  <td>{formatMoney(item.cout)}</td>
                  <td><span className={`status-badge status-${String(item.statut || "PLANIFIEE").toLowerCase()}`}>{item.statut || "PLANIFIEE"}</span></td>
                  <td><div className="table-actions"><button type="button" onClick={() => setSelected(item)}>Detail</button><button type="button" onClick={() => void closeEntretien(item)}>Cloturer</button><button type="button" onClick={() => deleteEntretien(item.id).then(() => void loadData())}>Suppr.</button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}

      {activeView === "ALERTES" ? (
        <div className="asset-grid">
          {alerts.map((item) => {
            const urgent = item.datePrevue && item.datePrevue < today ? "danger" : item.datePrevue && item.datePrevue <= addDays(7) ? "warning" : "info";
            return (
              <article key={item.id} className={`asset-card alert-${urgent}`}>
                <span className="badge-premium">{item.datePrevue}</span>
                <h3>{item.bien?.designation || "Bien"}</h3>
                <p>{item.type} - {item.prestataire || "Prestataire a definir"}</p>
                <button type="button" className="btn-export" onClick={() => { updateForm("bien", item.bien || null); updateForm("type", (item.type as EntretienType) || "PREVENTIF"); setShowForm(true); }}>Planifier</button>
              </article>
            );
          })}
        </div>
      ) : null}

      {showForm ? (
        <div className="modal-overlay-premium">
          <div className="modal-card large-modal">
            <h3>Creation entretien</h3>
            <form className="premium-dynamic-form" onSubmit={submit}>
              <Field label="Bien" error={errors.bien}><BienSelector value={form.bien} onChange={(bien) => updateForm("bien", bien)} /></Field>
              <div className="grid-2">
                <Field label="Type"><select value={form.type} onChange={(event) => updateForm("type", event.target.value as EntretienType)}><option value="PREVENTIF">PREVENTIF</option><option value="CURATIF">CURATIF</option><option value="REGLEMENTAIRE">REGLEMENTAIRE</option><option value="CONTROLE">CONTROLE</option></select></Field>
                <Field label="Date prevue" error={errors.datePrevue}><input type="date" value={form.datePrevue} onChange={(event) => updateForm("datePrevue", event.target.value)} /></Field>
                <Field label="Date realisee"><input type="date" value={form.dateRealisee} onChange={(event) => updateForm("dateRealisee", event.target.value)} /></Field>
                <Field label="Cout FCFA"><input type="number" min={0} value={form.cout} onChange={(event) => updateForm("cout", Number(event.target.value))} /></Field>
                <Field label="Prestataire" error={errors.prestataire}><input value={form.prestataire} onChange={(event) => updateForm("prestataire", event.target.value)} /></Field>
                <Field label="Rapport intervention"><FileUpload onUploadSuccess={(url) => updateForm("rapportUrl", url)} /></Field>
                <Field label="Description travaux" error={errors.description} span><textarea rows={3} value={form.description} onChange={(event) => updateForm("description", event.target.value)} /></Field>
              </div>
              <div className="modal-actions"><button type="submit" className="primary" disabled={saving}>{saving ? "Enregistrement..." : "Enregistrer"}</button><button type="button" className="btn-export" onClick={() => setShowForm(false)}>Annuler</button></div>
            </form>
          </div>
        </div>
      ) : null}

      {selected ? (
        <div className="side-panel-overlay" onClick={() => setSelected(null)}>
          <aside className="side-panel" onClick={(event) => event.stopPropagation()}>
            <div className="modal-card">
              <h3>{selected.bien?.designation || "Detail entretien"}</h3>
              <p>IUP : {selected.bien?.iup || "N/A"}</p>
              <p>Type : {selected.type}</p>
              <p>Date prevue : {selected.datePrevue}</p>
              <p>Prestataire : {selected.prestataire}</p>
              <p>{selected.description || selected.observation}</p>
              <button type="button" className="btn-export" onClick={() => setSelected(null)}>Fermer</button>
            </div>
          </aside>
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
