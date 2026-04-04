import React, { useState, useEffect } from 'react';
import { getInventaires, createInventaire, deleteInventaire } from '../api/api';

interface Inventaire {
  id: number;
  campagne: string;
  dateDebut: string;
  progression: number;
  actifsTotal: number;
  actifsVerifies: number;
  statut: 'EN_COURS' | 'TERMINÉ' | 'PLANIFIÉ';
}

const InventairePage: React.FC = () => {
  const [view, setView] = useState<'LIST' | 'FORM'>('LIST');
  const [data, setData] = useState<Inventaire[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getInventaires()
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  const [form, setForm] = useState({
    campagne: '',
    dateDebut: new Date().toISOString().split('T')[0],
    actifsTotal: ''
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createInventaire({
        campagne: form.campagne,
        dateDebut: form.dateDebut,
        actifsTotal: Number(form.actifsTotal),
        actifsVerifies: 0,
        progression: 0,
        statut: 'EN_COURS'
      });
      setData([created, ...data]);
      alert("Campagne créée avec succès!");
    } catch (error: any) {
      console.error('Erreur création campagne:', error);
      alert("Erreur: " + (error.response?.data?.message || error.message || "Erreur inconnue"));
    }
    setView('LIST');
    setForm({ campagne: '', dateDebut: new Date().toISOString().split('T')[0], actifsTotal: '' });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Êtes-vous sûr?')) return;
    try {
      await deleteInventaire(id);
      setData(data.filter(i => i.id !== id));
      alert("Campagne supprimée");
    } catch (error: any) {
      alert("Erreur: " + error.message);
    }
  };

  return (
    <div className="module-container fade-in" style={{padding: '24px'}}>
      <header className="page-header-modern">
        <div className="header-meta">
          <span className="badge-premium">Vérification Physique</span>
          <h2 style={{fontSize: '32px', marginTop: '8px'}}>Campagnes d'Inventaire</h2>
        </div>
        {view === 'LIST' ? (
          <button className="primary" onClick={() => setView('FORM')}>+ Démarrer une Campagne</button>
        ) : (
          <button className="btn-export" onClick={() => setView('LIST')}>Annuler</button>
        )}
      </header>

      {view === 'FORM' ? (
        <div className="glass-card-high" style={{maxWidth: '800px', margin: '40px auto', padding: '40px'}}>
          <h3 style={{marginBottom: '30px', color: 'var(--primary)'}}>📊 Nouvelle Campagne d'Inventaire</h3>
          <form onSubmit={handleCreate} style={{display: 'grid', gap: '20px'}}>
            <div className="form-group">
              <label>Nom de la Campagne</label>
              <input required value={form.campagne} onChange={e => setForm({...form, campagne: e.target.value})} placeholder="Ex: Inventaire Immobilier Siège 2024" />
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
              <div className="form-group">
                <label>Date de Début</label>
                <input type="date" required value={form.dateDebut} onChange={e => setForm({...form, dateDebut: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Nombre d'actifs attendus</label>
                <input type="number" required value={form.actifsTotal} onChange={e => setForm({...form, actifsTotal: e.target.value})} placeholder="Ex: 500" />
              </div>
            </div>
            <button type="submit" className="primary" style={{marginTop: '10px'}}>Initialiser la Campagne</button>
          </form>
        </div>
      ) : (
        <div className="asset-grid">
          {data.map(item => (
            <div key={item.id} className="asset-card" style={{display: 'flex', flexDirection: 'column'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '16px'}}>
                <span className="badge-premium" style={{fontSize: '9px'}}>{item.dateDebut}</span>
                <span className={`status-pill ${item.statut === 'TERMINÉ' ? 'status-neuf' : 'status-degrade'}`} style={{fontSize: '9px'}}>
                  {item.statut.replace('_', ' ')}
                </span>
              </div>
              
              <h3 style={{fontSize: '18px', marginBottom: '20px'}}>{item.campagne}</h3>
              
              <div style={{background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '16px', marginBottom: '20px', border: '1px solid var(--glass-border)'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '10px'}}>
                  <span style={{opacity: 0.6}}>Progression:</span>
                  <span style={{fontWeight: '800', color: 'var(--primary)'}}>{item.progression}%</span>
                </div>
                <div style={{height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', marginBottom: '12px'}}>
                  <div style={{width: `${item.progression}%`, height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--accent))', transition: 'width 0.8s ease-in-out'}}></div>
                </div>
                <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '11px', opacity: 0.8}}>
                  <span>📍 {item.actifsVerifies} vérifiés</span>
                  <span>📦 {item.actifsTotal} total</span>
                </div>
              </div>
              
              <div style={{marginTop: 'auto', display: 'flex', gap: '8px', paddingTop: '16px', borderTop: '1px solid var(--glass-border)'}}>
                <button className="btn-export" style={{flex: 1}}>{item.statut === 'TERMINÉ' ? 'Rapport' : 'Continuer'}</button>
                <button className="btn-export" style={{padding: '8px', color: 'var(--danger)'}} onClick={() => handleDelete(item.id)}>🗑️</button>
              </div>
            </div>
          ))}
          
          {data.length === 0 && (
            <div className="asset-card" style={{gridColumn: '1/-1', padding: '60px', textAlign: 'center'}}>
              <div style={{fontSize: '60px', marginBottom: '20px'}}>📋</div>
              <h3>Aucune campagne d'inventaire</h3>
              <p style={{color: 'var(--text-dim)', maxWidth: '400px', margin: '20px auto'}}>
                Lancement de la prochaine campagne prévu pour Juin 2024.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default InventairePage;
