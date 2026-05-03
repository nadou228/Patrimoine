import React, { useEffect, useMemo, useState } from "react";
import { Bien, searchBiens } from "../api/biens";
import { API_BASE_URL } from "../api/api";

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
  placeholder = "Rechercher par IUP, designation ou service",
}: BienSelectorProps) {
  const [query, setQuery] = useState(value?.iup || "");
  const [results, setResults] = useState<Bien[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const trimmed = query.trim();
    if (trimmed.length < 2) {
      setResults([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      try {
        setLoading(true);
        const data = await searchBiens(trimmed, archived);
        setResults(data);
        setOpen(true);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => window.clearTimeout(timer);
  }, [archived, query]);

  const selectedLabel = useMemo(() => {
    if (!value) return "";
    return `${value.iup || "Sans IUP"} - ${value.designation}`;
  }, [value]);

  return (
    <div className="bien-selector">
      <input
        disabled={disabled}
        value={open ? query : selectedLabel || query}
        placeholder={placeholder}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          onChange(null);
        }}
      />
      {loading ? <span className="bien-selector-loading">Recherche...</span> : null}
      {open && results.length > 0 ? (
        <div className="bien-selector-menu">
          {results.map((bien) => (
            <button
              key={bien.id || bien.iup}
              type="button"
              onClick={() => {
                onChange(bien);
                setQuery(bien.iup || bien.designation);
                setOpen(false);
              }}
            >
              {bien.photoUrl ? <img src={normalizePhotoUrl(bien.photoUrl)} alt="" /> : <span className="bien-thumb-empty" />}
              <span>
                <strong>{bien.iup || "Sans IUP"}</strong>
                <small>{bien.designation}</small>
              </span>
              <em>{bien.statutOperationnel || bien.etat || "ACTIF"}</em>
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
