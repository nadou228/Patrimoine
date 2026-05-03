import React, { useState } from 'react';
import { uploadDocumentFile } from '../api/upload';

interface FileUploadProps {
  onUploadSuccess: (url: string) => void;
  label?: string;
  accept?: string;
}

export default function FileUpload({ onUploadSuccess, label = "📄 Attacher un document", accept = ".pdf,.doc,.docx,.xls,.xlsx" }: FileUploadProps) {
  const [state, setState] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [fileName, setFileName] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validation côté client immédiate
    const maxSize = 20 * 1024 * 1024; // 20MB
    if (file.size > maxSize) {
      setState('error');
      setErrorMsg(`Fichier trop volumineux (${(file.size/1024/1024).toFixed(1)} MB). Maximum : 20 MB.`);
      return;
    }

    setState('uploading');
    setFileName(file.name);
    setProgress(0);

    try {
      // Simulation de progression pour l'UX
      const progressInterval = setInterval(() => setProgress(p => Math.min(p + 15, 85)), 200);
      
      const data = await uploadDocumentFile(file);
      
      clearInterval(progressInterval);
      setProgress(100);
      
      if (data?.url) {
        setState('success');
        onUploadSuccess(data.url);
      } else {
        throw new Error('URL de retour manquante');
      }
    } catch (err: any) {
      setState('error');
      const backendErr = err?.response?.data;
      if (backendErr?.conseil) {
        setErrorMsg(`${backendErr.error} — ${backendErr.conseil}`);
      } else if (err?.response?.status === 415) {
        setErrorMsg(`Type de fichier non accepté. Utilisez PDF, DOC, DOCX, XLS ou XLSX.`);
      } else if (err?.response?.status === 413) {
        setErrorMsg(`Fichier trop volumineux (limite : 20 MB).`);
      } else if (err?.request && !err?.response) {
        setErrorMsg(`Serveur PATRIS injoignable. Vérifiez que le backend tourne sur http://localhost:8082.`);
      } else {
        setErrorMsg(`Erreur inattendue : ${err?.message || 'connexion impossible'}`);
      }
    }
  };

  return (
    <div className="file-upload-zone">
      <label className={`file-upload-label state-${state}`}>
        <input type="file" hidden accept={accept} onChange={handleFileChange} disabled={state === 'uploading'} />
        <div className="file-upload-content">
          <span>{state === 'uploading' ? `Chargement ${fileName || ''}` : label}</span>
          <small>
            {state === 'uploading'
              ? `Progression ${progress}%`
              : fileName
              ? `Fichier prêt : ${fileName}`
              : `PDF, DOC, DOCX, XLS, XLSX`}
          </small>
        </div>
      </label>

      {state === 'uploading' && (
        <div className="upload-progress-bar">
          <div className="upload-progress-fill" style={{ width: `${progress}%` }} />
        </div>
      )}

      {state === 'error' && errorMsg && (
        <div className="upload-error-inline">
          <span>⚠ {errorMsg}</span>
          <button type="button" onClick={() => setState('idle')}>Réessayer</button>
        </div>
      )}

      {state === 'success' && fileName && (
        <div className="upload-success-inline">
          ✓ {fileName} enregistré
        </div>
      )}
    </div>
  );
}
