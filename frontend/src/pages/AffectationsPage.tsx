import React, { useEffect, useState } from "react";
import { exportBordereauMutationExcel } from "../utils/exporters";
import {
  createAffectation,
  deleteAffectation,
  getAffectations,
  getMouvementsByBien,
  getOrigineAffectation,
  getServices,
  updateAffectation,
  validerAffectation,
} from "../api/api";
import { Bien as BienType, getBiens } from "../api/biens";
import { usePermissions } from "../contexts/PermissionsContext";
import MouvementTimeline from "../components/MouvementTimeline";
import FileUpload from "../components/FileUpload";
import { getCurrentUser } from "../api/auth";

interface Affectation {
  id: number;
  bien?: BienType | null;
  detenteur: string;
  service: string;
  dateAffectation: string;
  statutValidation: string;
  motif: string;
  signatureUrl?: string;
  detenteurA?: string;
  ministere?: string;
  posteComptable?: string;
}

interface AffectationForm {
  id?: number;
  bienId: string;
  detenteur: string;
  detenteurA: string;
  service: string;
  dateAffectation: string;
  motif: string;
  signatureUrl: string;
  ministere: string;
  posteComptable: string;
}

const EMPTY_FORM: AffectationForm = {
  bienId: "",
  detenteur: "",
  detenteurA: "",
  service: "",
  dateAffectation: new Date().toISOString().split("T")[0],
  motif: "",
  signatureUrl: "",
  ministere: "",
  posteComptable: "",
};

const AffectationsPage: React.FC = () => {
  const [view, setView] = useState<"LIST" | "FORM">("LIST");
  const [data, setData] = useState<Affectation[]>([]);
  const [biensList, setBiensList] = useState<BienType[]>([]);
  const [servicesList, setServicesList] = useState<Array<Record<string, unknown>>>([]);
  const [timelineData, setTimelineData] = useState<Array<Record<string, unknown>>>([]);
  const [showTimeline, setShowTimeline] = useState(false);
  const [form, setForm] = useState<AffectationForm>(EMPTY_FORM);
  const { permissions } = usePermissions();
  const user = getCurrentUser();
  const canValidate = permissions?.role === "ADMIN" || permissions?.role === "SUPERVISOR";

  const loadData = () => {
    getAffectations()
      .then((response) => setData((response as Affectation[]) ?? []))
      .catch(() => setData([]));
  };

  useEffect(() => {
    loadData();
    getBiens().then(setBiensList).catch(() => setBiensList([]));
    getServices().then((response) => setServicesList((response as Array<Record<string, unknown>>) ?? [])).catch(() => setServicesList([]));
  }, []);

  const handleAdd = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      const payload = {
        ...form,
        bien: form.bienId ? String(form.bienId) : undefined,
      };

      if (form.id) {
        await updateAffectation(form.id, payload);
      } else {
        await createAffectation(payload);
      }

      loadData();
      setView("LIST");
      setForm(EMPTY_FORM);
    } catch (error) {
      alert(`Erreur: ${error}`);
    }
  };

  const handleValidate = async (id: number) => {
    if (!window.confirm("Valider officiellement cette affectation ?")) return;
    try {
      await validerAffectation(id, user?.username || "admin");
      loadData();
    } catch (error) {
      alert(`Erreur: ${error}`);
    }
  };

  const showHistory = async (bienId: number) => {
    try {
      const history = await getMouvementsByBien(bienId);
      setTimelineData((history as Array<Record<string, unknown>>) ?? []);
      setShowTimeline(true);
    } catch {
      alert("Historique indisponible");
    }
  };

  const handleBienChange = async (bienId: string) => {
    setForm((previous) => ({ ...previous, bienId }));
    if (!bienId) return;

    try {
      const origine = await getOrigineAffectation(Number(bienId));
      setForm((previous) => ({ ...previous, detenteurA: String(origine || "MAGASIN CENTRAL") }));
    } catch {
      setForm((previous) => ({ ...previous, detenteurA: "MAGASIN CENTRAL" }));
    }
  };

  const openEdit = (item: Affectation) => {
    setForm({
      id: item.id,
      bienId: String(item.bien?.id ?? ""),
      detenteur: item.detenteur || "",
      detenteurA: item.detenteurA || "",
      service: item.service || "",
      dateAffectation: item.dateAffectation ? item.dateAffectation.split("T")[0] : EMPTY_FORM.dateAffectation,
      motif: item.motif || "",
      signatureUrl: item.signatureUrl || "",
      ministere: item.ministere || "",
      posteComptable: item.posteComptable || "",
    });
    setView("FORM");
  };

  return (
    <div className="module-container fade-in" style={{ padding: "24px" }}>
      {showTimeline && <MouvementTimeline mouvements={timelineData as never} onClose={() => setShowTimeline(false)} />}

      <header className="page-header-premium">
        <div className="header-meta">
          <span className="badge-pill-glow">Tracabilite & detention</span>
          <h1 style={{ fontSize: "32px", marginTop: "8px" }}>Affectations des biens</h1>
        </div>
        {view === "LIST" ? (
          <button className="primary" onClick={() => setView("FORM")}>+ Nouvelle affectation</button>
        ) : (
          <button className="btn-export" onClick={() => { setView("LIST"); setForm(EMPTY_FORM); }}>Retour</button>
        )}
      </header>

      {view === "FORM" ? (
        <div className="centered-form-card fade-in">
          <div className="form-header-premium">
            <h2>{form.id ? "Modifier l'affectation" : "Nouvelle mutation"}</h2>
            <button className="btn-back-cat" onClick={() => { setView("LIST"); setForm(EMPTY_FORM); }}>Annuler</button>
          </div>

          <form onSubmit={handleAdd} className="premium-dynamic-form">
            <div className="form-group-modern">
              <label>Actif / Bien a affecter</label>
              <select required value={form.bienId} onChange={(event) => handleBienChange(event.target.value)}>
                <option value="">-- Selectionner l'actif --</option>
                {biensList.map((bien) => (
                  <option key={bien.id ?? bien.codeBien} value={bien.id ?? ""}>
                    {bien.iup || bien.codeBien} - {bien.designation}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid-2">
              <div className="form-group-modern">
                <label>Ministere / Institution</label>
                <input value={form.ministere} onChange={(event) => setForm({ ...form, ministere: event.target.value })} />
              </div>
              <div className="form-group-modern">
                <label>Poste comptable</label>
                <input value={form.posteComptable} onChange={(event) => setForm({ ...form, posteComptable: event.target.value })} />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group-modern">
                <label>Origine (Detenteur A)</label>
                <input value={form.detenteurA} onChange={(event) => setForm({ ...form, detenteurA: event.target.value })} />
              </div>
              <div className="form-group-modern">
                <label>Beneficiaire (Detenteur B)</label>
                <input required value={form.detenteur} onChange={(event) => setForm({ ...form, detenteur: event.target.value })} />
              </div>
            </div>

            <div className="form-group-modern">
              <label>Service / Direction de destination</label>
              <div style={{ display: "flex", gap: "8px" }}>
                <select style={{ flex: 1 }} value={form.service} onChange={(event) => setForm({ ...form, service: event.target.value })}>
                  <option value="">-- Choisir le service --</option>
                  {servicesList.map((service) => (
                    <option key={String(service.id)} value={String(service.nomService || "")}>
                      {String(service.nomService || "")}
                    </option>
                  ))}
                </select>
                <input style={{ width: "200px" }} value={form.service} onChange={(event) => setForm({ ...form, service: event.target.value })} />
              </div>
            </div>

            <div className="grid-2">
              <div className="form-group-modern">
                <label>Date de mutation</label>
                <input type="date" required value={form.dateAffectation} onChange={(event) => setForm({ ...form, dateAffectation: event.target.value })} />
              </div>
              <div className="form-group-modern">
                <label>Scan du bordereau signe (optionnel)</label>
                <FileUpload onUploadSuccess={(url) => setForm({ ...form, signatureUrl: url })} />
              </div>
            </div>

            <div className="form-group-modern">
              <label>Motif de l'affectation</label>
              <textarea required rows={3} value={form.motif} onChange={(event) => setForm({ ...form, motif: event.target.value })} />
            </div>

            <button type="submit" className="primary" style={{ width: "100%", marginTop: "20px" }}>
              Soumettre la demande
            </button>
          </form>
        </div>
      ) : (
        <div className="asset-grid">
          {data.map((item) => (
            <div key={item.id} className="asset-card">
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "16px" }}>
                <span className="badge-premium">{new Date(item.dateAffectation).toLocaleDateString()}</span>
                <span className={`status-pill ${item.statutValidation === "VALIDE" ? "status-actif" : "status-degrade"}`} style={{ fontSize: "10px" }}>
                  {item.statutValidation === "VALIDE" ? "VALIDE" : "EN ATTENTE"}
                </span>
              </div>

              <h3>{item.bien?.designation || "Actif"}</h3>
              <p style={{ fontSize: "11px", color: "var(--text-dim)", marginBottom: "15px" }}>IUP: {item.bien?.iup || "N/A"}</p>

              <div className="info-box-premium">
                <p>De : <strong style={{ color: "var(--primary)" }}>{item.detenteurA || "Magasin Central"}</strong></p>
                <p>Vers : <strong>{item.detenteur}</strong></p>
                <p style={{ fontSize: "12px", color: "var(--text-dim)" }}>{item.service}</p>
              </div>

              <div style={{ display: "flex", gap: "8px", margin: "20px 0" }}>
                <button className="btn-export" style={{ flex: 1 }} onClick={() => openEdit(item)}>
                  Modifier
                </button>
                <button
                  className="btn-export"
                  style={{ flex: 1, fontSize: "11px" }}
                  onClick={() =>
                    exportBordereauMutationExcel(
                      ({
                        ...item,
                        ministere: item.ministere || "MINISTERE DU PATRIMOINE",
                        posteComptable: item.posteComptable || "POSTE LOME CENTRE",
                      } as never),
                      `BM_${item.id}.xlsx`
                    )
                  }
                >
                  XLS
                </button>
                <button className="btn-export" style={{ flex: 1, fontSize: "11px" }} onClick={() => window.print()}>
                  PDF
                </button>
              </div>

              {item.statutValidation === "EN_ATTENTE" && canValidate && (
                <button className="primary" style={{ width: "100%", marginBottom: "10px" }} onClick={() => handleValidate(item.id)}>
                  Valider mutation
                </button>
              )}

              <div className="card-actions-premium">
                <button onClick={() => item.bien?.id && showHistory(item.bien.id)} disabled={!item.bien?.id}>
                  Historique
                </button>
                <button style={{ color: "var(--danger)" }} onClick={() => deleteAffectation(item.id).then(loadData)}>
                  Suppr.
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AffectationsPage;
