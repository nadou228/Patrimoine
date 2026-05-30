import React, { createContext, useContext, useEffect, useState } from 'react';
import { api } from '../api/api';
import { buildPermissionsFallback, clearCurrentUser, getCurrentUser } from '../api/auth';

export interface PermissionDetail {
  code: string;
  description: string;
  granted: boolean;
}

export interface PermissionsData {
  role: string;
  permissions: PermissionDetail[];
}

// Matrice RBAC granulaire : action × ressource → rôles autorisés
const RBAC_MATRIX: Record<string, Record<string, string[]>> = {
  create: {
    biens: ['ADMIN', 'SUPERADMIN', 'AGENT_INVENTAIRE', 'GESTIONNAIRE_TECHNIQUE', 'RESPONSABLE_PATRIMOINE', 'MAGASINIER', 'RESPONSABLE_PARC_AUTOMOBILE'],
    entretiens: ['ADMIN', 'SUPERADMIN', 'GESTIONNAIRE_TECHNIQUE', 'RESPONSABLE_PATRIMOINE'],
    affectations: ['ADMIN', 'SUPERADMIN', 'RESPONSABLE_PATRIMOINE'],
    reformes: ['ADMIN', 'SUPERADMIN', 'RESPONSABLE_PATRIMOINE'],
    sinistres: ['ADMIN', 'SUPERADMIN', 'RESPONSABLE_PATRIMOINE', 'GESTIONNAIRE_TECHNIQUE'],
    stocks: ['ADMIN', 'SUPERADMIN', 'MAGASINIER', 'RESPONSABLE_PATRIMOINE'],
    inventaires: ['ADMIN', 'SUPERADMIN', 'AGENT_INVENTAIRE', 'RESPONSABLE_PATRIMOINE'],
    users: ['ADMIN', 'SUPERADMIN'],
  },
  update: {
    biens: ['ADMIN', 'SUPERADMIN', 'AGENT_INVENTAIRE', 'GESTIONNAIRE_TECHNIQUE', 'RESPONSABLE_PATRIMOINE'],
    entretiens: ['ADMIN', 'SUPERADMIN', 'GESTIONNAIRE_TECHNIQUE', 'RESPONSABLE_PATRIMOINE'],
    affectations: ['ADMIN', 'SUPERADMIN', 'RESPONSABLE_PATRIMOINE'],
    reformes: ['ADMIN', 'SUPERADMIN', 'RESPONSABLE_PATRIMOINE'],
    sinistres: ['ADMIN', 'SUPERADMIN', 'RESPONSABLE_PATRIMOINE'],
    stocks: ['ADMIN', 'SUPERADMIN', 'MAGASINIER', 'RESPONSABLE_PATRIMOINE'],
    inventaires: ['ADMIN', 'SUPERADMIN', 'AGENT_INVENTAIRE', 'RESPONSABLE_PATRIMOINE'],
    users: ['ADMIN', 'SUPERADMIN'],
  },
  delete: {
    biens: ['ADMIN', 'SUPERADMIN'],
    entretiens: ['ADMIN', 'SUPERADMIN'],
    affectations: ['ADMIN', 'SUPERADMIN', 'RESPONSABLE_PATRIMOINE'],
    reformes: ['ADMIN', 'SUPERADMIN'],
    sinistres: ['ADMIN', 'SUPERADMIN'],
    stocks: ['ADMIN', 'SUPERADMIN'],
    inventaires: ['ADMIN', 'SUPERADMIN'],
    users: ['ADMIN', 'SUPERADMIN'],
  },
  export: {
    biens: ['ADMIN', 'SUPERADMIN', 'RESPONSABLE_PATRIMOINE', 'RESPONSABLE_FINANCIER', 'AUDITEUR', 'ELU'],
    audit: ['ADMIN', 'SUPERADMIN', 'AUDITEUR', 'RESPONSABLE_PATRIMOINE'],
    rapports: ['ADMIN', 'SUPERADMIN', 'RESPONSABLE_PATRIMOINE', 'RESPONSABLE_FINANCIER', 'AUDITEUR', 'ELU'],
  },
  view: {
    audit: ['ADMIN', 'SUPERADMIN', 'AUDITEUR', 'RESPONSABLE_PATRIMOINE'],
    users: ['ADMIN', 'SUPERADMIN'],
    dashboard: ['ADMIN', 'SUPERADMIN', 'RESPONSABLE_PATRIMOINE', 'RESPONSABLE_FINANCIER', 'ELU', 'AUDITEUR', 'GESTIONNAIRE_TECHNIQUE', 'AGENT_INVENTAIRE', 'MAGASINIER', 'RESPONSABLE_PARC_AUTOMOBILE'],
  },
};

interface PermissionsContextType {
  permissions: PermissionsData | null;
  hasPermission: (permissionCode: string) => boolean;
  hasAnyRole: (...roles: string[]) => boolean;
  /** Vérifie si le rôle actuel peut effectuer `action` sur `resource` selon la matrice RBAC */
  can: (action: string, resource: string) => boolean;
  loading: boolean;
  /** true si le serveur API n'a pas répondu (backend arrêté ou mauvaise URL). */
  backendUnreachable: boolean;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [permissions, setPermissions] = useState<PermissionsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [backendUnreachable, setBackendUnreachable] = useState(false);

  useEffect(() => {
    const fetchPermissions = async () => {
      const user = getCurrentUser();
      if (!user?.token) {
        setLoading(false);
        return;
      }

      try {
        const response = await api.get('/permissions/my-permissions');
        setPermissions(response.data);
        setBackendUnreachable(false);
      } catch (error: unknown) {
        const err = error as { response?: { status?: number }; message?: string; code?: string };
        const isNetwork =
          !err.response ||
          err.code === 'ERR_NETWORK' ||
          (err.message ?? '').includes('Network Error');

        if (isNetwork) {
          setBackendUnreachable(true);
          const fallback = buildPermissionsFallback(user);
          if (fallback) {
            setPermissions(fallback);
            console.warn(
              'API indisponible : permissions chargées depuis le jeton de connexion. Démarrez le backend sur le port 8082.'
            );
            return;
          }
          console.warn(
            'Serveur PATRIS injoignable (port 8082). Lancez le backend puis rechargez la page.'
          );
          return;
        }

        if (err.response?.status === 401 || err.response?.status === 403) {
          clearCurrentUser();
          window.location.replace('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    void fetchPermissions();
  }, []);

  const hasPermission = (permissionCode: string): boolean => {
    if (!permissions) return false;
    const perm = permissions.permissions.find((p) => p.code === permissionCode);
    return perm?.granted || false;
  };

  const hasAnyRole = (...roles: string[]): boolean => {
    if (!permissions?.role) return false;
    return roles.includes(permissions.role);
  };

  /**
   * Vérifie si l'utilisateur peut effectuer `action` sur `resource`.
   * Ex: can('delete', 'biens') → false pour AGENT_INVENTAIRE
   * Ex: can('create', 'users') → true pour ADMIN
   */
  const can = (action: string, resource: string): boolean => {
    if (!permissions?.role) return false;
    const allowedRoles = RBAC_MATRIX[action]?.[resource];
    if (!allowedRoles) return false;
    return allowedRoles.includes(permissions.role);
  };

  return (
    <PermissionsContext.Provider
      value={{ permissions, hasPermission, hasAnyRole, can, loading, backendUnreachable }}
    >
      {backendUnreachable && (
        <div
          role="alert"
          style={{
            background: '#fef3c7',
            color: '#92400e',
            padding: '10px 16px',
            textAlign: 'center',
            fontSize: '14px',
            borderBottom: '1px solid #fcd34d',
          }}
        >
          Backend non joignable — démarrez l&apos;API Spring Boot (port 8082), par ex.{' '}
          <code>start-backend-background.bat</code>, puis rechargez.
        </div>
      )}
      {children}
    </PermissionsContext.Provider>
  );
};

export const usePermissions = () => {
  const context = useContext(PermissionsContext);
  if (!context) {
    throw new Error('usePermissions doit etre utilise avec PermissionsProvider');
  }
  return context;
};
