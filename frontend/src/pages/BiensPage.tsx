import React, { useDeferredValue, useEffect, useMemo, useState } from "react";
import {
  Bien,
  BienCatalogueItem,
  createBien,
  deleteBien,
  getBienCatalogue,
  getBiens,
  updateBien,
} from "../api/biens";
import { getMouvementsByBien, getServices } from "../api/api";
import FileUpload from "../components/FileUpload";
import FileViewerModal from "../components/FileViewerModal";
import ImageUpload from "../components/ImageUpload";
import MouvementTimeline from "../components/MouvementTimeline";
import { usePermissions } from "../contexts/PermissionsContext";
import { exportGrandLivrePremiumExcel, exportLivreJournalPremiumExcel, exportPdf } from "../utils/exporters";

type Primitive = string | number | boolean | null | undefined;
type ServiceOption = Record<string, unknown>;
type TimelineEntry = Record<string, unknown>;
type ViewerFileType = "image" | "pdf" | "excel" | "unknown";

type BienForm = Bien & {
  documentsUrls: string[];
  statutOperationnel?: string;
  statutJuridique?: string;
  chargeUtile?: string;
  typeBoite?: string;
  finGarantie?: string;
  dateMaintenance?: string;
  dateDernierEntretien?: string;
  permisOccuper?: boolean;
  dureeLicence?: string;
  seuilAlerte?: number;
  numeroLot?: string;
};

type ViewerState = {
  url: string;
  filename: string;
  type: ViewerFileType;
} | null;

type CategoryPanel = {
  badge: string;
  icon: React.ReactNode;
  className: string;
  title: string;
  description: string;
};

const API_BASE_URL = "http://localhost:8082";

const EMPTY_BIEN: BienForm = {
  id: null,
  codeBien: "",
  iup: "",
  designation: "",
  categorie: "MOBILIER",
  categoriePrincipale: "",
  codeFamille: "",
  familleCatalogue: "",
  codeSousCategorie: "",
  sousCategorie: "",
  sectionCatalogue: "",
  profilFormulaire: "",
  dateAcquisition: new Date().toISOString().split("T")[0],
  valeur: 0,
  etat: "NEUF",
  localisation: "",
  observation: "",
  photoUrl: "",
  coordonneeGps: "",
  coordonneesGps: "",
  numInventaire: "",
  titreFoncier: "",
  superficie: "",
  modeAcquisition: "ACHAT",
  immatriculation: "",
  numChassis: "",
  marque: "",
  modele: "",
  numSerie: "",
  fabricant: "",
  dateMaintenance: "",
  dateDernierEntretien: "",
  dateProchaineMaintenance: "",
  dateProchaineVisiteTechnique: "",
  quantite: 1,
  service: "",
  specificationsTechniques: "",
  puissanceFiscale: "",
  typeCarburant: "ESSENCE",
  typeBoite: "MANUELLE",
  chargeUtile: "",
  statutOperationnel: "ACTIF",
  statutJuridique: "PROPRIETE_PRIVEE",
  finGarantie: "",
  dureeLicence: "",
  seuilAlerte: 0,
  numeroLot: "",
  dureeAmortissement: 0,
  tauxAmortissement: 0,
  valeurNetteComptable: 0,
  amortissementCumule: 0,
  documentsUrls: [],
  archived: false,
  permisOccuper: false,
};

const HouseIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M3 10.5 12 4l9 6.5" />
    <path d="M5 10v10h14V10" />
    <path d="M10 20v-5h4v5" />
  </svg>
);

const CarIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M5 16 7 9h10l2 7" />
    <path d="M4 16h16v3H4Z" />
    <circle cx="7.5" cy="18.5" r="1.5" />
    <circle cx="16.5" cy="18.5" r="1.5" />
  </svg>
);

const ComputerIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <rect x="4" y="5" width="16" height="11" rx="2" />
    <path d="M9 19h6" />
    <path d="M12 16v3" />
  </svg>
);

const CloudIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M7 18a4 4 0 1 1 .7-7.94A5.5 5.5 0 0 1 18 11a3.5 3.5 0 1 1 0 7H7Z" />
  </svg>
);

const BoxIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="M12 3 4 7l8 4 8-4-8-4Z" />
    <path d="M4 7v10l8 4 8-4V7" />
    <path d="M12 11v10" />
  </svg>
);

const SparkIcon = () => (
  <svg viewBox="0 0 24 24" aria-hidden="true">
    <path d="m12 3 1.9 4.6L18.5 9l-4.6 1.4L12 15l-1.9-4.6L5.5 9l4.6-1.4Z" />
  </svg>
);

const CATEGORY_DECOR: Record<string, CategoryPanel> = {
  IMMOBILIER: {
    badge: "Immobilier",
    icon: <HouseIcon />,
    className: "category-panel immobilier",
    title: "Bloc immobilier",
    description: "Titre foncier, superficie, mode d'acquisition et situation juridique du bien.",
  },
  roulant: {
    badge: "Vehicule",
    icon: <CarIcon />,
    className: "category-panel roulant",
    title: "Bloc materiel roulant",
    description: "Identification administrative et caracteristiques techniques du vehicule.",
  },
  informatique: {
    badge: "Informatique",
    icon: <ComputerIcon />,
    className: "category-panel informatique",
    title: "Bloc materiel informatique",
    description: "Serie, garantie et descriptif technique de l'equipement.",
  },
  immateriel: {
    badge: "Immateriel",
    icon: <CloudIcon />,
    className: "category-panel immateriel",
    title: "Bloc immobilisations incorporelles",
    description: "Licence, duree et specifications de l'actif immateriel.",
  },
  stock: {
    badge: "Consommable",
    icon: <BoxIcon />,
    className: "category-panel stock",
    title: "Bloc stocks & consommables",
    description: "Quantite, lot et seuil d'alerte pour le pilotage magasin.",
  },
  generic: {
    badge: "Technique",
    icon: <SparkIcon />,
    className: "category-panel generic",
    title: "Bloc descriptif",
    description: "Metadonnees techniques adaptees a la categorie selectionnee.",
  },
};

const normalizeUrl = (url?: string) => {
  if (!url) return "";
  return url.startsWith("http") ? url : `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

const inferFileType = (url: string): ViewerFileType => {
  const lower = url.toLowerCase();
  if (/\.(png|jpg|jpeg|gif|webp|bmp)$/i.test(lower)) return "image";
  if (/\.pdf$/i.test(lower)) return "pdf";
  if (/\.(xlsx|xls|csv)$/i.test(lower)) return "excel";
  return "unknown";
};

const getFilename = (url: string) => {
  const segments = url.split("/");
  return segments[segments.length - 1] || "document";
};

const computeAccounting = (valeur: number, dateAcquisition: string, dureeAmortissement?: number | null) => {
  if (!valeur || !dateAcquisition || !dureeAmortissement || dureeAmortissement <= 0) {
    return { valeurNetteComptable: valeur || 0, amortissementCumule: 0, tauxAmortissement: 0 };
  }

  const acquisition = new Date(dateAcquisition);
  if (Number.isNaN(acquisition.getTime())) {
    return { valeurNetteComptable: valeur || 0, amortissementCumule: 0, tauxAmortissement: 0 };
  }

  const elapsedYears = Math.max(0, (Date.now() - acquisition.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  const boundedYears = Math.min(elapsedYears, dureeAmortissement);
  const amortissementCumule = (valeur / dureeAmortissement) * boundedYears;

  return {
    valeurNetteComptable: Math.max(0, valeur - amortissementCumule),
    amortissementCumule,
    tauxAmortissement: 100 / dureeAmortissement,
  };
};

const inferPanel = (form: BienForm): CategoryPanel => {
  const categorie = (form.categoriePrincipale || "").toUpperCase();
  const profil = (form.profilFormulaire || "").toLowerCase();

  if (categorie.includes("IMMOBILIER")) return CATEGORY_DECOR.IMMOBILIER;
  if (profil === "roulant" || categorie.includes("ROULANT")) return CATEGORY_DECOR.roulant;
  if (profil === "informatique" || categorie.includes("INFORMATIQUE")) return CATEGORY_DECOR.informatique;
  if (profil === "immateriel" || categorie.includes("INCORPOREL")) return CATEGORY_DECOR.immateriel;
  if (profil === "stock" || categorie.includes("STOCK")) return CATEGORY_DECOR.stock;
  return CATEGORY_DECOR.generic;
};

const SearchIcon = ({ active }: { active: boolean }) => (
  <svg className={active ? "search-spinner active" : "search-spinner"} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </svg>
);

export default function BiensPage() {
  const [biens, setBiens] = useState<Bien[]>([]);
  const [catalogue, setCatalogue] = useState<BienCatalogueItem[]>([]);
  const [servicesList, setServicesList] = useState<ServiceOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState("");
  const deferredSearch = useDeferredValue(search);
  const [selectedPrincipalCategory, setSelectedPrincipalCategory] = useState<string | null>(null);
  const [view, setView] = useState<"GALLERY" | "FORM">("GALLERY");
  const [editingBienId, setEditingBienId] = useState<number | null>(null);
  const [timelineData, setTimelineData] = useState<TimelineEntry[]>([]);
  const [showTimeline, setShowTimeline] = useState(false);
  const [detailBien, setDetailBien] = useState<Bien | null>(null);
  const [viewer, setViewer] = useState<ViewerState>(null);
  const [form, setForm] = useState<BienForm>({ ...EMPTY_BIEN });
  const { permissions } = usePermissions();
  const isAdmin = permissions?.role === "ADMIN";

  const reload = async () => {
    const [biensData, catalogueData, servicesData] = await Promise.all([
      getBiens().catch(() => []),
      getBienCatalogue().catch(() => []),
      getServices().catch(() => []),
    ]);

    setBiens((biensData as Bien[]) ?? []);
    setCatalogue((catalogueData as BienCatalogueItem[]) ?? []);
    setServicesList((servicesData as ServiceOption[]) ?? []);
  };

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        await reload();
      } finally {
        setLoading(false);
      }
    };

    void load();
  }, []);

  const accounting = useMemo(
    () => computeAccounting(Number(form.valeur || 0), form.dateAcquisition, form.dureeAmortissement),
    [form.dateAcquisition, form.dureeAmortissement, form.valeur]
  );

  const panel = inferPanel(form);

  const principalCategories = useMemo(() => {
    const grouped = new Map<string, number>();
    catalogue
      .filter((item) => item.niveau === "ARTICLE")
      .forEach((item) => grouped.set(item.categoriePrincipale, (grouped.get(item.categoriePrincipale) || 0) + 1));
    return Array.from(grouped.entries()).map(([name, count]) => ({ name, count }));
  }, [catalogue]);

  const availableFamilies = useMemo(() => {
    if (!selectedPrincipalCategory) return [];
    const seen = new Map<string, BienCatalogueItem>();

    catalogue
      .filter((item) => item.categoriePrincipale === selectedPrincipalCategory && item.niveau === "ARTICLE")
      .forEach((item) => {
        if (!seen.has(item.codeFamille)) seen.set(item.codeFamille, item);
      });

    return Array.from(seen.values()).sort((a, b) => a.codeFamille.localeCompare(b.codeFamille));
  }, [catalogue, selectedPrincipalCategory]);

  const availableArticles = useMemo(() => {
    if (!form.codeFamille) return [];
    return catalogue
      .filter((item) => item.niveau === "ARTICLE" && item.codeFamille === form.codeFamille)
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [catalogue, form.codeFamille]);

  const filteredBiens = useMemo(() => {
    const term = deferredSearch.trim().toLowerCase();
    if (!term) return biens;

    return biens.filter((bien) =>
      [
        bien.designation,
        bien.iup,
        bien.service,
        bien.sousCategorie,
        bien.codeSousCategorie,
        bien.localisation,
        bien.immatriculation,
        bien.titreFoncier,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(term))
    );
  }, [biens, deferredSearch]);

  const currentArticle = useMemo(
    () => availableArticles.find((item) => item.code === form.codeSousCategorie) ?? null,
    [availableArticles, form.codeSousCategorie]
  );

  const handleFieldChange = <K extends keyof BienForm>(key: K, value: BienForm[K]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const selectPrincipalCategory = (categoryName: string) => {
    setSelectedPrincipalCategory(categoryName);
    setForm((previous) => ({
      ...previous,
      categoriePrincipale: categoryName,
      codeFamille: "",
      familleCatalogue: "",
      codeSousCategorie: "",
      sousCategorie: "",
      sectionCatalogue: "",
      profilFormulaire: "",
      designation: "",
    }));
  };

  const selectFamily = (familyCode: string) => {
    const familyRef = availableFamilies.find((item) => item.codeFamille === familyCode);
    setForm((previous) => ({
      ...previous,
      codeFamille: familyCode,
      familleCatalogue: familyRef?.libelleFamille || "",
      sectionCatalogue: familyRef?.section || "",
      profilFormulaire: familyRef?.profilFormulaire || "",
      categorie: familyRef?.categorieMetier || "MOBILIER",
    }));
  };

  const selectArticle = (codeSousCategorie: string) => {
    const article = catalogue.find(
      (item) => (item as BienCatalogueItem & { codeSousCategorie?: string }).codeSousCategorie === codeSousCategorie || item.code === codeSousCategorie
    );

    if (article) {
      setForm((previous) => ({
        ...previous,
        codeSousCategorie,
        designation: article.libelle || "",
        sousCategorie: article.libelle || "",
        categorie: article.categorieMetier,
        categoriePrincipale: article.categoriePrincipale,
        codeFamille: article.codeFamille,
        familleCatalogue: article.libelleFamille,
        sectionCatalogue: article.section,
        profilFormulaire: article.profilFormulaire,
      }));
      setSelectedPrincipalCategory(article.categoriePrincipale);
    }
  };

  const resetForm = () => {
    setForm({ ...EMPTY_BIEN });
    setSelectedPrincipalCategory(null);
    setEditingBienId(null);
  };

  const openNewForm = () => {
    resetForm();
    setView("FORM");
  };

  const openEditForm = (bien: Bien) => {
    setForm({
      ...EMPTY_BIEN,
      ...bien,
      documentsUrls: Array.isArray((bien as BienForm).documentsUrls) ? (bien as BienForm).documentsUrls : [],
      dateAcquisition: bien.dateAcquisition || EMPTY_BIEN.dateAcquisition,
    });
    setSelectedPrincipalCategory(bien.categoriePrincipale || null);
    setEditingBienId(typeof bien.id === "number" ? bien.id : null);
    setView("FORM");
  };

  const openViewer = (url: string) => {
    const normalized = normalizeUrl(url);
    setViewer({ url: normalized, filename: getFilename(normalized), type: inferFileType(normalized) });
  };

  const captureGPS = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((position) => {
      const coords = `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`;
      setForm((previous) => ({ ...previous, coordonneesGps: coords, coordonneeGps: coords }));
    });
  };

  const showHistory = async (bienId: number) => {
    try {
      const history = await getMouvementsByBien(bienId);
      setTimelineData((history as TimelineEntry[]) ?? []);
      setShowTimeline(true);
    } catch {
      setTimelineData([]);
      setShowTimeline(true);
    }
  };

  const buildPayload = (): BienForm => ({
    ...form,
    valeurNetteComptable: accounting.valeurNetteComptable,
    amortissementCumule: accounting.amortissementCumule,
    tauxAmortissement: accounting.tauxAmortissement,
  });

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!selectedPrincipalCategory || !form.codeSousCategorie) {
      alert("Veuillez choisir une categorie principale, une famille et une sous-categorie.");
      return;
    }

    try {
      setSaving(true);
      const payload = buildPayload();
      if (editingBienId) {
        await updateBien(editingBienId, payload);
      } else {
        await createBien(payload);
      }

      await reload();
      setView("GALLERY");
      resetForm();
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (bienId: number | null) => {
    if (!bienId || !window.confirm("Supprimer ce bien ?")) return;
    await deleteBien(bienId);
    await reload();
  };

  const renderInput = (
    label: string,
    key: keyof BienForm,
    options?: { type?: string; span?: boolean; placeholder?: string }
  ) => (
    <div className="form-group-modern" style={options?.span ? { gridColumn: "span 2" } : undefined}>
      <label>{label}</label>
      <input
        type={options?.type ?? "text"}
        value={String(form[key] ?? "")}
        placeholder={options?.placeholder}
        onChange={(event) =>
          handleFieldChange(
            key,
            (options?.type === "number" ? Number(event.target.value) : event.target.value) as BienForm[keyof BienForm]
          )
        }
      />
    </div>
  );

  const renderProfileFields = () => {
    if (panel.className.includes("immobilier")) {
      return (
        <>
          {renderInput("Titre foncier", "titreFoncier")}
          {renderInput("Superficie (m2)", "superficie")}
          {renderInput("Mode d'acquisition", "modeAcquisition")}
          {renderInput("Statut juridique", "statutJuridique")}
          <div className="form-group-modern" style={{ gridColumn: "span 2" }}>
            <label>Permis d'occuper</label>
            <div className="checkbox-modern">
              <input
                type="checkbox"
                checked={Boolean(form.permisOccuper)}
                onChange={(event) => handleFieldChange("permisOccuper", event.target.checked)}
              />
              <span>Le dossier contient un permis d'occuper ou un justificatif equivalent</span>
            </div>
          </div>
        </>
      );
    }

    if (panel.className.includes("roulant")) {
      return (
        <>
          {renderInput("Immatriculation", "immatriculation")}
          {renderInput("N° Chassis", "numChassis")}
          {renderInput("Marque", "marque")}
          {renderInput("Modele", "modele")}
          {renderInput("Puissance fiscale", "puissanceFiscale")}
          {renderInput("Type boite", "typeBoite")}
          {renderInput("Type carburant", "typeCarburant")}
          {renderInput("Charge utile", "chargeUtile")}
        </>
      );
    }

    if (panel.className.includes("informatique")) {
      return (
        <>
          {renderInput("N° Serie", "numSerie")}
          {renderInput("Fabricant", "fabricant")}
          {renderInput("Marque", "marque")}
          {renderInput("Modele", "modele")}
          {renderInput("Date fin garantie", "finGarantie", { type: "date" })}
          <div className="form-group-modern" style={{ gridColumn: "span 2" }}>
            <label>Specifications techniques</label>
            <textarea
              rows={3}
              value={form.specificationsTechniques || ""}
              onChange={(event) => handleFieldChange("specificationsTechniques", event.target.value)}
            />
          </div>
        </>
      );
    }

    if (panel.className.includes("immateriel")) {
      return (
        <>
          {renderInput("N° Serie / Licence", "numSerie")}
          {renderInput("Fabricant", "fabricant")}
          {renderInput("Duree licence", "dureeLicence")}
          <div className="form-group-modern" style={{ gridColumn: "span 2" }}>
            <label>Specifications</label>
            <textarea
              rows={3}
              value={form.specificationsTechniques || ""}
              onChange={(event) => handleFieldChange("specificationsTechniques", event.target.value)}
            />
          </div>
        </>
      );
    }

    if (panel.className.includes("stock")) {
      return (
        <>
          {renderInput("Quantite", "quantite", { type: "number" })}
          {renderInput("N° Lot / Batch", "numeroLot")}
          {renderInput("Seuil d'alerte", "seuilAlerte", { type: "number" })}
          <div className="form-group-modern" style={{ gridColumn: "span 2" }}>
            <label>Specifications</label>
            <textarea
              rows={3}
              value={form.specificationsTechniques || ""}
              onChange={(event) => handleFieldChange("specificationsTechniques", event.target.value)}
            />
          </div>
        </>
      );
    }

    return (
      <>
        {renderInput("N° Serie", "numSerie")}
        {renderInput("Fabricant", "fabricant")}
        {renderInput("Marque", "marque")}
        {renderInput("Modele", "modele")}
        <div className="form-group-modern" style={{ gridColumn: "span 2" }}>
          <label>Specifications techniques</label>
          <textarea
            rows={3}
            value={form.specificationsTechniques || ""}
            onChange={(event) => handleFieldChange("specificationsTechniques", event.target.value)}
          />
        </div>
      </>
    );
  };

  const renderDocuments = (documents: string[]) => {
    if (documents.length === 0) {
      return <span className="field-hint">Aucun document attache pour ce bien.</span>;
    }

    return (
      <div className="document-grid">
        {documents.map((documentUrl) => {
          const normalized = normalizeUrl(documentUrl);
          const type = inferFileType(normalized);
          return (
            <button
              key={documentUrl}
              type="button"
              className={`document-chip ${type}`}
              onClick={() => openViewer(normalized)}
              aria-label={`Ouvrir ${getFilename(normalized)}`}
            >
              <span>{type === "image" ? "Image" : type === "pdf" ? "PDF" : type === "excel" ? "Excel" : "Fichier"}</span>
              <strong>{getFilename(normalized)}</strong>
            </button>
          );
        })}
      </div>
    );
  };

  const resultLabel = deferredSearch.trim()
    ? `${filteredBiens.length} bien${filteredBiens.length > 1 ? "s" : ""} correspondent a votre recherche`
    : `${filteredBiens.length} bien${filteredBiens.length > 1 ? "s" : ""} disponibles dans le registre`;

  return (
    <div className="dashboard-container biens-page-shell fade-in">
      <header className="page-header-premium">
        <div className="header-meta">
          <span className="badge-pill-glow">Registre patrimonial</span>
          <h1>Gestion des biens</h1>
          <p className="header-subtitle">
            Catalogue officiel, fiches enrichies, previsualisation des pieces jointes et recherche en temps reel.
          </p>
        </div>
        <div className="export-bar">
          <button
            type="button"
            className="btn-export"
            onClick={() => exportLivreJournalPremiumExcel(filteredBiens as unknown as Record<string, Primitive>[], "Livre_Journal_Premium.xlsx")}
          >
            Livre journal
          </button>
          <button
            type="button"
            className="btn-export"
            onClick={() => exportGrandLivrePremiumExcel(filteredBiens as unknown as Record<string, Primitive>[], "Grand_Livre_Premium.xlsx")}
          >
            Grand livre
          </button>
          <button
            type="button"
            className="btn-export"
            onClick={() => exportPdf(filteredBiens as unknown as Record<string, Primitive>[], "Registre patrimonial", "registre_patrimonial.pdf")}
          >
            Rapport PDF
          </button>
          <button className="primary" type="button" onClick={openNewForm}>
            Nouveau bien
          </button>
        </div>
      </header>

      {view === "GALLERY" ? (
        <section className="asset-card card">
          <div className="biens-search-panel">
            <div className="biens-search-input">
              <SearchIcon active={search !== deferredSearch} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Rechercher par designation, IUP, service, code ou localisation"
                aria-label="Rechercher un bien"
              />
            </div>
            <span className="results-caption">{resultLabel}</span>
          </div>

          {loading ? (
            <div className="empty-state-modern skeleton-block">Chargement des biens...</div>
          ) : filteredBiens.length === 0 ? (
            <div className="empty-search-state">
              <svg viewBox="0 0 120 120" aria-hidden="true">
                <circle cx="52" cy="52" r="28" />
                <path d="m73 73 22 22" />
                <path d="M40 52h24" />
              </svg>
              <strong>Aucun bien trouve pour "{deferredSearch}".</strong>
              <p>Essayez une autre reference, un autre service ou revenez au catalogue complet.</p>
            </div>
          ) : (
            <div className="asset-grid">
              {filteredBiens.map((bien) => (
                <article key={bien.id || bien.iup} className="asset-card card">
                  <div className="card-badge-row">
                    <span className="badge-premium">{bien.iup || "Sans IUP"}</span>
                    <span className={`status-pill status-${String((bien.etat || "neuf")).toLowerCase()}`}>{bien.etat}</span>
                  </div>
                  <h3>{bien.designation}</h3>

                  {bien.photoUrl ? (
                    <button type="button" className="bien-photo-button" onClick={() => openViewer(String(bien.photoUrl))}>
                      <img
                        src={normalizeUrl(bien.photoUrl)}
                        alt={`Photo du bien ${bien.designation}`}
                        className="bien-photo-preview"
                      />
                    </button>
                  ) : (
                    <div className="bien-photo-placeholder">Aucune photo</div>
                  )}

                  <div className="card-stats-mini">
                    <div>Service: {bien.service || "Non affecte"}</div>
                    <div>Localisation: {bien.localisation || "A completer"}</div>
                    <div>Code: {bien.codeSousCategorie || "N/A"}</div>
                    <div>Valeur: {Math.round(bien.valeur || 0).toLocaleString("fr-FR")} FCFA</div>
                  </div>

                  {Array.isArray((bien as BienForm).documentsUrls) && (bien as BienForm).documentsUrls.length > 0 ? (
                    <div className="card-documents-preview">{renderDocuments((bien as BienForm).documentsUrls)}</div>
                  ) : null}

                  <div className="card-actions">
                    <button className="btn-export" type="button" onClick={() => openEditForm(bien)}>
                      Modifier
                    </button>
                    <button className="btn-export" type="button" onClick={() => showHistory(Number(bien.id))}>
                      Historique
                    </button>
                    {isAdmin && (
                      <button className="btn-export" type="button" onClick={() => setDetailBien(bien)}>
                        Details
                      </button>
                    )}
                    <button className="btn-export danger-text" type="button" onClick={() => handleDelete(bien.id)}>
                      Suppr.
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="registration-flow">
          {!selectedPrincipalCategory ? (
            <div className="category-selection-premium">
              {principalCategories.map((category) => (
                <button
                  key={category.name}
                  type="button"
                  className="cat-card-modern"
                  onClick={() => selectPrincipalCategory(category.name)}
                >
                  <div className="cat-icon-blob">{category.name.slice(0, 2)}</div>
                  <h3>{category.name}</h3>
                  <p>{category.count} sous-codes disponibles dans le referentiel officiel.</p>
                </button>
              ))}
            </div>
          ) : (
            <div className="centered-form-card fade-in large-form-card">
              <div className="form-header-premium">
                <div>
                  <h2>Recensement : {selectedPrincipalCategory}</h2>
                  <p className="form-subtitle">
                    Choisissez la famille NOMACT, puis la sous-categorie officielle. Le formulaire s'adapte automatiquement.
                  </p>
                </div>
                <button
                  className="btn-back-cat"
                  type="button"
                  onClick={() => {
                    setView("GALLERY");
                    resetForm();
                  }}
                >
                  Annuler
                </button>
              </div>

              <form onSubmit={handleSave} className="premium-dynamic-form">
                <div className="selection-shell">
                  <div className="form-group-modern">
                    <label>Categorie principale</label>
                    <div className="selection-pill">{selectedPrincipalCategory}</div>
                  </div>
                  <div className="form-group-modern">
                    <label>Famille</label>
                    <select value={form.codeFamille || ""} onChange={(event) => selectFamily(event.target.value)}>
                      <option value="">-- Choisir une famille --</option>
                      {availableFamilies.map((item) => (
                        <option key={item.codeFamille} value={item.codeFamille}>
                          {item.codeFamille} - {item.libelleFamille}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group-modern" style={{ gridColumn: "span 2" }}>
                    <label>Sous-categorie codifiee</label>
                    <select value={form.codeSousCategorie || ""} onChange={(event) => selectArticle(event.target.value)}>
                      <option value="">-- Choisir un article du catalogue --</option>
                      {availableArticles.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.code} - {item.libelle}
                        </option>
                      ))}
                    </select>
                  </div>
                  {currentArticle && (
                    <div className="catalogue-summary" style={{ gridColumn: "span 2" }}>
                      <strong>{currentArticle.code}</strong>
                      <span>{currentArticle.libelle}</span>
                      <small>{currentArticle.libelleFamille}</small>
                    </div>
                  )}
                </div>

                <div className="form-section">
                  <h4 className="section-title">
                    <span>01</span> Identification metier
                  </h4>
                  <div className="grid-2">
                    <div className="form-group-modern" style={{ gridColumn: "span 2" }}>
                      <label>Nom / Designation</label>
                      <input
                        value={form.designation}
                        readOnly={Boolean(form.codeSousCategorie)}
                        onChange={(event) => {
                          if (!form.codeSousCategorie) handleFieldChange("designation", event.target.value);
                        }}
                        className={form.codeSousCategorie ? "readonly-input" : ""}
                        style={
                          form.codeSousCategorie
                            ? {
                                background: "var(--bg-disabled)",
                                color: "var(--text-secondary)",
                                cursor: "not-allowed",
                                fontStyle: "italic",
                              }
                            : undefined
                        }
                        placeholder="Selectionnez une sous-categorie pour pre-remplir ce champ"
                      />
                      {form.codeSousCategorie && <span className="field-hint">Pre-rempli depuis le catalogue officiel</span>}
                    </div>
                    <div className="form-group-modern">
                      <label>Service detenteur</label>
                      <select value={form.service || ""} onChange={(event) => handleFieldChange("service", event.target.value)}>
                        <option value="">-- Choisir --</option>
                        {servicesList.map((service) => (
                          <option key={String(service.id)} value={String(service.nomService || service.nom || "")}>
                            {String(service.nomService || service.nom || "")}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="form-group-modern">
                      <label>Localisation precise</label>
                      <input value={form.localisation || ""} onChange={(event) => handleFieldChange("localisation", event.target.value)} />
                    </div>
                    <div className="form-group-modern">
                      <label>Coordonnees GPS</label>
                      <div className="field-inline">
                        <input value={form.coordonneesGps || ""} onChange={(event) => handleFieldChange("coordonneesGps", event.target.value)} />
                        <button type="button" className="btn-export" onClick={captureGPS}>
                          GPS
                        </button>
                      </div>
                    </div>
                    <div className="form-group-modern">
                      <label>Date acquisition</label>
                      <input type="date" value={form.dateAcquisition} onChange={(event) => handleFieldChange("dateAcquisition", event.target.value)} />
                    </div>
                  </div>
                </div>

                <div className={panel.className}>
                  <div className="category-panel-head">
                    <span className="category-panel-badge">{panel.badge}</span>
                    <div className="category-panel-icon" aria-hidden="true">
                      {panel.icon}
                    </div>
                    <div>
                      <h4>{panel.title}</h4>
                      <p>{panel.description}</p>
                    </div>
                  </div>
                  <div className="grid-2">{renderProfileFields()}</div>
                </div>

                <div className="form-section">
                  <h4 className="section-title">
                    <span>03</span> Suivi technique et pieces jointes
                  </h4>
                  <div className="grid-2">
                    <div className="form-group-modern">
                      <label>Date prochaine maintenance</label>
                      <input
                        type="date"
                        value={form.dateProchaineMaintenance || ""}
                        onChange={(event) => handleFieldChange("dateProchaineMaintenance", event.target.value)}
                      />
                    </div>
                    <div className="form-group-modern">
                      <label>Date prochaine visite technique</label>
                      <input
                        type="date"
                        value={form.dateProchaineVisiteTechnique || ""}
                        onChange={(event) => handleFieldChange("dateProchaineVisiteTechnique", event.target.value)}
                      />
                    </div>
                    <div className="form-group-modern">
                      <label>Photographie</label>
                      <ImageUpload value={form.photoUrl || ""} onChange={(url) => handleFieldChange("photoUrl", url)} />
                    </div>
                    <div className="form-group-modern">
                      <label>Documents attaches</label>
                      <div className="upload-stack">
                        <FileUpload
                          accept=".pdf,.doc,.docx,.xls,.xlsx"
                          label="Attacher un document (PDF, DOC, XLSX)"
                          onUploadSuccess={(url) =>
                            setForm((previous) => ({ ...previous, documentsUrls: [...(previous.documentsUrls || []), url] }))
                          }
                        />
                        {renderDocuments(form.documentsUrls || [])}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h4 className="section-title">
                    <span>04</span> Valorisation
                  </h4>
                  <div className="grid-2">
                    <div className="form-group-modern">
                      <label>Valeur d'origine (FCFA)</label>
                      <input type="number" value={form.valeur || 0} onChange={(event) => handleFieldChange("valeur", Number(event.target.value))} />
                    </div>
                    <div className="form-group-modern">
                      <label>Duree d'amortissement (ans)</label>
                      <input
                        type="number"
                        value={form.dureeAmortissement || 0}
                        onChange={(event) => handleFieldChange("dureeAmortissement", Number(event.target.value))}
                      />
                    </div>
                    <div className="form-group-modern">
                      <label>VNC calculee</label>
                      <input disabled value={Math.round(accounting.valeurNetteComptable).toLocaleString("fr-FR")} />
                    </div>
                    <div className="form-group-modern">
                      <label>Amortissement cumule</label>
                      <input disabled value={Math.round(accounting.amortissementCumule).toLocaleString("fr-FR")} />
                    </div>
                  </div>
                </div>

                <div className="form-footer">
                  <button type="submit" className="primary" disabled={saving}>
                    {saving ? "Enregistrement..." : editingBienId ? "Mettre a jour le bien" : "Enregistrer le bien"}
                  </button>
                </div>
              </form>
            </div>
          )}
        </section>
      )}

      {showTimeline && (
        <div className="admin-detail-overlay">
          <div className="admin-detail-panel">
            <div className="section-header-inline">
              <div>
                <h3>Historique du bien</h3>
                <p className="muted-paragraph">Affichage des mouvements et traces lies au bien selectionne.</p>
              </div>
              <button className="btn-export" type="button" onClick={() => setShowTimeline(false)}>
                Fermer
              </button>
            </div>
            <MouvementTimeline mouvements={timelineData as never} onClose={() => setShowTimeline(false)} />
          </div>
        </div>
      )}

      {detailBien && isAdmin && (
        <div className="admin-detail-overlay" onClick={() => setDetailBien(null)}>
          <div className="admin-detail-panel" onClick={(event) => event.stopPropagation()}>
            <div className="section-header-inline">
              <div>
                <h3>Fiche detaillee</h3>
                <p className="muted-paragraph">Vue d'audit reservee a l'administration.</p>
              </div>
              <button className="btn-export" type="button" onClick={() => setDetailBien(null)}>
                Fermer
              </button>
            </div>

            {detailBien.photoUrl && (
              <button type="button" className="bien-photo-button large" onClick={() => openViewer(String(detailBien.photoUrl))}>
                <img
                  src={normalizeUrl(detailBien.photoUrl)}
                  alt={`Photo du bien ${detailBien.designation}`}
                  className="bien-photo-preview"
                />
              </button>
            )}

            {renderDocuments((((detailBien as BienForm).documentsUrls as string[]) || []).map((item) => String(item)))}

            <div className="admin-detail-grid">
              {Object.entries(detailBien).map(([key, value]) => (
                <div key={key} className="admin-detail-item">
                  <span>{key}</span>
                  <strong>{typeof value === "object" ? JSON.stringify(value) : String(value ?? "")}</strong>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {viewer && <FileViewerModal url={viewer.url} filename={viewer.filename} type={viewer.type} onClose={() => setViewer(null)} />}
    </div>
  );
}
