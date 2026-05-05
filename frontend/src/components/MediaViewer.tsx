import React, { useState } from "react";
import { createPortal } from "react-dom";
import { X, ZoomIn, ZoomOut, Download, Trash2, FileText, DownloadCloud } from "lucide-react";
import "./MediaViewer.css";

export type MediaType = "image" | "pdf";

interface MediaViewerProps {
  url: string;
  type: MediaType;
  filename?: string;
  onClose: () => void;
  onDelete?: () => void;
}

export default function MediaViewer({ url, type, filename, onClose, onDelete }: MediaViewerProps) {
  const [scale, setScale] = useState(1);

  const zoomIn = () => setScale((s) => Math.min(s + 0.25, 3));
  const zoomOut = () => setScale((s) => Math.max(s - 0.25, 0.5));
  
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = url;
    link.download = filename || "document";
    link.target = "_blank";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const content = (
    <div className="media-viewer-overlay fade-in">
      <div className="media-viewer-header">
        <div className="media-info">
          {type === "pdf" ? <FileText size={24} /> : <span className="badge-pill-glow">Photo</span>}
          <span className="media-filename">{filename || (type === "pdf" ? "Document PDF" : "Aperçu de l'image")}</span>
        </div>
        <div className="media-actions">
          {type === "image" && (
            <>
              <button type="button" className="action-btn" onClick={zoomOut} title="Dézoomer"><ZoomOut size={20} /></button>
              <button type="button" className="action-btn" onClick={zoomIn} title="Zoomer"><ZoomIn size={20} /></button>
              <span className="zoom-level">{Math.round(scale * 100)}%</span>
            </>
          )}
          <button type="button" className="action-btn" onClick={handleDownload} title="Télécharger"><DownloadCloud size={20} /></button>
          {onDelete && (
            <button type="button" className="action-btn danger" onClick={onDelete} title="Supprimer">
              <Trash2 size={20} />
            </button>
          )}
          <div className="action-divider" />
          <button type="button" className="action-btn close-btn" onClick={onClose} title="Fermer"><X size={24} /></button>
        </div>
      </div>

      <div className="media-viewer-content">
        {type === "image" ? (
          <div className="image-container">
            <img 
              src={url} 
              alt={filename || "Aperçu"} 
              style={{ transform: `scale(${scale})`, transition: "transform 0.2s ease-out" }} 
              className="media-image"
            />
          </div>
        ) : (
          <div className="pdf-container">
            <iframe src={url} title={filename || "Document PDF"} className="pdf-iframe" />
          </div>
        )}
      </div>
    </div>
  );

  return createPortal(content, document.body);
}
