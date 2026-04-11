import React, { useState, useEffect } from "react";
import { getSinistres, createSinistre, deleteSinistre, getBiens } from "../api/api";

const SinistresPage: React.FC = () => {
  const [view, setView] = useState<'LIST' | 'FORM'>('LIST');
  const [data, setData] = useState<any[]>([]);
  const [biens, setBiens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    dateSinistre: new Date().toISOString().split('T')[0],
    bienId: '',
    type: 'ACCIDENT' as any,
    description: '',
    montantEstime: ''
  });

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createSinistre({
        ...form,
        montantEstime: Number(form.montantEstime),
        statut: 'DÉCLARÉ',
        bien: { id: Number(form.bienId) }
      });
      alert("Sinistre déclaré !");
      loadData();
      setView('LIST');
    } catch (err) { alert("Erreur: " + err); }
  };

  return (
    <div className="sinistres-module fade-in">
      <header className="page-header-premium">
        <div className="header-meta">
           <span className="badge-pill-glow" style={{borderColor: 'var(--danger)', color: 'var(--danger)'}}>Sécurité & Assurance</span>
           <h1>Sinistres & Incidents</h1>
        </div>
        <button className="primary" style={{background: 'var(--danger)'}} onClick={() => setView('FORM')}>+ Déclarer un Sinistre</button>
      </header>

      {view === 'FORM' ? (
        <div className="centered-form-card fade-in">
           <div className="form-header-premium">
              <h2 style={{color: 'var(--danger)'}}>⚠️ Nouvelle Déclaration</h2>
              <button className="btn-back-cat" onClick={() => setView('LIST')}>Annuler</button>
           </div>
           <form onSubmit={handleCreate} className="premium-dynamic-form">
              <div className="form-group-modern">
                 <label>Actif Impacté</label>
                 <select required value={form.bienId} onChange={e => setForm({...form, bienId: e.target.value})}>
                    <option value="">-- Choisir le bien --</option>
                    {biens.map(b => <option key={b.id} value={b.id}>{b.iup} - {b.designation}</option>)}
                 </select>
              </div>
              <div className="grid-2">
                 <div className="form-group-modern">
                    <label>Date</label>
                    <input type="date" required value={form.dateSinistre} onChange={e => setForm({...form, dateSinistre: e.target.value})} />
                 </div>
                 <div className="form-group-modern">
                    <label>Nature</label>
                    <select value={form.type} onChange={e => setForm({...form, type: e.target.value})}>
                        <option value="ACCIDENT">🚗 Accident</option>
                        <option value="VOL">🥷 Vol</option>
                        <option value="INCENDIE">🔥 Incendie</option>
                        <option value="PANNE">🛠️ Panne</option>
                    </select>
                 </div>
              </div>
              <div className="form-group-modern">
                 <label>Montant Estimé (FCFA)</label>
                 <input type="number" required value={form.montantEstime} onChange={e => setForm({...form, montantEstime: e.target.value})} />
              </div>
              <div className="form-group-modern">
                 <label>Description</label>
                 <textarea required value={form.description} onChange={e => setForm({...form, description: e.target.value})} rows={3} />
              </div>
              <button type="submit" className="primary" style={{width: '100%', background: 'var(--danger)', marginTop: '20px'}}>Soumettre au Contentieux</button>
           </form>
        </div>
      ) : (
        <div className="asset-grid">
           {data.map(item => (
             <div key={item.id} className="asset-card" style={{borderLeft: '4px solid var(--danger)'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px'}}>
                   <span className="badge-premium">{item.dateSinistre}</span>
                   <span className="status-pill status-degrade">{item.statut}</span>
                </div>
                <h3>{item.bien?.designation}</h3>
                <p style={{color: 'var(--danger)', fontSize: '13px', fontWeight: '800'}}>⚡ {item.type}</p>
                <div style={{marginTop: '15px', padding: '15px', background: 'rgba(239, 68, 68, 0.05)', borderRadius: '12px', fontSize: '12px'}}>
                   {item.description}
                </div>
                <div style={{marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                   <strong style={{color: 'var(--accent)'}}>{item.montantEstime.toLocaleString()} FCFA</strong>
                   <button className="btn-export" style={{color: 'var(--danger)'}} onClick={() => deleteSinistre(item.id).then(loadData)}>Supprimer</button>
                </div>
             </div>
           ))}
        </div>
      )}
    </div>
  );
};

export default SinistresPage;
