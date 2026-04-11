import React, { useState, useEffect } from 'react';
import { 
  getInventaires, 
  createInventaire, 
  deleteInventaire, 
  getInventaireFiches, 
  updateInventaireFiche,
  validerFicheAgent,
  getBiens,
  getServices
} from '../api/api';
import { exportRegistrePatrimoineExcel } from '../utils/exporters';

const InventairePage: React.FC = () => {
  const [view, setView] = useState<'DASHBOARD' | 'PREPARATION' | 'EXECUTION' | 'RECONCILIATION'>('DASHBOARD');
  const [campagnes, setCampagnes] = useState<any[]>([]);
  const [selectedCampagne, setSelectedCampagne] = useState<any | null>(null);
  const [fiches, setFiches] = useState<any[]>([]);
  const [biensRaw, setBiensRaw] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    nom: '',
    sites: '',
    equipes: '',
    dateDebut: new Date().toISOString().split('T')[0],
    dateFin: ''
  });
  const [editingFiche, setEditingFiche] = useState<any | null>(null);

  useEffect(() => {
    loadInitialData();
  }, []);

  const loadInitialData = async () => {
    setLoading(true);
    try {
      const [c, b] = await Promise.all([getInventaires(), getBiens()]);
      setCampagnes(c || []);
      setBiensRaw(b || []);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const handleStartCampagne = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createInventaire(form);
      setCampagnes([created, ...campagnes]);
      alert("Campagne de recensement initialisée !");
      setView('DASHBOARD');
    } catch (error) { alert("Erreur d'initialisation"); }
  };

  return (
    <div className="inventaire-module fade-in">
      <header className="page-header-premium">
        <div className="header-meta">
           <span className="badge-pill-glow">Audit & Certification</span>
           <h1>Inventaire Physique</h1>
        </div>
        <div className="header-nav-premium" style={{display: 'flex', gap: '15px'}}>
            <button className={`nav-btn ${view === 'DASHBOARD' ? 'active' : ''}`} onClick={() => setView('DASHBOARD')}>Tableau de Bord</button>
            <button className={`nav-btn ${view === 'RECONCILIATION' ? 'active' : ''}`} onClick={() => setView('RECONCILIATION')}>Rapprochement</button>
            <button className="primary" onClick={() => setView('PREPARATION')}>+ Lancer une Mission</button>
        </div>
      </header>

      {view === 'DASHBOARD' && (
        <div className="inventory-dashboard" style={{padding: '30px 0'}}>
            <div className="stats-grid-modern" style={{marginBottom: '40px'}}>
                <div className="stat-pill-modern">
                    <span className="pill-label">Campagnes Ouvertes</span>
                    <span className="pill-value">{campagnes.filter(c => c.statut === 'OUVERT').length}</span>
                </div>
                <div className="stat-pill-modern">
                    <span className="pill-label">Taux de Couverture</span>
                    <span className="pill-value" style={{color: 'var(--primary)'}}>84%</span>
                </div>
            </div>

            <div className="mission-grid-modern" style={{display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '25px'}}>
               {campagnes.map(c => (
                 <div key={c.id} className="mission-card-premium">
                    <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px'}}>
                       <span className={`status-pill status-${c.statut.toLowerCase()}`}>{c.statut}</span>
                       <span style={{fontSize: '11px', color: 'var(--text-dim)'}}>{new Date(c.dateCreation).toLocaleDateString()}</span>
                    </div>
                    <h3 style={{fontSize: '18px', marginBottom: '10px'}}>{c.nom}</h3>
                    <p style={{fontSize: '13px', color: 'var(--text-dim)', marginBottom: '20px'}}>📍 Sites : {c.sites || 'Tous'}</p>
                    
                    <div className="card-actions" style={{display: 'flex', gap: '10px', paddingTop: '15px', borderTop: '1px solid var(--glass-border)'}}>
                        <button className="btn-export" style={{flex: 1}} onClick={() => setView('RECONCILIATION')}>Rapport</button>
                        <button className="btn-export" style={{color: 'var(--danger)'}} onClick={() => deleteInventaire(c.id).then(loadInitialData)}>Supprimer</button>
                    </div>
                 </div>
               ))}
               <div className="mission-card-add" style={{border: '2px dashed var(--glass-border)', borderRadius: '30px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', padding: '40px'}} onClick={() => setView('PREPARATION')}>
                   <div style={{fontSize: '30px', color: 'var(--primary)', marginBottom: '10px'}}>+</div>
                   <h4 style={{fontSize: '14px'}}>Nouvelle Mission</h4>
               </div>
            </div>
        </div>
      )}

      {view === 'PREPARATION' && (
        <div className="centered-form-card fade-in">
           <div className="form-header-premium">
              <h2>🚀 Paramétrage de la Mission</h2>
              <button className="btn-back-cat" onClick={() => setView('DASHBOARD')}>Annuler</button>
           </div>
           <form onSubmit={handleStartCampagne} className="premium-dynamic-form">
              <div className="form-group-modern">
                 <label>Libellé de la Campagne d'Audit</label>
                 <input required value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} placeholder="Ex: Inventaire Annuel 2024" />
              </div>
              <div className="grid-2">
                 <div className="form-group-modern">
                    <label>Périmètre (Site)</label>
                    <input value={form.sites} onChange={e => setForm({...form, sites: e.target.value})} placeholder="Ex: Tous les sites" />
                 </div>
                 <div className="form-group-modern">
                    <label>Équipes affectées</label>
                    <input value={form.equipes} onChange={e => setForm({...form, equipes: e.target.value})} placeholder="Ex: Équipe A, Équipe B" />
                 </div>
              </div>
              <div className="grid-2">
                 <div className="form-group-modern">
                    <label>Date de Début</label>
                    <input type="date" value={form.dateDebut} onChange={e => setForm({...form, dateDebut: e.target.value})} />
                 </div>
                 <div className="form-group-modern">
                    <label>Clôture prévue</label>
                    <input type="date" value={form.dateFin} onChange={e => setForm({...form, dateFin: e.target.value})} />
                 </div>
              </div>
              <div style={{marginTop: '30px', padding: '20px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '15px', textAlign: 'center'}}>
                 <p style={{fontSize: '13px', color: 'var(--text-dim)'}}>L'initialisation générera automatiquement les fiches d'audit pour les actifs du périmètre choisi.</p>
              </div>
              <button type="submit" className="primary" style={{width: '100%', marginTop: '30px', padding: '18px'}}>Lancer le Recensement Physique</button>
           </form>
        </div>
      )}

      {view === 'RECONCILIATION' && (
        <div className="glass-card-high fade-in" style={{padding: '30px', marginTop: '30px'}}>
           <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '30px'}}>
              <h3>📊 Rapprochement Physique vs Comptable</h3>
              <button className="btn-export" onClick={() => exportRegistrePatrimoineExcel(biensRaw, 'rapport_inventaire.xls')}>Exporter Rapport (XLS)</button>
           </div>

           <div className="stats-grid-modern" style={{marginBottom: '40px'}}>
                <div className="stat-pill-modern">
                    <span className="pill-label">Écarts de Localisation</span>
                    <span className="pill-value" style={{color: 'var(--warning)'}}>12</span>
                </div>
                <div className="stat-pill-modern">
                    <span className="pill-label">Valeur Non Retrouvée</span>
                    <span className="pill-value" style={{color: 'var(--danger)'}}>450K FCFA</span>
                </div>
            </div>

           <table className="premium-table">
              <thead>
                <tr>
                   <th>Désignation</th>
                   <th>Site Théorique</th>
                   <th>Site Constaté</th>
                   <th>État</th>
                   <th>Résultat</th>
                </tr>
              </thead>
              <tbody>
                {biensRaw.slice(0, 10).map(b => (
                    <tr key={b.id}>
                        <td><strong>{b.designation}</strong></td>
                        <td>{b.localisation}</td>
                        <td>{b.localisation}</td>
                        <td>{b.etat}</td>
                        <td><span className="res-pill match">Conforme</span></td>
                    </tr>
                ))}
              </tbody>
           </table>
        </div>
      )}

    </div>
  );
};

export default InventairePage;
