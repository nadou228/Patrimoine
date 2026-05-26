import React, { useEffect, useState, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ChevronRight, Search, Loader2, CheckCircle2, Sparkles, X } from "lucide-react";

export interface ArticleOption {
  code: string;
  intitule: string;
  compte_principal: string;
  libelle_compte: string;
  categorie: string;
  famille: string;
  type_bien: string;
  unite_defaut: string | null;
  partie: "A" | "B";
}

interface NomenclatureSelectorProps {
  partie?: "A" | "B";
  family?: string;
  onSelect: (article: ArticleOption) => void;
  disabled?: boolean;
  className?: string;
  /** Code article pour pré-remplir en mode édition */
  initialCode?: string;
  /** Libellé article pour affichage immédiat pendant la résolution */
  initialLabel?: string;
}

const API = "http://localhost:8082/api/v1";

async function fetchNom<T>(endpoint: string, params: Record<string, string> = {}): Promise<T[]> {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${API}/nomenclature/${endpoint}${qs ? `?${qs}` : ""}`, {
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${localStorage.getItem("token") ?? ""}` },
  });
  if (!res.ok) throw new Error(`API ${res.status}`);
  return ((await res.json()).data ?? []) as T[];
}

const DEFAULT_LEVELS = [
  { label: "Compte principal", color: "#7c3aed", bg: "rgba(124,58,237,0.08)" },
  { label: "Catégorie",        color: "#0284c7", bg: "rgba(2,132,199,0.08)" },
  { label: "Famille",          color: "#059669", bg: "rgba(5,150,105,0.08)" },
  { label: "Article",          color: "#d97706", bg: "rgba(217,119,6,0.08)" },
];

const FAMILY_ROOTS: Record<string, string[]> = {
  IMMOBILIER: ["22", "23"],
  MOBILIER: ["241"],
  INFORMATIQUE: ["242"],
  MATERIEL_ROULANT: ["243", "245"],
  MATERIEL_TECHNIQUE: ["244"],
  INCORPORELS: ["20", "21"],
  OEUVRES_COLLECTIONS: ["248"],
  CHEPTELS: ["247"],
};

const FAMILY_LABELS: Record<string, string[]> = {
  IMMOBILIER: ["Nature immobilière", "Usage du bâtiment", "Sous-type d'ouvrage", "Article"],
  MOBILIER: ["Type de mobilier", "Sous-catégorie", "Modèle standard", "Article"],
  INFORMATIQUE: ["Type de matériel", "Sous-système", "Gamme", "Article"],
  MATERIEL_ROULANT: ["Type de véhicule", "Usage", "Modèle", "Article"],
  MATERIEL_TECHNIQUE: ["Domaine technique", "Type d'outil", "Spécificité", "Article"],
  INCORPORELS: ["Nature incorporelle", "Type de droit", "Catégorie", "Article"],
  OEUVRES_COLLECTIONS: ["Type d'œuvre", "Collection", "Support", "Article"],
  CHEPTELS: ["Espèce", "Race / Usage", "Variété", "Article"],
};

interface DropProps {
  step: number;
  label: string;
  color: string;
  bg: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; meta?: string }[];
  disabled?: boolean;
  loading?: boolean;
}

function CascadeDropdown({ step, label, color, bg, value, onChange, options, disabled, loading }: DropProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    const h = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  return (
    <motion.div ref={ref} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
      transition={{ delay: (step - 1) * 0.06 }}
      style={{ position: "relative", opacity: disabled ? 0.45 : 1, pointerEvents: disabled ? "none" : "auto" }}>

      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
        <span style={{
          width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 11, fontWeight: 800, background: value ? color : "var(--glass-border)", color: value ? "#fff" : "var(--text-dim)",
        }}>
          {value ? <CheckCircle2 size={12} /> : step}
        </span>
        <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-dim)", textTransform: "uppercase", letterSpacing: 1 }}>
          {label}
        </span>
        {loading && <Loader2 size={12} className="animate-spin" style={{ color: color, marginLeft: "auto" }} />}
        {value && !loading && (
          <span style={{ marginLeft: "auto", fontSize: 11, fontWeight: 700, color: color,
            background: bg, padding: "2px 10px", borderRadius: 20 }}>
            {selected?.label.split("—")[0]?.trim() ?? value}
          </span>
        )}
      </div>

      <button type="button" disabled={disabled || loading || options.length === 0}
        onClick={() => setOpen((o) => !o)}
        style={{
          width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "11px 16px", borderRadius: 12, border: `1.5px solid ${value ? color : "var(--glass-border)"}`,
          background: value ? bg : "var(--card-bg)", color: value ? color : "var(--text-main)",
          fontSize: 13, fontWeight: 600, cursor: "pointer", transition: "all 0.2s", textAlign: "left",
        }}>
        <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {loading ? "Chargement…" : selected ? selected.label : `— ${label} —`}
        </span>
        <motion.span animate={{ rotate: open ? 90 : 0 }} transition={{ duration: 0.18 }}>
          <ChevronRight size={15} />
        </motion.span>
      </button>

      <AnimatePresence>
        {open && options.length > 0 && (
          <motion.div initial={{ opacity: 0, y: -4, scaleY: 0.95 }} animate={{ opacity: 1, y: 0, scaleY: 1 }}
            exit={{ opacity: 0, scaleY: 0.95 }} style={{ transformOrigin: "top",
              position: "absolute", zIndex: 9999, width: "100%", marginTop: 6,
              background: "var(--bg-surface)", border: "1px solid var(--glass-border)",
              borderRadius: 14, boxShadow: "0 25px 50px rgba(0,0,0,0.22)", maxHeight: step === 4 ? 350 : 250, overflowY: "auto",
              scrollbarWidth: "thin", scrollbarColor: `${color} transparent` }}>
            {options.map((opt, i) => (
              <motion.button key={opt.value} type="button"
                initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => { onChange(opt.value); setOpen(false); }}
                style={{
                  width: "100%", textAlign: "left", padding: "12px 16px", fontSize: 13,
                  borderBottom: "1px solid var(--glass-border)", cursor: "pointer",
                  background: opt.value === value ? bg : "transparent",
                  color: opt.value === value ? color : "var(--text-main)",
                  fontWeight: opt.value === value ? 700 : 400, display: "flex",
                  alignItems: "center", gap: 12, transition: "all 0.15s"
                }}>
                <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 2 }}>
                    <span style={{ fontSize: 10, fontWeight: 800, fontFamily: "monospace", color: color, background: bg, padding: "1px 6px", borderRadius: 4 }}>
                      {opt.value}
                    </span>
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                      {opt.label.includes("—") ? opt.label.split("—")[1].trim() : opt.label}
                    </span>
                  </div>
                  {opt.meta && <span style={{ fontSize: 10, color: "var(--text-dim)", opacity: 0.8 }}>{opt.meta} articles disponibles</span>}
                </div>
                {opt.value === value && <CheckCircle2 size={14} style={{ flexShrink: 0 }} />}
              </motion.button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export default function NomenclatureSelector({ partie, family, onSelect, disabled = false, className = "", initialCode, initialLabel }: NomenclatureSelectorProps) {
  const [comptes,    setComptes]    = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [familles,   setFamilles]   = useState<any[]>([]);
  const [articles,   setArticles]   = useState<ArticleOption[]>([]);

  const [compte,    setCompte]    = useState("");
  const [categorie, setCategorie] = useState("");
  const [famille,   setFamille]   = useState("");
  const [article,   setArticle]   = useState("");

  const [searchTerm, setSearchTerm] = useState("");
  const [searchRes,  setSearchRes]  = useState<ArticleOption[]>([]);
  const [searching,  setSearching]  = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const [lC, setLC] = useState(false);
  const [lCat, setLCat] = useState(false);
  const [lF, setLF]  = useState(false);
  const [lA, setLA]  = useState(false);

  const [chosen, setChosen] = useState<ArticleOption | null>(null);
  const [resolving, setResolving] = useState(false);
  const progress = [compte, categorie, famille, article].filter(Boolean).length * 25;

  // ── Auto-résolution du code initial (mode édition) ──────────────────────
  useEffect(() => {
    if (!initialCode) return;
    setResolving(true);
    // 1. Chercher l'article par son code exact via l'API search
    const p: Record<string, string> = { q: initialCode, limit: "5" };
    if (partie) p.partie = partie;
    fetchNom<ArticleOption>("search", p)
      .then(async (results) => {
        const found = results.find(r => r.code === initialCode) || results[0];
        if (!found) return;
        // 2. Mettre à jour l'article sélectionné (chosen)
        setChosen(found);
        // 3. Résoudre la chaîne : compte → catégorie → famille
        const cpt = found.compte_principal;
        setCompte(cpt);
        // Charger catégories pour ce compte
        const cats = await fetchNom<any>("categories", { compte: cpt });
        setCategories(cats);
        const cat = found.categorie;
        setCategorie(cat);
        // Charger familles
        const fams = await fetchNom<any>("familles", { compte: cpt, categorie: cat });
        setFamilles(fams);
        const fam = found.famille;
        setFamille(fam);
        // Charger articles
        const arts = await fetchNom<ArticleOption>("articles", { compte: cpt, categorie: cat, famille: fam });
        setArticles(arts);
        setArticle(found.code);
      })
      .catch(console.error)
      .finally(() => setResolving(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialCode]);
  // ─────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    setLC(true);
    fetchNom<any>("comptes", partie ? { partie } : {})
      .then((data) => {
        // Appliquer le filtrage par famille si fourni
        if (family && FAMILY_ROOTS[family]) {
          const roots = FAMILY_ROOTS[family];
          setComptes(data.filter((c: any) => roots.some(r => c.compte_principal.startsWith(r))));
        } else {
          setComptes(data);
        }
      })
      .catch(console.error)
      .finally(() => setLC(false));
  }, [partie, family]);

  const getStepLabel = (stepIdx: number) => {
    if (family && FAMILY_LABELS[family]) {
      return FAMILY_LABELS[family][stepIdx];
    }
    return DEFAULT_LEVELS[stepIdx].label;
  };

  const getStepColor = (stepIdx: number) => DEFAULT_LEVELS[stepIdx].color;
  const getStepBg = (stepIdx: number) => DEFAULT_LEVELS[stepIdx].bg;

  useEffect(() => {
    // Ne pas réinitialiser si une résolution initiale est en cours
    if (resolving) return;
    setCategorie(""); setFamille(""); setArticle(""); setCategories([]); setFamilles([]); setArticles([]);
    if (!compte) return;
    setLCat(true);
    fetchNom<any>("categories", { compte }).then(setCategories).catch(console.error).finally(() => setLCat(false));
  }, [compte]);

  useEffect(() => {
    if (resolving) return;
    setFamille(""); setArticle(""); setFamilles([]); setArticles([]);
    if (!categorie) return;
    setLF(true);
    fetchNom<any>("familles", { compte, categorie }).then(setFamilles).catch(console.error).finally(() => setLF(false));
  }, [categorie]);

  useEffect(() => {
    if (resolving) return;
    setArticle(""); setArticles([]);
    if (!famille) return;
    setLA(true);
    fetchNom<ArticleOption>("articles", { compte, categorie, famille }).then(setArticles).catch(console.error).finally(() => setLA(false));
  }, [famille]);

  useEffect(() => {
    if (!article) return;
    const a = articles.find((x) => x.code === article);
    if (a) { setChosen(a); onSelect(a); }
  }, [article]);

  const handleSearch = useCallback(async (term: string) => {
    setSearchTerm(term);
    if (term.length < 2) { setSearchRes([]); return; }
    setSearching(true);
    try {
      const p: Record<string, string> = { q: term, limit: "15" };
      if (partie) p.partie = partie;
      setSearchRes(await fetchNom<ArticleOption>("search", p));
    } catch { setSearchRes([]); } finally { setSearching(false); }
  }, [partie]);

  const pickSearch = (a: ArticleOption) => { setSearchTerm(a.intitule); setSearchRes([]); setChosen(a); onSelect(a); };
  const reset = () => { setChosen(null); setCompte(""); setCategorie(""); setFamille(""); setArticle(""); setSearchTerm(""); setSearchRes([]); };

  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: 14 }}>

      {/* Header */}
      <div style={{
        background: "linear-gradient(135deg, #4f46e5 0%, #7c3aed 50%, #6d28d9 100%)",
        borderRadius: 18, padding: "18px 20px", color: "#fff", position: "relative", overflow: "hidden",
      }}>
        <div style={{ position: "absolute", top: -20, right: -20, width: 80, height: 80, borderRadius: "50%", background: "rgba(255,255,255,0.06)" }} />
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
          <div>

            <div style={{ fontSize: 16, fontWeight: 800 }}>
              Classification {partie === "A" ? "Immobilisations" : partie === "B" ? "Stocks" : "Générale"}
            </div>
            {resolving && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 6, fontSize: 11, opacity: 0.8 }}>
                <Loader2 size={11} className="animate-spin" /> Chargement de la nomenclature…
              </div>
            )}
          </div>
          {chosen && (
            <button type="button" onClick={reset}
              style={{ fontSize: 11, background: "rgba(255,255,255,0.15)", border: "none", color: "#fff",
                padding: "5px 12px", borderRadius: 20, cursor: "pointer", display: "flex", alignItems: "center", gap: 5 }}>
              <X size={10} /> Réinitialiser
            </button>
          )}
        </div>
        {/* Progress */}
        <div style={{ marginTop: 14 }}>
          <div style={{ height: 4, background: "rgba(255,255,255,0.15)", borderRadius: 4, overflow: "hidden" }}>
            <motion.div style={{ height: "100%", background: "#fff", borderRadius: 4 }}
              animate={{ width: `${progress}%` }} transition={{ duration: 0.4 }} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
            {[0, 1, 2, 3].map((i) => (
              <span key={i} style={{ fontSize: 9, fontWeight: 700, letterSpacing: 0.5, opacity: progress > i * 25 ? 1 : 0.35 }}>
                {getStepLabel(i)}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Toggle */}
      <div style={{ display: "flex", gap: 4, background: "var(--glass-border)", borderRadius: 12, padding: 3 }}>
        {[
          { v: false, icon: "🗂", label: "Navigation" },
          { v: true,  icon: "🔍", label: "Recherche rapide" },
        ].map((m) => (
          <button key={String(m.v)} type="button" onClick={() => setShowSearch(m.v)}
            style={{
              flex: 1, border: "none", borderRadius: 10, padding: "8px 10px", fontSize: 12, fontWeight: 700,
              cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: 5,
              background: showSearch === m.v ? "var(--bg-surface)" : "transparent",
              color: showSearch === m.v ? "var(--primary)" : "var(--text-dim)",
              boxShadow: showSearch === m.v ? "0 2px 8px rgba(0,0,0,0.1)" : "none",
              transition: "all 0.2s",
            }}>
            {m.icon} {m.label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {showSearch ? (
          <motion.div key="s" initial={{ opacity: 0, x: 16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -16 }}
            style={{ position: "relative" }}>
            <div style={{ position: "relative" }}>
              <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-dim)" }} />
              <input value={searchTerm} onChange={(e) => handleSearch(e.target.value)}
                placeholder="Ex: Bureau, Climatiseur, Ordinateur…" disabled={disabled}
                style={{ paddingLeft: 36, paddingRight: 36, borderRadius: 12, width: "100%",
                  border: "1.5px solid var(--primary)", background: "var(--card-bg)", color: "var(--text-main)", fontSize: 13 }} />
              {searching
                ? <Loader2 size={13} className="animate-spin" style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", color: "var(--primary)" }} />
                : searchTerm && <button type="button" onClick={() => { setSearchTerm(""); setSearchRes([]); }}
                    style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "var(--text-dim)" }}>
                    <X size={13} />
                  </button>
              }
            </div>
            <AnimatePresence>
              {searchRes.length > 0 && (
                <motion.div initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                  style={{ position: "absolute", zIndex: 999, width: "100%", marginTop: 6, background: "var(--bg-surface)",
                    border: "1px solid var(--glass-border)", borderRadius: 14, boxShadow: "0 20px 40px rgba(0,0,0,0.18)",
                    maxHeight: 260, overflowY: "auto" }}>
                  {searchRes.map((a, i) => (
                    <motion.button key={a.code} type="button"
                      initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.025 }}
                      onClick={() => pickSearch(a)}
                      style={{ width: "100%", textAlign: "left", padding: "12px 16px", cursor: "pointer",
                        borderBottom: "1px solid var(--glass-border)", background: "transparent", display: "block" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 800, fontFamily: "monospace", color: "#4f46e5",
                          background: "rgba(79,70,229,0.08)", padding: "2px 8px", borderRadius: 8 }}>{a.code}</span>
                        <span style={{ fontSize: 10, padding: "2px 8px", borderRadius: 20, fontWeight: 700,
                          background: a.partie === "A" ? "rgba(5,150,105,0.1)" : "rgba(217,119,6,0.1)",
                          color: a.partie === "A" ? "#059669" : "#d97706" }}>
                          {a.partie === "A" ? "Immo" : "Stock"}
                        </span>
                      </div>
                      <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-main)", margin: "4px 0 2px" }}>{a.intitule}</p>
                      <p style={{ fontSize: 11, color: "var(--text-dim)" }}>{a.libelle_compte}</p>
                    </motion.button>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
            {searchTerm.length >= 2 && !searching && searchRes.length === 0 && (
              <p style={{ textAlign: "center", color: "var(--text-dim)", fontSize: 12, marginTop: 12 }}>
                Aucun résultat pour « {searchTerm} »
              </p>
            )}
          </motion.div>
        ) : (
          <motion.div key="c" initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 16 }}
            style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <CascadeDropdown step={1} label={getStepLabel(0)} color={getStepColor(0)} bg={getStepBg(0)} value={compte} onChange={setCompte} loading={lC} disabled={disabled}
              options={comptes.map((c) => ({ value: c.compte_principal, label: `${c.compte_principal} — ${c.libelle_compte}`, meta: String(c.nb_items) }))} />
            <CascadeDropdown step={2} label={getStepLabel(1)} color={getStepColor(1)} bg={getStepBg(1)} value={categorie} onChange={setCategorie} loading={lCat} disabled={disabled || !compte}
              options={categories.map((c) => ({ value: c.categorie, label: c.categorie }))} />
            <CascadeDropdown step={3} label={getStepLabel(2)} color={getStepColor(2)} bg={getStepBg(2)} value={famille} onChange={setFamille} loading={lF} disabled={disabled || !categorie}
              options={familles.map((f) => ({ value: f.famille, label: f.famille }))} />
            <CascadeDropdown step={4} label={getStepLabel(3)} color={getStepColor(3)} bg={getStepBg(3)} value={article} onChange={setArticle} loading={lA} disabled={disabled || !famille}
              options={articles.map((a) => ({ value: a.code, label: `${a.code} — ${a.intitule}` }))} />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Confirmation */}
      <AnimatePresence>
        {chosen && (
          <motion.div initial={{ opacity: 0, y: 10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.96 }} transition={{ type: "spring", stiffness: 300, damping: 24 }}
            style={{ borderRadius: 16, border: "1.5px solid rgba(5,150,105,0.3)",
              background: "linear-gradient(135deg, rgba(5,150,105,0.07), rgba(16,185,129,0.04))",
              padding: "14px 16px", display: "flex", alignItems: "flex-start", gap: 12 }}>
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 400, damping: 15, delay: 0.1 }}
              style={{ width: 34, height: 34, borderRadius: "50%", background: "#059669", flexShrink: 0,
                display: "flex", alignItems: "center", justifyContent: "center",
                boxShadow: "0 4px 12px rgba(5,150,105,0.3)" }}>
              <CheckCircle2 size={16} color="#fff" />
            </motion.div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontSize: 10, fontWeight: 800, color: "#059669", textTransform: "uppercase", letterSpacing: 1.5, marginBottom: 3 }}>
                ✦ Article sélectionné
              </p>
              <p style={{ fontSize: 14, fontWeight: 700, color: "var(--text-main)", marginBottom: 8 }}>{chosen.intitule}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                <span style={{ fontSize: 11, fontWeight: 800, fontFamily: "monospace", color: "#059669",
                  background: "rgba(5,150,105,0.1)", border: "1px solid rgba(5,150,105,0.2)", padding: "3px 10px", borderRadius: 20 }}>
                  {chosen.code}
                </span>
                <span style={{ fontSize: 11, color: "var(--text-dim)", background: "var(--glass-border)", padding: "3px 10px", borderRadius: 20 }}>
                  {chosen.libelle_compte}
                </span>
                {chosen.unite_defaut && (
                  <span style={{ fontSize: 11, color: "#4f46e5", background: "rgba(79,70,229,0.08)", padding: "3px 10px", borderRadius: 20, fontWeight: 700 }}>
                    Unité : {chosen.unite_defaut}
                  </span>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
