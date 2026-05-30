import { api } from './api';

export type UserStatut = 'ACTIF' | 'SUSPENDU' | 'EN_ATTENTE';

export interface User {
  id: number;
  nom: string;
  prenom: string;
  fonction: string;
  username: string;
  email: string;
  telephone: string;
  role: Role;
  statut: UserStatut;
  matricule?: string;
  service?: string;
  derniereConnexion?: string;
  mustChangePassword?: boolean;
}

export interface Role {
  id: number;
  code: string;
  libelle: string;
  description: string;
  systemRole: boolean;
  actif?: boolean;
  permissions: Permission[];
}

/** Réponse GET /api/admin/roles */
export interface RoleWithUserCount {
  role: Role;
  nombreUtilisateurs: number;
}

export interface Permission {
  id: number;
  code: string;
  libelle: string;
}

export interface UserPermissionOverride {
  permissionCode: string;
  accordee: boolean;
  motif: string;
  accordeePar: string;
  dateAccord: string;
}

export interface UserPermissionsDetail {
  effectivePermissionCodes: string[];
  rolePermissionCodes: string[];
  directOverrides: UserPermissionOverride[];
}

export const getAdminUsers = async () => {
  const response = await api.get('/admin/users');
  return response.data;
};

export const createAdminUser = async (user: any) => {
  const response = await api.post('/admin/users', user);
  return response.data;
};

export const updateAdminUser = async (id: number, user: any) => {
  const response = await api.put(`/admin/users/${id}`, user);
  return response.data;
};

export const toggleUserActive = async (id: number): Promise<User> => {
  const response = await api.put(`/admin/users/${id}/toggle-active`);
  return response.data;
};

export const resetUserPassword = async (id: number, password: string) => {
  const response = await api.put(`/admin/users/${id}/reset-password`, { password });
  return response.data;
};

export const getAdminRoles = async () => {
  const response = await api.get('/admin/roles');
  return response.data;
};

export const getAllPermissions = async () => {
  const response = await api.get('/admin/permissions');
  return response.data;
};

export const updateRolePermissions = async (roleCode: string, permissionCodes: string[]) => {
  const response = await api.put(`/admin/roles/${roleCode}/permissions`, permissionCodes);
  return response.data;
};

export const createRole = async (role: any) => {
  const response = await api.post('/admin/roles', role);
  return response.data;
};

export const updateRoleMeta = async (roleCode: string, data: { libelle: string, description: string }) => {
  const response = await api.put(`/admin/roles/${roleCode}`, data);
  return response.data;
};

export const deleteRole = async (roleCode: string) => {
  await api.delete(`/admin/roles/${roleCode}`);
};

export const getUserPermissionsDetail = async (userId: number): Promise<UserPermissionsDetail> => {
  const response = await api.get(`/admin/users/${userId}/permissions`);
  return response.data;
};

export const applyUserDirectPermission = async (
  userId: number,
  permission: string,
  accordee: boolean,
  motif: string
) => {
  await api.post(`/admin/users/${userId}/permissions`, { permission, accordee, motif });
};

export const deleteUserDirectPermission = async (userId: number, permission: string) => {
  await api.delete(`/admin/users/${userId}/permissions/${permission}`);
};
export interface EtiquetteDto {
  iup: string;
  designation: string;
  categorie: string;
  service: string;
  localisation: string;
  dateAcquisition: string;
  valeur: string;
  qrCodeBase64: string;
  logoMinistere: string;
}

export const getEtiquetteData = async (bienId: number): Promise<EtiquetteDto> => {
  const response = await api.get(`/biens/${bienId}/etiquette`);
  return response.data;
};
