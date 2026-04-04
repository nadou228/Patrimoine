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
  localStorage.removeItem('user');
};

export const getCurrentUser = (): LoginResponse | null => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};
