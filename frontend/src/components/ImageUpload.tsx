import React, { useEffect, useState } from "react";
import { uploadImageFile } from "../api/upload";
import { useToast } from "../contexts/ToastContext";

interface ImageUploadProps {
  value: string;
  onChange: (url: string) => void;
  className?: string;
  label?: string;
}

import { API_BASE_URL } from "../api/config";

export default function ImageUpload({ value, onChange, className, label = "Cliquer pour ajouter une photo" }: ImageUploadProps) {
  const { showToast } = useToast();

  const formatInitialValue = (val: string) => {
    if (!val) return "";
    if (val.startsWith("blob:") || val.startsWith("http")) return val;
    return `${API_BASE_URL}${val.startsWith("/") ? "" : "/"}${val}`;
  };

  const [preview, setPreview] = useState<string>(formatInitialValue(value));
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    if (value && !value.startsWith("blob:")) {
      setPreview(value.startsWith("http") ? value : `${API_BASE_URL}${value.startsWith("/") ? "" : "/"}${value}`);
    } else if (!value) {
      setPreview("");
    }
  }, [value]);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    setPreview(objectUrl);
    setIsUploading(true);

    try {
      const data = await uploadImageFile(file);
      if (data && data.url) {
        onChange(data.url);
        showToast({ type: "success", title: "Photo enregistree" });
      }
    } catch (error: unknown) {
      console.error("Erreur lors de l'upload de l'image:", error);
      showToast({
        type: "error",
        title: "Upload image impossible",
        message: "Verifiez que le backend Spring Boot et le service d'upload sont bien disponibles.",
      });
      setPreview(value ? (value.startsWith("http") ? value : `${API_BASE_URL}${value.startsWith("/") ? "" : "/"}${value}`) : "");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className={`image-upload-container ${className || ""}`} style={{ width: "100%" }}>
      <label
        className="btn-export"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          cursor: isUploading ? "wait" : "pointer",
          textAlign: "center",
          width: "100%",
          minHeight: "120px",
          padding: "10px",
          border: "2px dashed var(--primary)",
          background: "rgba(99, 102, 241, 0.05)",
          overflow: "hidden",
          position: "relative",
        }}
      >
        {preview ? (
          <img
            src={preview}
            alt="Apercu"
            style={{ width: "100%", height: "100%", objectFit: "cover", position: "absolute", top: 0, left: 0, opacity: isUploading ? 0.5 : 1 }}
          />
        ) : (
          <span style={{ opacity: 0.7 }}>{label}</span>
        )}

        {isUploading ? (
          <div style={{ position: "absolute", zIndex: 10, background: "rgba(0,0,0,0.6)", padding: "5px 15px", borderRadius: "20px", color: "white", fontSize: "12px", fontWeight: "bold" }}>
            Upload en cours...
          </div>
        ) : null}

        {!preview && !isUploading ? (
          <div style={{ fontSize: "11px", opacity: 0.5, marginTop: "8px" }}>
            JPG, PNG (max 5MB)
          </div>
        ) : null}

        {preview && !isUploading ? (
          <div style={{ position: "absolute", bottom: "5px", right: "5px", background: "rgba(0,0,0,0.6)", padding: "5px 15px", borderRadius: "20px", color: "white", fontSize: "12px", fontWeight: "bold" }}>
            Modifier
          </div>
        ) : null}

        <input type="file" accept=".png,.jpg,.jpeg" hidden disabled={isUploading} onChange={handleFileChange} />
      </label>
    </div>
  );
}
