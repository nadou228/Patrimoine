import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { cloturerEntretien, createEntretien, deleteEntretien, getEntretiens } from "../api/api";
import { Bien, updateBien, updateBienStatus } from "../api/biens";
import BienSelector from "../components/BienSelector";
import FileUpload from "../components/FileUpload";
import { useToast } from "../contexts/ToastContext";
import { 
  Sparkles, Wrench, Clock, CheckCircle2, AlertTriangle, 
  Calendar, DollarSign, Search, PlusCircle, LayoutGrid,
  ChevronRight, X, FileText, ClipboardList, Activity, History, Settings,
  Trash2
} from "lucide-react";
import AnimatedNumber from "../components/AnimatedNumber";
import { motion, AnimatePresence } from "framer-motion";
import { API_BASE_URL } from "../api/api";
import MediaViewer from "../components/MediaViewer";

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

const normalizeUrl = (url?: string) => {
  if (!url || url === "" || url === "null" || url === "undefined") return "";
  if (url.startsWith("http")) return url;
  const baseUrl = API_BASE_URL.endsWith("/") ? API_BASE_URL.slice(0, -1) : API_BASE_URL;
  return `${baseUrl}${url.startsWith("/") ? "" : "/"}${url}`;
};
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
  const [viewerMedia, setViewerMedia] = useState<{ url: string; type: "image" | "pdf"; filename: string } | null>(null);

  const views = [
    { id: "PLANNING", label: "Planning Visuel", icon: <Calendar size={18} /> },
    { id: "LISTE", label: "Registre Complet", icon: <ClipboardList size={18} /> },
    { id: "ALERTES", label: "Maintenance Critique", icon: <AlertTriangle size={18} /> }
  ];

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

      // SECURITE : On utilise uniquement updateBienStatus qui est un endpoint spécifique et sûr.
      // On ne fait plus d'appel à updateBien (PUT) ici car il risque d'écraser les autres champs (photo, valeur...).
      await updateBienStatus(form.bien.id, {
        statutOperationnel: form.dateRealisee ? "ACTIF" : form.datePrevue === today ? "EN_MAINTENANCE" : form.bien.statutOperationnel || "ACTIF",
        service: typeof form.bien.service === 'object' ? ((form.bien.service as any).nomService || (form.bien.service as any).nom || "") : (form.bien.service || ""),
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
        await updateBienStatus(item.bien.id, {
          statutOperationnel: "ACTIF",
          service: typeof item.bien.service === 'object' ? ((item.bien.service as any).nomService || (item.bien.service as any).nom || "") : (item.bien.service || ""),
        }).catch(() => null);
      }
      await loadData();
      showToast({ type: "success", title: "Entretien cloture", message: "Le bien est repasse en statut ACTIF." });
    } catch {
      showToast({ type: "error", title: "Cloture impossible" });
    }
  };

  return (
    <div className="entretiens-module fade-in" style={{ padding: '32px', background: '#f8fafc', minHeight: '100vh' }}>
      <AnimatePresence>
        {viewerMedia && (
          <MediaViewer
            url={viewerMedia.url}
            type={viewerMedia.type}
            filename={viewerMedia.filename}
            onClose={() => setViewerMedia(null)}
          />
        )}
      </AnimatePresence>
      
      {showForm ? (
        <div className="fade-in" style={{ maxWidth: '860px', margin: '0 auto' }}>
          <div style={{ marginBottom: '24px' }}>
            <button 
              onClick={() => setShowForm(false)}
              className="aff-action-btn"
              style={{ background: '#fff', padding: '10px 20px' }}
            >
              ← Retour au registre
            </button>
          </div>

          <div className="aff-form-wrapper">
            <div className="aff-form-hero" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)' }}>
              <div className="aff-form-hero-icon">🛠️</div>
              <div>
                <h2>Programmer une intervention</h2>
                <p>Veuillez renseigner les détails de la maintenance préventive ou curative</p>
              </div>
            </div>

            <div className="aff-form-body">
              <form onSubmit={submit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <div style={{ gridColumn: 'span 2' }}>
                    <Field label="Bien concerné" error={errors.bien}>
                      <BienSelector value={form.bien} onChange={(bien) => updateForm("bien", bien)} />
                    </Field>
                  </div>
                  
                  <Field label="Type d'intervention">
                    <select 
                      value={form.type} 
                      onChange={(e) => updateForm("type", e.target.value as EntretienType)}
                      className="aff-search-input"
                      style={{ width: '100%', height: '42px' }}
                    >
                      <option value="PREVENTIF">Maintenance Préventive</option>
                      <option value="CURATIF">Réparation Curative</option>
                      <option value="REGLEMENTAIRE">Contrôle Réglementaire</option>
                      <option value="CONTROLE">Simple Contrôle</option>
                    </select>
                  </Field>

                  <Field label="Date prévue" error={errors.datePrevue}>
                    <input 
                      type="date" 
                      value={form.datePrevue} 
                      onChange={(e) => updateForm("datePrevue", e.target.value)}
                      className="aff-search-input"
                      style={{ width: '100%', height: '42px' }}
                    />
                  </Field>

                  <Field label="Prestataire / Technicien" error={errors.prestataire}>
                    <input 
                      placeholder="Nom de l'entreprise ou du technicien"
                      value={form.prestataire} 
                      onChange={(e) => updateForm("prestataire", e.target.value)}
                      className="aff-search-input"
                      style={{ width: '100%', height: '42px' }}
                    />
                  </Field>

                  <Field label="Coût estimatif (FCFA)">
                    <input 
                      type="number" 
                      value={form.cout} 
                      onChange={(e) => updateForm("cout", Number(e.target.value))}
                      className="aff-search-input"
                      style={{ width: '100%', height: '42px' }}
                    />
                  </Field>

                  <div style={{ gridColumn: 'span 2' }}>
                    <Field label="Description détaillée des travaux" error={errors.description}>
                      <textarea 
                        rows={3} 
                        value={form.description} 
                        onChange={(e) => updateForm("description", e.target.value)}
                        placeholder="Détaillez les tâches à accomplir..."
                        className="aff-search-input"
                        style={{ width: '100%', minHeight: '80px', padding: '12px' }}
                      />
                    </Field>
                  </div>

                  <div style={{ gridColumn: 'span 2' }}>
                    <Field label="Documents (Devis, Rapport, Photo)">
                      <FileUpload onUploadSuccess={(url) => updateForm("rapportUrl", url)} />
                    </Field>
                  </div>
                </div>

                <div style={{ marginTop: '32px', display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                  <button 
                    type="button" 
                    onClick={() => setShowForm(false)}
                    className="aff-action-btn"
                    style={{ padding: '10px 24px', fontSize: '14px' }}
                  >
                    Annuler
                  </button>
                  <button 
                    type="submit" 
                    disabled={saving}
                    className="aff-action-btn btn-primary"
                    style={{ padding: '10px 32px', fontSize: '14px' }}
                  >
                    {saving ? "Planification..." : "💾 Confirmer la planification"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>

      ) : (
        <>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '32px', background: '#fff', padding: '32px', borderRadius: '24px', border: '1px solid #e2e8f0', boxShadow: '0 4px 20px rgba(0,0,0,0.03)' }}>
            <div>
              <span style={{ background: '#e0f2fe', color: '#0369a1', padding: '6px 16px', borderRadius: '99px', fontSize: '12px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>PLANIFICATION & MAINTENANCE</span>
              <h1 style={{ fontSize: '32px', fontWeight: 900, color: '#0f172a', margin: '12px 0 0 0' }}>Gestion de la Maintenance</h1>
              <p style={{ color: '#64748b', fontSize: '15px', marginTop: '4px' }}>Suivi des interventions préventives et curatives du patrimoine</p>
            </div>
            <button 
              onClick={() => { setForm(EMPTY_FORM); setShowForm(true); }}
              style={{ 
                background: '#0ea5e9', 
                color: '#fff', 
                padding: '12px 24px', 
                borderRadius: '12px', 
                border: 'none', 
                fontWeight: 700, 
                fontSize: '15px', 
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '10px',
                boxShadow: '0 4px 12px rgba(14, 165, 233, 0.2)'
              }}
            >
              <PlusCircle size={20} />
              Programmer une intervention
            </button>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '24px', marginBottom: '32px' }}>
            <MetricCard label="TOTAL" value={data.length} icon={<History size={20} color="#6366f1" />} color="#6366f1" />
            <MetricCard label="EN COURS" value={data.filter(i => i.statut !== 'TERMINEE').length} icon={<Activity size={20} color="#0ea5e9" />} color="#0ea5e9" />
            <MetricCard label="TERMINÉES" value={data.filter(i => i.statut === 'TERMINEE').length} icon={<CheckCircle2 size={20} color="#10b981" />} color="#10b981" />
            <MetricCard label="CRITIQUES" value={alerts.length} icon={<AlertTriangle size={20} color="#ef4444" />} color="#ef4444" />
          </div>

          <div style={{ background: '#fff', borderRadius: '24px 24px 0 0', border: '1px solid #e2e8f0', borderBottom: 'none', padding: '24px 32px 0' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', gap: '32px' }}>
                {views.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setActiveView(v.id as any)}
                    style={{
                      padding: '16px 0',
                      background: 'none',
                      border: 'none',
                      borderBottom: activeView === v.id ? '3px solid #0ea5e9' : '3px solid transparent',
                      color: activeView === v.id ? '#0f172a' : '#64748b',
                      fontWeight: activeView === v.id ? 800 : 600,
                      fontSize: '14px',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      transition: 'all 0.2s'
                    }}
                  >
                    {v.icon} {v.label}
                  </button>
                ))}
              </div>
              <div className="affectation-list-toolbar" style={{ border: 'none', padding: 0 }}>
                 <input
                    className="aff-search-input"
                    placeholder="🔍 Rechercher une intervention..."
                    style={{ width: '300px' }}
                 />
              </div>
            </div>
          </div>

          {activeView === "PLANNING" ? (
            <div className="affectation-list-wrapper fade-in" style={{ borderTop: 'none', paddingTop: '24px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '18px', padding: '0 24px' }}>
                {["Semaine 1", "Semaine 2", "Semaine 3", "Semaine 4"].map((week, index) => (
                  <div key={week} style={{ background: '#f8fafc', borderRadius: '16px', padding: '16px', border: '1px solid #e2e8f0' }}>
                    <h3 style={{ fontSize: '13px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '8px' }}>
                      <Calendar size={14} /> {week}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                      {data
                        .filter((item) => new Date(item.datePrevue || today).getDate() % 4 === index)
                        .map((item) => (
                          <div 
                            key={item.id} 
                            className="aff-card"
                            onClick={() => setSelected(item)}
                            style={{ padding: '12px', cursor: 'pointer', minHeight: 'auto' }}
                          >
                            <div style={{ fontSize: '10px', fontWeight: 700, color: '#6366f1', marginBottom: '4px' }}>{item.bien?.iup}</div>
                            <div style={{ fontSize: '12px', fontWeight: 700, color: '#1e293b', marginBottom: '4px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.bien?.designation}</div>
                            <div style={{ fontSize: '10px', color: '#64748b' }}>{item.datePrevue}</div>
                          </div>
                        ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          {activeView === "LISTE" ? (
            <div className="affectation-list-wrapper fade-in" style={{ borderTop: 'none' }}>
              <div className="affectation-cards-grid">
                {data.map((item) => {
                  const photo = item.bien?.photoUrl || (item.bien as any)?.photo;
                  const imgUrl = photo ? normalizeUrl(photo) : null;
                  const statut = (item.statut || "PLANIFIEE").toLowerCase();
                  
                  return (
                    <div className="aff-card" key={item.id}>
                      <div className="aff-card-header">
                        <div style={{ width: "48px", height: "48px", borderRadius: "8px", overflow: "hidden", flexShrink: 0, background: "#f1f5f9", border: "1px solid #e2e8f0" }}>
                          {imgUrl ? (
                            <img src={imgUrl} alt="Bien" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>📦</div>
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <span className="aff-card-iup">{item.bien?.iup || "N/A"}</span>
                            <span className={`aff-status-pill status-${statut === "terminee" ? "valide" : statut === "en_cours" ? "transfere" : "en_attente"}`}>
                              {item.statut || "PLANIFIÉE"}
                            </span>
                          </div>
                          <p className="aff-card-designation" style={{ marginTop: 4 }}>{item.bien?.designation || "Bien non identifié"}</p>
                        </div>
                      </div>

                      <div className="aff-card-meta">
                        <div className="aff-meta-row">
                          <span>🛠️</span><strong>Type</strong>{item.type}
                        </div>
                        <div className="aff-meta-row">
                          <span>📅</span><strong>Date prévue</strong>{item.datePrevue || "—"}
                        </div>
                        <div className="aff-meta-row">
                          <span>👷</span><strong>Prestataire</strong>{item.prestataire || "—"}
                        </div>
                        <div className="aff-meta-row">
                          <span>💰</span><strong>Coût</strong>{formatMoney(item.cout)}
                        </div>
                      </div>

                      <div className="aff-card-actions">
                        <button className="aff-action-btn" type="button" onClick={() => setSelected(item)}>👁️ Détails</button>
                        
                        {(item as any).rapportUrl && (
                          <button 
                            className="aff-action-btn" 
                            type="button" 
                            onClick={() => {
                              const url = (item as any).rapportUrl;
                              const isImage = url.match(/\.(jpg|jpeg|png|webp)$/i);
                              setViewerMedia({ 
                                url: normalizeUrl(url), 
                                type: isImage ? "image" : "pdf", 
                                filename: `Document - ${item.bien?.designation || "Entretien"}` 
                              });
                            }}
                            title="Voir le document attaché"
                          >
                            <FileText size={14} style={{ marginRight: 4 }} /> Doc.
                          </button>
                        )}

                        {item.statut !== "TERMINEE" && (
                          <button className="aff-action-btn btn-success" type="button" onClick={() => void closeEntretien(item)}>✅ Clôturer</button>
                        )}
                        <button className="aff-action-btn" type="button" onClick={() => deleteEntretien(item.id).then(() => void loadData())} style={{ color: "#ef4444" }}>
                          <Trash2 size={14} style={{ marginRight: 4 }} /> Supprimer
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {activeView === "ALERTES" ? (
            <div className="affectation-list-wrapper fade-in" style={{ borderTop: 'none' }}>
              <div className="affectation-cards-grid">
                {alerts.map((item) => {
                  const photo = item.bien?.photoUrl || (item.bien as any)?.photo;
                  const imgUrl = photo ? normalizeUrl(photo) : null;
                  const urgent = item.datePrevue && item.datePrevue < today ? "danger" : item.datePrevue && item.datePrevue <= addDays(7) ? "warning" : "info";
                  
                  return (
                    <div className="aff-card" key={item.id} style={{ borderLeft: `4px solid ${urgent === 'danger' ? '#ef4444' : urgent === 'warning' ? '#f59e0b' : '#3b82f6'}` }}>
                      <div className="aff-card-header">
                        <div style={{ width: "48px", height: "48px", borderRadius: "8px", overflow: "hidden", flexShrink: 0, background: "#f1f5f9", border: "1px solid #e2e8f0" }}>
                          {imgUrl ? (
                            <img src={imgUrl} alt="Bien" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                          ) : (
                            <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px" }}>📦</div>
                          )}
                        </div>
                        <div style={{ flex: 1 }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                            <span className="aff-card-iup">{item.bien?.iup || "N/A"}</span>
                            <span className={`aff-status-pill status-en_attente`} style={{ color: urgent === 'danger' ? '#ef4444' : '#d97706' }}>
                              {urgent === 'danger' ? 'RETARD' : 'PROCHE'}
                            </span>
                          </div>
                          <p className="aff-card-designation" style={{ marginTop: 4 }}>{item.bien?.designation || "Bien"}</p>
                        </div>
                      </div>

                      <div className="aff-card-meta">
                        <div className="aff-meta-row">
                          <span>⚠️</span><strong>Alerte</strong>{item.type}
                        </div>
                        <div className="aff-meta-row">
                          <span>📅</span><strong>Échéance</strong>{item.datePrevue}
                        </div>
                      </div>

                      <div className="aff-card-actions">
                        <button className="aff-action-btn btn-primary" type="button" onClick={() => { updateForm("bien", item.bien || null); updateForm("type", (item.type as EntretienType) || "PREVENTIF"); setShowForm(true); }}>🛠️ Régulariser</button>
                        <button className="aff-action-btn" type="button" onClick={() => setSelected(item)}>👁️ Détails</button>
                        
                        {(item as any).rapportUrl && (
                          <button 
                            className="aff-action-btn" 
                            type="button" 
                            onClick={() => {
                              const url = (item as any).rapportUrl;
                              const isImage = url.match(/\.(jpg|jpeg|png|webp)$/i);
                              setViewerMedia({ 
                                url: normalizeUrl(url), 
                                type: isImage ? "image" : "pdf", 
                                filename: `Document - ${item.bien?.designation || "Entretien"}` 
                              });
                            }}
                            title="Voir le document"
                          >
                            <FileText size={14} style={{ marginRight: 4 }} /> Doc.
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}
        </>
      )}

      <AnimatePresence>
        {selected && (
          <div className="aff-modal-overlay" style={{ zIndex: 1100, display: 'flex', justifyContent: 'flex-end', padding: 0 }}>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}
            />
            <motion.aside 
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              style={{ 
                width: '100%', 
                maxWidth: '480px', 
                height: '100%', 
                background: '#fff', 
                position: 'relative', 
                zIndex: 2,
                boxShadow: '-20px 0 60px rgba(15,23,42,0.1)',
                display: 'flex',
                flexDirection: 'column'
              }}
            >
              <div className="aff-modal-header">
                <div className="aff-modal-header-icon">👁️</div>
                <div>
                  <h3>Détails de l'intervention</h3>
                  <p>Récapitulatif complet des travaux effectués ou prévus</p>
                </div>
                <button 
                  onClick={() => setSelected(null)}
                  style={{ marginLeft: 'auto', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>
                {/* Asset Summary Card */}
                <div className="aff-card" style={{ marginBottom: '24px', borderStyle: 'dashed' }}>
                   {(() => {
                        const photo = selected.bien?.photoUrl || (selected.bien as any)?.photo;
                        const url = photo ? normalizeUrl(photo) : null;
                        return url ? (
                          <img src={url} style={{ width: '100%', height: '140px', borderRadius: '12px', objectFit: 'cover', marginBottom: '12px' }} alt="Bien" />
                        ) : (
                          <div style={{ width: '100%', height: '140px', borderRadius: '12px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b', marginBottom: '12px' }}>
                            <Wrench size={32} />
                          </div>
                        );
                   })()}
                   <h4 style={{ fontSize: '15px', fontWeight: 700, color: '#1e293b', margin: '0 0 4px 0' }}>{selected.bien?.designation}</h4>
                   <div className="aff-card-iup" style={{ display: 'inline-block' }}>{selected.bien?.iup}</div>
                </div>

                <div className="aff-card-meta">
                  <DetailItem label="Type de maintenance" value={selected.type} icon="🛠️" />
                  <DetailItem label="Statut actuel" value={selected.statut || "EN ATTENTE"} icon="📊" />
                  <DetailItem label="Date prévue" value={selected.datePrevue} icon="📅" />
                  <DetailItem label="Prestataire" value={selected.prestataire} icon="👷" />
                  <DetailItem label="Coût" value={formatMoney(selected.cout)} icon="💰" />
                  
                  <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #e2e8f0' }}>
                    <strong style={{ fontSize: '11px', color: '#94a3b8', textTransform: 'uppercase', display: 'block', marginBottom: '8px' }}>Description des travaux</strong>
                    <p style={{ fontSize: '13px', color: '#475569', lineHeight: 1.5, margin: 0 }}>
                      {selected.description || selected.observation || "Aucune description fournie."}
                    </p>
                  </div>

                  {(selected as any).rapportUrl && (
                    <div style={{ marginTop: '20px' }}>
                      <button 
                        className="primary-premium" 
                        style={{ width: '100%', height: '48px', gap: '10px' }}
                        onClick={() => {
                          const url = (selected as any).rapportUrl;
                          const isImage = url.match(/\.(jpg|jpeg|png|webp)$/i);
                          setViewerMedia({ 
                            url: normalizeUrl(url), 
                            type: isImage ? "image" : "pdf", 
                            filename: `Document - ${selected.bien?.designation || "Entretien"}` 
                          });
                        }}
                      >
                        <FileText size={18} /> Voir le document attaché
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div className="aff-modal-footer" style={{ background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                <button 
                  onClick={() => setSelected(null)}
                  className="aff-action-btn"
                  style={{ padding: '10px 20px' }}
                >
                  Fermer
                </button>
                {selected.statut !== "TERMINEE" && (
                  <button 
                    onClick={() => { void closeEntretien(selected); setSelected(null); }}
                    className="aff-action-btn btn-primary"
                    style={{ padding: '10px 24px' }}
                  >
                    ✅ Clôturer l'intervention
                  </button>
                )}
              </div>
            </motion.aside>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}

function MetricCard({ label, value, icon, color }: { label: string; value: number; icon: React.ReactNode; color: string }) {
  return (
    <div style={{ 
      background: '#fff', 
      padding: '24px', 
      borderRadius: '24px', 
      border: '1px solid #e2e8f0', 
      display: 'flex', 
      alignItems: 'center', 
      gap: '20px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: color }} />
      <div style={{ 
        width: '56px', 
        height: '56px', 
        borderRadius: '16px', 
        background: `${color}15`, 
        display: 'flex', 
        alignItems: 'center', 
        justifyContent: 'center',
        flexShrink: 0
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '12px', fontWeight: 800, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>{label}</div>
        <div style={{ fontSize: '28px', fontWeight: 900, color: '#0f172a', lineHeight: 1 }}>{value}</div>
      </div>
    </div>
  );
}

function DetailItem({ label, value, icon }: { label: string; value?: string | number; icon: string }) {
  return (
    <div className="aff-meta-row">
      <span>{icon}</span><strong>{label}</strong>{value || "Non renseigné"}
    </div>
  );
}

function Field({ label, error, span = false, children }: React.PropsWithChildren<{ label: string; error?: string; span?: boolean }>) {
  return (
    <div className="form-group-modern" style={span ? { gridColumn: "span 2" } : undefined}>
      <label style={{ display: 'block', fontSize: '13px', fontWeight: 800, color: '#475569', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</label>
      {children}
      {error && <div style={{ color: '#ef4444', fontSize: '12px', fontWeight: 600, marginTop: '6px', display: 'flex', alignItems: 'center', gap: '4px' }}>
        <AlertTriangle size={12} /> {error}
      </div>}
    </div>
  );
}
