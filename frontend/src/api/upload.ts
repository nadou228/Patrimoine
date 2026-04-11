import { api } from './api';

export const uploadImageFile = async (file: File): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post('/upload/image', formData);
  return response.data;
};

export const uploadDocumentFile = async (file: File): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append('file', file);
  // On utilise le même endpoint car le backend FileStorageService est générique
  const response = await api.post('/upload/image?folder=documents', formData);
  return response.data;
};
