import React, { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
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
  const [activeTab, setActiveTab] = useState<'users' | 'roles' | 'catalog' | 'config'>('users');
  const [users, setUsers] = useState<User[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [allPermissions, setAllPermissions] = useState<Permission[]>([]);
  const [loading, setLoading] = useState(true);

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
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: number) => {
    try {
      const updated = await toggleUserActive(id);
      setUsers(users.map(u => (u.id === id ? updated : u)));
      showToast({ type: "success", title: "Statut utilisateur mis a jour" });
    } catch (error) {
      showToast({ type: "error", title: "Erreur lors de la modification du statut" });
    }
  };

  const handlePermissionToggle = async (roleId: number, permissionCode: string, currentCodes: string[]) => {
    const newCodes = currentCodes.includes(permissionCode)
      ? currentCodes.filter(c => c !== permissionCode)
      : [...currentCodes, permissionCode];
    
    try {
      await updateRolePermissions(roleId, newCodes);
      // Refresh roles to get updated permissions
      const updatedRoles = await getAdminRoles();
      setRoles(updatedRoles);
      showToast({ type: "success", title: "Permissions du role mises a jour" });
    } catch (error) {
      showToast({ type: "error", title: "Erreur lors de la mise a jour des permissions" });
    }
  };

  if (permLoading) {
    return <div className="admin-page"><div className="admin-loader">Vérification des accès…</div></div>;
  }
  if (!hasPermission('ADMIN_SYSTEM')) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="admin-page">
      <header className="admin-header">
        <div className="header-content">
          <h1>Administration Système</h1>
          <p>Gérez les utilisateurs, les rôles et le catalogue du patrimoine.</p>
        </div>
        
        <div className="admin-tabs">
          <button 
            className={activeTab === 'users' ? 'active' : ''} 
            onClick={() => setActiveTab('users')}
          >
            Utilisateurs
          </button>
          <button 
            className={activeTab === 'roles' ? 'active' : ''} 
            onClick={() => setActiveTab('roles')}
          >
            Rôles & Permissions
          </button>
          <button 
            className={activeTab === 'catalog' ? 'active' : ''} 
            onClick={() => setActiveTab('catalog')}
          >
            Catalogue
          </button>
          <button 
            className={activeTab === 'config' ? 'active' : ''} 
            onClick={() => setActiveTab('config')}
          >
            Configuration Système
          </button>
        </div>
      </header>

      <div className="admin-content">
        {loading ? (
          <div className="admin-loader">Chargement des données...</div>
        ) : (
          <>
            {activeTab === 'users' && (
              <section className="admin-section">
                <div className="section-header">
                  <h2>Gestion des Utilisateurs</h2>
                  <button className="btn-primary">Nouvel Utilisateur</button>
                </div>
                
                <div className="admin-table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>Nom & Prénom</th>
                        <th>Username</th>
                        <th>Email</th>
                        <th>Rôle</th>
                        <th>Statut</th>
                        <th>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {users.map(user => (
                        <tr key={user.id}>
                          <td>{user.nom} {user.prenom}</td>
                          <td><code>{user.username}</code></td>
                          <td>{user.email}</td>
                          <td>
                            <span className="badge-role">{user.role?.libelle || user.role?.code}</span>
                          </td>
                          <td>
                            <span className={`status-pill ${user.statut === 'ACTIF' ? 'active' : 'inactive'}`}>
                              {user.statut === 'ACTIF' ? 'Actif' : user.statut === 'SUSPENDU' ? 'Suspendu' : 'En attente'}
                            </span>
                          </td>
                          <td className="actions">
                            <button onClick={() => handleToggleActive(user.id)}>
                              {user.statut === 'ACTIF' ? 'Suspendre' : 'Réactiver'}
                            </button>
                            <button className="btn-text">Modifier</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeTab === 'roles' && (
              <section className="admin-section">
                <div className="section-header">
                  <h2>Rôles & Matrice de Permissions</h2>
                </div>
                
                <div className="roles-matrix-container">
                  <table className="matrix-table">
                    <thead>
                      <tr>
                        <th className="sticky-col">Permission</th>
                        {roles.map(role => (
                          <th key={role.id}>{role.libelle}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {allPermissions.map(perm => (
                        <tr key={perm.id}>
                          <td className="sticky-col">
                            <strong>{perm.code}</strong>
                            <small>{perm.libelle}</small>
                          </td>
                          {roles.map(role => {
                            const hasPerm = role.permissions.some(p => p.code === perm.code);
                            const rolePermCodes = role.permissions.map(p => p.code);
                            return (
                              <td key={role.id} className="matrix-cell">
                                <input 
                                  type="checkbox" 
                                  checked={hasPerm}
                                  disabled={role.systemRole && role.code === 'ADMIN'}
                                  onChange={() => handlePermissionToggle(role.id, perm.code, rolePermCodes)}
                                />
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            {activeTab === 'catalog' && (
              <section className="admin-section">
                <div className="section-header">
                  <h2>Catalogue du Patrimoine</h2>
                  <button className="btn-primary">Ajouter une Catégorie</button>
                </div>
                <div className="catalog-tree-admin">
                  <p className="helper-text">Explorez et modifiez la nomenclature officielle du patrimoine.</p>
                  <CategorieTreeSelect value="" onChange={() => undefined} />
                  <div className="admin-actions-floating">
                    <button className="btn-primary">Nouvelle Catégorie Racine</button>
                  </div>
                </div>
              </section>
            )}

              <section className="admin-section">
                <div className="section-header">
                  <h2>Configuration du Système</h2>
                </div>
                <div className="config-grid">
                  <div className="config-card card">
                    <h3>Identification (IUP)</h3>
                    <div className="form-group-modern">
                      <label>Préfixe IUP Global</label>
                      <input type="text" defaultValue="CT-LME" />
                    </div>
                    <div className="form-group-modern">
                      <label>Année en cours</label>
                      <input type="text" defaultValue="2024" disabled />
                    </div>
                    <button className="btn-primary">Sauvegarder les paramètres</button>
                  </div>
                  <div className="config-card card">
                    <h3>Paramètres Amortissement</h3>
                    <div className="form-group-modern">
                      <label>Mode par défaut</label>
                      <select><option>Linéaire</option><option>Dégressif</option></select>
                    </div>
                  </div>
                </div>
              </section>
          </>
        )}
      </div>
    </div>
  );
};

export default AdminPage;
