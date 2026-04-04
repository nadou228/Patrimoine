import React, { createContext, useContext, useEffect, useState } from 'react';
import axios from 'axios';

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
        const userStr = localStorage.getItem('user');
        if (!userStr) {
          console.warn('Pas d\'utilisateur trouvé dans localStorage');
          setLoading(false);
          return;
        }
        
        const user = JSON.parse(userStr);
        const token = user?.token;
        if (!token) {
          console.warn('Pas de token trouvé pour l\'utilisateur:', user);
          setLoading(false);
          return;
        }

        console.log('Chargement des permissions pour l\'utilisateur:', user.nom, 'avec le rôle:', user.role);
        
        const response = await axios.get('http://localhost:8082/api/permissions/my-permissions', {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        console.log('Permissions chargées avec succès:', response.data);
        setPermissions(response.data);
        
      } catch (error: any) {
        console.error('Erreur chargement permissions:', error);
        console.error('Détails:', error.response?.data || error.message);
      } finally {
        setLoading(false);
      }
    };

    fetchPermissions();
  }, []);

  const hasPermission = (permissionCode: string): boolean => {
    if (!permissions) return false;
    const perm = permissions.permissions.find(p => p.code === permissionCode);
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
    throw new Error('usePermissions doit être utilisé avec PermissionsProvider');
  }
  return context;
};
