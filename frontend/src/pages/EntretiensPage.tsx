import React, { useState, useEffect } from "react";
import { getEntretiens, createEntretien, deleteEntretien, getBiens } from "../api/api";

interface Entretien {
  id: number;
  datePrevue: string;
  dateRealisee: string;
  cout: number;
  prestataire: string;
  observation: string;
  bien: { id: number, designation: string }; 
}

const EntretiensPage: React.FC = () => {
  const [view, setView] = useState<'LIST' | 'FORM'>('LIST');
  const [data, setData] = useState<Entretien[]>([]);
  const [biens, setBiens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
    getBiens().then(setBiens).catch(() => setBiens([]));
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const res = await getEntretiens();
      setData(res || []);
    } catch (error) {
      console.error('Erreur chargement entretiens:', error);
    } finally {
      setLoading(false);
    }
  };

  const [form, setForm] = useState({
    datePrevue: new Date().toISOString().split('T')[0],
    dateRealisee: '',
    cout: '',
    prestataire: '',
    observation: '',
    bienId: ''
  });

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.bienId) return alert("Veuillez sélectionner un bien");
    
    try {
      await createEntretien({
        datePrevue: form.datePrevue,
        dateRealisee: form.dateRealisee || null,
        cout: Number(form.cout),
        prestataire: form.prestataire,
        observation: form.observation,
        bien: { id: Number(form.bienId) }
      });
      alert("Entretien enregistré avec succès!");
      setView('LIST');
      loadData();
      setForm({ datePrevue: new Date().toISOString().split('T')[0], dateRealisee: '', cout: '', prestataire: '', observation: '', bienId: '' });
    } catch (error: any) {
      alert("Erreur: " + (error.response?.data?.message || error.message));
    }
  };

  return (
    <div className="module-container fade-in" style={{padding: '24px'}}>
      <header className="page-header-modern">
        <div className="header-meta">
          <span className="badge-premium" style={{background: 'rgba(99, 102, 241, 0.1)', color: 'var(--primary)'}}>Maintenance & Vie du Bien</span>
          <h2 style={{fontSize: '32px', marginTop: '8px'}}>Registre des Entretiens</h2>
        </div>
        {view === 'LIST' ? (
          <button className="primary" onClick={() => setView('FORM')}>+ Planifier un Entretien</button>
        ) : (
          <button className="btn-export" onClick={() => setView('LIST')}>Annuler</button>
        )}
      </header>

      {view === 'FORM' ? (
        <div className="glass-card-high" style={{maxWidth: '800px', margin: '40px auto', padding: '40px'}}>
          <h3 style={{marginBottom: '30px', color: 'var(--primary)'}}>🛠️ Nouvel Entretien</h3>
          <form onSubmit={handleCreate} style={{display: 'grid', gap: '20px'}}>
            <div className="form-group">
              <label>Actif Concerné</label>
              <select required value={form.bienId} onChange={e => setForm({...form, bienId: e.target.value})}>
                <option value="">Sélectionner un bien...</option>
                {biens.map(b => (
                  <option key={b.id} value={b.id}>{b.iup} - {b.designation}</option>
                ))}
              </select>
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
              <div className="form-group">
                <label>Date Prévue</label>
                <input type="date" required value={form.datePrevue} onChange={e => setForm({...form, datePrevue: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Date Réalisée (optionnel)</label>
                <input type="date" value={form.dateRealisee} onChange={e => setForm({...form, dateRealisee: e.target.value})} />
              </div>
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
              <div className="form-group">
                <label>Coût de l'intervention (FCFA)</label>
                <input type="number" required value={form.cout} onChange={e => setForm({...form, cout: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Prestataire / Technicien</label>
                <input required value={form.prestataire} onChange={e => setForm({...form, prestataire: e.target.value})} placeholder="Nom de l'entreprise ou expert" />
              </div>
            </div>
            <div className="form-group">
              <label>Observations / Travaux effectués</label>
              <textarea required value={form.observation} onChange={e => setForm({...form, observation: e.target.value})} placeholder="Détaillez l'intervention..." rows={4} style={{background: 'var(--bg-input)', border: '1px solid var(--glass-border)', color: 'white', borderRadius: '12px', padding: '12px'}} />
            </div>
            <button type="submit" className="primary" style={{marginTop: '10px'}}>Enregistrer l'Intervention</button>
          </form>
        </div>
      ) : (
        <div className="asset-grid">
          {data.map(item => (
            <div key={item.id} className="asset-card" style={{borderLeft: '4px solid var(--primary)'}}>
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '16px'}}>
                <span className="badge-premium" style={{fontSize: '9px'}}>Prévu: {item.datePrevue}</span>
                {item.dateRealisee && <span className="status-pill status-neuf" style={{fontSize: '9px'}}>RÉALISÉ LE {item.dateRealisee}</span>}
              </div>
              
              <h3 style={{fontSize: '20px', marginBottom: '4px'}}>{item.bien?.designation || 'Bien inconnu'}</h3>
              <p style={{color: 'var(--text-dim)', fontSize: '13px', marginBottom: '12px'}}>👨‍🔧 {item.prestataire}</p>
              
              <div style={{background: 'rgba(255, 255, 255, 0.03)', padding: '16px', borderRadius: '16px', marginBottom: '16px', border: '1px solid var(--glass-border)'}}>
                <p style={{color: 'white', fontSize: '12px', lineHeight: '1.5'}}>{item.observation}</p>
              </div>
              
              <p style={{fontSize: '18px', fontWeight: '900', color: 'var(--accent)', marginBottom: '16px'}}>
                {item.cout.toLocaleString()} <span style={{fontSize: '12px'}}>FCFA</span>
              </p>
            </div>
          ))}
          {data.length === 0 && !loading && <p>Aucun entretien enregistré.</p>}
        </div>
      )}
    </div>
  );
};

export default EntretiensPage;
