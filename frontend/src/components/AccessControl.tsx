import React from 'react';
import { usePermissions } from '../contexts/PermissionsContext';

interface CanAccessProps {
  permission: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
  disabled?: boolean;
}

/**
 * Composant de contrôle d'accès basé sur les permissions
 * @param permission - Code de la permission à vérifier
 * @param children - Contenu affiché si autorisé
 * @param fallback - Contenu affiché si non autorisé
 * @param disabled - Force l'état désactivé
 */
export const CanAccess: React.FC<CanAccessProps> = ({ 
  permission, 
  children, 
  fallback = null,
  disabled = false 
}) => {
  const { hasPermission } = usePermissions();
  
  if (disabled || !hasPermission(permission)) {
    return fallback as React.ReactElement || null;
  }
  
  return children as React.ReactElement;
};

/**
 * Hook pour obtenir la liste des permissions d'un module
 */
export const useCanAccess = (permission: string): boolean => {
  const { hasPermission } = usePermissions();
  return hasPermission(permission);
};

/**
 * Wrapper pour les boutons avec désactivation automatique
 */
interface AccessibleButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  permission: string;
  title?: string;
}

export const AccessibleButton: React.FC<AccessibleButtonProps> = ({ 
  permission, 
  title,
  children,
  className,
  ...props 
}) => {
  const { hasPermission } = usePermissions();
  const hasAccess = hasPermission(permission);

  return (
    <button
      {...props}
      disabled={!hasAccess || props.disabled}
      className={`${className} ${!hasAccess ? 'disabled-button' : ''}`}
      title={!hasAccess ? `Vous n'avez pas les droits pour : ${title || permission}` : title}
      style={{
        opacity: hasAccess ? 1 : 0.5,
        cursor: hasAccess ? 'pointer' : 'not-allowed',
        ...props.style
      }}
    >
      {children}
    </button>
  );
};
