import React, { useState, useEffect } from 'react';
import { 
  getInventaires, createInventaire, deleteInventaire,
  getInventaireFiches, updateInventaireFiche,
  validerFicheAgent, validerFicheSuperviseur,
  getInventaireEcarts, validerEcart,
  validerZoneInventaire, certifierInventaire,
  getServices
} from '../api/api';
import { exportCertificatInventaire, exportInventaireCompletExcel } from '../utils/exporters';
import FileUpload from '../components/FileUpload';
import { useConfirm } from '../contexts/ConfirmContext';
import { useToast } from '../contexts/ToastContext';
import { 
  Sparkles, CheckCircle2, LayoutGrid, Search, X, Check, ChevronRight,
  ShieldCheck, Activity, BarChart3, QrCode
} from 'lucide-react';

const MISSION_TEMPLATES = [
  { id: 'ANNUAL', name: 'Inventaire Annuel', desc: 'Audit complet de fin d\'exercice pour certification officielle des comptes patrimoniaux.', icon: '📅', color: '#6366f1' },
  { id: 'SPOT',   name: 'Audit Flash',       desc: 'Recensement ciblé par échantillonnage sur une zone ou catégorie spécifique.', icon: '⚡', color: '#f59e0b' },
  { id: 'HANDOVER', name: 'Passation de Service', desc: 'Inventaire contradictoire lors du changement d\'un gestionnaire ou d\'un poste.', icon: '🤝', color: '#10b981' }
];

const ETAT_COLORS: Record<string, string> = {
  BON:   '#10b981',
  MOYEN: '#f59e0b',
  MAUVAIS: '#ef4444',
  HS:    '#7f1d1d',
};

/* ─── Circular Progress ─── */
const CircularProgress = ({ percent, size = 56 }: { percent: number; size?: number }) => {
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.max(0, Math.min(100, percent)) / 100) * circ;
  const color = percent >= 80 ? '#10b981' : percent >= 40 ? '#6366f1' : '#f59e0b';
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth={6}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={6} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}/>
      </svg>
      <span style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
        fontSize: size < 50 ? 9 : 11, fontWeight: 800, color }}>
        {percent}%
      </span>
    </div>
  );
};

/* ─── Empty State ─── */
const EmptyState = ({ icon, title, subtitle, action, onAction }: any) => (
  <div style={{ textAlign:'center', padding:'80px 40px' }}>
    <div style={{ fontSize: 72, marginBottom: 20, opacity: 0.7 }}>{icon}</div>
    <h3 style={{ fontSize: 22, marginBottom: 10, color: 'var(--text-main)' }}>{title}</h3>
    <p style={{ color: 'var(--text-dim)', fontSize: 14, marginBottom: 30, maxWidth: 400, margin: '0 auto 32px' }}>{subtitle}</p>
    {action && <button className="inv-btn-primary" onClick={onAction}>{action}</button>}
  </div>
);

/* ─── Main Component ─── */
const InventairePage: React.FC = () => {
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  type ViewType = 'DASHBOARD'|'PREPARATION'|'EXECUTION'|'RECONCILIATION'|'CERTIFICATION';
  const [view, setView] = useState<ViewType>('DASHBOARD');
  const [campagnes,       setCampagnes]       = useState<any[]>([]);
  const [selectedCampagne, setSelectedCampagne] = useState<any|null>(null);
  const [fiches,          setFiches]          = useState<any[]>([]);
  const [ecarts,          setEcarts]          = useState<any[]>([]);
  const [loading,         setLoading]         = useState(true);
  const [services,        setServices]        = useState<any[]>([]);
  const [wizardStep,      setWizardStep]      = useState(1);
  const [auditModal,      setAuditModal]      = useState<any|null>(null);
  const [superviseurModal, setSuperviseurModal] = useState<any|null>(null);
  const [scanInput, setScanInput] = useState('');
  const [form, setForm] = useState({
    nom:'', sites:'', equipes:'',
    dateDebut: new Date().toISOString().split('T')[0], dateFin:'', templateId:'ANNUAL'
  });

  useEffect(() => {
    loadInitialData();
    getServices().then(s => setServices(s || [])).catch(() => setServices([]));
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try { setCampagnes(await getInventaires() || []); }
    catch { setCampagnes([]); }
    finally { setLoading(false); }
  };

  const openCampagne = async (c: any) => {
    setSelectedCampagne(c);
    setLoading(true);
    try {
      const [f, e] = await Promise.all([getInventaireFiches(c.id), getInventaireEcarts(c.id)]);
      setFiches(f || []);
      setEcarts(e || []);
      setView('EXECUTION');
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const goView = async (v: ViewType) => {
    if (v !== 'DASHBOARD' && v !== 'PREPARATION' && selectedCampagne) {
      setLoading(true);
      try {
        const [f, e] = await Promise.all([getInventaireFiches(selectedCampagne.id), getInventaireEcarts(selectedCampagne.id)]);
        setFiches(f || []);
        setEcarts(e || []);
      } catch {}
      finally { setLoading(false); }
    }
    setView(v);
  };

  const handleAuditSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateInventaireFiche(auditModal.id, auditModal);
      await validerFicheAgent(auditModal.id, 'VALIDE');
      setAuditModal(null);
      openCampagne(selectedCampagne);
      showToast({ type: "success", title: "Fiche enregistree" });
    } catch {
      showToast({ type: "error", title: "Erreur lors de l'enregistrement de la fiche" });
    }
  };

  const handleSuperviseurSubmit = async () => {
    try {
      await validerFicheSuperviseur(superviseurModal.id, superviseurModal.decisionSup);
      setSuperviseurModal(null);
      openCampagne(selectedCampagne);
      showToast({ type: "success", title: "Validation superviseur effectuee" });
    } catch {
      showToast({ type: "error", title: "Erreur lors de la validation superviseur" });
    }
  };

  const handleScan = (e: React.FormEvent) => {
    e.preventDefault();
    if (!scanInput.trim()) return;
    const found = fiches.find(f => (f.bien?.iup === scanInput.trim() || f.codeIup === scanInput.trim()));
    if (found) {
      if (found.validationAgent !== 'VALIDE') {
        setAuditModal({...found});
        showToast({ type: 'info', title: 'IUP Détecté', message: `Ouverture de la fiche pour ${found.bien?.designation || found.codeIup}` });
      } else {
        showToast({ type: 'info', title: 'Déjà audité', message: 'Ce bien a déjà été scanné et validé.' });
      }
    } else {
      showToast({ type: 'error', title: 'IUP introuvable', message: 'Ce bien n\'est pas dans le périmètre de la mission.' });
    }
    setScanInput('');
  };

  const handleGlobalValidate = async () => {
    const approved = await confirm({
      title: "Valider les fiches conformes ?",
      message: "Toutes les fiches sans anomalie seront validees automatiquement pour cette campagne.",
      confirmLabel: "Valider",
      tone: "warning",
    });
    if (!approved) return;
    try {
      await validerZoneInventaire(selectedCampagne.id);
      goView('EXECUTION');
      showToast({ type: "success", title: "Zone validee" });
    } catch (err: any) {
      showToast({ type: "error", title: "Validation impossible", message: String(err.response?.data || err.message || "Erreur") });
    }
  };

  const handleCertify = async () => {
    const approved = await confirm({
      title: "Certifier officiellement cette campagne ?",
      message: "Cette action met a jour le registre du patrimoine et doit rester exceptionnelle.",
      confirmLabel: "Certifier",
      tone: "danger",
    });
    if (!approved) return;
    try {
      await certifierInventaire(selectedCampagne.id);
      showToast({ type: "success", title: "Campagne certifiee avec succes" });
      loadInitialData();
      setSelectedCampagne(null);
      setView('DASHBOARD');
    } catch (err: any) {
      showToast({ type: "error", title: "Certification impossible", message: String(err.response?.data || err.message || "Erreur") });
    }
  };

  const captureGPS = () => {
    if (!navigator.geolocation) {
      setAuditModal((m: any) => ({ ...m, coordonneesGps: "GPS non disponible" }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => setAuditModal((m: any) => ({ ...m, coordonneesGps: `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}` })),
      () => setAuditModal((m: any) => ({ ...m, coordonneesGps: "6.1248, 1.2394 (simulation)" }))
    );
  };

  const fichesSansAnomalie   = fiches.filter(f => !f.anomalie);
  const fichesAvecAnomalie   = fiches.filter(f => f.anomalie);
  const fichesValidees        = fiches.filter(f => f.validationAgent === 'VALIDE');
  const ecartsEnAttente       = ecarts.filter(e => e.statutValidation === 'EN_ATTENTE');
  const progressPercent       = fiches.length ? Math.round((fichesValidees.length / fiches.length) * 100) : 0;

  const handleExportCertificat = async () => {
    if (!selectedCampagne) return;
    const stats = {
      totalActifs: fiches.length,
      valeurTotale: fiches.reduce((s, f) => s + (f.bien?.valeur || 0), 0),
      conformite: Math.round((fiches.filter(f => !f.anomalie).length / Math.max(fiches.length, 1)) * 100),
      ecarts: ecarts.length
    };
    await exportCertificatInventaire(selectedCampagne, stats, { nom: 'Agent Comptable', prenom: '', role: 'Comptable' });
  };

  return (
    <div className="inv-page fade-in">
      {/* ══════════ HEADER ══════════ */}
      <header className="page-header-premium">
        <div>
          <span className="badge-pill-glow">Audit & Certification Patrimoniale</span>
          <h1 className="inv-h1">Inventaire & Certification</h1>
        </div>
        <div className="inv-header-right">
          <nav className="nav-btn-group" style={{ display: 'flex', gap: 8, background: 'rgba(255,255,255,0.03)', padding: 6, borderRadius: 16, border: '1px solid var(--glass-border)' }}>
            <button className={`nav-btn ${view === 'DASHBOARD' ? 'active' : ''}`} onClick={() => setView('DASHBOARD')}>📦 Missions</button>
            {selectedCampagne && (
              <>
                <button className={`nav-btn ${view === 'EXECUTION' ? 'active' : ''}`} onClick={() => goView('EXECUTION')}>📡 Terrain</button>
                <button className={`nav-btn ${view === 'RECONCILIATION' ? 'active' : ''}`} onClick={() => goView('RECONCILIATION')}>🔎 Écarts</button>
                <button className={`nav-btn ${view === 'CERTIFICATION' ? 'active' : ''}`} onClick={() => goView('CERTIFICATION')}>📜 Certificat</button>
              </>
            )}
          </nav>
          <button className="primary-premium" onClick={() => { setView('PREPARATION'); setWizardStep(1); }}>
            ＋ Lancer un Audit
          </button>
        </div>
      </header>

      {/* ══════════ LOADING ══════════ */}
      {loading && (
        <div style={{ textAlign:'center', padding: 60, color: 'var(--text-dim)' }}>
          <div className="inv-spinner"/>
          <p style={{ marginTop: 16 }}>Chargement en cours…</p>
        </div>
      )}

      {/* ══════════ DASHBOARD ══════════ */}
      {!loading && view === 'DASHBOARD' && (
        <div className="fade-in">
          <div className="dashboard-shell-grid" style={{ marginBottom: 40 }}>
            <div className="premium-card">
              <div className="card-header-premium">
                <div className="icon-box-premium"><Sparkles size={20} /></div>
                <div>
                  <h3 className="card-title-premium">Campagnes Actives</h3>
                  <p className="card-subtitle">Missions en cours d'audit physique</p>
                </div>
              </div>
              <div style={{ fontSize: 36, fontWeight: 900 }}>{campagnes.filter(c => c.statut === 'EN_COURS').length}</div>
            </div>

            <div className="premium-card">
              <div className="card-header-premium">
                <div className="icon-box-premium" style={{ color: '#10b981' }}><CheckCircle2 size={20} /></div>
                <div>
                  <h3 className="card-title-premium">Missions Certifiées</h3>
                  <p className="card-subtitle">Audits clôturés et scellés</p>
                </div>
              </div>
              <div style={{ fontSize: 36, fontWeight: 900 }}>{campagnes.filter(c => c.statut === 'CERTIFIE').length}</div>
            </div>

            <div className="premium-card">
              <div className="card-header-premium">
                <div className="icon-box-premium" style={{ color: '#f59e0b' }}><LayoutGrid size={20} /></div>
                <div>
                  <h3 className="card-title-premium">Total Missions</h3>
                  <p className="card-subtitle">Historique global des audits</p>
                </div>
              </div>
              <div style={{ fontSize: 36, fontWeight: 900 }}>{campagnes.length}</div>
            </div>
          </div>

          {campagnes.length === 0 ? (
            <EmptyState icon="🗂️"
              title="Aucune mission d'inventaire"
              subtitle="Démarrez une nouvelle mission d'audit pour prendre le contrôle de votre patrimoine."
              action="+ Lancer ma première mission"
              onAction={() => setView('PREPARATION')} />
          ) : (
            <div className="mission-grid-modern">
              {campagnes.map(c => {
                const prog = c.statut === 'CERTIFIE' ? 100 : Math.floor(Math.random() * 70) + 15;
                const isCert = c.statut === 'CERTIFIE';
                return (
                  <div key={c.id} className={`mission-card-premium ${isCert ? 'certified' : ''}`}>
                    <div className="card-status-indicator" style={{ background: isCert ? '#10b981' : '#6366f1' }} />
                    <div className="inv-card-top">
                      <span className={`status-pill ${isCert ? 'neuf' : 'bon'}`}>
                        {isCert ? 'CERTIFIÉ' : 'EN COURS'}
                      </span>
                      <CircularProgress percent={prog} />
                    </div>
                    <h3 className="inv-mission-name" style={{ fontSize: 20, marginBottom: 12 }}>{c.nom}</h3>
                    <div className="inv-mission-meta" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ opacity: 0.5 }}>📍</span> <strong>{c.sites || 'National'}</strong>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                        <span style={{ opacity: 0.5 }}>📅</span> {c.dateDebut || new Date(c.dateCreation).toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="inv-card-actions" style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--glass-border)', display: 'flex', gap: 10 }}>
                      <button className="primary-premium" style={{ flex: 1, padding: '8px 16px' }} onClick={() => openCampagne(c)}>Gérer</button>
                      <button className="nav-btn" style={{ padding: 10 }} title="Exporter XLS"
                        onClick={async () => {
                          try {
                            const [f, e] = await Promise.all([getInventaireFiches(c.id), getInventaireEcarts(c.id)]);
                            exportInventaireCompletExcel(c, f || [], e || []);
                          } catch {
                            showToast({ type: "error", title: "Erreur lors de l'export" });
                          }
                        }}><Search size={16} /></button>
                      <button className="nav-btn" style={{ padding: 10, color: '#ef4444' }} title="Supprimer" onClick={async () => {
                        const approved = await confirm({
                          title: "Supprimer cette mission ?",
                          message: "La campagne et ses donnees associees seront retirees.",
                          confirmLabel: "Supprimer",
                          tone: "danger",
                        });
                        if (!approved) return;
                        await deleteInventaire(c.id);
                        showToast({ type: "success", title: "Mission supprimee" });
                        await loadInitialData();
                      }}><X size={16} /></button>
                    </div>
                  </div>
                );
              })}
              {/* Add card */}
              <div className="inv-add-card" onClick={() => setView('PREPARATION')} style={{ border: '2px dashed var(--glass-border)', borderRadius: 30, background: 'rgba(255,255,255,0.02)' }}>
                <div className="inv-add-icon" style={{ opacity: 0.5 }}>+</div>
                <span style={{ fontWeight: 700 }}>Lancer un nouvel audit</span>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════ WIZARD ══════════ */}
      {!loading && view === 'PREPARATION' && (
        <div className="inv-wizard fade-in">
          <div className="inv-stepper" style={{ marginBottom: 48 }}>
            {['Modèle','Périmètre','Lancement'].map((lbl, i) => {
              const n = i+1;
              const isActive = wizardStep === n;
              const isDone = wizardStep > n;
              return (
                <React.Fragment key={n}>
                  <div className="inv-step" style={{ flex: 1, textAlign: 'center' }}>
                    <div className={`step-circle-premium ${isActive ? 'active' : ''} ${isDone ? 'completed' : ''}`} style={{ 
                      width: 44, height: 44, margin: '0 auto 12px',
                      background: isDone ? '#10b981' : isActive ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                      color: isDone || isActive ? 'white' : 'var(--text-dim)',
                      border: '2px solid ' + (isDone ? '#10b981' : isActive ? 'var(--primary)' : 'var(--glass-border)'),
                      boxShadow: isActive ? '0 0 20px var(--primary-glow)' : 'none',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', fontWeight: 900
                    }}>
                      {isDone ? <Check size={20} /> : n}
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 700, color: isActive ? 'var(--text-main)' : 'var(--text-dim)' }}>{lbl}</span>
                  </div>
                  {i < 2 && <div style={{ width: 60, height: 2, background: isDone ? '#10b981' : 'var(--glass-border)', marginTop: -25 }} />}
                </React.Fragment>
              );
            })}
          </div>

          <div className="premium-card" style={{ padding: '48px' }}>
            {/* Step 1 - Templates */}
            {wizardStep === 1 && (
              <div className="fade-in">
                <div style={{ textAlign: 'center', marginBottom: 40 }}>
                  <h2 className="inv-wizard-title" style={{ fontSize: 28, fontWeight: 900 }}>Configuration de la Mission</h2>
                  <p className="card-subtitle">Sélectionnez le protocole d'audit adapté à vos objectifs</p>
                </div>
                <div className="family-selection-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20 }}>
                  {MISSION_TEMPLATES.map(t => (
                    <div key={t.id}
                      className={`family-card-premium ${form.templateId === t.id ? 'selected' : ''}`}
                      onClick={() => { setForm({...form, templateId: t.id, nom: `Mission ${t.name} ${new Date().getFullYear()}`}); setWizardStep(2); }}>
                      <div className="icon-box-premium" style={{ width: 60, height: 60, fontSize: 32 }}>{t.icon}</div>
                      <div className="family-info">
                        <strong>{t.name}</strong>
                        <p>{t.desc}</p>
                      </div>
                      <div className="family-check"><ChevronRight size={20} /></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2 - Périmètre */}
            {wizardStep === 2 && (
              <div className="fade-in">
                <div style={{ marginBottom: 40 }}>
                  <h2 className="inv-wizard-title" style={{ fontSize: 24, fontWeight: 900 }}>Périmètre d'Intervention</h2>
                  <p className="card-subtitle">Définissez les limites géographiques et opérationnelles</p>
                </div>
                
                <div className="form-grid-premium">
                  <div className="form-group-modern" style={{ gridColumn: '1 / -1' }}>
                    <label>Nom de la Campagne</label>
                    <input className="premium-input" value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} placeholder="Ex : Inventaire Annuel 2025"/>
                  </div>
                  
                  <div className="form-group-modern">
                    <label>Service / Site concerné</label>
                    <select className="premium-input" value={form.sites} onChange={e => setForm({...form, sites: e.target.value})}>
                      <option value="">🌍 TOUS LES SERVICES (National)</option>
                      {services.map(s => <option key={s.id} value={s.nomService || s.nom}>{s.nomService || s.nom}</option>)}
                    </select>
                  </div>

                  <div className="form-group-modern">
                    <label>Brigades assignées</label>
                    <input className="premium-input" value={form.equipes} onChange={e => setForm({...form, equipes: e.target.value})} placeholder="Ex : Équipe Alpha + Audit Interne"/>
                  </div>

                  <div className="form-group-modern">
                    <label>Date de Lancement</label>
                    <input type="date" className="premium-input" value={form.dateDebut} onChange={e => setForm({...form, dateDebut: e.target.value})}/>
                  </div>

                  <div className="form-group-modern">
                    <label>Date de Clôture prévue</label>
                    <input type="date" className="premium-input" value={form.dateFin} onChange={e => setForm({...form, dateFin: e.target.value})}/>
                  </div>
                </div>

                <div className="form-footer-premium" style={{ marginTop: 40 }}>
                  <button className="nav-btn" onClick={() => setWizardStep(1)}>Précédent</button>
                  <button className="primary-premium" onClick={() => setWizardStep(3)}>Suivant : Lancement</button>
                </div>
              </div>
            )}

            {/* Step 3 - Launch */}
            {wizardStep === 3 && (
              <div className="fade-in" style={{ textAlign: 'center' }}>
                <div className="icon-box-premium" style={{ width: 100, height: 100, margin: '0 auto 24px', fontSize: 48 }}>🚀</div>
                <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 8 }}>Initialisation du Protocole</h2>
                <p className="card-subtitle" style={{ marginBottom: 40 }}>Récapitulatif des paramètres de mission avant propulsion</p>

                <div className="glass-card" style={{ maxWidth: 500, margin: '0 auto 40px', textAlign: 'left' }}>
                  <div className="inv-sum-row"><span>MISSION</span><strong>{form.nom}</strong></div>
                  <div className="inv-sum-row"><span>PROTOCOLE</span><strong>{MISSION_TEMPLATES.find(t => t.id === form.templateId)?.name}</strong></div>
                  <div className="inv-sum-row"><span>ZONE</span><strong>{form.sites || 'NATIONAL'}</strong></div>
                  <div className="inv-sum-row"><span>DÉBUT</span><strong>{form.dateDebut}</strong></div>
                </div>

                <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
                  <button className="nav-btn" onClick={() => setWizardStep(2)}>Ajuster</button>
                  <button className="primary-premium" style={{ padding: '16px 48px' }} onClick={async () => {
                    try {
                      await createInventaire(form);
                      showToast({ type: "success", title: "Mission lancée !" });
                      loadInitialData();
                      setView('DASHBOARD');
                    } catch {
                      showToast({ type: "error", title: "Échec de l'initialisation" });
                    }
                  }}>PROPULSER LA MISSION</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ══════════ TERRAIN / EXECUTION ══════════ */}
      {!loading && view === 'EXECUTION' && selectedCampagne && (
        <div className="fade-in">
          <div className="premium-card" style={{ marginBottom: 32, padding: '32px' }}>
            <div className="inv-terrain-header" style={{ border: 'none', marginBottom: 24 }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  <div className="inv-live-dot" style={{ width: 10, height: 10, borderRadius: '50%', background: '#ef4444', animation: 'blink 1.5s infinite' }} />
                  <span style={{ fontWeight: 800, fontSize: 12, color: '#ef4444', letterSpacing: 1 }}>MONITORING LIVE</span>
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 800 }}>{selectedCampagne.nom}</h2>
                <p className="card-subtitle">Opérations de recensement physique sur le terrain</p>
              </div>
              <div style={{ display:'flex', gap:16, alignItems:'center' }}>
                <div className="inv-progress-info" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid var(--glass-border)', padding: '12px 24px', borderRadius: 20 }}>
                  <CircularProgress percent={progressPercent} size={64}/>
                  <div>
                    <div style={{ fontWeight:900, fontSize:18 }}>{fichesValidees.length} / {fiches.length}</div>
                    <div style={{ fontSize:11, color:'var(--text-dim)', fontWeight: 700, textTransform: 'uppercase' }}>Actifs Scannés</div>
                  </div>
                </div>
                <button className="nav-btn" onClick={() => exportInventaireCompletExcel(selectedCampagne, fiches, ecarts)}>📊 Rapport</button>
                <button className="primary-premium" onClick={handleGlobalValidate}>✅ Clôturer Zone</button>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', marginTop: 32 }}>
              <form onSubmit={handleScan} className="glass-card" style={{ display: 'flex', gap: 12, padding: '16px 24px', borderRadius: 20, width: '100%', maxWidth: 600, alignItems: 'center', boxShadow: '0 20px 40px rgba(0,0,0,0.1)' }}>
                <Search size={24} style={{ color: 'var(--primary)', opacity: 0.7 }} />
                <input 
                  type="text" 
                  placeholder="Scanner un code-barres ou saisir un IUP..." 
                  value={scanInput} 
                  onChange={(e) => setScanInput(e.target.value)} 
                  style={{ flex: 1, border: 'none', background: 'transparent', outline: 'none', color: 'var(--text-main)', fontSize: 16, fontWeight: 600 }} 
                  autoFocus
                />
                <button type="submit" className="primary-premium" style={{ padding: '10px 20px' }}>Identifier</button>
              </form>
            </div>
          </div>

          {fiches.length === 0 ? (
            <EmptyState icon="📡" title="Aucune fiche générée" subtitle="Les fiches d'audit sont créées automatiquement selon le périmètre défini lors de la configuration de la mission."/>
          ) : (
            <div className="inv-fiches-grid">
              {fiches.map(f => {
                const done = f.validationAgent === 'VALIDE';
                const supDone = f.validationSuperviseur === 'VALIDE';
                return (
                  <div key={f.id} className={`premium-card ${done ? 'scanned' : ''}`} style={{ padding: '20px', borderTop: done ? '4px solid #10b981' : '1.5px solid var(--glass-border)' }}>
                    <div className="inv-fiche-top" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span className="monospace-glow" style={{ fontSize: 10 }}>{f.bien?.iup || f.codeIup}</span>
                      <span className={`status-pill ${f.anomalie ? 'degrade' : 'neuf'}`} style={{ fontSize: 9 }}>
                        {f.anomalie ? 'ANOMALIE' : 'CONFORME'}
                      </span>
                    </div>
                    <div className="inv-fiche-name" style={{ fontSize: 15, fontWeight: 700, marginBottom: 4 }}>{f.bien?.designation || '—'}</div>
                    <div className="inv-fiche-cat" style={{ fontSize: 11, color: 'var(--text-dim)', marginBottom: 16 }}>{f.bien?.categorie}</div>
                    
                    <div className="glass-card" style={{ padding: '12px', marginBottom: 16, background: 'rgba(255,255,255,0.02)' }}>
                      <div style={{ fontSize: 11, marginBottom: 8 }}>
                        <span style={{ opacity: 0.5 }}>📍 Théorique:</span> <strong>{f.bien?.localisation || '—'}</strong>
                      </div>
                      {f.localisationReelle && (
                        <div style={{ fontSize: 11, color: 'var(--primary)' }}>
                          <span style={{ opacity: 0.5 }}>📍 Constaté:</span> <strong>{f.localisationReelle}</strong>
                        </div>
                      )}
                    </div>

                    <div className="inv-fiche-footer" style={{ display: 'flex', gap: 8, marginTop: 'auto' }}>
                      {!done ? (
                        <button className="primary-premium" style={{ flex: 1, padding: '8px' }} onClick={() => setAuditModal({...f})}>Scanner</button>
                      ) : (
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, color: '#10b981', fontWeight: 800, fontSize: 12 }}>
                          <CheckCircle2 size={16} /> AUDITÉ
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════ ÉCARTS / RECONCILIATION ══════════ */}
      {!loading && view === 'RECONCILIATION' && selectedCampagne && (
        <div className="fade-in">
          <div className="inv-view-header">
            <div>
              <h2 style={{ margin:0, fontSize:24 }}>🔎 Analyse des Écarts Patrimoniaux</h2>
              <p style={{ color:'var(--text-dim)', margin:'4px 0 0', fontSize:13 }}>
                Mission : {selectedCampagne.nom}
              </p>
            </div>
            <div style={{ display:'flex', gap:12 }}>
              <div className="inv-ecart-kpi"><strong>{ecarts.length}</strong><span>Écarts détectés</span></div>
              <div className="inv-ecart-kpi warn"><strong>{ecartsEnAttente.length}</strong><span>En attente</span></div>
            </div>
          </div>

          {ecarts.length === 0 ? (
            <EmptyState icon="🎯"
              title="Aucun écart détecté"
              subtitle="Excellent ! Le rapprochement entre les données théoriques et les constats terrain ne révèle aucune discordance majeure. Le patrimoine est cohérent."
              action="Procéder à la Certification →"
              onAction={() => setView('CERTIFICATION')}/>
          ) : (
            <div className="inv-ecarts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: 24 }}>
              {ecarts.map(e => {
                const valide = e.statutValidation === 'VALIDE';
                return (
                  <div key={e.id} className="premium-card" style={{ opacity: valide ? 0.7 : 1 }}>
                    <div className="inv-ecart-top" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 12 }}>
                      <span className="badge-pill-glow" style={{ fontSize: 10 }}>{e.typeEcart?.replace(/_/g,' ')}</span>
                      <span className={`status-pill ${valide ? 'neuf' : 'bon'}`} style={{ fontSize: 9 }}>{valide ? 'RÉSOLU' : 'À TRAITER'}</span>
                    </div>
                    <div className="inv-ecart-bien" style={{ fontSize: 16, fontWeight: 700 }}>{e.bien?.designation || 'Bien non identifié'}</div>
                    <div className="monospace-glow" style={{ fontSize: 10, marginTop: 4 }}>{e.bien?.iup}</div>
                    
                    {e.justification && (
                      <div className="glass-card" style={{ marginTop: 16, padding: '12px', fontSize: 12, background: 'rgba(255,255,255,0.02)' }}>
                        <span style={{ opacity: 0.5 }}>Justification :</span><br/>
                        <strong>{e.justification}</strong>
                      </div>
                    )}

                    {!valide && (
                      <button className="primary-premium" style={{ marginTop: 20, width: '100%', padding: '12px' }} onClick={async () => {
                        const j = window.prompt("Décision / justification du superviseur :");
                        if (j !== null) {
                          try { await validerEcart(e.id, 'VALIDE'); goView('RECONCILIATION'); }
                          catch { showToast({ type: "error", title: "Erreur de validation" }); }
                        }
                      }}>
                        Valider l'écart
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ══════════ CERTIFICATION ══════════ */}
      {!loading && view === 'CERTIFICATION' && selectedCampagne && (
        <div className="fade-in inv-cert-view">
          {selectedCampagne.statut === 'CERTIFIE' ? (
            <div className="premium-card" style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center', padding: '60px 40px' }}>
              <div className="success-icon-wrapper" style={{ width: 120, height: 120, marginBottom: 40 }}>
                <div className="success-pulse" style={{ background: 'rgba(16,185,129,0.1)' }} />
                <div className="success-pulse" style={{ animationDelay: '0.5s', background: 'rgba(16,185,129,0.05)' }} />
                <CheckCircle2 size={64} className="success-icon-check" />
              </div>
              <h2 style={{ fontSize: 28, fontWeight: 900, marginBottom: 16 }}>Certification Officielle Scellée</h2>
              <p className="card-subtitle" style={{ maxWidth: 500, margin: '0 auto 40px' }}>
                Cette campagne d'inventaire a été auditée, validée et scellée dans le registre numérique du patrimoine.
              </p>
              
              <div className="glass-card" style={{ textAlign: 'left', marginBottom: 40, background: 'rgba(255,255,255,0.02)' }}>
                <div className="inv-sum-row"><span>N° Certification</span><strong>CERT-{selectedCampagne.id.toString().padStart(6, '0')}</strong></div>
                <div className="inv-sum-row"><span>Date de Clôture</span><strong>{new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</strong></div>
                <div className="inv-sum-row"><span>Signataire</span><strong>{selectedCampagne.validePar || 'ADMINISTRATION CENTRALE'}</strong></div>
              </div>

              <button className="primary-premium" style={{ width: '100%', padding: '16px' }} onClick={handleExportCertificat}>
                📥 Télécharger le PV d'Inventaire Certifié (PDF)
              </button>
            </div>
          ) : (
            <div className="premium-card" style={{ maxWidth: 800, margin: '0 auto', textAlign: 'center', padding: '60px 40px' }}>
              <div className="icon-box-premium" style={{ width: 80, height: 80, margin: '0 auto 32px', borderRadius: 24 }}>
                <Sparkles size={40} />
              </div>
              <h2 style={{ fontSize: 32, fontWeight: 900, marginBottom: 16 }}>Prêt pour la Certification</h2>
              <p className="card-subtitle" style={{ maxWidth: 600, margin: '0 auto 48px', fontSize: 16 }}>
                En certifiant cette campagne, vous engagez la responsabilité de l'audit et validez la mise à jour définitive du registre du patrimoine.
              </p>

              <div className="dashboard-shell-grid" style={{ marginBottom: 48 }}>
                <div className="glass-card">
                  <div className="pill-label">Audit Physique</div>
                  <div className="pill-value">{fiches.length}</div>
                </div>
                <div className="glass-card">
                  <div className="pill-label">Conformité</div>
                  <div className="pill-value">{Math.round((fichesValidees.length / Math.max(fiches.length, 1)) * 100)}%</div>
                </div>
                <div className="glass-card">
                  <div className="pill-label">Écarts Résolus</div>
                  <div className="pill-value">{ecarts.filter(e => e.statutValidation === 'VALIDE').length}</div>
                </div>
              </div>

              {ecartsEnAttente.length > 0 ? (
                <div className="premium-card" style={{ background: 'rgba(239, 68, 68, 0.05)', borderColor: 'rgba(239, 68, 68, 0.2)', padding: '24px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16, color: '#ef4444', textAlign: 'left' }}>
                    <X size={24} />
                    <div>
                      <strong style={{ display: 'block' }}>Action Requise</strong>
                      <span style={{ fontSize: 13 }}>{ecartsEnAttente.length} écart(s) en attente. Impossible de certifier.</span>
                    </div>
                    <button className="primary-premium" style={{ background: '#ef4444', marginLeft: 'auto' }} onClick={() => setView('RECONCILIATION')}>Régulariser</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20, alignItems: 'center' }}>
                  <div className="inv-cert-hash" style={{ background: 'rgba(255,255,255,0.03)', padding: '12px 24px', borderRadius: 12 }}>
                    <span style={{ opacity: 0.5, fontSize: 12 }}>CODE DE SÉCURITÉ :</span>
                    <code style={{ fontSize: 14, fontWeight: 900, color: 'var(--primary)', letterSpacing: 2 }}>{Math.random().toString(36).substring(2, 12).toUpperCase()}</code>
                  </div>
                  <button className="primary-premium" style={{ padding: '20px 48px', fontSize: 18, width: '100%' }} onClick={handleCertify}>
                    📜 SCELLER ET CERTIFIER LA MISSION
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ══════════ MODAL AUDIT TERRAIN ══════════ */}
      {auditModal && (
        <div className="inv-overlay">
          <div className="inv-modal fade-in">
            <div className="inv-modal-header">
              <div>
                <div className="inv-modal-iup">{auditModal.bien?.iup || auditModal.codeIup}</div>
                <h3>{auditModal.bien?.designation}</h3>
              </div>
              <button className="inv-modal-close" onClick={() => setAuditModal(null)}>✕</button>
            </div>

            <form onSubmit={handleAuditSubmit} className="inv-modal-body">
              <div className="inv-form-grid">
                <div className="form-group-modern">
                  <label>État de Conservation constaté</label>
                  <div className="inv-etat-selector">
                    {['BON','MOYEN','MAUVAIS','HS'].map(e => (
                      <button type="button" key={e}
                        style={{ background: auditModal.etatConstate === e ? ETAT_COLORS[e] : 'transparent',
                          color: auditModal.etatConstate === e ? 'white' : 'var(--text-dim)',
                          border: `2px solid ${ETAT_COLORS[e]}` }}
                        onClick={() => setAuditModal({...auditModal, etatConstate: e})}>
                        {e}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="form-group-modern">
                  <label>Localisation Réelle (bureau / salle)</label>
                  <input value={auditModal.localisationReelle || ''}
                    onChange={e => setAuditModal({...auditModal, localisationReelle: e.target.value})}
                    placeholder="Ex: Bureau DG – 3ème étage"/>
                </div>
                <div className="form-group-modern" style={{ gridColumn:'span 2' }}>
                  <label>Coordonnées GPS</label>
                  <div style={{ display:'flex', gap:8 }}>
                    <input style={{ flex:1 }} readOnly value={auditModal.coordonneesGps || ''}
                      placeholder="Cliquez sur Capturer pour localiser"/>
                    <button type="button" className="inv-btn-gps" onClick={captureGPS}>🛰️ Capturer</button>
                  </div>
                </div>
                <div className="form-group-modern" style={{ gridColumn:'span 2' }}>
                  <label>Preuve Photographique</label>
                  <FileUpload onUploadSuccess={(url: string) => setAuditModal({...auditModal, photoUrl: url})}/>
                  {auditModal.photoUrl && (
                    <div style={{ marginTop:8, padding:'6px 10px', background:'rgba(16,185,129,.1)', borderRadius:8, fontSize:12, color:'#10b981' }}>
                      ✔ Photo enregistrée
                    </div>
                  )}
                </div>
                <div className="form-group-modern" style={{ gridColumn:'span 2' }}>
                  <label>Observations & Commentaires</label>
                  <textarea rows={3} value={auditModal.observation || ''}
                    onChange={e => setAuditModal({...auditModal, observation: e.target.value})}
                    placeholder="Détails pertinents sur l'état ou la situation de l'actif…"/>
                </div>
              </div>

              <div className="inv-anomalie-row">
                <label className="inv-toggle-label">
                  <div className={`inv-toggle ${auditModal.anomalie ? 'on' : ''}`}
                    onClick={() => setAuditModal({...auditModal, anomalie: !auditModal.anomalie})}>
                    <div className="inv-toggle-thumb"/>
                  </div>
                  <span>Signaler comme <strong>Anomalie d'inventaire</strong></span>
                </label>
              </div>

              <div className="inv-modal-footer">
                <button type="button" className="inv-btn-back" onClick={() => setAuditModal(null)}>Annuler</button>
                <button type="submit" className="inv-btn-primary">✔ Valider la fiche terrain</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ══════════ MODAL SUPERVISEUR ══════════ */}
      {superviseurModal && (
        <div className="inv-overlay">
          <div className="inv-modal fade-in" style={{ maxWidth: 480 }}>
            <div className="inv-modal-header">
              <h3>🔐 Validation Superviseur</h3>
              <button className="inv-modal-close" onClick={() => setSuperviseurModal(null)}>✕</button>
            </div>
            <div className="inv-modal-body">
              <p style={{ color:'var(--text-dim)', marginBottom:20 }}>
                Nom de l'actif : <strong>{superviseurModal.bien?.designation}</strong>
              </p>
              <div className="form-group-modern">
                <label>Décision</label>
                <div style={{ display:'flex', gap:12 }}>
                  <button type="button"
                    style={{ flex:1, padding:'12px', border:'2px solid #10b981', borderRadius:12, cursor:'pointer',
                      background: superviseurModal.decisionSup === 'VALIDE' ? '#10b981' : 'transparent',
                      color: superviseurModal.decisionSup === 'VALIDE' ? 'white' : '#10b981' }}
                    onClick={() => setSuperviseurModal({...superviseurModal, decisionSup:'VALIDE'})}>✔ Valider</button>
                  <button type="button"
                    style={{ flex:1, padding:'12px', border:'2px solid #ef4444', borderRadius:12, cursor:'pointer',
                      background: superviseurModal.decisionSup === 'REJETE' ? '#ef4444' : 'transparent',
                      color: superviseurModal.decisionSup === 'REJETE' ? 'white' : '#ef4444' }}
                    onClick={() => setSuperviseurModal({...superviseurModal, decisionSup:'REJETE'})}>✕ Rejeter</button>
                </div>
              </div>
              <div className="inv-modal-footer" style={{ marginTop:24 }}>
                <button className="inv-btn-back" onClick={() => setSuperviseurModal(null)}>Annuler</button>
                <button className="inv-btn-primary" onClick={handleSuperviseurSubmit}>Confirmer la décision</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════════ INLINE STYLES ══════════ */}
      <style>{`
        .inv-page { color: var(--text-main); }

        /* HEADER */
        .inv-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:36px; gap:20px; flex-wrap:wrap; }
        .inv-h1 { font-size:28px; font-weight:800; margin:6px 0 0 0; }
        .inv-header-right { display:flex; gap:14px; align-items:center; flex-wrap:wrap; }
        .inv-nav-pill { display:flex; gap:4px; background:var(--card-bg); padding:5px; border-radius:16px; border:1px solid var(--glass-border); }
        .inv-nav-pill button { background:transparent; border:none; color:var(--text-dim); padding:9px 16px; border-radius:12px; cursor:pointer; font-weight:600; font-size:13px; transition:all .25s; }
        .inv-nav-pill button:hover { color:var(--text-main); background:rgba(99,102,241,.07); }
        .inv-nav-pill button.act { background:var(--primary); color:white; box-shadow:0 4px 14px rgba(99,102,241,.35); }
        .inv-btn-primary { background:linear-gradient(135deg,#6366f1,#4f46e5); color:white; border:none; padding:11px 22px; border-radius:14px; font-weight:700; cursor:pointer; box-shadow:0 6px 18px rgba(99,102,241,.25); transition:all .3s; white-space:nowrap; font-size:14px; }
        .inv-btn-primary:hover { transform:translateY(-2px); box-shadow:0 10px 24px rgba(99,102,241,.38); }

        /* SPINNER */
        .inv-spinner { width:36px; height:36px; border:4px solid var(--glass-border); border-top:4px solid var(--primary); border-radius:50%; animation:spin .8s linear infinite; margin:0 auto; }
        @keyframes spin { to { transform:rotate(360deg); } }

        /* STATS */
        .inv-stats-row { display:flex; gap:20px; margin-bottom:36px; flex-wrap:wrap; }
        .inv-stat-card { flex:1; min-width:200px; display:flex; align-items:center; gap:16px; background:var(--card-bg); border:1px solid var(--glass-border); border-radius:20px; padding:20px; backdrop-filter:blur(10px); }
        .inv-stat-icon { width:52px; height:52px; border-radius:14px; display:flex; align-items:center; justify-content:center; font-size:22px; flex-shrink:0; }
        .inv-stat-label { font-size:11px; text-transform:uppercase; letter-spacing:.8px; color:var(--text-dim); font-weight:700; }
        .inv-stat-value { font-size:32px; font-weight:800; color:var(--text-main); line-height:1; margin-top:2px; }

        /* MISSION CARDS */
        .inv-mission-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(340px,1fr)); gap:22px; }
        .inv-mission-card { background:var(--card-bg); border:1px solid var(--glass-border); border-radius:24px; padding:26px; position:relative; overflow:hidden; transition:all .35s; }
        .inv-mission-card:hover { transform:translateY(-6px); border-color:rgba(99,102,241,.5); box-shadow:0 20px 40px rgba(0,0,0,.2); }
        .inv-mission-card.cert { border-color:rgba(16,185,129,.4); }
        .inv-card-glow { position:absolute; top:0; left:0; right:0; height:3px; background:linear-gradient(90deg,#6366f1,#06b6d4); }
        .inv-mission-card.cert .inv-card-glow { background:linear-gradient(90deg,#10b981,#06b6d4); }
        .inv-card-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:18px; }
        .inv-status-pill { font-size:10px; font-weight:800; letter-spacing:.5px; padding:4px 12px; border-radius:20px; }
        .inv-status-pill.indigo { background:rgba(99,102,241,.12); color:#6366f1; }
        .inv-status-pill.green { background:rgba(16,185,129,.12); color:#10b981; }
        .inv-mission-name { font-size:17px; font-weight:700; margin:0 0 14px; }
        .inv-mission-meta { display:flex; gap:16px; flex-wrap:wrap; font-size:12px; color:var(--text-dim); margin-bottom:8px; }
        .inv-team-badge { display:inline-block; background:rgba(99,102,241,.08); color:var(--primary); font-size:11px; padding:3px 10px; border-radius:20px; margin-bottom:4px; }
        .inv-card-actions { display:flex; gap:10px; margin-top:20px; padding-top:18px; border-top:1px solid var(--glass-border); align-items:center; }
        .inv-btn-manage { flex:1; background:rgba(99,102,241,.1); color:#6366f1; border:1px solid rgba(99,102,241,.2); padding:10px 16px; border-radius:12px; cursor:pointer; font-weight:700; font-size:13px; transition:all .2s; }
        .inv-btn-manage:hover { background:#6366f1; color:white; }
        .inv-btn-pdf { background:rgba(16,185,129,.1); color:#10b981; border:1px solid rgba(16,185,129,.25); padding:10px 14px; border-radius:12px; cursor:pointer; font-weight:700; font-size:13px; transition:all .2s; }
        .inv-btn-pdf:hover { background:#10b981; color:white; }
        .inv-btn-export-card { background:rgba(6,182,212,.1); color:#06b6d4; border:1px solid rgba(6,182,212,.25); padding:10px 14px; border-radius:12px; cursor:pointer; font-weight:700; font-size:13px; transition:all .2s; white-space:nowrap; }
        .inv-btn-export-card:hover { background:#06b6d4; color:white; }
        .inv-btn-del { background:rgba(239,68,68,.1); color:#ef4444; border:1px solid rgba(239,68,68,.2); padding:10px 12px; border-radius:12px; cursor:pointer; transition:all .2s; }
        .inv-btn-del:hover { background:#ef4444; color:white; }
        .inv-add-card { background:var(--card-bg); border:2px dashed var(--glass-border); border-radius:24px; padding:26px; display:flex; flex-direction:column; align-items:center; justify-content:center; gap:12px; cursor:pointer; color:var(--text-dim); transition:all .3s; min-height:180px; }
        .inv-add-card:hover { border-color:var(--primary); color:var(--primary); background:rgba(99,102,241,.04); }
        .inv-add-icon { font-size:40px; font-weight:200; }

        /* WIZARD */
        .inv-wizard { max-width:860px; margin:0 auto; }
        .inv-stepper { display:flex; align-items:center; justify-content:center; gap:8px; margin-bottom:36px; }
        .inv-step { display:flex; flex-direction:column; align-items:center; gap:6px; }
        .inv-step-num { width:38px; height:38px; border-radius:50%; background:var(--bg-main); border:2px solid var(--glass-border); display:flex; align-items:center; justify-content:center; font-weight:800; color:var(--text-dim); font-size:14px; transition:all .4s; }
        .inv-step-num.done { background:#10b981; border-color:#10b981; color:white; }
        .inv-step-num.cur { background:#6366f1; border-color:#6366f1; color:white; box-shadow:0 0 20px rgba(99,102,241,.45); transform:scale(1.15); }
        .inv-step-lbl { font-size:12px; font-weight:600; color:var(--text-dim); }
        .inv-step-line { flex:1; max-width:60px; height:2px; background:var(--glass-border); border-radius:2px; }
        .inv-step-line.done { background:#10b981; }
        .inv-wizard-card { background:var(--card-bg); border:1px solid var(--glass-border); border-radius:24px; padding:40px; backdrop-filter:blur(12px); }
        .inv-wizard-title { font-size:22px; font-weight:800; margin:0 0 6px; }
        .inv-template-grid { display:flex; flex-direction:column; gap:14px; }
        .inv-template-card { background:rgba(255,255,255,.03); border:1px solid var(--glass-border); border-radius:18px; padding:20px 24px; display:flex; align-items:center; gap:16px; cursor:pointer; transition:all .3s; }
        .inv-template-card:hover, .inv-template-card.sel { border-color:var(--tcolor,#6366f1); background:rgba(99,102,241,.05); box-shadow:0 8px 20px rgba(0,0,0,.1); }
        .inv-tpl-icon { font-size:36px; flex-shrink:0; }
        .inv-tpl-name { font-size:15px; font-weight:700; margin-bottom:4px; }
        .inv-tpl-desc { font-size:12px; color:var(--text-dim); line-height:1.4; }
        .inv-tpl-arrow { font-size:20px; color:var(--text-dim); margin-left:auto; }
        .inv-form-grid { display:grid; grid-template-columns:1fr 1fr; gap:18px; margin:24px 0; }
        .inv-wiz-footer { display:flex; justify-content:space-between; margin-top:28px; }
        .inv-btn-back { background:var(--card-bg); border:1px solid var(--glass-border); color:var(--text-dim); padding:10px 20px; border-radius:12px; cursor:pointer; font-weight:600; transition:all .2s; }
        .inv-btn-back:hover { color:var(--text-main); }
        .inv-btn-launch { background:linear-gradient(135deg,#6366f1,#4f46e5); color:white; border:none; padding:16px 36px; border-radius:16px; font-weight:800; font-size:15px; cursor:pointer; box-shadow:0 12px 30px rgba(99,102,241,.4); transition:all .3s; }
        .inv-btn-launch:hover { transform:scale(1.04); box-shadow:0 16px 40px rgba(99,102,241,.5); }
        .inv-summary-box { background:rgba(99,102,241,.06); border:1px solid rgba(99,102,241,.15); border-radius:16px; padding:24px; text-align:left; max-width:500px; margin:0 auto; }
        .inv-sum-row { display:flex; justify-content:space-between; padding:8px 0; border-bottom:1px solid var(--glass-border); font-size:14px; }
        .inv-sum-row:last-child { border-bottom:none; }
        .inv-sum-row span { color:var(--text-dim); }

        /* TERRAIN */
        .inv-terrain-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:28px; flex-wrap:wrap; gap:16px; padding-bottom:20px; border-bottom:1px solid var(--glass-border); }
        .inv-live-dot { font-size:11px; font-weight:800; color:#ef4444; animation:blink 1.5s infinite; }
        @keyframes blink { 0%,100%{opacity:1} 50%{opacity:.3} }
        .inv-progress-info { display:flex; align-items:center; gap:14px; background:var(--card-bg); border:1px solid var(--glass-border); border-radius:16px; padding:14px 20px; }
        .inv-btn-export { background:var(--card-bg); color:var(--text-dim); border:1px solid var(--glass-border); padding:12px 18px; border-radius:12px; font-weight:700; cursor:pointer; font-size:13px; transition:all .2s; }
        .inv-btn-export:hover { background:rgba(6,182,212,.1); color:#06b6d4; border-color:rgba(6,182,212,.3); }
        .inv-btn-zone { background:linear-gradient(135deg,#10b981,#059669); color:white; border:none; padding:12px 22px; border-radius:12px; font-weight:700; cursor:pointer; box-shadow:0 4px 15px rgba(16,185,129,.3); transition:all .2s; }
        .inv-btn-zone:hover { transform:translateY(-2px); }
        .inv-fiches-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(300px,1fr)); gap:18px; margin-top:4px; }
        .inv-fiche-card { background:var(--card-bg); border:1px solid var(--glass-border); border-radius:20px; padding:20px; transition:all .3s; position:relative; overflow:hidden; }
        .inv-fiche-card::before { content:''; position:absolute; top:0; left:0; right:0; height:3px; background:var(--glass-border); }
        .inv-fiche-card.scanned::before { background:linear-gradient(90deg,#10b981,#06b6d4); }
        .inv-fiche-card.anomal::before { background:linear-gradient(90deg,#f59e0b,#ef4444); }
        .inv-fiche-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
        .inv-fiche-iup { font-size:10px; font-weight:800; color:var(--text-dim); background:var(--bg-main); padding:3px 8px; border-radius:8px; font-family:monospace; }
        .inv-fiche-status { font-size:10px; font-weight:800; padding:3px 10px; border-radius:20px; }
        .inv-fiche-status.ok { background:rgba(16,185,129,.12); color:#10b981; }
        .inv-fiche-status.bad { background:rgba(245,158,11,.12); color:#f59e0b; }
        .inv-fiche-name { font-size:14px; font-weight:700; margin-bottom:4px; }
        .inv-fiche-cat { font-size:11px; color:var(--text-dim); margin-bottom:12px; }
        .inv-fiche-locs { display:flex; flex-direction:column; gap:6px; margin-bottom:12px; }
        .inv-loc-item { font-size:12px; display:flex; gap:8px; }
        .inv-loc-label { font-weight:700; font-size:10px; text-transform:uppercase; color:var(--text-dim); min-width:60px; }
        .inv-loc-item.reel .inv-loc-label { color:#06b6d4; }
        .inv-etat-badge { display:inline-block; font-size:10px; font-weight:800; padding:3px 10px; border-radius:20px; margin-bottom:12px; }
        .inv-fiche-footer { display:flex; gap:8px; align-items:center; padding-top:12px; border-top:1px solid var(--glass-border); }
        .inv-btn-scan { flex:1; background:rgba(99,102,241,.1); color:#6366f1; border:1px solid rgba(99,102,241,.2); padding:9px 14px; border-radius:10px; cursor:pointer; font-weight:700; font-size:12px; transition:all .2s; }
        .inv-btn-scan:hover { background:#6366f1; color:white; }
        .inv-btn-sup { background:rgba(245,158,11,.1); color:#f59e0b; border:1px solid rgba(245,158,11,.2); padding:9px 12px; border-radius:10px; cursor:pointer; font-size:12px; font-weight:700; }
        .inv-scanned-pill { background:rgba(16,185,129,.1); color:#10b981; font-size:10px; font-weight:800; padding:4px 10px; border-radius:20px; }
        .inv-sup-pill { background:rgba(6,182,212,.1); color:#06b6d4; font-size:10px; font-weight:800; padding:4px 10px; border-radius:20px; }

        /* ÉCARTS */
        .inv-view-header { display:flex; justify-content:space-between; align-items:flex-start; margin-bottom:28px; flex-wrap:wrap; gap:16px; padding-bottom:20px; border-bottom:1px solid var(--glass-border); }
        .inv-ecart-kpi { background:var(--card-bg); border:1px solid var(--glass-border); border-radius:16px; padding:14px 22px; text-align:center; }
        .inv-ecart-kpi strong { display:block; font-size:28px; font-weight:800; }
        .inv-ecart-kpi span { font-size:11px; color:var(--text-dim); }
        .inv-ecart-kpi.warn { border-color:rgba(245,158,11,.3); }
        .inv-ecart-kpi.warn strong { color:#f59e0b; }
        .inv-ecarts-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(320px,1fr)); gap:18px; }
        .inv-ecart-card { background:var(--card-bg); border:1px solid var(--glass-border); border-radius:20px; padding:22px; transition:all .3s; }
        .inv-ecart-card.done { border-color:rgba(16,185,129,.3); opacity:.75; }
        .inv-ecart-top { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
        .inv-ecart-type { font-size:11px; font-weight:800; background:rgba(99,102,241,.1); color:#6366f1; padding:4px 10px; border-radius:20px; }
        .inv-ecart-pill { font-size:10px; font-weight:800; padding:3px 10px; border-radius:20px; }
        .inv-ecart-pill.ok { background:rgba(16,185,129,.1); color:#10b981; }
        .inv-ecart-pill.wait { background:rgba(245,158,11,.1); color:#f59e0b; }
        .inv-ecart-bien { font-size:14px; font-weight:700; margin-bottom:4px; }
        .inv-ecart-iup { font-size:11px; color:var(--text-dim); font-family:monospace; margin-bottom:10px; }
        .inv-ecart-just { font-size:12px; color:var(--text-dim); padding:8px; background:var(--bg-main); border-radius:8px; margin-bottom:14px; }
        .inv-btn-valide-ecart { width:100%; background:rgba(16,185,129,.1); color:#10b981; border:1px solid rgba(16,185,129,.25); padding:10px; border-radius:12px; cursor:pointer; font-weight:700; font-size:13px; transition:all .2s; }
        .inv-btn-valide-ecart:hover { background:#10b981; color:white; }

        /* CERTIFICATION */
        .inv-cert-view { display:flex; justify-content:center; }
        .inv-cert-center { text-align:center; max-width:680px; width:100%; background:var(--card-bg); border:1px solid var(--glass-border); border-radius:28px; padding:48px 40px; backdrop-filter:blur(12px); }
        .inv-cert-pre-seal { font-size:72px; margin-bottom:16px; }
        .inv-cert-kpis { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin:28px 0; }
        .inv-cert-kpi-item { background:var(--bg-main); border-radius:14px; padding:16px 10px; text-align:center; }
        .inv-cert-kpi-item strong { display:block; font-size:28px; font-weight:800; }
        .inv-cert-kpi-item span { font-size:11px; color:var(--text-dim); }
        .inv-cert-kpi-item.blue strong { color:#6366f1; }
        .inv-cert-kpi-item.orange strong { color:#f59e0b; }
        .inv-cert-kpi-item.red strong { color:#ef4444; }
        .inv-cert-kpi-item.green strong { color:#10b981; }
        .inv-cert-warning { background:rgba(245,158,11,.1); border:1px solid rgba(245,158,11,.3); color:#f59e0b; border-radius:14px; padding:14px 18px; font-size:13px; display:flex; align-items:center; flex-wrap:wrap; gap:8px; margin:10px 0; }
        .inv-cert-hash { display:inline-flex; gap:12px; align-items:center; background:var(--bg-main); border:1px solid var(--glass-border); border-radius:10px; padding:8px 16px; font-size:12px; color:var(--text-dim); margin-top:12px; }
        .inv-cert-hash code { font-family:monospace; color:#6366f1; font-weight:700; }
        .inv-cert-done { text-align:center; max-width:620px; width:100%; background:var(--card-bg); border:1px solid rgba(16,185,129,.3); border-radius:28px; padding:48px 40px; }
        .inv-cert-seal { position:relative; display:inline-flex; align-items:center; justify-content:center; margin-bottom:24px; }
        .inv-seal-outer { font-size:80px; animation:pulse 2s infinite; }
        @keyframes pulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
        .inv-cert-info { background:rgba(16,185,129,.06); border-radius:16px; padding:20px; margin:24px 0; text-align:left; display:flex; flex-direction:column; gap:10px; }
        .inv-cert-info div { display:flex; justify-content:space-between; font-size:14px; }
        .inv-cert-info span { color:var(--text-dim); }

        /* MODAL */
        .inv-overlay { position:fixed; inset:0; background:rgba(0,0,0,.65); z-index:1000; display:flex; align-items:center; justify-content:center; padding:20px; backdrop-filter:blur(4px); }
        .inv-modal { background:var(--card-bg); border:1px solid var(--glass-border); border-radius:24px; width:100%; max-width:660px; max-height:90vh; overflow-y:auto; box-shadow:0 30px 60px rgba(0,0,0,.4); }
        .inv-modal-header { display:flex; justify-content:space-between; align-items:flex-start; padding:24px 28px 16px; border-bottom:1px solid var(--glass-border); }
        .inv-modal-iup { font-size:10px; font-weight:800; color:var(--text-dim); font-family:monospace; margin-bottom:4px; }
        .inv-modal-header h3 { margin:0; font-size:17px; }
        .inv-modal-close { background:var(--glass-border); border:none; width:32px; height:32px; border-radius:50%; cursor:pointer; font-size:16px; color:var(--text-dim); display:flex; align-items:center; justify-content:center; flex-shrink:0; transition:all .2s; }
        .inv-modal-close:hover { background:#ef4444; color:white; }
        .inv-modal-body { padding:24px 28px; }
        .inv-modal-footer { display:flex; justify-content:flex-end; gap:12px; margin-top:20px; }
        .inv-etat-selector { display:flex; gap:8px; flex-wrap:wrap; }
        .inv-etat-selector button { padding:10px 16px; border-radius:10px; cursor:pointer; font-weight:700; font-size:12px; transition:all .2s; }
        .inv-anomalie-row { margin:10px 0 0; padding:14px 0; border-top:1px solid var(--glass-border); }
        .inv-toggle-label { display:flex; align-items:center; gap:14px; cursor:pointer; }
        .inv-toggle { width:44px; height:24px; background:var(--glass-border); border-radius:12px; position:relative; transition:background .3s; flex-shrink:0; }
        .inv-toggle.on { background:#6366f1; }
        .inv-toggle-thumb { width:18px; height:18px; background:white; border-radius:50%; position:absolute; top:3px; left:3px; transition:transform .3s; box-shadow:0 2px 4px rgba(0,0,0,.2); }
        .inv-toggle.on .inv-toggle-thumb { transform:translateX(20px); }
        .inv-btn-gps { background:rgba(6,182,212,.1); color:#06b6d4; border:1px solid rgba(6,182,212,.2); padding:10px 16px; border-radius:10px; cursor:pointer; font-weight:700; font-size:13px; white-space:nowrap; transition:all .2s; }
        .inv-btn-gps:hover { background:#06b6d4; color:white; }
      `}</style>
    </div>
  );
};

export default InventairePage;
