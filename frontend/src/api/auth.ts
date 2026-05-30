import axios from 'axios';
import { resolveApiUrl } from './config';

const api = axios.create({
  baseURL: resolveApiUrl('/api'),
});

export interface LoginResponse {
  id: number;
  username: string;
  nom: string;
  role: string;
  token: string;
  /** Permissions effectives (aligné sur le claim JWT `permissions`). */
  permissions?: string[];
}

interface JwtPayload {
  exp?: number;
  role?: string;
  permissions?: string[];
}

export const decodeJwtPayload = (token: string): JwtPayload | null => {
  try {
    const [, payload] = token.split('.');
    if (!payload) return null;

    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const decoded = atob(normalized.padEnd(normalized.length + ((4 - normalized.length % 4) % 4), '='));
    return JSON.parse(decoded) as JwtPayload;
  } catch {
    return null;
  }
};

export const clearCurrentUser = () => {
  localStorage.removeItem('user');
};

export const isTokenExpired = (token?: string): boolean => {
  if (!token) return true;

  const payload = decodeJwtPayload(token);
  if (!payload?.exp) {
    return false;
  }

  return payload.exp * 1000 <= Date.now();
};

export interface TwoFactorRequiredResponse {
  requiresTwoFactor: true;
  tempToken: string;
}

export const login = async (username: string, password: string): Promise<LoginResponse | TwoFactorRequiredResponse> => {
  try {
    const response = await api.post('/auth/login', { username, password });
    const data = response.data;
    // Si 2FA requise, ne pas stocker en localStorage — le LoginPage gère l'étape 2
    if (data?.requiresTwoFactor) {
      return data as TwoFactorRequiredResponse;
    }
    localStorage.setItem('user', JSON.stringify(data));
    return data as LoginResponse;
  } catch (error) {
    throw new Error('Invalid credentials');
  }
};


export const logout = () => {
  clearCurrentUser();
};

/** Repli si le backend est momentanément indisponible (permissions du JWT / login). */
export const buildPermissionsFallback = (user: LoginResponse): {
  role: string;
  permissions: { code: string; description: string; granted: boolean }[];
} | null => {
  const payload = decodeJwtPayload(user.token);
  const codes =
    (Array.isArray(payload?.permissions) ? payload.permissions : user.permissions) ?? [];
  const role = payload?.role ?? user.role ?? 'GUEST';
  if (codes.length === 0) {
    return null;
  }
  return {
    role,
    permissions: codes.map((code) => ({
      code,
      description: code,
      granted: true,
    })),
  };
};

export const getCurrentUser = (): LoginResponse | null => {
  const rawUser = localStorage.getItem('user');
  if (!rawUser) return null;

  try {
    const user = JSON.parse(rawUser) as LoginResponse;
    if (!user.token || isTokenExpired(user.token)) {
      clearCurrentUser();
      return null;
    }

    return user;
  } catch {
    clearCurrentUser();
    return null;
  }
};
