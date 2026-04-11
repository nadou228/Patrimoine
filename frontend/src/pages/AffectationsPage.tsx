import React, { useState, useEffect } from 'react';
import { exportBordereauMutationExcel } from '../utils/exporters';
import { getAffectations, createAffectation, updateAffectation, deleteAffectation, getServices, validerAffectation, rejeterAffectation, getMouvementsByBien, getOrigineAffectation } from '../api/api';
import { getBiens, Bien as BienType } from '../api/biens';
import { usePermissions } from '../contexts/PermissionsContext';
import MouvementTimeline from '../components/MouvementTimeline';
import FileUpload from '../components/FileUpload';

interface Affectation {
  id: number;
  bien: any;
  detenteur: string;
  service: string;
  dateAffectation: string;
  statutValidation: string;
  motif: string;
  signatureUrl?: string;
}

const AffectationsPage: React.FC = () => {
  const [view, setView] = useState<'LIST' | 'FORM'>('LIST');
  const [data, setData] = useState<Affectation[]>([]);
  const [loading, setLoading] = useState(true);
  const [biensList, setBiensList] = useState<BienType[]>([]);
  const [servicesList, setServicesList] = useState<any[]>([]);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [showTimeline, setShowTimeline] = useState(false);
  const { hasRole, user } = usePermissions();

  const loadData = () => {
    setLoading(true);
    getAffectations()
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
    getBiens().then(setBiensList).catch(console.error);
    getServices().then(setServicesList).catch(() => setServicesList([]));
  }, []);

  const [form, setForm] = useState<any>({
    bienId: '',
    detenteur: '',
    service: '',
    motif: '',
    signatureUrl: '',
    ministere: '',
    posteComptable: '',
    detenteurA: ''
  });

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...form,
        bien: form.bienId ? String(form.bienId) : undefined
      };
      
      if (form.id) {
        await updateAffectation(form.id, payload);
        alert("Demande de modification envoyée!");
      } else {
        await createAffectation(payload);
        alert("Demande d'affectation créée (En attente de validation)!");
      }
      loadData();
      setView('LIST');
      setForm({ bienId: '', detenteur: '', service: '', dateAffectation: new Date().toISOString().split('T')[0], motif: '', signatureUrl: '' });
    } catch (error: any) {
      alert("Erreur: " + (error.response?.data?.message || error.message));
    }
  };

  const handleValidate = async (id: number) => {
     if (!window.confirm("Valider officiellement cette affectation ?")) return;
     try {
        await validerAffectation(id, user?.username || 'admin');
        alert("Affectation Validée ! Mouvement enregistré.");
        loadData();
     } catch (err) { alert("Erreur: " + err); }
  };

  const showHistory = async (bienId: number) => {
     try {
        const history = await getMouvementsByBien(bienId);
        setTimelineData(history);
        setShowTimeline(true);
     } catch (err) { alert("Historique indisponible"); }
  };

  const handleBienChange = async (bienId: string) => {
    setForm((prev: any) => ({ ...prev, bienId }));
    if (bienId) {
      try {
        const origine = await getOrigineAffectation(Number(bienId));
        setForm((prev: any) => ({ ...prev, detenteurA: origine }));
      } catch (e) {
        setForm((prev: any) => ({ ...prev, detenteurA: "MAGASIN CENTRAL" }));
      }
    }
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
      {showTimeline && <MouvementTimeline mouvements={timelineData} onClose={() => setShowTimeline(false)} />}
      
      <header className="page-header-premium">
        <div className="header-meta">
          <span className="badge-pill-glow">Traçabilité & Détention</span>
          <h1 style={{fontSize: '32px', marginTop: '8px'}}>Affectations des Biens</h1>
        </div>
        {view === 'LIST' ? (
          <button className="primary" onClick={() => setView('FORM')}>+ Nouvelle Affectation</button>
        ) : (
          <button className="btn-export" onClick={() => setView('LIST')}>Retour</button>
        )}
      </header>

      {view === 'FORM' ? (
        <div className="centered-form-card fade-in">
          <div className="form-header-premium">
            <h2>{form.id ? '✏️ Modifier l\'Affectation' : '📦 Nouvelle Mutation'}</h2>
            <button className="btn-back-cat" onClick={() => setView('LIST')}>Annuler</button>
          </div>
          <form onSubmit={handleAdd} className="premium-dynamic-form">
            <div className="form-group-modern">
              <label>Actif / Bien à affecter</label>
              <select required value={form.bienId} onChange={e => handleBienChange(e.target.value)}>
                  <option value="">-- Sélectionner l'actif --</option>
                  {biensList.map(b => (
                    <option key={b.id} value={b.id}>{b.iup || b.codeBien} - {b.designation}</option>
                  ))}
              </select>
            </div>
            <div className="grid-2">
              <div className="form-group-modern">
                <label>Ministère / Institution</label>
                <input value={form.ministere} onChange={e => setForm({...form, ministere: e.target.value})} placeholder="Ex: Ministère de l'Économie" />
              </div>
              <div className="form-group-modern">
                <label>Poste Comptable</label>
                <input value={form.posteComptable} onChange={e => setForm({...form, posteComptable: e.target.value})} placeholder="Ex: Poste de Lomé" />
              </div>
            </div>
            <div className="grid-2">
              <div className="form-group-modern">
                <label>Origine (Détenteur A)</label>
                <input required value={form.detenteurA} onChange={e => setForm({...form, detenteurA: e.target.value})} placeholder="Détecté automatiquement..." />
              </div>
              <div className="form-group-modern">
                <label>Bénéficiaire (Détenteur B)</label>
                <input required value={form.detenteur} onChange={e => setForm({...form, detenteur: e.target.value})} placeholder="Nom complet" />
              </div>
            </div>
            <div className="form-group-modern">
              <label>Service / Direction de Destination</label>
              <div style={{display: 'flex', gap: '8px'}}>
                <select style={{flex: 1}} value={form.service} onChange={e => setForm({...form, service: e.target.value})}>
                    <option value="">-- Choisir le service --</option>
                    {servicesList.map(s => <option key={s.id} value={s.nomService}>{s.nomService}</option>)}
                </select>
                <input 
                  placeholder="Ou saisie libre..." 
                  value={form.service} 
                  onChange={e => setForm({...form, service: e.target.value})} 
                  style={{width: '200px'}}
                />
              </div>
            </div>
            <div className="grid-2">
               <div className="form-group-modern">
                  <label>Date de Mutation</label>
                  <input type="date" required value={form.dateAffectation} onChange={e => setForm({...form, dateAffectation: e.target.value})} />
               </div>
               <div className="form-group-modern">
                  <label>Scan du Bordereau Signé (Optionnel)</label>
                  <FileUpload onUploadSuccess={(url) => setForm({...form, signatureUrl: url})} />
               </div>
            </div>
            <div className="form-group-modern">
              <label>Motif de l'affectation</label>
              <textarea required value={form.motif} onChange={e => setForm({...form, motif: e.target.value})} rows={3} />
            </div>
            <button type="submit" className="primary" style={{width: '100%', marginTop: '20px'}}>Soumettre la demande</button>
          </form>
        </div>
      ) : (
        <div className="asset-grid">
          {data.map(item => (
            <div key={item.id} className="asset-card">
              <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '16px'}}>
                <span className="badge-premium">{new Date(item.dateAffectation).toLocaleDateString()}</span>
                <span className={`status-pill ${item.statutValidation === 'VALIDE' ? 'status-actif' : 'status-degrade'}`} style={{fontSize: '10px'}}>
                    {item.statutValidation === 'VALIDE' ? '✅ VALIDÉ' : '🕒 EN ATTENTE DE VALIDATION'}
                </span>
              </div>
              <h3>{item.bien?.designation || 'Actif'}</h3>
              <p style={{fontSize: '11px', color: 'var(--text-dim)', marginBottom: '15px'}}>IUP: {item.bien?.iup || 'N/A'}</p>
              
              <div className="info-box-premium">
                <p>🛄 De : <strong style={{color: 'var(--primary)'}}>{item.detenteurA || 'Magasin Central'}</strong></p>
                <p>👤 Vers : <strong>{item.detenteur}</strong></p>
                <p style={{fontSize: '12px', color: 'var(--text-dim)'}}>🏢 {item.service}</p>
              </div>

              <div style={{display: 'flex', gap: '8px', margin: '20px 0'}}>
                 <button 
                  className="btn-export" 
                  style={{flex: 1}}
                  onClick={() => {
                    setForm({
                      ...item,
                      bienId: item.bien?.id,
                      dateAffectation: item.dateAffectation ? item.dateAffectation.split('T')[0] : '',
                      detenteurA: item.detenteurA || '',
                      ministere: item.ministere || '',
                      posteComptable: item.posteComptable || ''
                    });
                    setView('FORM');
                  }}
                >
                  Modifier
                </button>
                 <button className="btn-export" style={{flex: 1, fontSize: '11px'}} onClick={() => {
                    const enriched = {
                      ...item,
                      bienCode: item.bien?.iup || item.bien?.codeBien,
                      valeur: item.bien?.valeur,
                      ministere: item.ministere || "MINISTÈRE DU PATRIMOINE",
                      posteComptable: item.posteComptable || "POSTE LOMÉ CENTRE"
                    };
                    exportBordereauMutationExcel(enriched, `BM_${item.id}.xls`);
                 }}>📗 XLS</button>
                 <button className="btn-export" style={{flex: 1, fontSize: '11px'}} onClick={() => window.print()}>📕 PDF</button>
              </div>

              {item.statutValidation === 'EN_ATTENTE' && (hasRole('ADMIN') || hasRole('SUPERVISOR')) && (
                 <button className="primary" style={{width: '100%', marginBottom: '10px'}} onClick={() => handleValidate(item.id)}>✅ Valider Mutation</button>
              )}

              <div className="card-actions-premium">
                <button onClick={() => item.bien?.id && showHistory(item.bien.id)} disabled={!item.bien?.id}>🕒 Historique</button>
                <button style={{color: 'var(--danger)'}} onClick={() => deleteAffectation(item.id).then(loadData)}>🗑️</button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AffectationsPage;
