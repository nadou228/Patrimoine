import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import {
  getBackups,
  createBackup,
  getSystemSettings,
  updateSystemSettings,
  SystemSettings
} from '../api/api';
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
  applyUserDirectPermission,
  getUserPermissionsDetail,
  User,
  Role,
  Permission,
  RoleWithUserCount,
  UserPermissionsDetail
} from '../api/admin';
import { useToast } from '../contexts/ToastContext';
import { usePermissions } from '../contexts/PermissionsContext';
import CategorieTreeSelect from '../components/CategorieTreeSelect';
import './AdminPage.css';

const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  IUP_PREFIX: 'CT-LME',
  REFERENCE_YEAR: String(new Date().getFullYear()),
  AMORTISSEMENT_MODE: 'LINEAIRE_01',
  EXPORT_EXERCICE: String(new Date().getFullYear()),
  EXPORT_INSTITUTION: "MINISTERE DE L'ECONOMIE ET DES FINANCES",
  EXPORT_POSTE: 'CENTRAL DE LAME'
};

const VALIDATION_PERMISSION_ROWS = [
  { code: 'VALIDATE_BIENS', libelle: 'Valider les biens (Workflow IUP)' },
  { code: 'VALIDATE_AFFECTATIONS', libelle: 'Valider / Rejeter les affectations' },
  { code: 'VALIDATE_REFORMES', libelle: 'Valider / Annuler les dossiers de réforme' },
  { code: 'VALIDATE_STOCKS', libelle: 'Valider les mouvements de stock' },
  { code: 'VALIDATE_INVENTAIRES_AGENT', libelle: 'Valider les fiches inventaires (Agent terrain)' },
  { code: 'VALIDATE_INVENTAIRES_SUPERVISEUR', libelle: 'Contrôle final superviseur des fiches d’audit' },
  { code: 'VALIDATE_INVENTAIRES_ECART', libelle: 'Valider et résoudre les écarts physiques/comptables' }
];

const AdminPage: React.FC = () => {
  const { hasPermission, loading: permLoading } = usePermissions();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'validations' | 'catalog' | 'config' | 'backup'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingSystemSettings, setSavingSystemSettings] = useState(false);
  const [systemSettings, setSystemSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedValidationUserId, setSelectedValidationUserId] = useState<number | ''>('');
  const [userPermissionDetail, setUserPermissionDetail] = useState<UserPermissionsDetail | null>(null);
  const [loadingUserPermissions, setLoadingUserPermissions] = useState(false);

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
      const [usersData, rolesData, permsData, settingsData] = await Promise.all([
        getAdminUsers(),
        getAdminRoles(),
        getAllPermissions(),
        getSystemSettings().catch(() => DEFAULT_SYSTEM_SETTINGS)
      ]);
      setUsers(usersData);
      const wrapped = rolesData as RoleWithUserCount[];
      setRoles(wrapped.map((item) => item.role));
      setAllPermissions(permsData);
      setSystemSettings({ ...DEFAULT_SYSTEM_SETTINGS, ...settingsData });
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

  const loadUserPermissionDetail = async (userId: number) => {
    setLoadingUserPermissions(true);
    try {
      const detail = await getUserPermissionsDetail(userId);
      setUserPermissionDetail(detail);
    } catch {
      showToast({ type: "error", title: "Chargement impossible", message: "Impossible de lire les droits individuels." });
      setUserPermissionDetail(null);
    } finally {
      setLoadingUserPermissions(false);
    }
  };

  const handleValidationUserChange = async (value: string) => {
    const userId = value ? Number(value) : '';
    setSelectedValidationUserId(userId);
    setUserPermissionDetail(null);
    if (userId) {
      await loadUserPermissionDetail(userId);
    }
  };

  const handleDirectValidationToggle = async (permissionCode: string) => {
    if (!selectedValidationUserId || !userPermissionDetail) return;
    const effective = userPermissionDetail.effectivePermissionCodes.includes(permissionCode);
    const roleGrants = userPermissionDetail.rolePermissionCodes.includes(permissionCode);
    const motif = window.prompt(
      effective
        ? "Motif du retrait de ce droit de validation :"
        : "Motif de l'attribution de ce droit de validation :"
    );
    if (!motif || !motif.trim()) {
      showToast({ type: "error", title: "Motif obligatoire", message: "La matrice exige une justification tracée." });
      return;
    }

    try {
      await applyUserDirectPermission(selectedValidationUserId, permissionCode, !effective, motif.trim());
      await loadUserPermissionDetail(selectedValidationUserId);
      showToast({
        type: "success",
        title: roleGrants && effective ? "Droit bloqué pour cet utilisateur" : "Droit individuel mis à jour",
        message: "La décision est enregistrée dans le journal d'audit."
      });
    } catch (error: any) {
      const msg = error.response?.data?.message || "Impossible de modifier ce droit individuel.";
      showToast({ type: "error", title: "Action refusée", message: msg });
    }
  };

  const updateSystemField = (key: keyof SystemSettings, value: string) => {
    setSystemSettings((current) => ({ ...current, [key]: value }));
  };

  const handleSaveSystemSettings = async () => {
    setSavingSystemSettings(true);
    try {
      const saved = await updateSystemSettings(systemSettings);
      setSystemSettings({ ...DEFAULT_SYSTEM_SETTINGS, ...saved });
      showToast({
        type: 'success',
        title: 'Paramètres synchronisés',
        message: 'Le noyau et le profil d’export utilisent maintenant ces valeurs.'
      });
    } catch (error) {
      showToast({
        type: 'error',
        title: 'Mise à jour impossible',
        message: 'Vérifiez vos droits administrateur ou la connexion au serveur.'
      });
    } finally {
      setSavingSystemSettings(false);
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
            { id: 'roles', label: 'Sécurité Générale', icon: <ShieldCheck size={18} /> },
            { id: 'validations', label: 'Matrice de Validation', icon: <CheckCircle2 size={18} /> },
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
                <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>

                  {/* ── Section 1 : Matrice Sécurité Générale ── */}
                  <div className="admin-glass-panel">
                    <div className="panel-header">
                      <div className="header-icon-box"><ShieldCheck size={20} /></div>
                      <h2>Matrice de Sécurité Générale</h2>
                      <span className="matrix-badge-count">{allPermissions.filter(p => !p.code.startsWith('VALIDATE_')).length} permissions</span>
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
                          {allPermissions.filter(p => !p.code.startsWith('VALIDATE_')).map(perm => (
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

                  <div className="admin-glass-panel">
                    <div className="panel-header">
                      <div className="header-icon-box" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
                        <Users size={20} />
                      </div>
                      <div>
                        <h2>Droits individuels de validation</h2>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
                          L'admin ou superadmin peut accorder ou retirer un pouvoir de validation à une personne précise.
                        </p>
                      </div>
                    </div>

                    <div className="direct-validation-layout">
                      <div className="direct-validation-selector">
                        <label>Utilisateur concerné</label>
                        <select
                          value={selectedValidationUserId}
                          onChange={(e) => handleValidationUserChange(e.target.value)}
                        >
                          <option value="">-- Choisir un utilisateur --</option>
                          {users.map(user => (
                            <option key={user.id} value={user.id}>
                              {user.nom} {user.prenom} - {user.role?.libelle || user.role?.code || 'Sans rôle'}
                            </option>
                          ))}
                        </select>
                        <p>
                          Un accord direct donne le droit immédiatement. Un retrait direct bloque ce droit pour cette personne,
                          même si son rôle le possède.
                        </p>
                      </div>

                      <div className="direct-validation-grid">
                        {loadingUserPermissions && (
                          <div className="direct-validation-empty">Chargement des permissions individuelles...</div>
                        )}

                        {!loadingUserPermissions && !userPermissionDetail && (
                          <div className="direct-validation-empty">Sélectionnez un utilisateur pour piloter ses droits de validation.</div>
                        )}

                        {!loadingUserPermissions && userPermissionDetail && VALIDATION_PERMISSION_ROWS.map(row => {
                          const effective = userPermissionDetail.effectivePermissionCodes.includes(row.code);
                          const roleGrants = userPermissionDetail.rolePermissionCodes.includes(row.code);
                          const override = userPermissionDetail.directOverrides.find(o => o.permissionCode === row.code);
                          return (
                            <div key={row.code} className={`direct-validation-card ${effective ? 'enabled' : 'disabled'}`}>
                              <div>
                                <span className="perm-code">{row.code}</span>
                                <strong>{row.libelle}</strong>
                                <small>
                                  {override
                                    ? `${override.accordee ? 'Accord direct' : 'Retrait direct'} par ${override.accordeePar || 'admin'}`
                                    : roleGrants ? 'Autorisé par le rôle' : 'Non autorisé par le rôle'}
                                </small>
                              </div>
                              <label className="direct-toggle">
                                <input
                                  type="checkbox"
                                  checked={effective}
                                  onChange={() => handleDirectValidationToggle(row.code)}
                                />
                                <span>{effective ? 'Autorisé' : 'Refusé'}</span>
                              </label>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'validations' && (
                <div className="fade-up" style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
                  <div className="admin-glass-panel">
                    <div className="panel-header">
                      <div className="header-icon-box" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                        <CheckCircle2 size={20} />
                      </div>
                      <div>
                        <h2>Matrice de Validation Dynamique</h2>
                        <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
                          Configurez les droits d'approbation et de validation de flux métiers par rôle (Temps Réel)
                        </p>
                      </div>
                      <span className="matrix-badge-count" style={{ background: 'rgba(245, 158, 11, 0.1)', color: '#f59e0b' }}>
                        {
                          [
                            'VALIDATE_BIENS',
                            'VALIDATE_AFFECTATIONS',
                            'VALIDATE_REFORMES',
                            'VALIDATE_STOCKS',
                            'VALIDATE_INVENTAIRES_AGENT',
                            'VALIDATE_INVENTAIRES_SUPERVISEUR',
                            'VALIDATE_INVENTAIRES_ECART'
                          ].filter(code => allPermissions.some(p => p.code === code)).length
                        } / 7 configurées
                      </span>
                    </div>

                    <div className="matrix-wrapper">
                      <table className="matrix-tech-table">
                        <thead>
                          <tr>
                            <th className="sticky-col">Validation Métier</th>
                            {roles.map(role => (
                              <th key={role.id}>{role.libelle}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { code: 'VALIDATE_BIENS', libelle: 'Valider les biens (Workflow IUP)' },
                            { code: 'VALIDATE_AFFECTATIONS', libelle: 'Valider / Rejeter les affectations' },
                            { code: 'VALIDATE_REFORMES', libelle: 'Valider / Annuler les dossiers de réforme' },
                            { code: 'VALIDATE_STOCKS', libelle: 'Valider les mouvements de stock' },
                            { code: 'VALIDATE_INVENTAIRES_AGENT', libelle: 'Valider les fiches inventaires (Agent terrain)' },
                            { code: 'VALIDATE_INVENTAIRES_SUPERVISEUR', libelle: 'Contrôle final superviseur des fiches d\'audit' },
                            { code: 'VALIDATE_INVENTAIRES_ECART', libelle: 'Valider et résoudre les écarts physiques/comptables' }
                          ].map(staticPerm => {
                            const perm = allPermissions.find(p => p.code === staticPerm.code) || { id: 0, code: staticPerm.code, libelle: staticPerm.libelle };
                            return (
                              <tr key={staticPerm.code} className="matrix-row">
                                <td className="perm-label-cell">
                                  <span className="perm-code" style={{ color: '#f59e0b', fontWeight: 600 }}>{perm.code}</span>
                                  <span className="perm-desc">{perm.libelle}</span>
                                </td>
                                {roles.map(role => {
                                  const hasPerm = role.permissions.some(p => p.code === perm.code);
                                  const rolePermCodes = role.permissions.map(p => p.code);
                                  const isLocked = role.systemRole && role.code === 'ADMIN';

                                  return (
                                    <td key={role.id} className="matrix-cell">
                                      <input
                                        type="checkbox"
                                        className="cyber-toggle"
                                        style={{ '--accent': '#f59e0b' } as React.CSSProperties}
                                        checked={hasPerm}
                                        disabled={isLocked}
                                        onChange={() => handlePermissionToggle(role.code, perm.code, rolePermCodes)}
                                      />
                                    </td>
                                  );
                                })}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'validations' && (
                <div className="admin-glass-panel fade-up">
                  <div className="panel-header">
                    <div className="header-icon-box" style={{ background: 'rgba(99, 102, 241, 0.1)', color: '#6366f1' }}>
                      <Users size={20} />
                    </div>
                    <div>
                      <h2>Droits individuels de validation</h2>
                      <p style={{ color: '#64748b', fontSize: '0.9rem', margin: '4px 0 0 0' }}>
                        L'admin ou superadmin peut accorder ou retirer un pouvoir de validation à une personne précise.
                      </p>
                    </div>
                  </div>

                  <div className="direct-validation-layout">
                    <div className="direct-validation-selector">
                      <label>Utilisateur concerné</label>
                      <select
                        value={selectedValidationUserId}
                        onChange={(e) => handleValidationUserChange(e.target.value)}
                      >
                        <option value="">-- Choisir un utilisateur --</option>
                        {users.map(user => (
                          <option key={user.id} value={user.id}>
                            {user.nom} {user.prenom} - {user.role?.libelle || user.role?.code || 'Sans rôle'}
                          </option>
                        ))}
                      </select>
                      <p>
                        Un accord direct donne le droit immédiatement. Un retrait direct bloque ce droit pour cette personne,
                        même si son rôle le possède.
                      </p>
                    </div>

                    <div className="direct-validation-grid">
                      {loadingUserPermissions && (
                        <div className="direct-validation-empty">Chargement des permissions individuelles...</div>
                      )}

                      {!loadingUserPermissions && !userPermissionDetail && (
                        <div className="direct-validation-empty">Sélectionnez un utilisateur pour piloter ses droits de validation.</div>
                      )}

                      {!loadingUserPermissions && userPermissionDetail && VALIDATION_PERMISSION_ROWS.map(row => {
                        const effective = userPermissionDetail.effectivePermissionCodes.includes(row.code);
                        const roleGrants = userPermissionDetail.rolePermissionCodes.includes(row.code);
                        const override = userPermissionDetail.directOverrides.find(o => o.permissionCode === row.code);
                        return (
                          <div key={row.code} className={`direct-validation-card ${effective ? 'enabled' : 'disabled'}`}>
                            <div>
                              <span className="perm-code">{row.code}</span>
                              <strong>{row.libelle}</strong>
                              <small>
                                {override
                                  ? `${override.accordee ? 'Accord direct' : 'Retrait direct'} par ${override.accordeePar || 'admin'}`
                                  : roleGrants ? 'Autorisé par le rôle' : 'Non autorisé par le rôle'}
                              </small>
                            </div>
                            <label className="direct-toggle">
                              <input
                                type="checkbox"
                                checked={effective}
                                onChange={() => handleDirectValidationToggle(row.code)}
                              />
                              <span>{effective ? 'Autorisé' : 'Refusé'}</span>
                            </label>
                          </div>
                        );
                      })}
                    </div>
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
                      Identite (IUP)
                    </h3>
                    <div className="cyber-field">
                      <label>Prefixe IUP Global</label>
                      <input
                        type="text"
                        value={systemSettings.IUP_PREFIX}
                        onChange={(event) => updateSystemField('IUP_PREFIX', event.target.value.toUpperCase())}
                        placeholder="CT-LME"
                      />
                      <div className="field-glow" />
                    </div>
                    <div className="cyber-field">
                      <label>Annee de Reference</label>
                      <input
                        type="number"
                        min="2020"
                        max="2100"
                        value={systemSettings.REFERENCE_YEAR}
                        onChange={(event) => updateSystemField('REFERENCE_YEAR', event.target.value)}
                      />
                    </div>
                    <div className="cyber-hint">
                      <ChevronRight size={14} /> Ces valeurs pilotent les nouveaux identifiants generes.
                    </div>
                  </div>

                  <div className="config-cyber-card">
                    <h3>
                      <div className="config-icon-box"><RefreshCw size={18} /></div>
                      Amortissement
                    </h3>
                    <div className="cyber-field">
                      <label>Mode Standard</label>
                      <select
                        value={systemSettings.AMORTISSEMENT_MODE}
                        onChange={(event) => updateSystemField('AMORTISSEMENT_MODE', event.target.value)}
                      >
                        <option value="LINEAIRE_01">Lineaire (Code 01)</option>
                        <option value="DEGRESSIF_02">Degressif (Code 02)</option>
                        <option value="MANUEL">Saisie manuelle</option>
                      </select>
                    </div>
                    <div className="cyber-hint">
                      <ChevronRight size={14} /> La modification affectera les nouveaux biens.
                    </div>
                  </div>

                  <div className="config-cyber-card export-profile-card">
                    <h3>
                      <div className="config-icon-box"><Database size={18} /></div>
                      Profil d'export
                    </h3>
                    <div className="smart-year-row">
                      {['2024', '2025', '2026'].map((year) => (
                        <button
                          key={year}
                          type="button"
                          className={`year-chip ${systemSettings.EXPORT_EXERCICE === year ? 'active' : ''}`}
                          onClick={() => updateSystemField('EXPORT_EXERCICE', year)}
                        >
                          {year}
                        </button>
                      ))}
                    </div>
                    <div className="cyber-field">
                      <label>Exercice budgetaire</label>
                      <input
                        list="exercice-options"
                        inputMode="numeric"
                        value={systemSettings.EXPORT_EXERCICE}
                        onChange={(event) => updateSystemField('EXPORT_EXERCICE', event.target.value)}
                        placeholder="Ex: 2027"
                      />
                      <datalist id="exercice-options">
                        <option value="2023" />
                        <option value="2024" />
                        <option value="2025" />
                        <option value="2026" />
                        <option value="2027" />
                      </datalist>
                    </div>
                    <div className="cyber-field">
                      <label>Institution / Ministere</label>
                      <textarea
                        value={systemSettings.EXPORT_INSTITUTION}
                        onChange={(event) => updateSystemField('EXPORT_INSTITUTION', event.target.value)}
                        rows={3}
                        placeholder="Nom officiel a afficher dans les documents"
                      />
                    </div>
                    <div className="cyber-field">
                      <label>Poste Comptable</label>
                      <input
                        type="text"
                        value={systemSettings.EXPORT_POSTE}
                        onChange={(event) => updateSystemField('EXPORT_POSTE', event.target.value)}
                        placeholder="Ex: CENTRAL DE LAME"
                      />
                    </div>
                    <div className="profile-preview">
                      <span>{systemSettings.EXPORT_EXERCICE || 'Exercice'}</span>
                      <strong>{systemSettings.EXPORT_POSTE || 'Poste comptable'}</strong>
                      <small>{systemSettings.EXPORT_INSTITUTION || 'Institution'}</small>
                    </div>
                  </div>

                  <div className="config-save-panel">
                    <div>
                      <strong>Noyau systeme pret</strong>
                      <span>Les rapports utilisent ce profil automatiquement.</span>
                    </div>
                    <button className="btn-cyber-submit" onClick={handleSaveSystemSettings} disabled={savingSystemSettings}>
                      <RefreshCw size={16} className={savingSystemSettings ? 'spin' : ''} />
                      {savingSystemSettings ? 'Synchronisation...' : 'Enregistrer les parametres'}
                    </button>
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

// ── Backup Panel ─────────────────────────────────────────────────────────────
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
