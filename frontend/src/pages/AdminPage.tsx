import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { getBackups, createBackup } from '../api/api';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  ShieldCheck, 
  Settings, 
  Layers, 
  Activity, 
  Search, 
  UserPlus, 
  Lock, 
  Database,
  Cpu,
  RefreshCw,
  MoreVertical,
  CheckCircle2,
  XCircle,
  ChevronRight
} from 'lucide-react';
import { 
  getAdminUsers, 
  getAdminRoles, 
  getAllPermissions, 
  toggleUserActive, 
  updateRolePermissions,
  User,
  Role,
  Permission,
  RoleWithUserCount
} from '../api/admin';
import { useToast } from '../contexts/ToastContext';
import { usePermissions } from '../contexts/PermissionsContext';
import CategorieTreeSelect from '../components/CategorieTreeSelect';
import './AdminPage.css';

const AdminPage: React.FC = () => {
  const { hasPermission, loading: permLoading } = usePermissions();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'catalog' | 'config' | 'backup'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // 🚀 Métriques calculées
  const stats = React.useMemo(() => {
    return {
      totalUsers: users.length,
      activeUsers: users.filter(u => u.statut === 'ACTIF').length,
      totalRoles: roles.length,
      totalPerms: allPermissions.length,
      systemHealth: 'Optimal'
    };
  }, [users, roles, allPermissions]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [usersData, rolesData, permsData] = await Promise.all([
        getAdminUsers(),
        getAdminRoles(),
        getAllPermissions()
      ]);
      setUsers(usersData);
      const wrapped = rolesData as RoleWithUserCount[];
      setRoles(wrapped.map((item) => item.role));
      setAllPermissions(permsData);
    } catch (error) {
      console.error("Error fetching admin data", error);
      showToast({ type: "error", title: "Erreur de chargement", message: "Impossible de récupérer les données système." });
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: number) => {
    try {
      const updated = await toggleUserActive(id);
      setUsers(users.map(u => (u.id === id ? updated : u)));
      showToast({ 
        type: "success", 
        title: "Statut mis à jour", 
        message: `L'utilisateur est maintenant ${updated.statut.toLowerCase()}.` 
      });
    } catch (error: any) {
      const msg = error.response?.data?.message || "Échec de la modification du statut.";
      showToast({ type: "error", title: "Action impossible", message: msg });
    }
  };

  const handlePermissionToggle = async (roleCode: string, permissionCode: string, currentCodes: string[]) => {
    const newCodes = currentCodes.includes(permissionCode)
      ? currentCodes.filter(c => c !== permissionCode)
      : [...currentCodes, permissionCode];
    
    try {
      await updateRolePermissions(roleCode, newCodes);
      // Refresh roles to get updated permissions
      setRoles(roles.map(r => {
        if (r.code === roleCode) {
          return {
            ...r,
            permissions: newCodes.map(code => ({ code, libelle: '', id: 0 }))
          };
        }
        return r;
      }));
      showToast({ type: "success", title: "Sécurité mise à jour", message: "Les droits d'accès ont été modifiés." });
    } catch (error) {
      showToast({ type: "error", title: "Erreur", message: "Impossible de modifier les permissions." });
    }
  };

  if (permLoading) {
    return (
      <div className="admin-page">
        <div className="admin-loader-tech">
          <div className="tech-spinner"></div>
          <p>Initialisation du noyau système...</p>
        </div>
      </div>
    );
  }

  if (!hasPermission('ADMIN_SYSTEM')) {
    return <Navigate to="/" replace />;
  }

  const filteredUsers = users.filter(u => 
    u.nom.toLowerCase().includes(searchQuery.toLowerCase()) || 
    u.username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="admin-page">
      <motion.header 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="admin-header"
      >
        <div className="header-main">
          <div className="title-group">
            <span className="badge-tech"><Activity size={12} /> System Live</span>
            <h1>Administration</h1>
          </div>

          <div className="header-metrics">
            <div className="metric-card">
              <span>Utilisateurs</span>
              <strong>{stats.totalUsers}</strong>
            </div>
            <div className="metric-card">
              <span>Sécurité</span>
              <strong>{stats.totalPerms} P</strong>
            </div>
            <div className="metric-card">
              <span>Noyau</span>
              <strong>{stats.systemHealth}</strong>
            </div>
          </div>
        </div>
        
        <nav className="admin-tabs-nav">
          {[
            { id: 'users', label: 'Utilisateurs', icon: <Users size={18} /> },
            { id: 'roles', label: 'Sécurité', icon: <ShieldCheck size={18} /> },
            { id: 'catalog', label: 'Catalogue', icon: <Layers size={18} /> },
            { id: 'config', label: 'Paramètres', icon: <Settings size={18} /> },
            { id: 'backup', label: 'PRA & Backup', icon: <Database size={18} /> }
          ].map((tab) => (
            <button 
              key={tab.id}
              className={`tab-trigger ${activeTab === tab.id ? 'active' : ''}`} 
              onClick={() => setActiveTab(tab.id as any)}
            >
              {tab.icon}
              {tab.label}
              {activeTab === tab.id && (
                <motion.div layoutId="activeTab" className="tab-indicator" />
              )}
            </button>
          ))}
        </nav>
      </motion.header>

      <div className="admin-view-container">
        {loading ? (
          <div className="admin-loader-tech">
            <div className="tech-spinner"></div>
            <p>Synchronisation des données...</p>
          </div>
        ) : (
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.3 }}
            >
              {activeTab === 'users' && (
                <div className="admin-users-view fade-up">
                  <div className="section-toolbar">
                    <div className="search-box-modern">
                      <Search size={18} />
                      <input 
                        type="text" 
                        placeholder="Rechercher un administrateur..." 
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                    <button className="btn-premium">
                      <UserPlus size={18} />
                      Nouveau Compte
                    </button>
                  </div>

                  <div className="admin-users-grid">
                    {filteredUsers.map(user => (
                      <div key={user.id} className="admin-user-card">
                        <div className="user-card-header">
                          <div className="user-card-avatar">
                            {user.nom.slice(0, 1)}{user.prenom?.slice(0, 1)}
                          </div>
                          <div className="user-card-info">
                            <h3>{user.nom} {user.prenom}</h3>
                            <p>@{user.username}</p>
                          </div>
                          <div className={`status-pulse ${user.statut === 'ACTIF' ? 'active' : 'suspended'}`} />
                        </div>

                        <div className="user-card-body">
                          <div className="info-row">
                            <ShieldCheck size={14} />
                            <span>{user.role?.libelle || user.role?.code}</span>
                          </div>
                          <div className="info-row">
                            <Lock size={14} />
                            <span>{user.statut === 'ACTIF' ? 'Accès autorisé' : 'Accès révoqué'}</span>
                          </div>
                        </div>

                        <div className="user-card-actions">
                          <button 
                            className={`btn-action-pill ${user.statut === 'ACTIF' ? 'danger' : 'success'}`}
                            onClick={() => handleToggleActive(user.id)}
                          >
                            {user.statut === 'ACTIF' ? <XCircle size={14} /> : <CheckCircle2 size={14} />}
                            {user.statut === 'ACTIF' ? 'Suspendre' : 'Réactiver'}
                          </button>
                          <button className="btn-action-icon"><MoreVertical size={16} /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeTab === 'roles' && (
                <div className="admin-glass-panel fade-up">
                  <div className="panel-header">
                    <div className="header-icon-box"><ShieldCheck size={20} /></div>
                    <h2>Matrice de Sécurité Haute Densité</h2>
                  </div>
                  
                  <div className="matrix-wrapper">
                    <table className="matrix-tech-table">
                      <thead>
                        <tr>
                          <th className="sticky-col">Code Permission</th>
                          {roles.map(role => (
                            <th key={role.id}>{role.libelle}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {allPermissions.map(perm => (
                          <tr key={perm.id} className="matrix-row">
                            <td className="perm-label-cell">
                              <span className="perm-code">{perm.code}</span>
                              <span className="perm-desc">{perm.libelle}</span>
                            </td>
                            {roles.map(role => {
                              const hasPerm = role.permissions.some(p => p.code === perm.code);
                              const rolePermCodes = role.permissions.map(p => p.code);
                              return (
                                <td key={role.id} className="matrix-cell">
                                  <input 
                                    type="checkbox" 
                                    className="cyber-toggle"
                                    checked={hasPerm}
                                    disabled={role.systemRole && role.code === 'ADMIN'}
                                    onChange={() => handlePermissionToggle(role.code, perm.code, rolePermCodes)}
                                  />
                                </td>
                              );
                            })}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {activeTab === 'catalog' && (
                <div className="admin-glass-panel fade-up">
                  <div className="panel-header">
                    <div className="header-icon-box"><Database size={20} /></div>
                    <h2>Explorateur de Nomenclature</h2>
                    <button className="btn-premium sm">Nouvelle Catégorie</button>
                  </div>
                  <div className="catalog-explorer-content">
                    <p className="helper-text-tech">Structure hiérarchique officielle du patrimoine national.</p>
                    <div className="tree-container-premium">
                      <CategorieTreeSelect value="" onChange={() => undefined} />
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'config' && (
                <div className="admin-config-grid fade-up">
                  <div className="config-cyber-card">
                    <h3>
                      <div className="config-icon-box"><Cpu size={18} /></div>
                      Identité (IUP)
                    </h3>
                    <div className="cyber-field">
                      <label>Préfixe IUP Global</label>
                      <input type="text" defaultValue="CT-LME" />
                      <div className="field-glow" />
                    </div>
                    <div className="cyber-field disabled">
                      <label>Année de Référence</label>
                      <input type="text" defaultValue="2024" disabled />
                    </div>
                    <button className="btn-cyber-submit">
                      <RefreshCw size={16} /> Mettre à jour le noyau
                    </button>
                  </div>

                  <div className="config-cyber-card">
                    <h3>
                      <div className="config-icon-box"><RefreshCw size={18} /></div>
                      Amortissement
                    </h3>
                    <div className="cyber-field">
                      <label>Mode Standard</label>
                      <select>
                        <option>Linéaire (Code 01)</option>
                        <option>Dégressif (Code 02)</option>
                      </select>
                    </div>
                    <div className="cyber-hint">
                      <ChevronRight size={14} /> La modification affectera les nouveaux biens.
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'backup' && (
                <BackupPanel showToast={showToast} />
              )}
            </motion.div>
          </AnimatePresence>
        )}
      </div>
    </div>
  );
};

const BackupPanel: React.FC<{ showToast: any }> = ({ showToast }) => {
  const [backups, setBackups] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [triggering, setTriggering] = useState(false);

  const loadBackups = async () => {
    setLoading(true);
    try {
      const data = await getBackups();
      setBackups(data);
    } catch {
      showToast({ type: 'error', title: 'Erreur', message: 'Impossible de charger les sauvegardes.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBackups();
  }, []);

  const handleCreateBackup = async () => {
    setTriggering(true);
    try {
      await createBackup('manual');
      showToast({ type: 'success', title: 'Backup lancé', message: 'Sauvegarde effectuée avec succès.' });
      loadBackups();
    } catch (e: any) {
      showToast({ type: 'error', title: 'Erreur', message: e.response?.data?.error || 'Échec de la sauvegarde.' });
    } finally {
      setTriggering(false);
    }
  };

  return (
    <div className="admin-glass-panel fade-up">
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div className="header-icon-box"><Database size={20} /></div>
          <div>
            <h2>Plan de Reprise d'Activité (PRA)</h2>
            <p style={{ color: '#64748b', fontSize: '0.9rem', margin: 0 }}>Gérez vos sauvegardes de base de données PostgreSQL.</p>
          </div>
        </div>
        <button className="btn-premium sm" onClick={handleCreateBackup} disabled={triggering} style={{ background: '#059669', color: 'white' }}>
          <RefreshCw size={16} className={triggering ? 'spin' : ''} /> {triggering ? 'Création...' : 'Sauvegarder Maintenant'}
        </button>
      </div>

      <div className="matrix-wrapper" style={{ marginTop: '20px' }}>
        <table className="matrix-tech-table">
          <thead>
            <tr>
              <th>Nom du fichier</th>
              <th>Type</th>
              <th>Taille</th>
              <th>Date de création</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>Chargement...</td></tr>
            ) : backups.length === 0 ? (
              <tr><td colSpan={4} style={{ textAlign: 'center', padding: '20px' }}>Aucune sauvegarde trouvée.</td></tr>
            ) : (
              backups.map((b, i) => (
                <tr key={i} className="matrix-row">
                  <td style={{ fontWeight: 500 }}>{b.fileName}</td>
                  <td><span style={{ padding: '4px 8px', background: '#e2e8f0', borderRadius: '4px', fontSize: '12px' }}>{b.type}</span></td>
                  <td>{(b.sizeBytes / 1024 / 1024).toFixed(2)} MB</td>
                  <td>{new Date(b.timestamp).toLocaleString('fr-FR')}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminPage;
