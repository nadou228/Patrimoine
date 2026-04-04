import { api } from './api';

export const uploadDocument = async (file: File, bienId: number, type: string) => {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('type', type);
  
  try {
    const response = await api.post(`/biens/${bienId}/documents`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  } catch (error) {
    console.error('Erreur upload document:', error);
    throw error;
  }
};
