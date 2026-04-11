import React, { useState } from 'react';
import { uploadDocumentFile } from '../api/upload';

interface FileUploadProps {
  onUploadSuccess: (url: string) => void;
  label?: string;
  accept?: string;
}

export default function FileUpload({ onUploadSuccess, label = "📄 Attacher un document (PDF, DOC)", accept = ".pdf,.doc,.docx" }: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [lastFile, setLastFile] = useState<string | null>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const data = await uploadDocumentFile(file);
      if (data && data.url) {
        setLastFile(file.name);
        onUploadSuccess(data.url);
      }
    } catch (error) {
      console.error('Erreur upload:', error);
      alert("Erreur lors de l'envoi du document.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="file-upload-modern" style={{ marginBottom: '15px' }}>
      <label className="btn-export" style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '10px', 
          cursor: isUploading ? 'wait' : 'pointer',
          padding: '12px 20px',
          background: 'rgba(99, 102, 241, 0.05)',
          border: '1px dashed var(--primary)',
          borderRadius: '12px',
          fontSize: '13px'
      }}>
        <span>{isUploading ? "⏳ Upload en cours..." : label}</span>
        {lastFile && <span className="status-pill status-neuf" style={{ fontSize: '10px' }}>✓ {lastFile}</span>}
        <input type="file" hidden accept={accept} onChange={handleFileChange} disabled={isUploading} />
      </label>
    </div>
  );
}
