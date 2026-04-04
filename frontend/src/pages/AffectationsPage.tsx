import React, { useState, useEffect } from 'react';
import { exportBordereauMutationExcel } from '../utils/exporters';
import { getAffectations, createAffectation, deleteAffectation } from '../api/api';

interface Affectation {
  id: number;
  bien: string;
  detenteur: string;
  service: string;
  dateAffectation: string;
  etat: string;
  motif: string;
}

const AffectationsPage: React.FC = () => {
  const [view, setView] = useState<'LIST' | 'FORM'>('LIST');
  const [data, setData] = useState<Affectation[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAffectations()
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  const [form, setForm] = useState({
    bien: '',
    detenteur: '',
    service: '',
    dateAffectation: new Date().toISOString().split('T')[0],
    motif: ''
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createAffectation({ ...form, etat: 'ACTIF' });
      setData([created, ...data]);
      alert("Affectation créée avec succès!");
    } catch (error: any) {
      console.error('Erreur création affectation:', error);
      alert("Erreur lors de la création: " + (error.response?.data?.message || error.message || "Erreur inconnue"));
    }
    setView('LIST');
    setForm({ bien: '', detenteur: '', service: '', dateAffectation: new Date().toISOString().split('T')[0], motif: '' });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Êtes-vous sûr?')) return;
    try {
      await deleteAffectation(id);
      setData(data.filter(item => item.id !== id));
      alert("Affectation supprimée");
    } catch (error: any) {
      alert("Erreur: " + error.message);
    }
  };

  return (
    <div className="module-container fade-in" style={{padding: '24px'}}>
      <header className="page-header-modern">
        <div className="header-meta">
          <span className="badge-premium">Suivi Géographique & Détention</span>
          <h2 style={{fontSize: '32px', marginTop: '8px'}}>Affectations des Biens</h2>
        </div>
        {view === 'LIST' ? (
          <button className="primary" onClick={() => setView('FORM')}>+ Nouvelle Affectation</button>
        ) : (
          <button className="btn-export" onClick={() => setView('LIST')}>Annuler</button>
        )}
      </header>

      {view === 'FORM' ? (
        <div className="glass-card-high" style={{maxWidth: '800px', margin: '40px auto', padding: '40px'}}>
          <h3 style={{marginBottom: '30px', color: 'var(--primary)'}}>📦 Recenser une Nouvelle Affectation</h3>
          <form onSubmit={handleAdd} style={{display: 'grid', gap: '20px'}}>
            <div className="form-group">
              <label>Actif / Bien à affecter</label>
              <input required value={form.bien} onChange={e => setForm({...form, bien: e.target.value})} placeholder="Rechercher ou saisir le bien (Ex: Toyota Hilux)" />
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
              <div className="form-group">
                <label>Détenteur (Bénéficiaire)</label>
                <input required value={form.detenteur} onChange={e => setForm({...form, detenteur: e.target.value})} placeholder="Nom Prénom" />
              </div>
              <div className="form-group">
                <label>Service / Département</label>
                <input required value={form.service} onChange={e => setForm({...form, service: e.target.value})} placeholder="Ex: Ressources Humaines" />
              </div>
            </div>
            <div className="form-group">
              <label>Date d'affectation</label>
              <input type="date" required value={form.dateAffectation} onChange={e => setForm({...form, dateAffectation: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Motif / Justification</label>
              <textarea value={form.motif} onChange={e => setForm({...form, motif: e.target.value})} placeholder="Détails de l'affectation..." rows={3} style={{background: 'var(--bg-input)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '12px', padding: '12px'}} />
            </div>
            <button type="submit" className="primary" style={{marginTop: '10px'}}>Confirmer l'Affectation</button>
          </form>
        </div>
      ) : (
        <div className="asset-grid">
          {data.map(item => (
            <div key={item.id} className="asset-card">
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '16px'}}>
                <span className="badge-premium" style={{fontSize: '9px'}}>{item.dateAffectation}</span>
                <span className="status-pill status-neuf">{item.etat}</span>
              </div>
              <h3 style={{fontSize: '20px', marginBottom: '8px'}}>{item.bien}</h3>
              
              <div style={{background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px', marginBottom: '20px', border: '1px solid var(--glass-border)'}}>
                <p style={{color: 'var(--primary)', fontWeight: '800', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px'}}>
                  👤 <span style={{color: 'white'}}>{item.detenteur}</span>
                </p>
                <p style={{color: 'var(--text-dim)', fontSize: '12px', marginTop: '8px'}}>🏢 {item.service}</p>
                <p style={{color: 'var(--text-dim)', fontSize: '11px', marginTop: '12px', fontStyle: 'italic'}}>📝 {item.motif}</p>
              </div>
              
              <button 
                className="btn-export" 
                style={{width: '100%', padding: '12px', fontWeight: 'bold', marginBottom: '10px'}} 
                onClick={() => exportBordereauMutationExcel(item, `Bordereau_Mutation_${item.id}.xls`)}
              >
                📄 Exporter Bordereau (XLS)
              </button>

              <div style={{marginTop: 'auto', display: 'flex', gap: '10px', paddingTop: '16px', borderTop: '1px solid var(--glass-border)'}}>
                <button className="btn-export" style={{flex: 1}}>Modifier</button>
                <button className="btn-export" style={{flex: 1, color: 'var(--danger)'}} onClick={() => handleDelete(item.id)}>Retirer</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AffectationsPage;
