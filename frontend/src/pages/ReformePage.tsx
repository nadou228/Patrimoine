import React, { useState, useEffect } from 'react';
import { getReformes, createReforme, deleteReforme } from '../api/api';

interface Reforme {
  id: number;
  bien: string;
  dateReforme: string;
  typeReforme: 'CESSION' | 'REBUT' | 'VENTE' | 'DON';
  motif: string;
  valeurResiduelle: number;
}

const ReformePage: React.FC = () => {
  const [view, setView] = useState<'LIST' | 'FORM'>('LIST');
  const [data, setData] = useState<Reforme[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getReformes()
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  const [form, setForm] = useState({
    bien: '',
    dateReforme: new Date().toISOString().split('T')[0],
    typeReforme: 'REBUT' as any,
    motif: '',
    valeurResiduelle: ''
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const created = await createReforme({
        ...form,
        valeurResiduelle: Number(form.valeurResiduelle)
      });
      setData([created, ...data]);
      alert("Réforme enregistrée avec succès!");
    } catch (error: any) {
      console.error('Erreur création réforme:', error);
      alert("Erreur: " + (error.response?.data?.message || error.message || "Erreur inconnue"));
    }
    setView('LIST');
    setForm({ bien: '', dateReforme: new Date().toISOString().split('T')[0], typeReforme: 'REBUT', motif: '', valeurResiduelle: '' });
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Êtes-vous sûr?')) return;
    try {
      await deleteReforme(id);
      setData(data.filter(r => r.id !== id));
      alert("Réforme supprimée");
    } catch (error: any) {
      alert("Erreur: " + error.message);
    }
  };

  return (
    <div className="module-container fade-in" style={{padding: '24px'}}>
      <header className="page-header-modern">
        <div className="header-meta">
          <span className="badge-premium">Fin de Vie & Cession</span>
          <h2 style={{fontSize: '32px', marginTop: '8px'}}>Sortie du Patrimoine</h2>
        </div>
        {view === 'LIST' ? (
          <button className="primary" onClick={() => setView('FORM')}>+ Réformer un Bien</button>
        ) : (
          <button className="btn-export" onClick={() => setView('LIST')}>Annuler</button>
        )}
      </header>

      {view === 'FORM' ? (
        <div className="glass-card-high" style={{maxWidth: '800px', margin: '40px auto', padding: '40px'}}>
          <h3 style={{marginBottom: '30px', color: 'var(--primary)'}}>♻️ Procédure de Réforme / Sortie</h3>
          <form onSubmit={handleCreate} style={{display: 'grid', gap: '20px'}}>
            <div className="form-group">
              <label>Actif à réformer</label>
              <input required value={form.bien} onChange={e => setForm({...form, bien: e.target.value})} placeholder="Désignation de l'actif..." />
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
              <div className="form-group">
                <label>Date de Réforme</label>
                <input type="date" required value={form.dateReforme} onChange={e => setForm({...form, dateReforme: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Mode de Sortie</label>
                <select value={form.typeReforme} onChange={e => setForm({...form, typeReforme: e.target.value as any})}>
                  <option value="REBUT">🗑️ Mise au rebut / Destruction</option>
                  <option value="VENTE">💰 Vente aux enchères / Cession</option>
                  <option value="DON">🎁 Don / Transfert</option>
                  <option value="CESSION">📤 Cession Interne</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>Valeur de Sortie / Prix de cession (FCFA)</label>
              <input type="number" required value={form.valeurResiduelle} onChange={e => setForm({...form, valeurResiduelle: e.target.value})} />
            </div>
            <div className="form-group">
              <label>Motif de la décision</label>
              <textarea required value={form.motif} onChange={e => setForm({...form, motif: e.target.value})} placeholder="Observations, raisons de la sortie..." rows={3} style={{background: 'var(--bg-input)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '12px', padding: '12px'}} />
            </div>
            <button type="submit" className="primary" style={{marginTop: '10px'}}>Valider la Réforme</button>
          </form>
        </div>
      ) : (
        <div className="asset-grid">
          {data.map(item => (
            <div key={item.id} className="asset-card" style={{opacity: 0.8, filter: 'grayscale(0.2)'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '16px'}}>
                <span className="badge-premium" style={{fontSize: '9px'}}>{item.dateReforme}</span>
                <span className="status-pill status-reforme" style={{fontSize: '9px', background: 'rgba(255,255,255,0.1)'}}>{item.typeReforme}</span>
              </div>
              
              <h3 style={{fontSize: '20px', marginBottom: '8px'}}>{item.bien}</h3>
              <p style={{color: 'var(--text-dim)', fontSize: '11px', marginBottom: '16px', fontStyle: 'italic'}}>“ {item.motif} ”</p>
              
              <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '12px', borderRadius: '12px'}}>
                <span style={{fontSize: '11px', opacity: 0.6}}>VALEUR RÉSIDUELLE:</span>
                <span style={{fontWeight: '900', color: 'var(--accent)'}}>{item.valeurResiduelle.toLocaleString()} FCFA</span>
              </div>

              <div style={{display: 'flex', gap: '8px', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid var(--glass-border)'}}>
                <button className="btn-export" style={{flex: 1}}>Certificat</button>
                <button className="btn-export" style={{padding: '8px', color: 'var(--danger)'}} onClick={() => handleDelete(item.id)}>🗑️</button>
              </div>
            </div>
          ))}

          {data.length === 0 && (
            <div className="asset-card" style={{gridColumn: '1/-1', padding: '60px', textAlign: 'center'}}>
              <div style={{fontSize: '60px', marginBottom: '20px'}}>♻️</div>
              <h3>Dossier de réforme vide</h3>
              <p style={{color: 'var(--text-dim)', maxWidth: '400px', margin: '20px auto'}}>
                Tous les actifs réformés s'afficheront ici.
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ReformePage;
