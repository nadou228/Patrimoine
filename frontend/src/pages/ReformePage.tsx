import React, { useState, useEffect } from 'react';
import { getReformes, createReforme, deleteReforme, getBiens } from '../api/api';

const ReformePage: React.FC = () => {
  const [view, setView] = useState<'LIST' | 'FORM'>('LIST');
  const [data, setData] = useState<any[]>([]);
  const [biens, setBiens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    bienId: '',
    dateReforme: new Date().toISOString().split('T')[0],
    typeReforme: 'REBUT' as any,
    motif: '',
    valeurResiduelle: ''
  });

  useEffect(() => {
    loadData();
    getBiens().then(setBiens).catch(() => setBiens([]));
  }, []);

  const loadData = () => {
    setLoading(true);
    getReformes()
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createReforme({ 
        ...form, 
        valeurResiduelle: Number(form.valeurResiduelle),
        bien: { id: Number(form.bienId) }
      });
      alert("Réforme validée !");
      loadData();
      setView('LIST');
    } catch (err) { alert("Erreur: " + err); }
  };

  return (
    <div className="reforme-module fade-in">
      <header className="page-header-premium">
        <div className="header-meta">
           <span className="badge-pill-glow">Cessions & Fins de Vie</span>
           <h1>Réforme du Patrimoine</h1>
        </div>
        <button className="primary" onClick={() => setView('FORM')}>+ Nouvelle Réforme</button>
      </header>

      {view === 'FORM' ? (
        <div className="centered-form-card fade-in">
           <div className="form-header-premium">
              <h2>♻️ Procédure de Sortie</h2>
              <button className="btn-back-cat" onClick={() => setView('LIST')}>Annuler</button>
           </div>
           <form onSubmit={handleCreate} className="premium-dynamic-form">
              <div className="form-group-modern">
                 <label>Actif à réformer (Sélecteur officiel)</label>
                 <select required value={form.bienId} onChange={e => setForm({...form, bienId: e.target.value})}>
                    <option value="">-- Choisir l'actif --</option>
                    {biens.map(b => (
                        <option key={b.id} value={b.id}>{b.iup} - {b.designation}</option>
                    ))}
                 </select>
              </div>
              <div className="grid-2">
                 <div className="form-group-modern">
                    <label>Date de Sortie</label>
                    <input type="date" required value={form.dateReforme} onChange={e => setForm({...form, dateReforme: e.target.value})} />
                 </div>
                 <div className="form-group-modern">
                    <label>Mode de Sortie</label>
                    <select value={form.typeReforme} onChange={e => setForm({...form, typeReforme: e.target.value})}>
                        <option value="REBUT">🗑️ Mise au rebut</option>
                        <option value="VENTE">💰 Vente / Cession</option>
                        <option value="DON">🎁 Don</option>
                    </select>
                 </div>
              </div>
              <div className="form-group-modern">
                 <label>Valeur Résiduelle / Prix (FCFA)</label>
                 <input type="number" required value={form.valeurResiduelle} onChange={e => setForm({...form, valeurResiduelle: e.target.value})} />
              </div>
              <div className="form-group-modern">
                 <label>Motif / Justification</label>
                 <textarea required value={form.motif} onChange={e => setForm({...form, motif: e.target.value})} rows={3} />
              </div>
              <button type="submit" className="primary" style={{width: '100%', marginTop: '20px'}}>Confirmer la Réforme</button>
           </form>
        </div>
      ) : (
        <div className="asset-grid">
           {data.map(item => (
             <div key={item.id} className="asset-card">
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px'}}>
                   <span className="badge-premium">{item.dateReforme}</span>
                   <span className="status-pill status-degrade">{item.typeReforme}</span>
                </div>
                <h3>{item.bien?.designation || 'Actif Inconnu'}</h3>
                <p style={{fontSize: '11px', color: 'var(--text-dim)'}}>IUP: {item.bien?.iup || 'N/A'}</p>
                <p style={{color: 'var(--text-dim)', fontSize: '13px', fontStyle: 'italic', margin: '15px 0'}}>“ {item.motif} ”</p>
                <div style={{marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                   <strong style={{color: 'var(--accent)'}}>{item.valeurResiduelle.toLocaleString()} FCFA</strong>
                   <button className="btn-export" style={{color: 'var(--danger)'}} onClick={() => deleteReforme(item.id).then(loadData)}>🗑️</button>
                </div>
             </div>
           ))}
        </div>
      )}
    </div>
  );
};

export default ReformePage;
