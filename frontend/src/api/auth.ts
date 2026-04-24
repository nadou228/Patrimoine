import axios from 'axios';

const api = axios.create({
  baseURL: 'http://localhost:8082/api',
});

export interface LoginResponse {
  id: number;
  username: string;
  nom: string;
  role: string;
  token: string;
}

interface JwtPayload {
  exp?: number;
}

const decodeJwtPayload = (token: string): JwtPayload | null => {
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

export const login = async (username: string, password: string): Promise<LoginResponse> => {
  try {
    const response = await api.post('/auth/login', { username, password });
    const user = response.data;
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  } catch (error) {
    throw new Error('Invalid credentials');
  }
};

export const logout = () => {
  clearCurrentUser();
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
