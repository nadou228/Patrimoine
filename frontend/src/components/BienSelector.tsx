import React, { useEffect, useMemo, useState, useRef } from "react";
import { Bien, getBiens } from "../api/biens";
import { API_BASE_URL } from "../api/api";
import { Search, ChevronDown, Package, Image as ImageIcon, CheckCircle2 } from "lucide-react";

type BienSelectorProps = {
  value: Bien | null;
  onChange: (bien: Bien | null) => void;
  disabled?: boolean;
  archived?: boolean;
  placeholder?: string;
};

const normalizePhotoUrl = (url?: string) => {
  if (!url) return "";
  return url.startsWith("http") ? url : `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

export default function BienSelector({
  value,
  onChange,
  disabled = false,
  archived = false,
  placeholder = "Sélectionner un bien...",
}: BienSelectorProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [biens, setBiens] = useState<Bien[]>([]);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && biens.length === 0) {
      setLoading(true);
      getBiens(archived).then(data => {
        setBiens(data);
        setLoading(false);
      }).catch(() => setLoading(false));
    }
  }, [open, archived, biens.length]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const filteredBiens = useMemo(() => {
    if (!query) return biens;
    const lower = query.toLowerCase();
    return biens.filter(b => 
      (b.iup || "").toLowerCase().includes(lower) || 
      (b.designation || "").toLowerCase().includes(lower) ||
      (b.service || "").toLowerCase().includes(lower)
    );
  }, [biens, query]);

  const selectedLabel = value ? `${value.iup || "Sans IUP"} - ${value.designation}` : "";

  return (
    <>
      <style>{`
        .bien-selector-premium {
          position: relative;
          width: 100%;
          font-family: inherit;
        }
        .selector-trigger {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          background: var(--background, #ffffff);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s ease;
          min-height: 48px;
        }
        .selector-trigger:hover {
          border-color: var(--primary, #3b82f6);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.05);
        }
        .selector-trigger.active {
          border-color: var(--primary, #3b82f6);
          box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        .selector-trigger.disabled {
          opacity: 0.6;
          pointer-events: none;
          background: #f8fafc;
        }
        .selected-item-badge {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--text, #1e293b);
          font-weight: 500;
          font-size: 0.95rem;
        }
        .selected-item-badge svg {
          color: var(--primary, #3b82f6);
        }
        .placeholder-text {
          color: var(--text-muted, #64748b);
          font-size: 0.95rem;
        }
        .chevron-icon {
          color: var(--text-muted, #64748b);
          transition: transform 0.3s ease;
        }
        .chevron-icon.rotated {
          transform: rotate(180deg);
        }
        .selector-dropdown-menu {
          position: absolute;
          top: calc(100% + 8px);
          left: 0;
          width: 100%;
          background: var(--card, #ffffff);
          border: 1px solid var(--border, #e2e8f0);
          border-radius: 12px;
          box-shadow: 0 10px 40px rgba(0,0,0,0.1);
          z-index: 1000;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .selector-search-box {
          display: flex;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid var(--border, #e2e8f0);
          background: var(--background, #f8fafc);
          gap: 10px;
        }
        .selector-search-box input {
          flex: 1;
          border: none;
          background: transparent;
          outline: none;
          font-size: 0.95rem;
          color: var(--text, #1e293b);
        }
        .selector-search-box .search-icon {
          color: var(--text-muted, #64748b);
        }
        .selector-results {
          max-height: 350px;
          overflow-y: auto;
          padding: 8px;
        }
        .selector-option {
          display: flex;
          gap: 14px;
          padding: 12px;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s ease;
          align-items: center;
        }
        .selector-option:hover {
          background: var(--background, #f1f5f9);
        }
        .selector-option.selected {
          background: rgba(59, 130, 246, 0.05);
          border: 1px solid rgba(59, 130, 246, 0.2);
        }
        .option-image {
          width: 48px;
          height: 48px;
          border-radius: 8px;
          overflow: hidden;
          flex-shrink: 0;
          background: var(--border, #e2e8f0);
          display: flex;
          align-items: center;
          justify-content: center;
          color: var(--text-muted, #64748b);
        }
        .option-image img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .option-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 4px;
        }
        .option-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 0.95rem;
          color: var(--text, #1e293b);
        }
        .option-title {
          font-size: 0.85rem;
          color: var(--text-muted, #64748b);
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 90%;
        }
        .option-meta {
          display: flex;
          gap: 8px;
          align-items: center;
          font-size: 0.75rem;
        }
        .meta-text {
          color: var(--text-muted, #64748b);
        }
        .selector-loading, .selector-empty {
          padding: 32px 24px;
          text-align: center;
          color: var(--text-muted, #64748b);
          font-size: 0.95rem;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
        }
      `}</style>

      <div className="bien-selector-premium" ref={containerRef}>
        <div 
          className={`selector-trigger ${disabled ? "disabled" : ""} ${open ? "active" : ""}`}
          onClick={() => !disabled && setOpen(!open)}
        >
          <div className="selector-value">
            {value ? (
              <div className="selected-item-badge">
                <Package size={18} />
                <span>{selectedLabel}</span>
              </div>
            ) : (
              <span className="placeholder-text">{placeholder}</span>
            )}
          </div>
          <ChevronDown size={18} className={`chevron-icon ${open ? "rotated" : ""}`} />
        </div>

        {open && (
          <div className="selector-dropdown-menu fade-in">
            <div className="selector-search-box">
              <Search size={16} className="search-icon" />
              <input 
                autoFocus
                placeholder="Rechercher par IUP, désignation, service..."
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            
            <div className="selector-results">
              {loading ? (
                <div className="selector-loading">
                  <span>Chargement du catalogue des biens...</span>
                </div>
              ) : filteredBiens.length > 0 ? (
                filteredBiens.map(bien => {
                  const isSelected = value?.id === bien.id;
                  return (
                    <div 
                      key={bien.id || bien.iup} 
                      className={`selector-option ${isSelected ? "selected" : ""}`}
                      onClick={() => {
                        onChange(bien);
                        setOpen(false);
                        setQuery("");
                      }}
                    >
                      <div className="option-image">
                        {bien.photoUrl ? (
                          <img src={normalizePhotoUrl(bien.photoUrl)} alt="Bien" />
                        ) : (
                          <ImageIcon size={20} />
                        )}
                      </div>
                      <div className="option-content">
                        <div className="option-header">
                          <strong>{bien.iup || "Sans IUP"}</strong>
                          {isSelected && <CheckCircle2 size={16} className="text-success" />}
                        </div>
                        <span className="option-title">{bien.designation}</span>
                        <div className="option-meta">
                          {bien.categorie && <span className="badge-outline">{bien.categorie}</span>}
                          {bien.etat && <span className="meta-text">{bien.etat}</span>}
                          {bien.service && <span className="meta-text">• {bien.service}</span>}
                        </div>
                      </div>
                    </div>
                  )
                })
              ) : (
                <div className="selector-empty">
                  <Package size={32} style={{ opacity: 0.5 }} />
                  <span>Aucun bien ne correspond à "{query}".</span>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
