import React, { useState, useEffect } from 'react';
import { getUsers, createUser, deleteUser } from '../api/api';

interface User {
  id: number;
  nom: string;
  username: string;
  email?: string;
  fonction?: string;
  telephone?: string;
  role: string;
  derniereConnexion?: string;
  statut?: 'ACTIF' | 'SUSPENDU';
}

// Mapping des rôles frontend vers backend
const ROLES_MAPPING: { [key: string]: string } = {
  'ADMIN': 'ADMIN',
  'AGENT_INVENTAIRE': 'AGENT_INVENTAIRE',
  'GESTIONNAIRE_TECHNIQUE': 'GESTIONNAIRE_TECHNIQUE',
  'RESPONSABLE_PATRIMOINE': 'RESPONSABLE_PATRIMOINE',
  'RESPONSABLE_FINANCIER': 'RESPONSABLE_FINANCIER',
  'ELU': 'ELU',
  'AUDITEUR': 'AUDITEUR',
  'MAGASINIER': 'MAGASINIER'
};

const ROLE_LABELS: { [key: string]: { label: string; icon: string } } = {
  'ADMIN': { label: '🔑 Administrateur Système', icon: '🔑' },
  'AGENT_INVENTAIRE': { label: '📋 Agent d\'Inventaire', icon: '📋' },
  'GESTIONNAIRE_TECHNIQUE': { label: '🛠️ Gestionnaire Technique', icon: '🛠️' },
  'RESPONSABLE_PATRIMOINE': { label: '👔 Responsable Patrimoine', icon: '👔' },
  'RESPONSABLE_FINANCIER': { label: '💰 Responsable Financier', icon: '💰' },
  'ELU': { label: '🏛️ Élu', icon: '🏛️' },
  'AUDITEUR': { label: '🔍 Auditeur', icon: '🔍' },
  'MAGASINIER': { label: '📦 Magasinier', icon: '📦' }
};

const UsersPage: React.FC = () => {
  const [view, setView] = useState<'LIST' | 'FORM'>('LIST');
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getUsers()
      .then(setData)
      .catch(() => setData([]))
      .finally(() => setLoading(false));
  }, []);

  const [form, setForm] = useState({
    nom: '',
    username: '',
    email: '',
    fonction: '',
    telephone: '',
    role: 'AGENT_INVENTAIRE' as string,
    password: ''
  });

  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    try {
      const created = await createUser(form);
      setData([created, ...data]);
      setSuccessMessage(`✅ Utilisateur ${created.nom || created.username} créé avec succès !`);
      setForm({ nom: '', username: '', email: '', fonction: '', telephone: '', role: 'AGENT_INVENTAIRE', password: '' });
      setView('LIST');
    } catch (error: any) {
      console.error('Erreur création:', error);
      setErrorMessage(`⚠️ Erreur lors de la création du compte : ${error.response?.data?.message || error.message || 'Erreur inconnue'}`);
    }
  };

  const getRoleLabel = (role: string) => {
    return ROLE_LABELS[role]?.label || role;
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir suppimer cet utilisateur?')) {
      try {
        await deleteUser(id);
        setData(data.filter(u => u.id !== id));
        alert('Utilisateur supprimé');
      } catch (error: any) {
        alert('Erreur: ' + error.message);
      }
    }
  };

  return (
    <div className="module-container fade-in" style={{padding: '24px'}}>
      <header className="page-header-modern">
        <div className="header-meta">
          <span className="badge-premium">Système & Accès</span>
          <h2 style={{fontSize: '32px', marginTop: '8px'}}>Administration des Comptes</h2>
        </div>
        {view === 'LIST' ? (
          <button className="primary" onClick={() => setView('FORM')}>+ Créer un Compte</button>
        ) : (
          <button className="btn-export" onClick={() => setView('LIST')}>Annuler</button>
        )}
      </header>

      {successMessage && view === 'LIST' && (
        <div style={{background: '#e6ffed', border: '1px solid #2ecc71', color: '#145214', borderRadius: '10px', padding: '12px', margin: '16px 0'}}>
          {successMessage}
        </div>
      )}
      {errorMessage && view === 'LIST' && (
        <div style={{background: '#ffe6e6', border: '1px solid #e74c3c', color: '#b90202', borderRadius: '10px', padding: '12px', margin: '16px 0'}}>
          {errorMessage}
        </div>
      )}
      {view === 'FORM' ? (
        <div className="glass-card-high" style={{maxWidth: '800px', margin: '40px auto', padding: '40px'}}>
          <h3 style={{marginBottom: '30px', color: 'var(--primary)'}}>👤 Création d'un Nouvel Utilisateur</h3>
          {successMessage && <div style={{background: '#e6ffed', border: '1px solid #2ecc71', color: '#145214', borderRadius: '10px', padding: '12px', marginBottom: '16px'}}>{successMessage}</div>}
          {errorMessage && <div style={{background: '#ffe6e6', border: '1px solid #e74c3c', color: '#b90202', borderRadius: '10px', padding: '12px', marginBottom: '16px'}}>{errorMessage}</div>}
          <form onSubmit={handleCreate} style={{display: 'grid', gap: '20px'}}>
            <div className="form-group">
              <label>Nom Complet</label>
              <input required value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} placeholder="Ex: Jean Kouassi" />
            </div>
            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
              <div className="form-group">
                <label>Email</label>
                <input type="email" required value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="Ex: jean.kouassi@domain.tg" />
              </div>
              <div className="form-group">
                <label>Nom d'utilisateur (Login)</label>
                <input required value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="Ex: j.kouassi" />
              </div>
            </div>

            <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
              <div className="form-group">
                <label>Fonction</label>
                <input value={form.fonction} onChange={e => setForm({...form, fonction: e.target.value})} placeholder="Ex: Administrateur" />
              </div>
              <div className="form-group">
                <label>Téléphone</label>
                <input value={form.telephone} onChange={e => setForm({...form, telephone: e.target.value})} placeholder="Ex: +228 90 12 34 56" />
              </div>
            </div>

            <div className="form-group">
              <label>Rôle Système</label>
              <select value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                <option value="AGENT_INVENTAIRE">📋 Agent d'Inventaire</option>
                <option value="GESTIONNAIRE_TECHNIQUE">🛠️ Gestionnaire Technique</option>
                <option value="RESPONSABLE_PATRIMOINE">👔 Responsable Patrimoine</option>
                <option value="RESPONSABLE_FINANCIER">💰 Responsable Financier</option>
                <option value="AUDITEUR">🔍 Auditeur</option>
                <option value="MAGASINIER">📦 Magasinier</option>
                <option value="ADMIN">🔑 Administrateur</option>
              </select>
            </div>
            <div className="form-group">
              <label>Mot de passe</label>
              <input type="password" required value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Choisir un mot de passe" />
            </div>
            <button type="submit" className="primary" style={{marginTop: '10px'}}>Générer le Compte</button>
          </form>
        </div>
      ) : (
        <div className="asset-grid">
          {loading ? (
            <div style={{gridColumn: '1/-1', textAlign: 'center', padding: '40px'}}>
              <div className="loader"></div>
              <p style={{marginTop: '20px', opacity: 0.6}}>Chargement des utilisateurs...</p>
            </div>
          ) : data.length > 0 ? (
            data.map(user => (
              <div key={user.id} className="asset-card">
                <div style={{display: 'flex', gap: '15px', alignItems: 'center', marginBottom: '20px'}}>
                  <div style={{
                    width: '56px', 
                    height: '56px', 
                    borderRadius: '18px', 
                    background: 'linear-gradient(135deg, var(--primary), var(--accent))', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: 'center', 
                    fontSize: '22px', 
                    fontWeight: '900', 
                    color: 'white',
                    boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
                  }}>
                    {user.nom.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h3 style={{fontSize: '18px'}}>{user.nom}</h3>
                    <p style={{fontSize: '12px', color: 'var(--text-dim)'}}>@{user.username}</p>
                  </div>
                </div>
                
                <div style={{background: 'rgba(255,255,255,0.02)', padding: '16px', borderRadius: '16px', marginBottom: '20px', border: '1px solid var(--glass-border)'}}>
                  <p style={{margin: '0 0 8px', fontSize: '13px'}}><strong>Email :</strong> {user.email || 'Non défini'}</p>
                  <p style={{margin: '0 0 8px', fontSize: '13px'}}><strong>Fonction :</strong> {user.fonction || 'Non défini'}</p>
                  <p style={{margin: '0 0 8px', fontSize: '13px'}}><strong>Téléphone :</strong> {user.telephone || 'Non défini'}</p>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px'}}>
                    <span className="badge-premium" style={{fontSize: '9px', background: 'rgba(255,255,255,0.05)'}}>
                      {ROLE_LABELS[user.role]?.icon || '👤'} {user.role}
                    </span>
                    <span className="status-pill status-neuf" style={{fontSize: '9px'}}>
                      ✓ ACTIF
                    </span>
                  </div>
                  <p style={{fontSize: '11px', color: 'var(--text-dim)', textAlign: 'right', margin: '6px 0 0'}}>
                    🕒 {user.derniereConnexion || 'Jamais connecté'}
                  </p>
                </div>

                <div style={{marginTop: 'auto', display: 'flex', gap: '8px'}}>
                  <button className="btn-export" style={{flex: 1}}>Modifier</button>
                  <button className="btn-export" style={{padding: '8px', color: 'var(--danger)'}} onClick={() => handleDelete(user.id)}>🗑️</button>
                </div>
              </div>
            ))
          ) : (
            <div className="asset-card" style={{gridColumn: '1/-1', padding: '60px', textAlign: 'center'}}>
              <div style={{fontSize: '60px', marginBottom: '20px'}}>👥</div>
              <h3>Aucun utilisateur</h3>
              <p style={{color: 'var(--text-dim)', maxWidth: '400px', margin: '20px auto'}}>
                Créez votre premier utilisateur en cliquant sur le bouton "Créer un Compte".
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default UsersPage;
