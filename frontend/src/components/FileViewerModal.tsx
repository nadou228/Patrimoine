import React, { useEffect, useMemo, useState } from "react";
import { read, utils } from "xlsx";

interface Props {
  url: string;
  filename: string;
  type: "image" | "pdf" | "excel" | "unknown";
  onClose: () => void;
}

const detectMimeLabel = (type: Props["type"]) => {
  switch (type) {
    case "image":
      return "Image";
    case "pdf":
      return "PDF";
    case "excel":
      return "Excel";
    default:
      return "Fichier";
  }
};

const FileViewerModal: React.FC<Props> = ({ url, filename, type, onClose }) => {
  const [zoom, setZoom] = useState(1);
  const [excelRows, setExcelRows] = useState<string[][]>([]);
  const [loadingExcel, setLoadingExcel] = useState(false);
  const [excelError, setExcelError] = useState<string | null>(null);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (type === "image" && event.key === "+") setZoom((previous) => Math.min(4, previous + 0.1));
      if (type === "image" && event.key === "-") setZoom((previous) => Math.max(0.5, previous - 0.1));
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose, type]);

  useEffect(() => {
    if (type !== "excel") return;

    const loadExcel = async () => {
      try {
        setLoadingExcel(true);
        setExcelError(null);
        const response = await fetch(url);
        if (!response.ok) throw new Error("Lecture du fichier impossible");
        const buffer = await response.arrayBuffer();
        const workbook = read(buffer, { type: "array" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const sheetRows = utils.sheet_to_json<string[]>(firstSheet, { header: 1, raw: false });
        setExcelRows(sheetRows.map((row) => row.map((cell) => String(cell ?? ""))));
      } catch (error) {
        setExcelRows([]);
        setExcelError(error instanceof Error ? error.message : "Lecture impossible");
      } finally {
        setLoadingExcel(false);
      }
    };

    void loadExcel();
  }, [type, url]);

  useEffect(() => {
    if (type !== "image") return;

    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      setZoom((previous) => Math.min(4, Math.max(0.5, previous + (event.deltaY > 0 ? -0.1 : 0.1))));
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    return () => window.removeEventListener("wheel", onWheel);
  }, [type]);

  const content = useMemo(() => {
    if (type === "image") {
      return (
        <div className="file-viewer-stage image">
          <img src={url} alt={filename} style={{ transform: `scale(${zoom})` }} />
        </div>
      );
    }

    if (type === "pdf") {
      return (
        <div className="file-viewer-stage pdf">
          <iframe src={url} title={filename} />
          <a className="file-viewer-overlay-download btn-export" href={url} download={filename}>
            Telecharger
          </a>
        </div>
      );
    }

    if (type === "excel") {
      return (
        <div className="file-viewer-stage excel">
          {loadingExcel ? (
            <div className="empty-state-modern skeleton-block">Lecture du classeur...</div>
          ) : excelError ? (
            <div className="empty-search-state">
              <strong>Previsualisation impossible</strong>
              <p>{excelError}</p>
            </div>
          ) : (
            <div className="excel-preview-table">
              <table>
                <tbody>
                  {excelRows.map((row, rowIndex) => (
                    <tr key={`${filename}-${rowIndex}`}>
                      {row.map((cell, cellIndex) => (
                        <td key={`${rowIndex}-${cellIndex}`}>{cell}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }

    return (
      <div className="file-viewer-stage unknown">
        <div className="empty-search-state">
          <strong>Ce fichier n'est pas previsualisable dans l'application.</strong>
          <p>Utilisez le bouton de telechargement pour l'ouvrir dans votre outil habituel.</p>
        </div>
      </div>
    );
  }, [excelError, excelRows, filename, loadingExcel, type, url, zoom]);

  return (
    <div className="file-viewer-overlay" onClick={onClose} role="dialog" aria-modal="true" aria-label={filename}>
      <div className="file-viewer-modal" onClick={(event) => event.stopPropagation()}>
        <div className="file-viewer-toolbar">
          <div>
            <strong>{filename}</strong>
            <span>{detectMimeLabel(type)}</span>
          </div>
          <div className="file-viewer-actions">
            {type === "image" && (
              <>
                <button
                  type="button"
                  className="btn-export"
                  onClick={() => setZoom((previous) => Math.max(0.5, previous - 0.1))}
                  aria-label="Reduire le zoom"
                >
                  Zoom -
                </button>
                <button
                  type="button"
                  className="btn-export"
                  onClick={() => setZoom((previous) => Math.min(4, previous + 0.1))}
                  aria-label="Augmenter le zoom"
                >
                  Zoom +
                </button>
              </>
            )}
            <a className="btn-export" href={url} download={filename}>
              Telecharger
            </a>
            <button
              type="button"
              className="btn-export"
              onClick={() => window.open(url, "_blank", "noopener,noreferrer")}
              aria-label="Ouvrir en plein ecran"
            >
              Plein ecran
            </button>
            <button type="button" className="btn-export" onClick={onClose} aria-label="Fermer la previsualisation">
              X
            </button>
          </div>
        </div>
        {content}
      </div>
    </div>
  );
};

export default FileViewerModal;
