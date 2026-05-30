import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  Download,
  BookOpen, ClipboardList, TrendingUp,
  ShieldCheck, Printer,
  FileSpreadsheet, Layers
} from "lucide-react";
import { api, getSystemSettings } from "../api/api";
import { useToast } from "../contexts/ToastContext";

type DocCategory = 'ENTREES' | 'JOURNAUX' | 'INVENTAIRES' | 'BILANS' | 'TECHNIQUE';

interface DocSpec {
  id: string;
  code: string;
  label: string;
  category: DocCategory;
  description: string;
  icon: React.ReactNode;
}

const DOCUMENT_CATALOG: DocSpec[] = [
  { id: '1', code: 'OEM', label: "Ordre d'Entrée des Matières", category: 'ENTREES', description: "Enregistrement officiel des entrées en stock et patrimoine.", icon: <FileSpreadsheet className="text-blue-500" /> },
  { id: '2', code: 'LJ-A', label: "Livre Journal Immobilisations", category: 'JOURNAUX', description: "Journal chronologique des mouvements d'actifs.", icon: <BookOpen className="text-indigo-500" /> },
  { id: '4', code: 'GL-A', label: "Grand Livre Immobilisations", category: 'JOURNAUX', description: "Détail des mouvements par compte matière.", icon: <Layers className="text-purple-500" /> },
  { id: '15', code: 'FIA', label: "Fiche d'Inventaire Annuel", category: 'INVENTAIRES', description: "Comparaison stock physique vs stock écritures.", icon: <ClipboardList className="text-emerald-500" /> },
  { id: '18', code: 'FIB', label: "Fiche Matricule Bâtiments", category: 'TECHNIQUE', description: "Identité complète et historique des immeubles.", icon: <Printer className="text-amber-500" /> },
  { id: '8', code: 'BGC', label: "Balance Générale des Comptes", category: 'BILANS', description: "Synthèse comptable de l'ensemble du patrimoine.", icon: <TrendingUp className="text-rose-500" /> },
];

const ReportsPage: React.FC = () => {
  const { showToast } = useToast();
  const [loadingDoc, setLoadingDoc] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    exercice: "2024",
    institution: "MINISTERE DE L'ECONOMIE ET DES FINANCES",
    poste: "CENTRAL DE LAME"
  });

  useEffect(() => {
    getSystemSettings()
      .then((settings) => {
        setFilters({
          exercice: settings.EXPORT_EXERCICE || "2024",
          institution: settings.EXPORT_INSTITUTION || "MINISTERE DE L'ECONOMIE ET DES FINANCES",
          poste: settings.EXPORT_POSTE || "CENTRAL DE LAME"
        });
      })
      .catch(() => undefined);
  }, []);

  const handleDownload = async (docCode: string) => {
    setLoadingDoc(docCode);
    try {
      const response = await api.get(`/export/excel/${docCode.toLowerCase()}`, {
        params: filters,
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${docCode}_PATRIMOINE_${filters.exercice}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      showToast({ type: "success", title: "Document généré avec succès" });
    } catch (error) {
      console.error(error);
      showToast({ type: "error", title: "Erreur lors de la génération du document" });
    } finally {
      setLoadingDoc(null);
    }
  };

  return (
    <div className="reports-module fade-in">
      {/* --- HEADER --- */}
      <header className="page-header-premium-light">
        <div className="header-meta">
          <div className="badge-pill-glow-light">
            <ShieldCheck size={14} />
            <span>NORMES SYSCOHADA / UEMOA CERTIFIÉES</span>
          </div>
          <h1 className="text-deep-indigo">Annexes & États Comptables</h1>
          <p className="card-subtitle">Génération des documents officiels de gestion des matières du Togo.</p>
        </div>
      </header>

      <div className="reports-layout compact">
        {/* --- MAIN CATALOG --- */}
        <main className="reports-catalog">
          <div className="catalog-grid">
            {DOCUMENT_CATALOG.map((doc, idx) => (
              <motion.div
                key={doc.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="doc-card-premium"
              >
                <div className="doc-card-body">
                  <div className="doc-icon-aura">
                    {doc.icon}
                  </div>
                  <div className="doc-info">
                    <div className="doc-code-badge">{doc.code}</div>
                    <h3>{doc.label}</h3>
                    <p>{doc.description}</p>
                  </div>
                </div>
                <div className="doc-card-footer">
                  <button 
                    className={`btn-export-premium ${loadingDoc === doc.code ? 'loading' : ''}`}
                    onClick={() => handleDownload(doc.code)}
                    disabled={loadingDoc !== null}
                  >
                    {loadingDoc === doc.code ? (
                      <div className="mini-spinner" />
                    ) : (
                      <Download size={16} />
                    )}
                    <span>{loadingDoc === doc.code ? 'Génération...' : 'Exporter Excel'}</span>
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        </main>
      </div>

      <style>{`
        .reports-module { padding: 40px; }
        .reports-layout { display: grid; grid-template-columns: 320px 1fr; gap: 32px; margin-top: 30px; }
        .reports-layout.compact { display: block; }
        
        .reports-sidebar-glass {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          padding: 24px;
          height: fit-content;
          position: sticky;
          top: 40px;
        }

        .sidebar-section { display: flex; flex-direction: column; gap: 20px; }
        .section-title { display: flex; align-items: center; gap: 10px; font-weight: 800; color: #0f172a; border-bottom: 1px solid #f1f5f9; padding-bottom: 12px; }
        
        .filter-group { display: flex; flex-direction: column; gap: 8px; }
        .filter-group label { font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; }
        
        .premium-input, .premium-select, .premium-textarea {
          width: 100%;
          background: #f8fafc;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          padding: 10px 15px;
          font-size: 14px;
          color: #1e293b;
          transition: all 0.2s;
        }
        .premium-input:focus { border-color: #4f46e5; background: white; outline: none; }

        .catalog-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 24px; }
        
        .doc-card-premium {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          overflow: hidden;
          transition: all 0.3s;
          display: flex;
          flex-direction: column;
        }
        .doc-card-premium:hover { transform: translateY(-5px); box-shadow: 0 20px 25px -5px rgba(0,0,0,0.05); }
        
        .doc-card-body { padding: 24px; display: flex; gap: 20px; flex: 1; }
        .doc-icon-aura { 
          width: 50px; height: 50px; background: #f8fafc; border-radius: 16px; 
          display: flex; align-items: center; justify-content: center; font-size: 24px;
          flex-shrink: 0;
        }
        
        .doc-info h3 { margin: 0; font-size: 15px; font-weight: 800; color: #0f172a; line-height: 1.2; }
        .doc-info p { font-size: 12px; color: #64748b; margin-top: 6px; line-height: 1.4; }
        
        .doc-code-badge { 
          display: inline-block; font-size: 10px; font-weight: 800; color: #4f46e5; 
          background: rgba(79, 70, 229, 0.05); padding: 2px 8px; border-radius: 6px;
          margin-bottom: 8px;
        }
        
        .doc-card-footer { padding: 16px 24px; background: #f8fafc; border-top: 1px solid #f1f5f9; }
        
        .btn-export-premium {
          width: 100%; display: flex; align-items: center; justify-content: center; gap: 10px;
          background: white; border: 1px solid #e2e8f0; padding: 10px; border-radius: 12px;
          font-weight: 700; color: #1e293b; cursor: pointer; transition: all 0.2s;
        }
        .btn-export-premium:hover { background: #4f46e5; color: white; border-color: #4f46e5; }
        
        .mini-spinner { width: 16px; height: 16px; border: 2px solid #e2e8f0; border-top-color: #4f46e5; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
      `}</style>
    </div>
  );
};

export default ReportsPage;
