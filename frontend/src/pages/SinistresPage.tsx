import React, { useState, useEffect } from "react";
import { getSinistres, createSinistre, deleteSinistre, getBiens } from "../api/api";

interface Sinistre {
  id: number;
  dateSinistre: string;
  bien: { id: number, designation: string };
  type: 'ACCIDENT' | 'VOL' | 'INCENDIE' | 'PANNE' | 'AUTRE';
  description: string;
  montantEstime: number;
  statut: 'DÉCLARÉ' | 'EN COURS' | 'CLÔTURÉ' | 'REJETÉ';
}

const SinistresPage: React.FC = () => {
  const [view, setView] = useState<'LIST' | 'FORM'>('LIST');
  const [data, setData] = useState<Sinistre[]>([]);
  const [biens, setBiens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    getBiens().then(setBiens).catch(() => setBiens([]));
  }, []);

  const loadData = () => {
    setLoading(true);
    getSinistres()
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  };

  const [form, setForm] = useState({
    dateSinistre: new Date().toISOString().split('T')[0],
    bienId: '',
    type: 'ACCIDENT' as any,
    description: '',
    montantEstime: ''
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.bienId) return alert("Veuillez sélectionner un bien");
    
    try {
      await createSinistre({
        dateSinistre: form.dateSinistre,
        type: form.type,
        description: form.description,
        montantEstime: Number(form.montantEstime),
        statut: 'DÉCLARÉ',
        bien: { id: Number(form.bienId) }
      });
      alert("Sinistre déclaré avec succès!");
      loadData();
      setView('LIST');
      setForm({ dateSinistre: new Date().toISOString().split('T')[0], bienId: '', type: 'ACCIDENT', description: '', montantEstime: '' });
    } catch (error: any) {
      console.error('Erreur création sinistre:', error);
      alert("Erreur: " + (error.response?.data?.message || error.message || "Erreur inconnue"));
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Êtes-vous sûr?')) return;
    try {
      await deleteSinistre(id);
      setData(data.filter(s => s.id !== id));
      alert("Sinistre supprimé");
    } catch (error: any) {
      alert("Erreur: " + error.message);
    }
  };

  return (
    <div className="module-container fade-in" style={{padding: '24px'}}>
      <header className="page-header-modern">
        <div className="header-meta">
          <span className="badge-premium" style={{background: 'rgba(239, 68, 68, 0.1)', color: 'var(--danger)'}}>Sécurité & Assurance</span>
          <h2 style={{fontSize: '32px', marginTop: '8px'}}>Gestion des Sinistres</h2>
        </div>
        {view === 'LIST' ? (
          <button className="primary" style={{background: 'var(--danger)'}} onClick={() => setView('FORM')}>+ Déclarer un Sinistre</button>
        ) : (
          <button className="btn-export" onClick={() => setView('LIST')}>Annuler</button>
        )}
      </header>

      {view === 'FORM' ? (
        <div className="glass-card-high" style={{maxWidth: '800px', margin: '40px auto', padding: '40px', borderTop: '4px solid var(--danger)'}}>
          <h3 style={{marginBottom: '30px', color: 'var(--danger)'}}>⚠️ Nouvelle Déclaration de Sinistre</h3>
          <form onSubmit={handleCreate} style={{display: 'grid', gap: '20px'}}>
            <div className="form-group">
              <label>Actif Impacté</label>
              <select required value={form.bienId} onChange={e => setForm({...form, bienId: e.target.value})}>
                <option value="">Sélectionner un bien...</option>
                {biens.map(b => (
                  <option key={b.id} value={b.id}>{b.iup} - {b.designation}</option>
                ))}
              </select>
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
              <div className="form-group">
                <label>Date du Sinistre</label>
                <input type="date" required value={form.dateSinistre} onChange={e => setForm({...form, dateSinistre: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Type de Sinistre</label>
                <select value={form.type} onChange={e => setForm({...form, type: e.target.value as any})}>
                  <option value="ACCIDENT">🚗 Accident</option>
                  <option value="VOL">🥷 Vol / Disparition</option>
                  <option value="INCENDIE">🔥 Incendie</option>
                  <option value="PANNE">🛠️ Panne Critique</option>
                  <option value="AUTRE">❓ Autre</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Estimation du préjudice (FCFA)</label>
              <input type="number" required value={form.montantEstime} onChange={e => setForm({...form, montantEstime: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Description détaillée des faits</label>
              <textarea required value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Circonstances, dégâts apparents..." rows={4} style={{background: 'var(--bg-input)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '12px', padding: '12px'}} />
            </div>
            <button type="submit" className="primary" style={{background: 'var(--danger)', marginTop: '10px'}}>Soumettre la Déclaration</button>
          </form>
        </div>
      ) : (
        <div className="asset-grid">
          {data.map(item => (
            <div key={item.id} className="asset-card" style={{borderLeft: '4px solid var(--danger)', display: 'flex', flexDirection: 'column'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '16px'}}>
                <span className="badge-premium" style={{fontSize: '9px'}}>{item.dateSinistre}</span>
                <span className={`status-pill ${item.statut === 'CLÔTURÉ' ? 'status-neuf' : 'status-degrade'}`} style={{fontSize: '9px'}}>
                  {item.statut}
                </span>
              </div>
              
              <h3 style={{fontSize: '20px', marginBottom: '4px'}}>{item.bien?.designation || 'Bien inconnu'}</h3>
              <p style={{color: 'var(--danger)', fontWeight: '800', fontSize: '13px', marginBottom: '12px'}}>⚡ {item.type}</p>
              
              <div style={{background: 'rgba(239, 68, 68, 0.05)', padding: '16px', borderRadius: '16px', marginBottom: '16px', border: '1px solid rgba(239, 68, 68, 0.1)'}}>
                <p style={{color: 'white', fontSize: '12px', lineHeight: '1.5'}}>{item.description}</p>
              </div>
              
              <div style={{marginTop: 'auto'}}>
                <p style={{fontSize: '18px', fontWeight: '900', color: 'var(--accent)', marginBottom: '16px'}}>
                  {item.montantEstime.toLocaleString()} <span style={{fontSize: '12px'}}>FCFA</span>
                </p>
                <div style={{display: 'flex', gap: '8px', paddingTop: '16px', borderTop: '1px solid var(--glass-border)'}}>
                  <button className="btn-export" style={{flex: 1}}>Suivi</button>
                  <button className="btn-export" style={{padding: '8px', color: 'var(--danger)'}} onClick={() => handleDelete(item.id)}>🗑️</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default SinistresPage;
