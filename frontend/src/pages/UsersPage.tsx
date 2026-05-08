import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { getUsers, createUser, deleteUser } from '../api/api';
import { getCurrentUser } from '../api/auth';
import { useConfirm } from '../contexts/ConfirmContext';
import { useToast } from '../contexts/ToastContext';
import { 
  User as UserIcon, Users, ShieldCheck, UserPlus, 
  Search, Mail, Phone, Briefcase, Calendar, 
  Trash2, Edit3, Filter, MoreVertical, Shield,
  CheckCircle2, XCircle, Clock
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import AnimatedNumber from '../components/AnimatedNumber';

interface RoleDto {
  id?: number;
  code: string;
  libelle?: string;
}

interface User {
  id: number;
  nom: string;
  username: string;
  email?: string;
  fonction?: string;
  telephone?: string;
  role?: RoleDto | string;
  derniereConnexion?: string;
  statut?: 'ACTIF' | 'SUSPENDU' | 'EN_ATTENTE';
}

// Mapping des rôles frontend vers backend
const ROLES_MAPPING: { [key: string]: string } = {
  'SUPERADMIN': 'SUPERADMIN',
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
  'SUPERADMIN': { label: '👑 Super Administrateur', icon: '👑' },
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
  const navigate = useNavigate();
  const { confirm } = useConfirm();
  const { showToast } = useToast();
  const [view, setView] = useState<'LIST' | 'FORM'>('LIST');
  const [data, setData] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');

  const currentUser = getCurrentUser();
  const isSuperAdmin = currentUser?.role === 'SUPERADMIN';


  const stats = React.useMemo(() => {
    const total = data.length;
    const active = data.filter(u => u.statut === 'ACTIF').length;
    const admins = data.filter(u => {
      const roleCode = typeof u.role === 'object' && u.role && 'code' in u.role ? u.role.code : String(u.role ?? '');
      return roleCode === 'ADMIN';
    }).length;
    return { total, active, admins };
  }, [data]);

  const filteredData = React.useMemo(() => {
    return data.filter(u => {
      const roleCode = typeof u.role === 'object' && u.role && 'code' in u.role ? u.role.code : String(u.role ?? '');
      const matchesSearch = 
        u.nom.toLowerCase().includes(searchQuery.toLowerCase()) || 
        u.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'ALL' || roleCode === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [data, searchQuery, roleFilter]);

  useEffect(() => {
    console.log("🔍 Chargement des utilisateurs...");
    getUsers()
      .then(users => {
        console.log(`✅ ${users.length} utilisateurs chargés:`, users);
        setData(users);
      })
      .catch(err => {
        console.error("❌ Erreur chargement utilisateurs:", err);
        setData([]);
      })
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
      const payload = {
        nom: form.nom,
        username: form.username,
        email: form.email,
        fonction: form.fonction,
        telephone: form.telephone,
        password: form.password,
        role: { code: form.role },
      };
      const created = await createUser(payload);
      console.log("🚀 Utilisateur créé/réactivé:", created);
      
      // Rechargement complet de la liste pour être sûr
      const freshData = await getUsers();
      setData(freshData);
      
      setSuccessMessage(`✅ Utilisateur ${created.nom || created.username} prêt !`);
      setForm({ nom: '', username: '', email: '', fonction: '', telephone: '', role: 'AGENT_INVENTAIRE', password: '' });
      setView('LIST');
      
      showToast({
        type: "success",
        title: "Compte activé",
        message: `Le compte de ${created.nom} est opérationnel.`
      });
    } catch (error: any) {
      console.error('Erreur création:', error);
      let msg = "Une erreur est survenue lors de la création.";
      
      // Extraction intelligente du message serveur
      const serverMessage = error.response?.data?.message || error.response?.data;
      
      if (error.response?.status === 409) {
        msg = typeof serverMessage === 'string' ? serverMessage : "Ce nom d'utilisateur ou cet email est déjà utilisé.";
      } else if (serverMessage) {
        msg = typeof serverMessage === 'string' ? serverMessage : "Erreur serveur.";
      }
      
      showToast({
        type: "error",
        title: "Échec de création",
        message: msg
      });
      setErrorMessage(msg);
    }
  };

  const getRoleLabel = (role: string) => {
    return ROLE_LABELS[role]?.label || role;
  };

  const handleDelete = async (id: number) => {
    const approved = await confirm({
      title: "Supprimer cet utilisateur ?",
      message: "Le compte sera retire de la liste active des utilisateurs.",
      confirmLabel: "Supprimer",
      tone: "danger",
    });
    if (!approved) return;

    try {
      await deleteUser(id);
      setData(data.filter(u => u.id !== id));
      showToast({ type: "success", title: "Utilisateur supprime" });
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "Erreur inconnue";
      showToast({ type: "error", title: "Suppression impossible", message });
    }
  };

  return (
    <div className="dashboard-container users-page-shell fade-in" style={{ padding: '32px' }}>
      
      <div className="aff-header-premium glass-card" style={{ marginBottom: 32 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 24 }}>
          <div>
            <span className="badge-pill-glow">ADMINISTRATION SYSTÈME</span>
            <h1 style={{ fontSize: '2.5rem', fontWeight: 800, color: '#1e293b', margin: '8px 0' }}>Gestion des Comptes</h1>
            <p style={{ color: '#64748b', fontSize: '1.1rem' }}>Contrôle des accès, rôles et privilèges utilisateurs</p>
          </div>
          <div style={{ display: 'flex', gap: 12 }}>
             <button 
                className={`pill-filter ${view === 'LIST' ? 'active' : ''}`} 
                onClick={() => setView('LIST')}
                style={{ height: 60, padding: '0 24px' }}
              >
                <Users size={18} /> Utilisateurs
             </button>
             <button 
                className="primary-premium" 
                onClick={() => setView('FORM')} 
                style={{ height: 60, padding: '0 32px', fontSize: '1.1rem' }}
              >
                <UserPlus size={20} /> Créer un compte
             </button>
          </div>
        </div>
      </div>

      {view === 'LIST' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', marginBottom: '32px' }}>
          <div className="stat-card-premium">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span className="stat-label">Total Utilisateurs</span>
              <div className="icon-box-mini" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
                <Users size={16} />
              </div>
            </div>
            <span className="stat-value"><AnimatedNumber value={stats.total} /></span>
          </div>
          <div className="stat-card-premium">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span className="stat-label">Comptes Actifs</span>
              <div className="icon-box-mini" style={{ background: 'rgba(16, 185, 129, 0.1)', color: '#10b981' }}>
                <CheckCircle2 size={16} />
              </div>
            </div>
            <span className="stat-value"><AnimatedNumber value={stats.active} /></span>
          </div>
          <div className="stat-card-premium">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <span className="stat-label">Administrateurs</span>
              <div className="icon-box-mini" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                <ShieldCheck size={16} />
              </div>
            </div>
            <span className="stat-value"><AnimatedNumber value={stats.admins} /></span>
          </div>
        </div>
      )}

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
      {view === 'LIST' ? (
        <>
          <div className="gallery-toolbar" style={{ marginBottom: 24 }}>
            <div className="toolbar-search">
              <Search size={18} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Rechercher par nom, email, login..."
              />
            </div>
            <div className="toolbar-filters">
              <button 
                className={`pill-filter ${roleFilter === 'ALL' ? 'active' : ''}`}
                onClick={() => setRoleFilter('ALL')}
              >
                Tout voir
              </button>
              <button 
                className={`pill-filter ${roleFilter === 'ADMIN' ? 'active' : ''}`}
                onClick={() => setRoleFilter('ADMIN')}
              >
                Admins
              </button>
              <select 
                className="pill-filter-select" 
                value={roleFilter} 
                onChange={(e) => setRoleFilter(e.target.value)}
                style={{ marginLeft: 8 }}
              >
                <option value="ALL">Autres rôles...</option>
                {Object.keys(ROLES_MAPPING)
                  .filter(r => r !== 'SUPERADMIN' || isSuperAdmin)
                  .map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="asset-grid-premium">
            {loading ? (
              [1, 2, 3].map(i => <div key={i} className="skeleton skeleton-card" />)
            ) : filteredData.length > 0 ? (
              <AnimatePresence mode="popLayout">
                {filteredData.map((user, idx) => {
                  const roleCode = typeof user.role === 'object' && user.role && 'code' in user.role ? user.role.code : String(user.role ?? '');
                  const roleInfo = ROLE_LABELS[roleCode] || { label: roleCode, icon: '👤' };
                  
                  return (
                    <motion.article 
                      key={user.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      transition={{ delay: idx * 0.05 }}
                      className="asset-card-premium user-identity-card"
                    >
                      <div className="user-card-glow" />
                      <div className="asset-content-premium">
                        <div style={{ display: 'flex', gap: 16, alignItems: 'center', marginBottom: 20 }}>
                          <div className="user-avatar-premium">
                            {user.nom.charAt(0).toUpperCase()}
                            <div className={`online-status-pulse ${user.statut === 'ACTIF' ? 'active' : ''}`} />
                          </div>
                          <div>
                            <h3 className="asset-title-premium" style={{ margin: 0 }}>{user.nom}</h3>
                            <span className="field-hint">@{user.username}</span>
                          </div>
                        </div>

                        <div className="asset-details-grid" style={{ marginBottom: 20 }}>
                          <div className="detail-item">
                            <span className="detail-label"><Mail size={12} /> Email</span>
                            <span className="detail-value">{user.email || '—'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label"><Phone size={12} /> Contact</span>
                            <span className="detail-value">{user.telephone || '—'}</span>
                          </div>
                          <div className="detail-item">
                            <span className="detail-label"><Briefcase size={12} /> Fonction</span>
                            <span className="detail-value">{user.fonction || 'Non défini'}</span>
                          </div>
                        </div>

                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto' }}>
                          <div className="role-badge-modern">
                            <span className="role-icon">{roleInfo.icon}</span>
                            <span className="role-text">{roleInfo.label.split(' ').slice(1).join(' ')}</span>
                          </div>
                          <div className={`status-pill-mini ${user.statut?.toLowerCase()}`}>
                            {user.statut === 'ACTIF' ? <CheckCircle2 size={10} /> : <Clock size={10} />}
                            {user.statut || 'EN_ATTENTE'}
                          </div>
                        </div>
                      </div>

                      <div className="asset-footer-premium" style={{ marginTop: 20, paddingTop: 16, borderTop: '1px solid rgba(0,0,0,0.05)' }}>
                        <span className="field-hint" style={{ fontSize: 10 }}>
                          <Clock size={10} style={{ marginRight: 4 }} /> 
                          {user.derniereConnexion || 'Aucune activité'}
                        </span>
                        <div className="asset-actions-premium">
                          <button className="action-btn-mini" title="Modifier">
                            <Edit3 size={14} />
                          </button>
                          <button className="action-btn-mini danger" title="Supprimer" onClick={() => handleDelete(user.id)}>
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </div>
                    </motion.article>
                  );
                })}
              </AnimatePresence>
            ) : (
              <div style={{ gridColumn: '1/-1', textAlign: 'center', padding: '100px 0' }}>
                <Users size={64} style={{ opacity: 0.1, marginBottom: 20 }} />
                <h3 style={{ opacity: 0.4 }}>Aucun utilisateur trouvé</h3>
                <p style={{ opacity: 0.3 }}>Ajustez vos filtres ou créez un nouveau compte</p>
              </div>
            )}
          </div>

          <div style={{ marginTop: 40, padding: 20, borderTop: '1px dashed rgba(0,0,0,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="field-hint">
              <Shield size={14} style={{ marginRight: 8 }} />
              Diagnostic : {data.length} comptes chargés au total ({filteredData.length} visibles avec les filtres)
            </span>
            <button className="btn-export" onClick={() => {
              setLoading(true);
              getUsers().then(setData).finally(() => setLoading(false));
            }}>
              <Clock size={14} style={{ marginRight: 8 }} /> Actualiser la liste
            </button>
          </div>
        </>
      ) : (
        <div className="registration-flow fade-in-up">
          <div className="centered-form-card" style={{ maxWidth: '800px', margin: '0 auto' }}>
            <div className="form-header-premium glass-card" style={{ marginBottom: 32, borderBottom: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div className="step-circle-premium active">
                  <UserPlus />
                </div>
                <div>
                  <h2 style={{ margin: 0 }}>Nouveau Compte</h2>
                  <p className="form-subtitle" style={{ margin: 0 }}>Création d'un profil et attribution des privilèges</p>
                </div>
              </div>
              <button className="btn-export glass-card" onClick={() => setView('LIST')}>
                Annuler
              </button>
            </div>

            <form onSubmit={handleCreate} className="glass-card" style={{ padding: 40 }}>
              <div className="form-grid-premium">
                <div className="full-span">
                  <label className="field-label-modern">Nom Complet de l'agent</label>
                  <input required className="premium-input" value={form.nom} onChange={e => setForm({...form, nom: e.target.value})} placeholder="Ex: Jean Kouassi" />
                </div>
                
                <div>
                  <label className="field-label-modern">Adresse Email</label>
                  <div className="input-with-icon">
                    <Mail size={16} />
                    <input type="email" required className="premium-input" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="jean.k@domaine.tg" />
                  </div>
                </div>

                <div>
                  <label className="field-label-modern">Nom d'utilisateur (Login)</label>
                  <input required className="premium-input" value={form.username} onChange={e => setForm({...form, username: e.target.value})} placeholder="Ex: j.kouassi" />
                </div>

                <div>
                  <label className="field-label-modern">Fonction / Titre</label>
                  <input className="premium-input" value={form.fonction} onChange={e => setForm({...form, fonction: e.target.value})} placeholder="Ex: Chef de service" />
                </div>

                <div>
                  <label className="field-label-modern">Téléphone</label>
                  <input className="premium-input" value={form.telephone} onChange={e => setForm({...form, telephone: e.target.value})} placeholder="+228 99..." />
                </div>

                <div className="full-span">
                  <label className="field-label-modern">Rôle & Privilèges Système</label>
                  <select className="premium-input" value={form.role} onChange={e => setForm({...form, role: e.target.value})}>
                    {Object.entries(ROLE_LABELS)
                      .filter(([code]) => code !== 'SUPERADMIN' || isSuperAdmin)
                      .map(([code, info]) => (
                      <option key={code} value={code}>{info.label}</option>
                    ))}
                  </select>
                </div>

                <div className="full-span">
                  <label className="field-label-modern">Mot de passe initial</label>
                  <input type="password" required className="premium-input" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="••••••••" />
                </div>
              </div>

              <div className="form-footer-premium" style={{ marginTop: 40 }}>
                <button type="submit" className="primary-premium large-btn" style={{ width: '100%', justifyContent: 'center' }}>
                  <Shield size={18} /> Générer les accès
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsersPage;
