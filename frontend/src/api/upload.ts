import { api } from "./api";

export const uploadImageFile = async (file: File): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post("/upload/image", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};

export const uploadDocumentFile = async (file: File): Promise<{ url: string }> => {
  const formData = new FormData();
  formData.append("file", file);
  const response = await api.post("/upload/document", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return response.data;
};
