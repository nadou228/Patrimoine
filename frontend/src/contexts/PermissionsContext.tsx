import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';
import { clearCurrentUser, getCurrentUser } from '../api/auth';

export interface PermissionDetail {
  code: string;
  description: string;
  granted: boolean;
}

export interface PermissionsData {
  role: string;
  permissions: PermissionDetail[];
}

interface PermissionsContextType {
  permissions: PermissionsData | null;
  hasPermission: (permissionCode: string) => boolean;
  loading: boolean;
}

const PermissionsContext = createContext<PermissionsContextType | undefined>(undefined);

export const PermissionsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [permissions, setPermissions] = useState<PermissionsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPermissions = async () => {
      try {
        const user = getCurrentUser();
        if (!user) {
          console.warn('Pas d utilisateur valide trouve en session');
          setLoading(false);
          return;
        }

        if (!user.token) {
          console.warn('Pas de token trouve pour utilisateur:', user);
          setLoading(false);
          return;
        }

        console.log('Chargement des permissions pour utilisateur:', user.nom, 'avec le role:', user.role);

        const response = await axios.get('http://localhost:8082/api/permissions/my-permissions', {
          headers: {
            Authorization: `Bearer ${user.token}`,
            'Content-Type': 'application/json',
          },
        });

        console.log('Permissions chargees avec succes:', response.data);
        setPermissions(response.data);
      } catch (error: any) {
        console.error('Erreur chargement permissions:', error);
        console.error('Details:', error.response?.data || error.message);

        if (error.response?.status === 401 || error.response?.status === 403) {
          clearCurrentUser();
          window.location.replace('/login');
        }
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, []);

  const hasPermission = (permissionCode: string): boolean => {
    if (!permissions) return false;
    const perm = permissions.permissions.find((p) => p.code === permissionCode);
    return perm?.granted || false;
  };

  return (
    <PermissionsContext.Provider value={{ permissions, hasPermission, loading }}>
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
