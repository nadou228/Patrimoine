import React from 'react';
import { usePermissions } from '../contexts/PermissionsContext';

const ROLE_COLORS: { [key: string]: { bg: string; text: string; icon: string } } = {
  ADMIN: { bg: '#e74c3c', text: 'Administrateur Système', icon: '🔑' },
  AGENT_INVENTAIRE: { bg: '#3498db', text: 'Agent d\'Inventaire', icon: '📋' },
  GESTIONNAIRE_TECHNIQUE: { bg: '#9b59b6', text: 'Gestionnaire Technique', icon: '🛠️' },
  RESPONSABLE_PATRIMOINE: { bg: '#2ecc71', text: 'Responsable du Patrimoine', icon: '👔' },
  RESPONSABLE_FINANCIER: { bg: '#f39c12', text: 'Responsable Financier', icon: '💰' },
  ELU: { bg: '#1abc9c', text: 'Élu', icon: '🏛️' },
  AUDITEUR: { bg: '#34495e', text: 'Auditeur', icon: '🔍' },
  MAGASINIER: { bg: '#16a085', text: 'Magasinier', icon: '📦' },
  RESPONSABLE_PARC_AUTOMOBILE: { bg: '#d35400', text: 'Responsable Parc Auto', icon: '🚗' }
};

const MODULE_CODES: { [key: string]: string } = {
  READ_BIENS: '📦 Biens',
  CREATE_BIENS: '➕ Ajouter Bien',
  UPDATE_BIENS: '✏️ Modifier Bien',
  DELETE_BIENS: '🗑️ Supprimer Bien',
  READ_USERS: '👥 Utilisateurs',
  CREATE_USERS: '➕ Nouveau Compte',
  DELETE_USERS: '🗑️ Supprimer Compte',
  READ_STOCKS: '📊 Stocks',
  CREATE_STOCKS: '➕ Mouvement Stock',
  UPDATE_STOCKS: '✏️ Modifier Stock',
  READ_INVENTAIRES: '📝 Inventaires',
  CREATE_INVENTAIRES: '➕ Créer Inventaire',
  UPDATE_INVENTAIRES: '✏️ Modifier Inventaire',
  READ_AFFECTATIONS: '🏠 Affectations',
  CREATE_AFFECTATIONS: '➕ Affecter',
  READ_REFORMES: '♻️ Réformes',
  CREATE_REFORMES: '➕ Nouvelle Réforme',
  READ_SINISTRES: '🔥 Sinistres',
  CREATE_SINISTRES: '📢 Signaler Sinistre',
  READ_AUDIT: '🔐 Audit',
  VIEW_DASHBOARD: '📊 Tableau de Bord',
  EXPORT_REPORTS: '📥 Exporter Rapports',
  ADMIN_SYSTEM: '⚙️ Admin Système'
};

export const RolePermissionsCard: React.FC = () => {
  const { permissions, loading } = usePermissions();

  if (loading) {
    return <div style={{ padding: '20px', textAlign: 'center' }}>Chargement permissions...</div>;
  }

  if (!permissions) {
    return <div>Impossible de charger les permissions</div>;
  }

  const roleInfo = ROLE_COLORS[permissions.role] || { bg: '#95a5a6', text: permissions.role, icon: '👤' };
  const grantedPermissions = permissions.permissions.filter(p => p.granted).sort((a, b) => a.code.localeCompare(b.code));

  return (
    <div style={{
      background: 'linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.02))',
      border: '1px solid rgba(255,255,255,0.1)',
      borderRadius: '16px',
      padding: '24px',
      margin: '20px',
      maxWidth: '500px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
        <div style={{
          width: '64px',
          height: '64px',
          borderRadius: '14px',
          background: roleInfo.bg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '32px',
          boxShadow: '0 8px 16px rgba(0,0,0,0.2)'
        }}>
          {roleInfo.icon}
        </div>
        <div>
          <h3 style={{ margin: '0 0 4px', fontSize: '18px', fontWeight: 'bold' }}>
            Votre Rôle
          </h3>
          <p style={{ margin: 0, fontSize: '16px', color: 'var(--text-dim)' }}>
            {roleInfo.text}
          </p>
        </div>
      </div>

      <div style={{ marginBottom: '20px' }}>
        <h4 style={{ margin: '0 0 12px', fontSize: '13px', textTransform: 'uppercase', color: 'var(--text-dim)' }}>
          ✅ Actions Autorisées ({grantedPermissions.length})
        </h4>
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px'
        }}>
          {grantedPermissions.map(perm => (
            <div key={perm.code} style={{
              background: 'rgba(46, 204, 113, 0.1)',
              border: '1px solid rgba(46, 204, 113, 0.3)',
              borderRadius: '8px',
              padding: '8px 12px',
              fontSize: '11px',
              color: '#2ecc71',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <span>✓</span>
              <span>{MODULE_CODES[perm.code] || perm.code}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={{
        background: 'rgba(52, 152, 219, 0.1)',
        border: '1px solid rgba(52, 152, 219, 0.3)',
        borderRadius: '8px',
        padding: '12px',
        fontSize: '12px',
        color: '#3498db'
      }}>
        💡 <strong>Conseil :</strong> Vous voyez uniquement les modules et actions que vous pouvez utiliser. Les autres sont masqués de l'interface.
      </div>
    </div>
  );
};
