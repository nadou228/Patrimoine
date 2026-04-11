import React, { useState, useEffect } from "react";
import { getEntretiens, createEntretien, deleteEntretien, getBiens } from "../api/api";

const EntretiensPage: React.FC = () => {
  const [view, setView] = useState<'LIST' | 'FORM'>('LIST');
  const [data, setData] = useState<any[]>([]);
  const [biens, setBiens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [form, setForm] = useState({
    datePrevue: new Date().toISOString().split('T')[0],
    dateRealisee: '',
    cout: '',
    prestataire: '',
    observation: '',
    bienId: ''
  });

  useEffect(() => {
    loadData();
    getBiens().then(setBiens).catch(() => setBiens([]));
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getEntretiens();
      setData(res || []);
    } catch (error) { console.error(error); }
    finally { setLoading(false); }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createEntretien({
        ...form,
        cout: Number(form.cout),
        bien: { id: Number(form.bienId) }
      });
      alert("Entretien enregistré !");
      setView('LIST');
      loadData();
    } catch (err) { alert("Erreur: " + err); }
  };

  return (
    <div className="entretiens-module fade-in">
      <header className="page-header-premium">
        <div className="header-meta">
           <span className="badge-pill-glow">Maintenance & Cycle de Vie</span>
           <h1>Registre des Entretiens</h1>
        </div>
        <button className="primary" onClick={() => setView('FORM')}>+ Planifier une Maintenance</button>
      </header>

      {view === 'FORM' ? (
        <div className="centered-form-card fade-in">
           <div className="form-header-premium">
              <h2>🛠️ Nouvel Entretien</h2>
              <button className="btn-back-cat" onClick={() => setView('LIST')}>Annuler</button>
           </div>
           <form onSubmit={handleCreate} className="premium-dynamic-form">
              <div className="form-group-modern">
                 <label>Actif Concerné</label>
                 <select required value={form.bienId} onChange={e => setForm({...form, bienId: e.target.value})}>
                    <option value="">-- Choisir le bien --</option>
                    {biens.map(b => <option key={b.id} value={b.id}>{b.iup} - {b.designation}</option>)}
                 </select>
              </div>
              <div className="grid-2">
                 <div className="form-group-modern">
                    <label>Date Prévue</label>
                    <input type="date" required value={form.datePrevue} onChange={e => setForm({...form, datePrevue: e.target.value})} />
                 </div>
                 <div className="form-group-modern">
                    <label>Coût (FCFA)</label>
                    <input type="number" required value={form.cout} onChange={e => setForm({...form, cout: e.target.value})} />
                 </div>
              </div>
              <div className="form-group-modern">
                 <label>Prestataire / Expert</label>
                 <input required value={form.prestataire} onChange={e => setForm({...form, prestataire: e.target.value})} placeholder="Nom du technicien/garage..." />
              </div>
              <div className="form-group-modern">
                 <label>Observations / Travaux</label>
                 <textarea required value={form.observation} onChange={e => setForm({...form, observation: e.target.value})} rows={3} />
              </div>
              <button type="submit" className="primary" style={{width: '100%', marginTop: '20px'}}>Enregistrer l'Intervention</button>
           </form>
        </div>
      ) : (
        <div className="asset-grid">
           {data.map(item => (
             <div key={item.id} className="asset-card" style={{borderLeft: '4px solid var(--primary)'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px'}}>
                   <span className="badge-premium">{item.datePrevue}</span>
                   {item.dateRealisee && <span className="status-pill status-neuf">FAIT LE {item.dateRealisee}</span>}
                </div>
                <h3>{item.bien?.designation}</h3>
                <p style={{color: 'var(--text-dim)', fontSize: '13px', margin: '10px 0'}}>👨‍🔧 {item.prestataire}</p>
                <div style={{marginTop: '15px', padding: '15px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '12px', fontSize: '12px'}}>
                   {item.observation}
                </div>
                <div style={{marginTop: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
                   <strong style={{color: 'var(--accent)'}}>{item.cout.toLocaleString()} FCFA</strong>
                   <button className="btn-export" style={{color: 'var(--danger)'}} onClick={() => deleteEntretien(item.id).then(loadData)}>🗑️</button>
                </div>
             </div>
           ))}
        </div>
      )}
    </div>
  );
};

export default EntretiensPage;
