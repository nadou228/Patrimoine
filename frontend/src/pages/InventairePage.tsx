import React, { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { 
  getInventaires, createInventaire, deleteInventaire,
  getInventaireFiches, updateInventaireFiche,
  validerFicheAgent, validerFicheSuperviseur,
  getInventaireEcarts, validerEcart,
  validerZoneInventaire, certifierInventaire,
  getInventaireStats, lancerRapprochementInventaire,
  getServices
} from '../api/api';
import { exportCertificatInventaire, exportInventaireCompletExcel } from '../utils/exporters';
import ImageUpload from '../components/ImageUpload';
import { parseQrPayload } from '../utils/qrParser';
import { ETATS_CONSTATES, TYPE_ECART_LABELS } from '../utils/inventaireConstants';
import { useConfirm } from '../contexts/ConfirmContext';
import { useToast } from '../contexts/ToastContext';
import { usePermissions } from '../contexts/PermissionsContext';
import { 
  Sparkles, CheckCircle2, LayoutGrid, Search, X, Check, ChevronRight,
  ShieldCheck, Activity, BarChart3, QrCode, FileText, PlusCircle, AlertTriangle, ExternalLink, Smartphone
} from 'lucide-react';
import AnimatedNumber from "../components/AnimatedNumber";

const MISSION_TEMPLATES = [
  { id: 'ANNUAL', name: 'Inventaire Annuel', desc: 'Audit complet de fin d\'exercice pour certification officielle des comptes patrimoniaux.', icon: '📅', color: '#6366f1' },
  { id: 'SPOT',   name: 'Audit Flash',       desc: 'Recensement ciblé par échantillonnage sur une zone ou catégorie spécifique.', icon: '⚡', color: '#f59e0b' },
  { id: 'HANDOVER', name: 'Passation de Service', desc: 'Inventaire contradictoire lors du changement d\'un gestionnaire ou d\'un poste.', icon: '🤝', color: '#10b981' }
];

const ETAT_COLORS: Record<string, string> = Object.fromEntries(
  ETATS_CONSTATES.map(e => [e.value, e.color])
);

/* ─── Circular Progress ─── */
const CircularProgress = ({ percent, size = 56 }: { percent: number; size?: number }) => {
  const r = size * 0.38;
  const circ = 2 * Math.PI * r;
  const offset = circ - (Math.max(0, Math.min(100, percent)) / 100) * circ;
  const color = percent >= 80 ? '#10b981' : percent >= 40 ? '#6366f1' : '#f59e0b';
  return (
    <div className="circular-progress-wrap" style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={6}/>
        <circle cx={size/2} cy={size/2} r={r} fill="none"
          stroke={color} strokeWidth={6} strokeLinecap="round"
          strokeDasharray={circ} strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)' }}/>
      </svg>
      <span style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center',
        fontSize: size < 50 ? 10 : 12, fontWeight: 900, color }}>
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
  const [searchParams] = useSearchParams();
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const canValidateAgent = hasPermission('VALIDATE_INVENTAIRES_AGENT');
  const canValidateSuperviseur = hasPermission('VALIDATE_INVENTAIRES_SUPERVISEUR');
  const canValidateEcart = hasPermission('VALIDATE_INVENTAIRES_ECART');
  const canCertifier = hasPermission('VALIDATE_INVENTAIRES_SUPERVISEUR') || hasPermission('VALIDATE_INVENTAIRES_ECART');
  type ViewType = 'DASHBOARD'|'PREPARATION'|'EXECUTION'|'RECONCILIATION'|'CERTIFICATION';
  const [view, setView] = useState<ViewType>('DASHBOARD');
  const [campagnes,       setCampagnes]       = useState<any[]>([]);
  const [campagnesStats,  setCampagnesStats]  = useState<Record<number, any>>({});
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

  useEffect(() => {
    const fromUrl = searchParams.get('campagne');
    if (!fromUrl || campagnes.length === 0) return;
    const c = campagnes.find(x => x.id === Number(fromUrl));
    if (c && selectedCampagne?.id !== c.id) openCampagne(c);
  }, [searchParams, campagnes]);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const list = await getInventaires() || [];
      setCampagnes(list);
      const statsMap: Record<number, any> = {};
      await Promise.all(list.map(async (c: any) => {
        try { statsMap[c.id] = await getInventaireStats(c.id); } catch { /* ignore */ }
      }));
      setCampagnesStats(statsMap);
    } catch { setCampagnes([]); }
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
    const iup = parseQrPayload(scanInput);
    const found = fiches.find(f =>
      f.bien?.iup === iup || f.codeIup === iup
      || (iup && (f.bien?.iup?.includes(iup) || iup.includes(f.bien?.iup || '')))
    );
    if (found) {
      if (found.validationAgent !== 'VALIDE') {
        setAuditModal({ ...found, coordonneeGps: found.coordonneeGps || found.coordonneesGps || '' });
        showToast({ type: 'info', title: 'IUP Détecté', message: `Ouverture de la fiche pour ${found.bien?.designation || found.codeIup}` });
      } else {
        showToast({ type: 'info', title: 'Déjà audité', message: 'Ce bien a déjà été scanné et validé par l\'agent.' });
      }
    } else {
      showToast({ type: 'error', title: 'IUP introuvable', message: 'Ce bien n\'est pas dans le périmètre de la mission. Utilisez le Mode Terrain pour les biens hors périmètre.' });
    }
    setScanInput('');
  };

  const handleRapprochement = async () => {
    if (!selectedCampagne) return;
    try {
      const res = await lancerRapprochementInventaire(selectedCampagne.id);
      showToast({ type: 'success', title: 'Rapprochement comptable', message: res.message || `${res.ecartsDetectes} écart(s) détecté(s)` });
      goView('RECONCILIATION');
    } catch (err: any) {
      showToast({ type: 'error', title: 'Rapprochement impossible', message: String(err.response?.data || err.message) });
    }
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
      setAuditModal((m: any) => ({ ...m, coordonneeGps: 'GPS non disponible' }));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => setAuditModal((m: any) => ({ ...m, coordonneeGps: `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}` })),
      () => setAuditModal((m: any) => ({ ...m, coordonneeGps: '' }))
    );
  };

  const securityHash = selectedCampagne
    ? `SIGP-${selectedCampagne.id}-${(selectedCampagne.nom || '').slice(0, 4).toUpperCase()}-${new Date().getFullYear()}`
    : 'SIGP-PENDING';

  const fichesSansAnomalie   = fiches.filter(f => !f.anomalie);
  const fichesAvecAnomalie   = fiches.filter(f => f.anomalie);
  const fichesValidees        = fiches.filter(f => f.validationAgent === 'VALIDE');
  const ecartsEnAttente       = ecarts.filter(e => e.statutValidation === 'EN_ATTENTE');
  const progressPercent       = fiches.length ? Math.round((fichesValidees.length / fiches.length) * 100) : 0;
  const selectedStats         = selectedCampagne ? campagnesStats[selectedCampagne.id] : null;
  const globalInventoryStats  = Object.values(campagnesStats).reduce((acc: any, st: any) => {
    acc.totalFiches += Number(st?.totalFiches || 0);
    acc.fichesRecensees += Number(st?.fichesRecensees || 0);
    acc.fichesConformes += Math.max(0, Number(st?.fichesRecensees || 0) - Number(st?.fichesAvecAnomalie || 0));
    acc.ecartsTotal += Number(st?.ecartsTotal || 0);
    return acc;
  }, { totalFiches: 0, fichesRecensees: 0, fichesConformes: 0, ecartsTotal: 0 });
  const certifiedAssetsCount  = campagnes
    .filter(c => c.statut === 'CERTIFIE')
    .reduce((sum, c) => sum + Number(campagnesStats[c.id]?.totalFiches || 0), 0);
  const dashboardConformity   = selectedCampagne
    ? Number(selectedStats?.tauxConformite || 0)
    : (globalInventoryStats.fichesRecensees
      ? Math.round((globalInventoryStats.fichesConformes / globalInventoryStats.fichesRecensees) * 100)
      : 0);
  const dashboardAnomalies    = selectedCampagne ? ecarts.length : globalInventoryStats.ecartsTotal;

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
      <header className="page-header-modern">
        <div className="header-meta">
          <span className="badge-pill-glow">Audit & Certification Patrimoniale</span>
          <h1>Inventaire & Certification</h1>
        </div>
        
        <div className="toolbar-filters">
          {[
            { id: 'DASHBOARD', label: 'Missions', icon: <LayoutGrid size={16} /> },
            ...(selectedCampagne ? [
              { id: 'EXECUTION', label: 'Terrain', icon: <Activity size={16} /> },
              { id: 'RECONCILIATION', label: 'Écarts', icon: <Search size={16} /> },
              { id: 'CERTIFICATION', label: 'Certificat', icon: <ShieldCheck size={16} /> }
            ] : [])
          ].map((item) => (
            <button
              key={item.id}
              className={`pill-filter ${view === item.id ? "active" : ""}`}
              onClick={() => goView(item.id as ViewType)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
          <button className="primary-premium" onClick={() => { setView('PREPARATION'); setWizardStep(1); }}>
            <Sparkles size={16} />
            Lancer un Audit
          </button>
        </div>
      </header>

      {/* ══════════ LOADING ══════════ */}
      {loading && (
        <div className="empty-state-modern">
          <div className="inv-spinner"/>
          <p>Initialisation du moteur d'audit...</p>
        </div>
      )}

      {/* ══════════ STATS DASHBOARD ══════════ */}
      {!loading && (
        <div className="stats-dashboard fade-in">
          <div className="stat-card-premium">
            <span className="stat-label">Missions Actives</span>
            <span className="stat-value">
              <AnimatedNumber value={campagnes.filter(c => c.statut === 'EN_COURS').length} />
            </span>
            <p className="stat-hint">Audits physiques live</p>
          </div>

          <div className="stat-card-premium">
            <span className="stat-label">Taux de Conformité</span>
            <span className="stat-value text-success">
              <AnimatedNumber value={dashboardConformity} />%
            </span>
            <p className="stat-hint">{selectedCampagne ? 'Mission sélectionnée' : 'Missions recensées'}</p>
          </div>

          <div className="stat-card-premium">
            <span className="stat-label">Anomalies Détectées</span>
            <span className="stat-value text-danger">
              <AnimatedNumber value={dashboardAnomalies} />
            </span>
            <p className="stat-hint">Écarts à régulariser</p>
          </div>

          <div className="stat-card-premium">
            <span className="stat-label">Biens Certifiés</span>
            <span className="stat-value text-warning">
              <AnimatedNumber value={certifiedAssetsCount} />
            </span>
            <p className="stat-hint">Validés dans missions certifiées</p>
          </div>
        </div>
      )}

      {/* ══════════ DASHBOARD ══════════ */}
      {!loading && view === 'DASHBOARD' && (
        <div className="fade-in" style={{ marginTop: 20 }}>
          <div className="mission-logic-panel">
            <div>
              <span className="badge-pill-glow">Logique métier</span>
              <h3>Une mission d'inventaire suit un cycle contrôlé</h3>
              <p>
                Préparer le périmètre, enregistrer les membres de l'équipe, recenser sur le terrain,
                valider par agent puis superviseur, rapprocher les écarts, enfin certifier le rapport.
              </p>
            </div>
            <div className="mission-logic-steps">
              {[
                'Préparation',
                'Équipe terrain',
                'Scan + preuve',
                'Double contrôle',
                'Écarts',
                'Certification'
              ].map((step, index) => (
                <div key={step} className="logic-step">
                  <strong>{index + 1}</strong>
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </div>

          {campagnes.length === 0 ? (
            <div className="empty-state-modern">
              <div className="icon-box-premium" style={{ width: 100, height: 100, fontSize: 40, margin: '0 auto 24px' }}>🗂️</div>
              <h3>Aucune mission d'inventaire</h3>
              <p>Démarrez une nouvelle mission d'audit pour prendre le contrôle de votre patrimoine.</p>
              <button className="primary-premium" onClick={() => setView('PREPARATION')}>
                + Lancer ma première mission
              </button>
            </div>
          ) : (
            <div className="mission-grid-modern">
              {campagnes.map(c => {
                const st = campagnesStats[c.id];
                const prog = c.statut === 'CERTIFIE' ? 100 : (st?.tauxCouverture ?? 0);
                const isCert = c.statut === 'CERTIFIE';
                return (
                  <div key={c.id} className={`mission-card-premium glass-card ${isCert ? 'certified' : ''}`}>
                    <div className="card-header-premium">
                      <div className="icon-box-premium" style={{ background: isCert ? 'var(--success-glow)' : 'var(--primary-glow)' }}>
                        {isCert ? <ShieldCheck size={20} className="text-success" /> : <Activity size={20} className="text-primary" />}
                      </div>
                      <div style={{ flex: 1 }}>
                        <h3 className="inv-mission-name">{c.nom}</h3>
                        <span className={`badge-pill-glow ${isCert ? 'text-success' : 'text-primary'}`} style={{ fontSize: 9, padding: '2px 10px' }}>
                          {isCert ? 'CERTIFIÉ' : 'EN COURS'}
                        </span>
                      </div>
                      <CircularProgress percent={prog} size={48} />
                    </div>

                    <div className="inv-mission-meta-modern">
                      <div className="meta-item">
                        <Search size={14} />
                        <span>Périmètre : <strong>{c.sites || 'National'}</strong></span>
                      </div>
                      <div className="meta-item">
                        <Activity size={14} />
                        <span>Équipes : <strong>{c.equipes || 'Audit Interne'}</strong></span>
                      </div>
                      <div className="meta-item">
                        <CheckCircle2 size={14} />
                        <span>Lancé le : <strong>{c.dateDebut || new Date(c.dateCreation).toLocaleDateString()}</strong></span>
                      </div>
                    </div>
                    
                    <div className="card-actions-premium">
                      <button className="primary-premium" onClick={() => openCampagne(c)}>
                        Gérer la mission
                      </button>
                      {!isCert && (
                        <Link to={`/terrain?campagne=${c.id}`} className="pill-filter" title="Mode Terrain">
                          <Smartphone size={16} />
                        </Link>
                      )}
                      <button className="pill-filter" title="Exporter" onClick={() => {
                        getInventaireFiches(c.id).then(f => exportInventaireCompletExcel(c, f, []));
                      }}>
                        <Search size={16} />
                      </button>
                      <button className="pill-filter text-danger" title="Supprimer" onClick={async () => {
                        const approved = await confirm({
                          title: "Supprimer cette mission ?",
                          message: "La campagne et ses donnees associees seront retirees.",
                          confirmLabel: "Supprimer",
                          tone: "danger",
                        });
                        if (!approved) return;
                        await deleteInventaire(c.id);
                        loadInitialData();
                      }}>
                        <X size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
              
              <div className="mission-card-premium add-placeholder glass-card" onClick={() => setView('PREPARATION')}>
                <div className="add-icon-glow">
                  <PlusCircle size={32} />
                </div>
                <h3>Nouvel Audit</h3>
                <p>Initialiser un protocole</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ══════════ WIZARD ══════════ */}
      {!loading && view === 'PREPARATION' && (
        <div className="inv-wizard fade-in">
          <div className="inv-stepper-modern">
            {['Modèle','Périmètre','Lancement'].map((lbl, i) => {
              const n = i+1;
              const isActive = wizardStep === n;
              const isDone = wizardStep > n;
              return (
                <React.Fragment key={n}>
                  <div className={`step-item ${isActive ? 'active' : ''} ${isDone ? 'done' : ''}`}>
                    <div className="step-number">{isDone ? <Check size={16} /> : n}</div>
                    <span className="step-label">{lbl}</span>
                  </div>
                  {i < 2 && <div className={`step-line ${isDone ? 'done' : ''}`} />}
                </React.Fragment>
              );
            })}
          </div>

          <div className="glass-card premium-card wizard-content-box">
            {/* Step 1 - Templates */}
            {wizardStep === 1 && (
              <div className="fade-in">
                <div className="wizard-header-center">
                  <span className="badge-pill-glow">Étape 01</span>
                  <h2>Protocole d'Audit</h2>
                  <p>Sélectionnez le protocole adapté à vos objectifs stratégiques</p>
                </div>
                <div className="template-grid-creative">
                  {MISSION_TEMPLATES.map(t => (
                    <div key={t.id}
                      className={`template-card-creative ${form.templateId === t.id ? 'selected' : ''}`}
                      onClick={() => { setForm({...form, templateId: t.id, nom: `Mission ${t.name} ${new Date().getFullYear()}`}); setWizardStep(2); }}>
                      <div className="template-icon-wrap" style={{ background: t.color + '20', color: t.color }}>
                        <span style={{ fontSize: 32 }}>{t.icon}</span>
                      </div>
                      <div className="template-info">
                        <h3>{t.name}</h3>
                        <p>{t.desc}</p>
                      </div>
                      <div className="template-arrow"><ChevronRight size={20} /></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Step 2 - Périmètre */}
            {wizardStep === 2 && (
              <div className="fade-in">
                <div className="wizard-header-center">
                  <span className="badge-pill-glow">Étape 02</span>
                  <h2>Périmètre & Équipes</h2>
                  <p>Définissez les limites géographiques et opérationnelles de la mission</p>
                </div>
                
                <div className="form-content-premium">
                  <div className="grid-2">
                    <div className="form-group-modern" style={{ gridColumn: 'span 2' }}>
                      <label>Désignation de la Mission</label>
                      <input value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} placeholder="Ex : Inventaire Annuel 2025"/>
                    </div>
                    
                    <div className="form-group-modern">
                      <label>Site / Direction concernée</label>
                      <select value={form.sites} onChange={e => setForm({...form, sites: e.target.value})}>
                        <option value="">🌍 Périmètre National (Tous sites)</option>
                        {services.map(s => <option key={s.id} value={s.nomService || s.nom}>{s.nomService || s.nom}</option>)}
                      </select>
                    </div>

                    <div className="form-group-modern">
                      <label>Noms des membres de l'équipe terrain</label>
                      <textarea
                        value={form.equipes}
                        onChange={e => setForm({...form, equipes: e.target.value})}
                        placeholder="Ex : Amina Diallo - Agent, Karim Ba - Superviseur, Fatou Ndiaye - Contrôle interne"
                        rows={3}
                      />
                      <small className="field-help">Ces noms seront conservés avec la mission et repris dans le rapport/certificat.</small>
                    </div>

                    <div className="form-group-modern">
                      <label>Date de démarrage</label>
                      <input type="date" value={form.dateDebut} onChange={e => setForm({...form, dateDebut: e.target.value})}/>
                    </div>

                    <div className="form-group-modern">
                      <label>Date de clôture estimée</label>
                      <input type="date" value={form.dateFin} onChange={e => setForm({...form, dateFin: e.target.value})}/>
                    </div>
                  </div>
                </div>

                <div className="form-actions-wizard">
                  <button className="pill-filter" onClick={() => setWizardStep(1)}>Précédent</button>
                  <button className="primary-premium" onClick={() => setWizardStep(3)}>Suivant : Validation</button>
                </div>
              </div>
            )}

            {/* Step 3 - Launch */}
            {wizardStep === 3 && (
              <div className="fade-in launch-confirmation">
                <div className="launch-icon-container">
                  <div className="pulse-ring" />
                  <Sparkles size={48} className="text-primary" />
                </div>
                <h2>Prêt pour le Lancement</h2>
                <p>Récapitulatif des paramètres avant initialisation du registre d'audit</p>

                <div className="summary-glass-box">
                  <div className="summary-item"><span>MISSION</span><strong>{form.nom}</strong></div>
                  <div className="summary-item"><span>ZONE</span><strong>{form.sites || 'NATIONAL'}</strong></div>
                  <div className="summary-item"><span>ÉQUIPE</span><strong>{form.equipes || 'Non renseignée'}</strong></div>
                  <div className="summary-item"><span>DÉBUT</span><strong>{form.dateDebut}</strong></div>
                </div>

                <div className="form-actions-wizard centered">
                  <button className="pill-filter" onClick={() => setWizardStep(2)}>Ajuster</button>
                  <button className="primary-premium large-btn" onClick={async () => {
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
        <div className="fade-in terrain-shell">
          <div className="glass-card premium-card monitoring-header">
            <div className="monitoring-meta">
              <div className="live-status">
                <div className="pulse-dot-red" />
                <span>MONITORING TERRAIN LIVE</span>
              </div>
              <h2>{selectedCampagne.nom}</h2>
              <p className="text-dim">Capture de données physiques en temps réel</p>
            </div>

            <div className="monitoring-stats">
              <div className="mini-stat-box">
                <CircularProgress percent={progressPercent} size={50}/>
                <div className="stat-text">
                  <strong>{fichesValidees.length} / {fiches.length}</strong>
                  <span>ACTIFS AUDITÉS</span>
                </div>
              </div>
              <div className="action-group">
                <Link to={`/terrain?campagne=${selectedCampagne.id}`} className="pill-filter" title="Ouvrir Mode Terrain">
                  <Smartphone size={16} /> Mode Terrain
                </Link>
                <button className="pill-filter" onClick={handleRapprochement} title="Rapprochement comptable automatique">
                  <BarChart3 size={16} /> Rapprochement
                </button>
                <button className="pill-filter" onClick={() => exportInventaireCompletExcel(selectedCampagne, fiches, ecarts)}>
                  <FileText size={16} />
                  Rapport
                </button>
                {canValidateAgent ? (
                  <button className="primary-premium" onClick={handleGlobalValidate}>
                    <CheckCircle2 size={16} />
                    Clôturer Zone
                  </button>
                ) : (
                  <div className="aff-status-pill status-en_attente" style={{ padding: '8px 14px' }}>
                    ⏳ Zone en attente de clôture
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="scan-section-premium">
            <div className="scan-bar-glow">
              <QrCode size={24} className="text-primary" />
              <form onSubmit={handleScan} style={{ flex: 1, display: 'flex' }}>
                <input 
                  type="text" 
                  placeholder="Scanner un code IUP ou identifiant d'actif..." 
                  value={scanInput} 
                  onChange={(e) => setScanInput(e.target.value)} 
                  autoFocus
                />
                <button type="submit">IDENTIFIER</button>
              </form>
            </div>
          </div>

          {fiches.length === 0 ? (
            <div className="empty-state-modern">
              <Activity size={48} className="text-dim" style={{ marginBottom: 20 }} />
              <h3>Aucune fiche disponible</h3>
              <p>Les fiches d'audit seront générées dès que les données du périmètre seront synchronisées.</p>
            </div>
          ) : (
            <div className="audit-fiches-grid">
              {fiches.map(f => {
                const done = f.validationAgent === 'VALIDE';
                return (
                  <div key={f.id} className={`audit-card-premium glass-card ${done ? 'completed' : ''}`}>
                    <div className="card-top-info">
                      <span className="iup-badge">{f.bien?.iup || f.codeIup}</span>
                      <span className={`status-tag ${f.anomalie ? 'anomaly' : 'conforming'}`}>
                        {f.anomalie ? 'ANOMALIE' : 'CONFORME'}
                      </span>
                    </div>
                    
                    <div className="card-main-content">
                      <h3>{f.bien?.designation || 'Actif non identifié'}</h3>
                      <p className="cat-text">{f.bien?.categorie || 'Catégorie inconnue'}</p>
                      
                      <div className="loc-info-box">
                        <div className="loc-row">
                          <span className="label">Théorique :</span>
                          <span className="val">{f.bien?.localisation || '—'}</span>
                        </div>
                        {f.localisationReelle && (
                          <div className="loc-row real">
                            <span className="label">Constaté :</span>
                            <span className="val">{f.localisationReelle}</span>
                          </div>
                        )}
                        <div className="loc-row" style={{ fontSize: 11, marginTop: 6, gap: 8, display: 'flex' }}>
                          {f.photoUrl ? <span style={{ color: '#10b981' }}>📷 Photo</span> : <span style={{ color: '#f59e0b' }}>📷 Manquante</span>}
                          {f.coordonneeGps ? <span style={{ color: '#10b981' }}>🛰️ GPS</span> : <span style={{ color: '#f59e0b' }}>🛰️ GPS absent</span>}
                        </div>
                      </div>
                    </div>

                    <div className="card-footer-premium">
                      {!done ? (
                        canValidateAgent ? (
                          <button className="primary-premium small" onClick={() => setAuditModal({...f})}>
                            AUDITER L'ACTIF
                          </button>
                        ) : (
                          <div className="audit-status-badge" style={{ background: '#f1f5f9', color: '#64748b', border: '1px dashed #cbd5e1' }}>
                            <span>LECTURE SEULE</span>
                          </div>
                        )
                      ) : (
                        f.validationSuperviseur === 'VALIDE' ? (
                          <div className="audit-status-badge" style={{ background: '#d1fae5', color: '#065f46', border: '1px solid #6ee7b7' }}>
                            <CheckCircle2 size={14} />
                            <span>CONFORME (SUPERVISEUR)</span>
                          </div>
                        ) : f.validationSuperviseur === 'REJETE' ? (
                          <div className="audit-status-badge" style={{ background: '#fee2e2', color: '#991b1b', border: '1px solid #fca5a5' }}>
                            <X size={14} />
                            <span>REJETÉ PAR LE SUPERVISEUR</span>
                          </div>
                        ) : (
                          canValidateSuperviseur ? (
                            <button className="primary-premium small" style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)' }} onClick={() => setSuperviseurModal({...f, decisionSup: 'VALIDE'})}>
                              CONTRÔLER / VALIDER
                            </button>
                          ) : (
                            <div className="aff-status-pill status-en_attente" style={{ width: '100%', justifyContent: 'center', fontSize: '10px' }}>
                              ⏳ En attente de contrôle final
                            </div>
                          )
                        )
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
        <div className="fade-in reconciliation-shell">
          <div className="glass-card premium-card reconciliation-header">
            <div className="header-meta">
              <span className="badge-pill-glow">Phase d'Audit 03</span>
              <h2>Analyse & Résolution des Écarts</h2>
              <p className="text-dim">Traitement des anomalies constatées lors du recensement terrain</p>
            </div>
            
            <div className="header-kpis">
              <div className="kpi-pill">
                <span className="kpi-label">DÉTECTÉS</span>
                <span className="kpi-val">{ecarts.length}</span>
              </div>
              <div className="kpi-pill warning">
                <span className="kpi-label">À TRAITER</span>
                <span className="kpi-val">{ecartsEnAttente.length}</span>
              </div>
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
                      <span className="badge-pill-glow" style={{ fontSize: 10 }}>{TYPE_ECART_LABELS[e.typeEcart] || e.typeEcart?.replace(/_/g,' ')}</span>
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
                      canValidateEcart ? (
                        <button className="primary-premium" style={{ marginTop: 20, width: '100%', padding: '12px' }} onClick={async () => {
                          const j = window.prompt("Décision / justification du superviseur :");
                          if (j !== null) {
                            try { await validerEcart(e.id, 'VALIDE'); goView('RECONCILIATION'); }
                            catch { showToast({ type: "error", title: "Erreur de validation" }); }
                          }
                        }}>
                          Valider l'écart
                        </button>
                      ) : (
                        <div className="aff-status-pill status-en_attente" style={{ marginTop: 20, width: '100%', justifyContent: 'center', fontSize: '11px', padding: '10px' }}>
                          ⏳ En attente de régularisation comptable
                        </div>
                      )
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
        <div className="fade-in certification-shell">
          {selectedCampagne.statut === 'CERTIFIE' ? (
            <div className="glass-card premium-card certification-result-box light">
              <div className="success-icon-container">
                <div className="ripple-effect" />
                <ShieldCheck size={80} className="text-success" />
              </div>
              <h2>Certification Officielle Scellée</h2>
              <p className="certification-status-text">
                Cette campagne d'inventaire a été auditée, validée et scellée dans le registre numérique immuable du patrimoine.
              </p>
              
              <div className="certification-details-glass light">
                <div className="detail-row">
                  <span>NUMÉRO DE CERTIFICAT</span>
                  <strong>CERT-{selectedCampagne.id.toString().padStart(6, '0')}</strong>
                </div>
                <div className="detail-row">
                  <span>DATE DE SCELLÉ</span>
                  <strong>{new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>
                </div>
                <div className="detail-row">
                  <span>AUTORITÉ DE VALIDATION</span>
                  <strong>{selectedCampagne.validePar || 'DIRECTION GÉNÉRALE DU PATRIMOINE'}</strong>
                </div>
              </div>

              <button className="primary-premium large-btn" onClick={handleExportCertificat}>
                <FileText size={20} />
                TÉLÉCHARGER LE PROCÈS-VERBAL CERTIFIÉ (PDF)
              </button>
            </div>
          ) : (
            <div className="glass-card premium-card certification-ready-box light">
              <div className="ready-icon-wrap">
                <Sparkles size={48} className="text-primary" />
              </div>
              <h2>Homologation de l'Audit</h2>
              <p className="ready-subtitle">
                Engagement de la responsabilité de l'audit et validation définitive du registre patrimonial.
              </p>

              <div className="kpi-grid-certification">
                <div className="kpi-card-mini light">
                  <span className="kpi-label">Actifs Recensés</span>
                  <span className="kpi-value">{fiches.length}</span>
                </div>
                <div className="kpi-card-mini light">
                  <span className="kpi-label">Taux d'Audit</span>
                  <span className="kpi-value">{Math.round((fichesValidees.length / Math.max(fiches.length, 1)) * 100)}%</span>
                </div>
                <div className="kpi-card-mini light">
                  <span className="kpi-label">Écarts Résolus</span>
                  <span className="kpi-value">{ecarts.filter(e => e.statutValidation === 'VALIDE').length}</span>
                </div>
              </div>

              {ecartsEnAttente.length > 0 ? (
                <div className="alert-card-premium danger light">
                  <AlertTriangle size={24} />
                  <div className="alert-content">
                    <strong>Action Impérative Requise</strong>
                    <p>{ecartsEnAttente.length} écart(s) n'ont pas encore été régularisés par un superviseur.</p>
                  </div>
                  <button className="pill-filter danger" onClick={() => setView('RECONCILIATION')}>Régulariser maintenant</button>
                </div>
              ) : (
                <div className="certification-action-zone">
                  <div className="security-hash-box light">
                    <span className="label">EMPREINTE DE SÉCURITÉ :</span>
                    <code>{securityHash}</code>
                  </div>
                  {canCertifier ? (
                    <button className="primary-premium extra-large" onClick={handleCertify}>
                      <ShieldCheck size={24} />
                      SCELLER ET CERTIFIER LA MISSION
                    </button>
                  ) : (
                    <div className="aff-status-pill status-en_attente" style={{ padding: '12px 24px', fontSize: '13px', fontWeight: 700 }}>
                      🔐 Certification réservée au superviseur ou responsable patrimoine
                    </div>
                  )}
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
                    {ETATS_CONSTATES.map(e => (
                      <button type="button" key={e.value}
                        style={{ background: auditModal.etatConstate === e.value ? e.color : 'transparent',
                          color: auditModal.etatConstate === e.value ? 'white' : 'var(--text-dim)',
                          border: `2px solid ${e.color}` }}
                        onClick={() => setAuditModal({...auditModal, etatConstate: e.value})}>
                        {e.label}
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
                    <input style={{ flex:1 }} readOnly value={auditModal.coordonneeGps || ''}
                      placeholder="Cliquez sur Capturer pour localiser"/>
                    <button type="button" className="inv-btn-gps" onClick={captureGPS}>🛰️ Capturer</button>
                  </div>
                </div>
                <div className="form-group-modern" style={{ gridColumn:'span 2' }}>
                  <label>Preuve Photographique</label>
                  <ImageUpload value={auditModal.photoUrl || ''} onChange={(url) => setAuditModal({...auditModal, photoUrl: url})} />
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

        .mission-logic-panel {
          display: grid;
          grid-template-columns: minmax(260px, 0.9fr) 1.5fr;
          gap: 20px;
          align-items: center;
          background: var(--card-bg);
          border: 1px solid var(--glass-border);
          border-radius: 22px;
          padding: 22px;
          margin-bottom: 22px;
        }

        .mission-logic-panel h3 {
          margin: 10px 0 8px;
          color: var(--text-main);
          font-size: 18px;
        }

        .mission-logic-panel p {
          margin: 0;
          color: var(--text-dim);
          font-size: 13px;
          line-height: 1.55;
        }

        .mission-logic-steps {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 10px;
        }

        .logic-step {
          display: flex;
          align-items: center;
          gap: 10px;
          background: var(--bg-main);
          border: 1px solid var(--glass-border);
          border-radius: 14px;
          padding: 12px;
          font-size: 12px;
          font-weight: 700;
          color: var(--text-main);
        }

        .logic-step strong {
          width: 24px;
          height: 24px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          border-radius: 999px;
          background: rgba(99,102,241,.12);
          color: #6366f1;
          font-size: 11px;
          flex-shrink: 0;
        }

        .form-group-modern textarea {
          min-height: 86px;
          resize: vertical;
          border: 1px solid var(--glass-border);
          border-radius: 12px;
          padding: 12px 14px;
          background: var(--bg-main);
          color: var(--text-main);
          font: inherit;
          font-size: 13px;
        }

        .field-help {
          color: var(--text-dim);
          font-size: 11px;
          line-height: 1.4;
        }

        @media (max-width: 900px) {
          .mission-logic-panel,
          .mission-logic-steps {
            grid-template-columns: 1fr;
          }
        }

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
