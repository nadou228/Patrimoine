import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bien,
  BienHistoriqueEntry,
  BienPayload,
  CategoriePatrimoineDto,
  createBien,
  deleteBien,
  generateIup,
  getFlatCategories,
  getBienHistorique,
  getBienQrCode,
  updateBien,
  validateImmatriculation,
  validateIup,
} from "../api/biens";
import { API_BASE_URL, getServices } from "../api/api";
import CategorieTreeSelect from "../components/CategorieTreeSelect";
import FileUpload from "../components/FileUpload";
import ImageUpload from "../components/ImageUpload";
import { useToast } from "../contexts/ToastContext";
import { useApi } from "../hooks/useApi";
import { exportGrandLivrePremiumExcel, exportLivreJournalPremiumExcel, exportPdf } from "../utils/exporters";
import NomenclatureSelector from "../components/NomenclatureSelector";
import MediaViewer, { MediaType } from "../components/MediaViewer";
import { 
  Sparkles, Search, CheckCircle2, ChevronRight, X, Loader2, 
  Building2, Armchair, Monitor, Car, Wrench, FileText, Palette, Dog, LayoutGrid, Check, ArrowRight, ArrowLeft, PlusCircle
} from "lucide-react";

type MainCategory = 
  | "IMMOBILIER" 
  | "MOBILIER" 
  | "INFORMATIQUE" 
  | "MATERIEL_ROULANT" 
  | "MATERIEL_TECHNIQUE" 
  | "INCORPORELS" 
  | "OEUVRES_COLLECTIONS" 
  | "CHEPTELS";
type StepKey = 0 | 1 | 2 | 3;
type ViewMode = "grid" | "list";
type SortMode = "date" | "valeur" | "designation";
type IupMeta = {
  prefixe: string;
  categorie: string;
  annee: number;
  sequence: string;
};

type ServiceOption = {
  id?: number;
  nom?: string;
  nomService?: string;
  code?: string;
};

type FormErrors = Partial<Record<keyof BienForm | "categoriePrincipale" | "codeSousCategorie" | "iup", string>>;

type BienForm = {
  id: number | null;
  iup: string;
  codeBien: string;
  designation: string;
  categorie: MainCategory;
  categoriePrincipale: MainCategory | "";
  codeFamille: string;
  familleCatalogue: string;
  codeSousCategorie: string;
  sousCategorie: string;
  dateAcquisition: string;
  modeAcquisition: string;
  valeur: number;
  dureeAmortissement: number;
  valeurNetteComptable: number;
  amortissementCumule: number;
  localisation: string;
  coordonneesGps: string;
  service: string;
  etat: string;
  quantite: number;
  observation: string;
  photoUrl: string;
  documentsUrls: string[];
  titreFoncier: string;
  superficie: string;
  statutJuridique: string;
  permisOccuper: boolean;
  numSerie: string;
  fabricant: string;
  marque: string;
  modele: string;
  finGarantie: string;
  specificationsTechniques: string;
  immatriculation: string;
  numChassis: string;
  puissanceFiscale: string;
  typeBoite: string;
  typeCarburant: string;
  chargeUtile: string;
  dateProchaineVisiteTechnique: string;
  numInventaire: string;
  statutOperationnel: string;
  archived: boolean;
  nomenclatureCode?: string;
};

type ConfirmationState = {
  title: string;
  message: string;
  onConfirm: () => Promise<void>;
} | null;

type IndividualUnitData = {
  iup: string;
  numSerie: string;
  immatriculation: string;
  numChassis: string;
  numInventaire: string;
  localisation: string;
  etat: string;
};

type HistoryPanelState = {
  bien: Bien;
  loading: boolean;
  entries: BienHistoriqueEntry[];
} | null;

type ExportValue = string | number | boolean | null | undefined;
type ExportRecord = Record<string, ExportValue>;


const today = new Date().toISOString().slice(0, 10);

const EMPTY_FORM: BienForm = {
  id: null,
  iup: "",
  codeBien: "",
  designation: "",
  categorie: "MOBILIER",
  categoriePrincipale: "",
  codeFamille: "",
  familleCatalogue: "",
  codeSousCategorie: "",
  sousCategorie: "",
  dateAcquisition: today,
  modeAcquisition: "ACHAT",
  valeur: 0,
  dureeAmortissement: 0,
  valeurNetteComptable: 0,
  amortissementCumule: 0,
  localisation: "",
  coordonneesGps: "",
  service: "",
  etat: "NEUF",
  quantite: 1,
  observation: "",
  photoUrl: "",
  documentsUrls: [],
  titreFoncier: "",
  superficie: "",
  statutJuridique: "PROPRIETE_ETAT",
  permisOccuper: false,
  numSerie: "",
  fabricant: "",
  marque: "",
  modele: "",
  finGarantie: "",
  specificationsTechniques: "",
  immatriculation: "",
  numChassis: "",
  puissanceFiscale: "",
  typeBoite: "MANUELLE",
  typeCarburant: "ESSENCE",
  chargeUtile: "",
  dateProchaineVisiteTechnique: "",
  numInventaire: "",
  statutOperationnel: "ACTIF",
  archived: false,
  nomenclatureCode: "",
};

const CATEGORY_META: Record<MainCategory, { label: string; description: string; color: string; icon: React.ReactNode }> = {
  IMMOBILIER: {
    label: "Immobilier",
    description: "Terrains, bâtiments, ouvrages et infrastructures",
    color: "#1D9E75",
    icon: <Building2 size={32} />,
  },
  MOBILIER: {
    label: "Mobilier",
    description: "Meubles, équipements de bureau et de logement",
    color: "#378ADD",
    icon: <Armchair size={32} />,
  },
  INFORMATIQUE: {
    label: "Matériel informatique",
    description: "Ordinateurs, imprimantes, réseaux et accessoires",
    color: "#534AB7",
    icon: <Monitor size={32} />,
  },
  MATERIEL_ROULANT: {
    label: "Matériel roulant",
    description: "Véhicules de service, transport en commun et marchandises",
    color: "#BA7517",
    icon: <Car size={32} />,
  },
  MATERIEL_TECHNIQUE: {
    label: "Matériel technique",
    description: "Outillages, équipements médicaux, agricoles et spécialisés",
    color: "#D85A30",
    icon: <Wrench size={32} />,
  },
  INCORPORELS: {
    label: "Immobilisations incorporelles",
    description: "Brevets, licences, logiciels, marques et droits",
    color: "#993556",
    icon: <FileText size={32} />,
  },
  OEUVRES_COLLECTIONS: {
    label: "Œuvres et collections",
    description: "Peintures, sculptures, trophées et objets de collection",
    color: "#0F6E56",
    icon: <Palette size={32} />,
  },
  CHEPTELS: {
    label: "Cheptels",
    description: "Animaux d'élevage, de trait et de zoo",
    color: "#639922",
    icon: <Dog size={32} />,
  },
};

const formatMoney = (value?: number) => `${Math.round(value || 0).toLocaleString("fr-FR")} FCFA`;

const normalizeUrl = (url?: string) => {
  if (!url) return "";
  return url.startsWith("http") ? url : `${API_BASE_URL}${url.startsWith("/") ? "" : "/"}${url}`;
};

const serviceName = (service: ServiceOption) => service.nomService || service.nom || service.code || "";

const coerceServiceList = (value: unknown): ServiceOption[] => {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is ServiceOption => typeof item === "object" && item !== null);
};

const computeAccounting = (valeur: number, dateAcquisition: string, dureeAmortissement: number) => {
  if (!valeur || !dateAcquisition || !dureeAmortissement) {
    return { valeurNetteComptable: valeur || 0, amortissementCumule: 0 };
  }
  const acquisition = new Date(dateAcquisition);
  const elapsedYears = Math.max(0, (Date.now() - acquisition.getTime()) / (1000 * 60 * 60 * 24 * 365.25));
  const usedYears = Math.min(elapsedYears, dureeAmortissement);
  const amortissementCumule = (valeur / dureeAmortissement) * usedYears;
  return {
    valeurNetteComptable: Math.max(0, valeur - amortissementCumule),
    amortissementCumule,
  };
};

const toPayload = (form: BienForm): BienPayload => ({
  ...form,
  codeCategorie: form.categoriePrincipale || form.categorie,
  categorie: form.categoriePrincipale || form.categorie,
  nomenclature: form.nomenclatureCode ? { code: form.nomenclatureCode } : undefined,
  type:
    form.categoriePrincipale === "IMMOBILIER"
      ? "IMMOBILIER"
      : form.categoriePrincipale === "MATERIEL_ROULANT"
      ? "MATERIEL_ROULANT"
      : "MOBILIER",
  coordonneesGps: form.coordonneesGps,
});

const toExportRows = (biens: Bien[]): ExportRecord[] =>
  biens.map((bien) => ({
    id: bien.id,
    iup: bien.iup,
    designation: bien.designation,
    categorie: bien.categorie,
    service: bien.service,
    localisation: bien.localisation,
    etat: bien.etat,
    valeur: bien.valeur,
    valeurNetteComptable: bien.valeurNetteComptable,
    dateAcquisition: bien.dateAcquisition,
    statutOperationnel: bien.statutOperationnel,
  }));

const AnimatedNumber = ({ value, isMoney = false }: { value: number; isMoney?: boolean }) => {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDisplayValue(value);
      return;
    }
    let frame = 0;
    const startedAt = performance.now();
    const tick = (now: number) => {
      const progress = Math.min(1, (now - startedAt) / 1200);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplayValue(value * eased);
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [value]);

  if (isMoney) return <>{Math.round(displayValue).toLocaleString("fr-FR")} FCFA</>;
  return <>{Math.round(displayValue)}</>;
};

function ErrorText({ message }: { message?: string }) {
  return message ? <span className="field-error">{message}</span> : null;
}

function Stepper({ active, maxStep, onGo }: { active: StepKey; maxStep: StepKey; onGo: (step: StepKey) => void }) {
  if (active === 0) return null; // Ne pas afficher le stepper à l'étape de choix de famille

  const steps: Array<{ key: StepKey; label: string }> = [
    { key: 1, label: "Recensement" },
    { key: 2, label: "Identification" },
    { key: 3, label: "Affectation" },
  ];

  return (
    <div className="step-indicator-premium">
      {steps.map((step) => {
        const done = step.key < active || step.key < maxStep;
        const activeItem = active === step.key;
        const clickable = step.key <= maxStep;
        return (
          <div
            key={step.key}
            className={`step-item-premium ${activeItem ? "active" : ""} ${done ? "completed" : ""}`}
            onClick={() => clickable && onGo(step.key)}
            style={{ cursor: clickable ? "pointer" : "default" }}
          >
            <div className="step-circle-premium">
              {done ? "✓" : step.key}
            </div>
            <div className="step-label-premium">{step.label}</div>
          </div>
        );
      })}
    </div>
  );
}

export default function BiensPage() {
  const { showToast } = useToast();
  const navigate = useNavigate();
  const { data: biensData, loading, refresh } = useApi<Bien[]>("/biens?archived=false", []);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [catalogueNodes, setCatalogueNodes] = useState<CategoriePatrimoineDto[]>([]);
  const [view, setView] = useState<"gallery" | "form">("gallery");
  const [form, setForm] = useState<BienForm>(EMPTY_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [saving, setSaving] = useState(false);
  const [generatingIup, setGeneratingIup] = useState(false);
  const [generatingQr, setGeneratingQr] = useState(false);
  const [validatingImmatriculation, setValidatingImmatriculation] = useState(false);
  const [returningToGallery, setReturningToGallery] = useState(false);
  const [activeStep, setActiveStep] = useState<StepKey>(0);
  const [maxStep, setMaxStep] = useState<StepKey>(0);
  const [manualIup, setManualIup] = useState(false);
  const [iupUnique, setIupUnique] = useState<boolean | null>(null);
  const [iupMeta, setIupMeta] = useState<IupMeta | null>(null);
  const [qrCode, setQrCode] = useState("");
  const [showAffectationPrompt, setShowAffectationPrompt] = useState(false);
  const [createdBien, setCreatedBien] = useState<Bien | null>(null);
  const [confirmation, setConfirmation] = useState<ConfirmationState>(null);
  const [historyPanel, setHistoryPanel] = useState<HistoryPanelState>(null);
  const [filters, setFilters] = useState({
    category: "TOUS",
    etat: "TOUS",
    affectation: "TOUS",
    sort: "date" as SortMode,
    view: "grid" as ViewMode,
    query: "",
  });

  const [individualUnits, setIndividualUnits] = useState<IndividualUnitData[]>([]);
  const [currentUnitIndex, setCurrentUnitIndex] = useState(0);

  const [viewerMedia, setViewerMedia] = useState<{ url: string; type: MediaType; filename?: string } | null>(null);

  const handleDeleteDocument = async (urlToDelete: string) => {
    const targetBien = biens.find(b => b.documentsUrls?.some(u => normalizeUrl(u) === urlToDelete));
    if (!targetBien || !targetBien.id) return;

    if (window.confirm("Voulez-vous supprimer définitivement ce document joint ?")) {
      try {
        const updatedDocs = (targetBien.documentsUrls || []).filter(u => u !== urlToDelete);
        const type = targetBien.type || (targetBien.categoriePrincipale === "IMMOBILIER" ? "IMMOBILIER" : targetBien.categoriePrincipale === "MATERIEL_ROULANT" ? "MATERIEL_ROULANT" : "MOBILIER");
        await updateBien(targetBien.id, { documentsUrls: updatedDocs, type });
        showToast({ title: "Document détaché avec succès", type: "success" });
        setViewerMedia(null);
        void refresh();
      } catch (err) {
        showToast({ title: "Erreur lors de la suppression", type: "error" });
      }
    }
  };

  const resetFlow = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setManualIup(false);
    setIupUnique(null);
    setIupMeta(null);
    setQrCode("");
    setCreatedBien(null);
    setShowAffectationPrompt(false);
    setReturningToGallery(false);
    setActiveStep(0);
    setMaxStep(0);
    setView("gallery");
  };

  const biens = biensData || [];

  useEffect(() => {
    void getServices().then((data: unknown) => setServices(coerceServiceList(data))).catch(() => setServices([]));
  }, []);

  useEffect(() => {
    void getFlatCategories().then((data) => setCatalogueNodes(data)).catch(() => setCatalogueNodes([]));
  }, []);

  useEffect(() => {
    const accounting = computeAccounting(form.valeur, form.dateAcquisition, form.dureeAmortissement);
    setForm((current) =>
      current.valeurNetteComptable === accounting.valeurNetteComptable &&
      current.amortissementCumule === accounting.amortissementCumule
        ? current
        : { ...current, ...accounting }
    );
  }, [form.dateAcquisition, form.dureeAmortissement, form.valeur]);

  useEffect(() => {
    const iup = form.iup.trim();
    if (!iup) {
      setIupUnique(null);
      setIupMeta(null);
      return;
    }
    const parts = iup.split("-");
    if (parts.length === 4) {
      const [prefixe, categorie, anneeText, sequence] = parts;
      const annee = Number(anneeText);
      if (!Number.isNaN(annee)) {
        setIupMeta({ prefixe, categorie, annee, sequence });
      }
    }
    const timer = window.setTimeout(async () => {
      if (!/^[A-Z]{2,4}-[A-Z]{2,4}-\d{4}-\d{6}$/.test(iup)) {
        setIupUnique(false);
        return;
      }
      const result = await validateIup(iup).catch(() => ({ unique: false }));
      setIupUnique(result.unique);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [form.iup]);

  const totals = useMemo(() => {
    const visible = biens.filter((bien) => !bien.archived);
    return {
      count: visible.length,
      value: visible.reduce((sum, bien) => sum + (bien.valeur || 0), 0),
      affected: visible.filter((bien) => Boolean(bien.service) || bien.statutOperationnel === "AFFECTE").length,
      free: visible.filter((bien) => !bien.service && bien.statutOperationnel !== "AFFECTE").length,
    };
  }, [biens]);

  const filteredBiens = useMemo(() => {
    const term = filters.query.trim().toLowerCase();
    const list = biens.filter((bien) => {
      const categoryOk = filters.category === "TOUS" || bien.categorie === filters.category || bien.categoriePrincipale === filters.category;
      const etatOk = filters.etat === "TOUS" || bien.etat === filters.etat;
      const isAffected = Boolean(bien.service) || bien.statutOperationnel === "AFFECTE";
      const affectationOk =
        filters.affectation === "TOUS" ||
        (filters.affectation === "AFFECTE" && isAffected) ||
        (filters.affectation === "NON_AFFECTE" && !isAffected) ||
        (filters.affectation === "REFORME" && bien.statutOperationnel === "REFORME");
      const searchOk =
        !term ||
        [bien.iup, bien.designation, bien.service, bien.localisation, bien.sousCategorie]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(term));
      return categoryOk && etatOk && affectationOk && searchOk;
    });

    return [...list].sort((a, b) => {
      if (filters.sort === "valeur") return (b.valeur || 0) - (a.valeur || 0);
      if (filters.sort === "designation") return a.designation.localeCompare(b.designation);
      return String(b.dateAcquisition || "").localeCompare(String(a.dateAcquisition || ""));
    });
  }, [biens, filters]);

  const exportRows = useMemo(() => toExportRows(filteredBiens), [filteredBiens]);



  const catalogueLabelMap = useMemo(() => {
    const map = new Map<string, string>();
    catalogueNodes.forEach((node) => {
      map.set(node.code, node.libelle);
    });
    return map;
  }, [catalogueNodes]);

  const updateField = <K extends keyof BienForm>(key: K, value: BienForm[K]) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  const updateUnitField = (index: number, key: keyof IndividualUnitData, value: string) => {
    setIndividualUnits((current) => {
      const next = [...current];
      next[index] = { ...next[index], [key]: value };
      return next;
    });
  };

  const selectCategory = (category: MainCategory) => {
    setForm((current) => ({
      ...current,
      categorie: category,
      categoriePrincipale: category,
      quantite: category === "IMMOBILIER" ? 1 : current.quantite,
    }));
    setErrors((current) => ({ ...current, categoriePrincipale: undefined }));
  };

  const famillesDisponibles = useMemo(() => {
    if (!form.categoriePrincipale) return [];
    const exact = catalogueNodes.filter((n) => n.codeParent === form.categoriePrincipale);
    if (exact.length > 0) return exact;
    return catalogueNodes.filter((n) => !n.codeParent || String(n.niveau).toUpperCase() === "FAMILLE");
  }, [catalogueNodes, form.categoriePrincipale]);

  const sousCategoriesDisponibles = useMemo(() => {
    if (!form.codeFamille) return [];
    return catalogueNodes.filter((n) => n.codeParent === form.codeFamille);
  }, [catalogueNodes, form.codeFamille]);

  const captureGps = () => {
    if (!navigator.geolocation) {
      showToast({ type: "warning", title: "GPS indisponible", message: "Le navigateur ne permet pas la geolocalisation." });
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        updateField("coordonneesGps", `${position.coords.latitude.toFixed(6)}, ${position.coords.longitude.toFixed(6)}`);
        showToast({ type: "success", title: "Coordonnees GPS capturees" });
      },
      () => showToast({ type: "error", title: "Capture GPS impossible" })
    );
  };

  const validatePhaseOne = () => {
    const nextErrors: FormErrors = {};
    if (!form.categoriePrincipale) nextErrors.categoriePrincipale = "Choisissez une categorie principale.";
    if (!form.codeSousCategorie) nextErrors.codeSousCategorie = "Choisissez une famille puis une sous-categorie.";
    if (!form.designation.trim()) nextErrors.designation = "La designation est obligatoire.";
    if (!form.dateAcquisition) nextErrors.dateAcquisition = "La date d'acquisition est obligatoire.";
    if (form.dateAcquisition && form.dateAcquisition > today) nextErrors.dateAcquisition = "La date d'acquisition ne peut pas etre dans le futur.";
    if (!form.valeur || form.valeur <= 0) nextErrors.valeur = "La valeur d'acquisition est obligatoire.";
    if (!form.modeAcquisition.trim()) nextErrors.modeAcquisition = "Le mode d'acquisition est obligatoire.";
    if (!form.localisation.trim()) nextErrors.localisation = "La localisation precise est obligatoire.";
    if (!form.service.trim()) nextErrors.service = "Le service detenteur est obligatoire.";
    if (form.categoriePrincipale !== "IMMOBILIER" && (!form.quantite || form.quantite < 1)) {
      nextErrors.quantite = "La quantite doit etre au minimum egale a 1.";
    }
    if (form.categoriePrincipale === "IMMOBILIER" && !form.coordonneesGps.trim()) {
      nextErrors.coordonneesGps = "Les coordonnees GPS sont obligatoires pour l'immobilier.";
    }
    if (form.categoriePrincipale === "IMMOBILIER" && !form.titreFoncier.trim()) {
      nextErrors.titreFoncier = "Le titre foncier est obligatoire pour l'immobilier.";
    }
    if (form.categoriePrincipale === "IMMOBILIER" && !form.superficie.trim()) {
      nextErrors.superficie = "La superficie est obligatoire pour l'immobilier.";
    }
    if (form.categoriePrincipale === "MATERIEL_ROULANT" && !form.immatriculation.trim()) {
      nextErrors.immatriculation = "L'immatriculation est obligatoire.";
    }
    if (
      form.categoriePrincipale === "MATERIEL_ROULANT" &&
      form.immatriculation.trim() &&
      biens.some(
        (bien) =>
          bien.id !== form.id &&
          String(bien.immatriculation || "")
            .trim()
            .toUpperCase() === form.immatriculation.trim().toUpperCase()
      )
    ) {
      nextErrors.immatriculation = "Cette immatriculation existe deja dans le registre.";
    }
    if (form.categoriePrincipale === "MATERIEL_ROULANT" && !form.numChassis.trim()) {
      nextErrors.numChassis = "Le numero de chassis est obligatoire.";
    }
    if (form.categoriePrincipale === "MATERIEL_ROULANT" && !form.marque.trim()) {
      nextErrors.marque = "La marque est obligatoire pour le materiel roulant.";
    }
    if (form.categoriePrincipale === "MATERIEL_ROULANT" && !form.modele.trim()) {
      nextErrors.modele = "Le modele est obligatoire pour le materiel roulant.";
    }
    if (form.finGarantie && form.dateAcquisition && form.finGarantie < form.dateAcquisition) {
      nextErrors.finGarantie = "La fin de garantie doit etre posterieure a la date d'acquisition.";
    }
    if (form.dateProchaineVisiteTechnique && form.dateAcquisition && form.dateProchaineVisiteTechnique < form.dateAcquisition) {
      nextErrors.dateProchaineVisiteTechnique = "La visite technique ne peut pas preceder l'acquisition.";
    }
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const goIdentification = async () => {
    if (!validatePhaseOne()) return;
    if (form.categoriePrincipale === "MATERIEL_ROULANT" && form.immatriculation.trim()) {
      try {
        setValidatingImmatriculation(true);
        const result = await validateImmatriculation(form.immatriculation.trim(), form.id);
        if (!result.unique) {
          setErrors((current) => ({
            ...current,
            immatriculation: "Cette immatriculation existe deja dans le registre et bloque le passage a l'identification.",
          }));
          return;
        }
      } finally {
        setValidatingImmatriculation(false);
      }
    }
    // Initialiser les données individuelles pour chaque unité
    const count = form.quantite || 1;
    const initialUnits: IndividualUnitData[] = Array.from({ length: count }, (_, i) => ({
      iup: (count === 1 && form.iup) ? form.iup : "",
      numSerie: form.numSerie,
      immatriculation: form.immatriculation,
      numChassis: form.numChassis,
      numInventaire: form.numInventaire ? (count > 1 ? `${form.numInventaire}-${i + 1}` : form.numInventaire) : "",
      localisation: form.localisation,
      etat: form.etat,
    }));
    setIndividualUnits(initialUnits);
    setCurrentUnitIndex(0);
    
    setMaxStep(2);
    setActiveStep(2);
  };

  const handleGenerateIup = async () => {
    const code = form.nomenclatureCode || form.codeSousCategorie || form.codeFamille;
    if (!code) {
      showToast({ type: "warning", title: "Codification manquante", message: "Veuillez selectionner un article dans la nomenclature." });
      return;
    }
    try {
      setGeneratingIup(true);
      const result = await generateIup({
        nomenclatureCode: code,
        annee: new Date(form.dateAcquisition || today).getFullYear(),
      }).catch(() => null);

      if (!result?.iup) {
        showToast({ type: "error", title: "Generation IUP impossible" });
        return;
      }
      updateField("iup", result.iup);
      setIupMeta({
        prefixe: result.prefixe || "IMM",
        categorie: result.categorie || result.nomenclature || code,
        annee: result.annee || new Date(form.dateAcquisition || today).getFullYear(),
        sequence: result.sequence || result.iup.split("-")[3] || "000001",
      });
      setManualIup(false);
      showToast({ type: "success", title: "IUP genere", message: result.iup });
    } finally {
      setGeneratingIup(false);
    }
  };

  const handleGenerateIupForUnit = async (index: number) => {
    const code = form.nomenclatureCode || form.codeSousCategorie || form.codeFamille;
    if (!code) {
      showToast({ type: "warning", title: "Codification manquante", message: "Veuillez selectionner un article dans la nomenclature." });
      return;
    }
    try {
      setGeneratingIup(true);
      const result = await generateIup({
        nomenclatureCode: code,
        annee: new Date(form.dateAcquisition || today).getFullYear(),
      }).catch(() => null);

      if (!result?.iup) {
        showToast({ type: "error", title: "Generation IUP impossible" });
        return;
      }
      updateUnitField(index, "iup", result.iup);
      showToast({ type: "success", title: `IUP généré pour l'unité ${index + 1}`, message: result.iup });
    } finally {
      setGeneratingIup(false);
    }
  };

  const handleGenerateQrForUnit = async (index: number) => {
    const unitIup = individualUnits[index]?.iup;
    if (!unitIup) return;
    try {
      setGeneratingQr(true);
      const result = await getBienQrCode(unitIup).catch(() => null);
      if (!result?.qrCodeBase64) {
        showToast({ type: "error", title: "QR Code indisponible" });
        return;
      }
      setQrCode(result.qrCodeBase64);
    } finally {
      setGeneratingQr(false);
    }
  };

  const copyIup = async (iup: string) => {
    try {
      await navigator.clipboard.writeText(iup);
      showToast({ type: "success", title: "IUP copie !" });
    } catch {
      showToast({ type: "warning", title: "Copie impossible", message: "Copiez l'IUP manuellement depuis le champ affiche." });
    }
  };

  const saveAllUnits = async () => {
    const missingIup = individualUnits.some(u => !u.iup);
    if (missingIup) {
      showToast({ type: 'error', title: 'IUP Manquants', message: 'Toutes les unités doivent avoir un IUP généré ou saisi.' });
      return;
    }

    try {
      setSaving(true);
      const savedBiens: Bien[] = [];

      // CAS 1 : MODIFICATION d'un bien existant
      if (form.id) {
        const unit = individualUnits[0];
        const payload: BienPayload = {
          ...toPayload(form),
          iup: unit.iup,
          numSerie: unit.numSerie,
          immatriculation: unit.immatriculation,
          numChassis: unit.numChassis,
          numInventaire: unit.numInventaire,
          localisation: unit.localisation,
          etat: unit.etat,
          quantite: 1
        };
        const updated = await updateBien(form.id, payload);
        savedBiens.push(updated);
      } 
      // CAS 2 : CRÉATION de nouvelles unités
      else {
        for (const unit of individualUnits) {
          const payload: BienPayload = {
            ...toPayload(form),
            id: undefined, // CRITIQUE : Supprimer l'ID pour forcer la création
            iup: unit.iup,
            numSerie: unit.numSerie,
            immatriculation: unit.immatriculation,
            numChassis: unit.numChassis,
            numInventaire: unit.numInventaire,
            localisation: unit.localisation,
            etat: unit.etat,
            quantite: 1
          };
          const saved = await createBien(payload);
          savedBiens.push(saved);
        }
      }

      setCreatedBien(savedBiens[0]);
      await refresh();
      showToast({ type: "success", title: form.id ? "Modification enregistrée" : `${savedBiens.length} actif(s) enregistré(s)` });
      setMaxStep(3);
      setActiveStep(3);
      setShowAffectationPrompt(true);
    } catch (err: any) {
      const serverError = err.response?.data;
      const errorMsg = serverError?.message || serverError?.error || "Erreur lors de l'enregistrement.";
      console.error("ÉCHEC ENREGISTREMENT:", serverError || err);
      showToast({ type: "error", title: "Erreur", message: errorMsg });
    } finally {
      setSaving(false);
    }
  };

  const editBien = (bien: Bien) => {
    setForm({
      ...EMPTY_FORM,
      ...bien,
      id: bien.id,
      categorie: (bien.categoriePrincipale || bien.categorie || "MOBILIER") as MainCategory,
      categoriePrincipale: (bien.categoriePrincipale || bien.categorie || "MOBILIER") as MainCategory,
      coordonneesGps: bien.coordonneesGps || bien.coordonneeGps || "",
      documentsUrls: bien.documentsUrls || [],
      dateAcquisition: bien.dateAcquisition || today,
    });
    setView("form");
    setActiveStep(1);
    setMaxStep(2);
  };

  const askDelete = (bien: Bien) => {
    if (!bien.id) {
      showToast({ type: "error", title: "Erreur", message: "ID du bien manquant, impossible de supprimer." });
      return;
    }
    setConfirmation({
      title: "Supprimer le bien",
      message: `Confirmer la suppression de ${bien.designation} ? Cette action est irreversible.`,
      onConfirm: async () => {
        try {
          await deleteBien(bien.id as number);
          await refresh();
          showToast({ type: "success", title: "Bien supprime avec succes" });
        } catch (err: any) {
          console.error("Erreur suppression:", err);
          showToast({ type: "error", title: "Erreur", message: "Echec de la suppression : " + (err.response?.data?.message || err.message) });
        }
      },
    });
  };

  const openHistory = async (bien: Bien) => {
    if (!bien.id) {
      showToast({ type: "warning", title: "Historique indisponible", message: "Ce bien doit etre enregistre avant consultation de son historique." });
      return;
    }

    setHistoryPanel({ bien, loading: true, entries: [] });
    const entries = await getBienHistorique(bien.id).catch(() => []);
    setHistoryPanel({ bien, loading: false, entries });
  };

  const openNewForm = () => {
    setForm(EMPTY_FORM);
    setErrors({});
    setManualIup(false);
    setIupUnique(null);
    setIupMeta(null);
    setQrCode("");
    setActiveStep(0);
    setMaxStep(0);
    setView("form");
  };

  const openAffectationFlow = (bien?: Bien | null) => {
    const targetBien = bien || createdBien;
    if (!targetBien) {
      resetFlow();
      navigate("/affectations");
      return;
    }
    setShowAffectationPrompt(false);
    navigate("/affectations", {
      state: {
        prefillBien: targetBien,
        source: "biens",
      },
    });
  };

  const finalizeWithoutAffectation = () => {
    setShowAffectationPrompt(false);
    setReturningToGallery(true);
    showToast({
      type: "info",
      title: "Retour vers la galerie",
      message: "Le bien a ete enregistre. Retour automatique a la galerie dans 2 secondes.",
    });
    window.setTimeout(() => {
      resetFlow();
    }, 2000);
  };

  const openActionModule = (path: string, bien: Bien, title: string) => {
    navigate(path, {
      state: {
        prefillBien: bien,
        source: "biens",
      },
    });
    showToast({ type: "info", title, message: `${bien.designation} preselectionne dans le module cible.` });
  };

  const renderCataloguePath = (categoryCode?: string, familyCode?: string, familyLabel?: string, subCode?: string, subLabel?: string) => {
    const categoryLabel = categoryCode ? CATEGORY_META[categoryCode as MainCategory]?.label || categoryCode : "Categorie";
    const familyText = familyCode ? `${familyCode}${familyLabel ? ` - ${familyLabel}` : ""}` : "Famille";
    const subText = subCode ? `${subCode}${subLabel ? ` - ${subLabel}` : ""}` : "Sous-categorie";
    return `${categoryLabel} > ${familyText} > ${subText}`;
  };

  return (
    <div className="dashboard-container biens-page-shell fade-in">
      <header className="page-header-premium">
        <div className="header-meta">
          <span className="badge-pill-glow">Registre patrimonial</span>
          <h1>Gestion des biens</h1>
          <p className="header-subtitle">Recensement, identification IUP, galerie operationnelle et actions rapides.</p>
        </div>
        <div className="export-bar">
          <button type="button" className="btn-export" onClick={() => exportLivreJournalPremiumExcel(exportRows, "Livre_Journal.xlsx")}>
            Livre journal
          </button>
          <button type="button" className="btn-export" onClick={() => void exportGrandLivrePremiumExcel(exportRows, "Grand_Livre.xlsx")}>
            Grand livre
          </button>
          <button type="button" className="btn-export" onClick={() => exportPdf(exportRows, "Registre patrimonial", "registre.pdf")}>
            Rapport PDF
          </button>
          <button type="button" className="primary" onClick={openNewForm}>
            Nouveau bien
          </button>
        </div>
      </header>

      {view === "gallery" ? (
        <section className="patris-gallery">
          <div className="gallery-counter">
            <strong><AnimatedNumber value={totals.count} /> biens</strong>
            <span>Valeur totale : <AnimatedNumber value={totals.value} isMoney /></span>
            <span><AnimatedNumber value={totals.affected} /> affectés</span>
            <span><AnimatedNumber value={totals.free} /> à affecter</span>
          </div>

          <div className="gallery-filters sticky-filters">
            <input
              value={filters.query}
              onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
              placeholder="Rechercher IUP, designation, service"
            />
            <div className="filter-pills">
              {["TOUS", "IMMOBILIER", "MOBILIER", "MATERIEL_ROULANT"].map((category) => (
                <button
                  key={category}
                  type="button"
                  className={filters.category === category ? "active" : ""}
                  onClick={() => setFilters((current) => ({ ...current, category }))}
                >
                  {category === "TOUS" ? "Tous" : CATEGORY_META[category as MainCategory].label}
                </button>
              ))}
            </div>
            <select value={filters.etat} onChange={(event) => setFilters((current) => ({ ...current, etat: event.target.value }))}>
              {["TOUS", "NEUF", "BON", "MOYEN", "DEGRADE", "HORS_SERVICE"].map((etat) => (
                <option key={etat} value={etat}>
                  {etat === "TOUS" ? "Tous etats" : etat}
                </option>
              ))}
            </select>
            <select
              value={filters.affectation}
              onChange={(event) => setFilters((current) => ({ ...current, affectation: event.target.value }))}
            >
              <option value="TOUS">Tous statuts</option>
              <option value="AFFECTE">Affecte</option>
              <option value="NON_AFFECTE">Non affecte</option>
              <option value="REFORME">Reforme</option>
            </select>
            <select value={filters.sort} onChange={(event) => setFilters((current) => ({ ...current, sort: event.target.value as SortMode }))}>
              <option value="date">Date acquisition</option>
              <option value="valeur">Valeur</option>
              <option value="designation">Designation A-Z</option>
            </select>
            <div className="view-toggle">
              <button type="button" className={filters.view === "grid" ? "active" : ""} onClick={() => setFilters((current) => ({ ...current, view: "grid" }))}>
                Grille
              </button>
              <button type="button" className={filters.view === "list" ? "active" : ""} onClick={() => setFilters((current) => ({ ...current, view: "list" }))}>
                Liste
              </button>
            </div>
          </div>

          {loading ? (
            <div className="asset-grid">
              {[1, 2, 3].map((item) => (
                <div key={item} className="skeleton skeleton-card" />
              ))}
            </div>
          ) : (
            <div className={filters.view === "grid" ? "asset-grid patris-asset-grid" : "asset-list"}>
              {filteredBiens.map((bien) => {
                const category = (bien.categoriePrincipale || bien.categorie || "MOBILIER") as MainCategory;
                const vnc = bien.valeurNetteComptable ?? bien.valeur;
                const amortPercent = bien.valeur ? Math.min(100, Math.round(((bien.valeur - vnc) / bien.valeur) * 100)) : 0;
                const affected = Boolean(bien.service) || bien.statutOperationnel === "AFFECTE";
                return (
                  <article key={bien.id || bien.iup} className={`asset-card patrimony-card ${CATEGORY_META[category]?.color || ""}`}>
                    <div className="asset-band" />
                    <div className="card-badge-row">
                      <button type="button" className="badge-premium monospace" onClick={() => bien.iup && void copyIup(bien.iup)}>
                        {bien.iup || "Sans IUP"}
                      </button>
                      <span className={`operation-badge operation-${String(bien.statutOperationnel || "ACTIF").toLowerCase()}`}>
                        {bien.statutOperationnel || "ACTIF"}
                      </span>
                    </div>
                    {bien.photoUrl ? (
                      <div 
                        className="card-media-premium" 
                        onClick={() => setViewerMedia({ url: normalizeUrl(bien.photoUrl!), type: "image", filename: bien.designation })}
                      >
                        <img src={normalizeUrl(bien.photoUrl)} alt={bien.designation} />
                        {bien.documentsUrls && bien.documentsUrls.length > 0 && (
                          <div className="media-badge-premium" title={`${bien.documentsUrls.length} document(s) attaché(s)`}>
                            <FileText size={12} />
                            <span>{bien.documentsUrls.length}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="card-media-premium" style={{ display: 'grid', placeItems: 'center', background: 'var(--bg-input)', cursor: 'default' }}>
                        {CATEGORY_META[category]?.icon}
                      </div>
                    )}
                    <h3>{bien.designation}</h3>
                    <p className="asset-breadcrumb">
                      {renderCataloguePath(
                        bien.categoriePrincipale || bien.categorie,
                        bien.codeFamille,
                        bien.familleCatalogue,
                        bien.codeSousCategorie,
                        bien.sousCategorie
                      )}
                    </p>
                    <div className="asset-values">
                      <span>Acquisition : {formatMoney(bien.valeur)}</span>
                      <span>VNC : {formatMoney(vnc)}</span>
                      <i><b style={{ width: `${amortPercent}%` }} /></i>
                    </div>
                    <div className={affected ? "assignment-box affected" : "assignment-box"}>
                      {affected ? (
                        <>
                          <strong>Affecte a : {bien.service}</strong>
                          <span>{bien.dateAffectation || "Date non renseignee"}</span>
                        </>
                      ) : (
                        <>
                          <strong>Non affecte</strong>
                          <button type="button" onClick={() => openAffectationFlow(bien)}>Affecter &gt;</button>
                        </>
                      )}
                    </div>
                    {(() => {
                      const docs = (bien as any).documentsUrls || (bien as any).documentUrls || [];
                      if (docs.length === 0) return null;
                      
                      return (
                        <div className="card-documents-panel" style={{ padding: '0 16px 12px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: 'var(--text-dim)', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                            <FileText size={12} />
                            <span>Pièces jointes ({docs.length})</span>
                          </div>
                          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                            {docs.map((docUrl: string, idx: number) => {
                              const isPdf = docUrl.toLowerCase().endsWith(".pdf");
                              return (
                                <button 
                                  key={idx}
                                  type="button" 
                                  className="doc-pill"
                                  title={isPdf ? "Ouvrir le PDF" : "Ouvrir le document"}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setViewerMedia({ 
                                      url: normalizeUrl(docUrl), 
                                      type: isPdf ? "pdf" : "image", 
                                      filename: `Document ${idx + 1}` 
                                    });
                                  }}
                                >
                                  <FileText size={10} />
                                  <span>Doc {idx + 1}</span>
                                </button>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })()}
                    <div className="card-actions icon-actions">
                      <button type="button" title="Modifier" onClick={() => editBien(bien)}>Modifier</button>
                      <button type="button" title="Historique" onClick={() => void openHistory(bien)}>Historique</button>
                      <button type="button" title="Affecter" onClick={() => openAffectationFlow(bien)}>Affecter</button>
                      <button type="button" title="Maintenance" onClick={() => openActionModule("/entretiens", bien, "Maintenance")}>Maintenance</button>
                      <button type="button" title="Sinistre" onClick={() => openActionModule("/sinistres", bien, "Declaration sinistre")}>Sinistre</button>
                      <button type="button" title="Reformer" onClick={() => openActionModule("/reforme", bien, "Procedure de reforme")}>Reformer</button>
                      <button type="button" title="Supprimer" className="danger-text" onClick={() => askDelete(bien)}>Suppr.</button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      ) : (
        <section className="registration-flow">
          <div className="centered-form-card large-form-card fade-in-up">
            <div className="form-header-premium glass-card" style={{ marginBottom: 24, borderBottom: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                <div className="step-circle-premium active" style={{ width: 48, height: 48, fontSize: 20 }}>
                  <Sparkles />
                </div>
                <div>
                  <h2 style={{ margin: 0, fontSize: '1.8rem' }}>{form.id ? "Modification d'Actif" : "Nouvel Enregistrement"}</h2>
                  <p className="form-subtitle" style={{ margin: 0, opacity: 0.8 }}>Flux métier : Recensement, Identification & Affectation</p>
                </div>
              </div>
              <button type="button" className="btn-export glass-card" style={{ padding: '8px 20px', borderRadius: 12 }} onClick={() => setView("gallery")}>
                <X size={18} style={{ marginRight: 8 }} /> Fermer
              </button>
            </div>

            <Stepper active={activeStep} maxStep={maxStep} onGo={setActiveStep} />

            {activeStep === 0 ? (
              <div className="step-panel fade-in-up">
                <div style={{ textAlign: 'center', marginBottom: 40 }}>
                  <h3 style={{ fontSize: '1.5rem', marginBottom: 10 }}>Sélectionnez la famille du bien</h3>
                  <p style={{ opacity: 0.7 }}>Choisissez le type d'actif pour adapter automatiquement le formulaire de recensement.</p>
                </div>
                
                <div className="family-selection-grid">
                  {(Object.keys(CATEGORY_META) as MainCategory[]).map((category) => (
                    <button
                      key={category}
                      type="button"
                      className={`family-card-premium glass-card ${form.categoriePrincipale === category ? "selected" : ""}`}
                      onClick={() => {
                        selectCategory(category);
                        setMaxStep(1);
                        setActiveStep(1);
                      }}
                    >
                      <div className="family-icon" style={{ color: CATEGORY_META[category].color }}>
                        {CATEGORY_META[category].icon}
                      </div>
                      <div className="family-info">
                        <strong>{CATEGORY_META[category].label}</strong>
                        <p>{CATEGORY_META[category].description}</p>
                      </div>
                      <div className="family-check">
                        <ChevronRight size={24} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            ) : null}

            {activeStep === 1 ? (
              <div className="step-panel fade-in-up">
                {/* Section 1: Classification */}
                <div className="glass-card stagger-1" style={{ marginBottom: 24 }}>
                  <h3 className="premium-section-title"><Sparkles size={18} /> 1. Classification & Nomenclature</h3>
                  <ErrorText message={errors.categoriePrincipale} />

                  <div className="full-span" style={{ marginTop: 24 }}>
                    <div className="selected-family-badge" style={{ background: CATEGORY_META[form.categoriePrincipale as MainCategory]?.color + '22', border: `1px solid ${CATEGORY_META[form.categoriePrincipale as MainCategory]?.color}` }}>
                      <span style={{ color: CATEGORY_META[form.categoriePrincipale as MainCategory]?.color }}>
                        {CATEGORY_META[form.categoriePrincipale as MainCategory]?.icon}
                      </span>
                      <strong>Famille : {CATEGORY_META[form.categoriePrincipale as MainCategory]?.label}</strong>
                      <button type="button" onClick={() => setActiveStep(0)} className="change-family-btn">Changer</button>
                    </div>

                    <div style={{ marginTop: 20 }}>
                      <label className="field-label-modern">Rechercher dans la nomenclature {CATEGORY_META[form.categoriePrincipale as MainCategory]?.label}</label>
                      <NomenclatureSelector
                        partie="A"
                        family={form.categoriePrincipale}
                        onSelect={(article) => {
                          setForm((cur) => ({
                            ...cur,
                            nomenclatureCode: article.code,
                            codeSousCategorie: article.code,
                            sousCategorie: article.intitule,
                            codeFamille: article.famille,
                            familleCatalogue: article.famille,
                            designation: cur.designation || article.intitule,
                          }));
                          setErrors((cur) => ({ ...cur, codeSousCategorie: undefined, designation: undefined }));
                        }}
                      />
                    </div>
                  </div>
                </div>

                {/* Section 2: Identification de base */}
                <div className="glass-card stagger-2" style={{ marginBottom: 24 }}>
                  <h3 className="premium-section-title"><Search size={18} /> 2. Identification de l'Actif</h3>
                  <div className="grid-2">
                    <Field label="Désignation de l'article" error={errors.designation}>
                      <input 
                        className="premium-input" 
                        placeholder="Ex: Ordinateur Portable HP EliteBook"
                        value={form.designation} 
                        onChange={(event) => updateField("designation", event.target.value)} 
                      />
                    </Field>
                    <Field label="Localisation précise" error={errors.localisation}>
                      <input 
                        className="premium-input"
                        placeholder="Ex: Bureau 204, 2ème étage"
                        value={form.localisation} 
                        onChange={(event) => updateField("localisation", event.target.value)} 
                      />
                    </Field>
                    <Field label="Service détenteur" error={errors.service}>
                      <select className="premium-input" value={form.service} onChange={(event) => updateField("service", event.target.value)}>
                        <option value="">-- Choisir un service --</option>
                        {services.map((service) => {
                          const name = serviceName(service);
                          return <option key={service.id || name} value={name}>{name}</option>;
                        })}
                      </select>
                    </Field>
                    <Field label="État initial">
                      <select className="premium-input" value={form.etat} onChange={(event) => updateField("etat", event.target.value)}>
                        {["NEUF", "BON", "MOYEN", "DEGRADE", "HORS_SERVICE"].map((item) => <option key={item}>{item}</option>)}
                      </select>
                    </Field>
                  </div>
                </div>

                {/* Section 3: Acquisition & Valeur */}
                <div className="glass-card stagger-3" style={{ marginBottom: 24 }}>
                  <h3 className="premium-section-title"><CheckCircle2 size={18} /> 3. Acquisition & Données Comptables</h3>
                  <div className="grid-2">
                    <Field label="Date d'acquisition" error={errors.dateAcquisition}>
                      <input type="date" className="premium-input" value={form.dateAcquisition} onChange={(event) => updateField("dateAcquisition", event.target.value)} />
                    </Field>
                    <Field label="Mode d'acquisition" error={errors.modeAcquisition}>
                      <select className="premium-input" value={form.modeAcquisition} onChange={(event) => updateField("modeAcquisition", event.target.value)}>
                        {["ACHAT", "DON", "LEGS", "TRANSFERT", "PRODUCTION_PROPRE"].map((item) => <option key={item}>{item}</option>)}
                      </select>
                    </Field>
                    <Field label="Valeur d'acquisition (FCFA)" error={errors.valeur}>
                      <div className="input-with-icon">
                        <input type="number" className="premium-input" min={0} value={form.valeur} onChange={(event) => updateField("valeur", Number(event.target.value))} />
                        <span className="input-unit">CFA</span>
                      </div>
                      <small className="field-hint" style={{ color: 'var(--primary)', fontWeight: 700 }}>{formatMoney(form.valeur)}</small>
                    </Field>
                    <Field label="Durée d'amortissement (Années)">
                      <input type="number" className="premium-input" min={0} value={form.dureeAmortissement} onChange={(event) => updateField("dureeAmortissement", Number(event.target.value))} />
                    </Field>
                    <Field label="VNC calculée">
                      <input readOnly className="premium-input readonly" value={formatMoney(form.valeurNetteComptable)} />
                    </Field>
                    <Field label="Coordonnées GPS" error={errors.coordonneesGps}>
                      <div className="field-inline">
                        <input className="premium-input" placeholder="Latitude, Longitude" value={form.coordonneesGps} onChange={(event) => updateField("coordonneesGps", event.target.value)} />
                        <button type="button" className="btn-export glass-card" style={{ whiteSpace: 'nowrap' }} onClick={captureGps}>Capturer GPS</button>
                      </div>
                    </Field>
                  </div>
                </div>

                {/* Section 4: Médias & Observations */}
                <div className="glass-card stagger-4" style={{ marginBottom: 24 }}>
                  <h3 className="premium-section-title"><X size={18} /> 4. Détails Supplémentaires & Médias</h3>
                  <div className="grid-2">
                    {form.categoriePrincipale !== "IMMOBILIER" ? (
                      <Field label="Quantité" error={errors.quantite}>
                        <input type="number" className="premium-input" min={1} value={form.quantite} onChange={(event) => updateField("quantite", Number(event.target.value))} />
                      </Field>
                    ) : (
                      <Field label="Quantité">
                        <input readOnly className="premium-input readonly" value="1" />
                      </Field>
                    )}
                    <Field label="Photo de l'actif">
                      <ImageUpload value={form.photoUrl} onChange={(url) => updateField("photoUrl", url)} />
                    </Field>
                    <Field label="Documents joints (Factures, PV...)">
                      <FileUpload onUploadSuccess={(url) => updateField("documentsUrls", [...form.documentsUrls, url])} />
                      {form.documentsUrls.length > 0 ? (
                        <div className="badge-pill-glow" style={{ marginTop: 8, display: 'inline-block' }}>{form.documentsUrls.length} document(s) joint(s)</div>
                      ) : null}
                    </Field>
                    <Field label="Observations" span>
                      <textarea rows={3} className="premium-input" placeholder="Remarques éventuelles sur l'état ou l'origine du bien..." value={form.observation} onChange={(event) => updateField("observation", event.target.value)} />
                    </Field>
                  </div>
                </div>

                <SpecificFields form={form} updateField={updateField} errors={errors} />

                <div className="form-footer glass-card" style={{ background: 'var(--premium-accent)', color: 'white', border: 'none' }}>
                  <button
                    type="button"
                    className="primary-premium"
                    style={{ background: 'white', color: 'var(--premium-accent)', fontWeight: 800, padding: '12px 30px', borderRadius: 15, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, width: '100%', justifyContent: 'center' }}
                    disabled={validatingImmatriculation}
                    onClick={() => void goIdentification()}
                  >
                    {validatingImmatriculation ? "Validation en cours..." : "Continuer vers l'identification du bien"} <ChevronRight size={20} />
                  </button>
                </div>
              </div>
            ) : null}

            {activeStep === 2 ? (
              <div className="step-panel fade-in-up">
                <div className="glass-card" style={{ marginBottom: 24, borderLeft: `4px solid ${CATEGORY_META[form.categoriePrincipale as MainCategory]?.color || '#7c3aed'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ margin: 0 }}>{form.designation}</h3>
                      <p style={{ margin: '4px 0', opacity: 0.7 }}>
                        {form.categoriePrincipale} · {formatMoney(form.valeur)} · {form.service || "Sans service"}
                      </p>
                    </div>
                    <div className="badge-pill-glow" style={{ fontSize: 10 }}>
                      {renderCataloguePath(form.categoriePrincipale, form.codeFamille, form.familleCatalogue, form.codeSousCategorie, form.sousCategorie)}
                    </div>
                  </div>
                </div>

                {form.quantite > 1 && (
                  <div className="unit-navigator-premium glass-card stagger-1">
                    <div className="unit-nav-info">
                      <span className="unit-count-badge">Unité {currentUnitIndex + 1} / {form.quantite}</span>
                      <p>Veuillez identifier individuellement chaque unité de ce lot.</p>
                    </div>
                    <div className="unit-nav-dots">
                      {individualUnits.map((_, idx) => (
                        <div 
                          key={idx} 
                          className={`unit-dot ${idx === currentUnitIndex ? 'active' : ''} ${individualUnits[idx].iup ? 'filled' : ''}`}
                          onClick={() => setCurrentUnitIndex(idx)}
                        />
                      ))}
                    </div>
                  </div>
                )}

                <div className="identification-grid stagger-2">
                  <div className="iup-panel glass-card">
                    <h3 className="premium-section-title"><CheckCircle2 size={18} /> Identification Individuelle</h3>
                    <p style={{ fontSize: 13, marginBottom: 20 }}>Saisissez les informations spécifiques pour cette unité (N° de série, IUP, etc.).</p>
                    
                    <button 
                      type="button" 
                      className="primary-premium" 
                      style={{ width: '100%', marginBottom: 16, background: CATEGORY_META[form.categoriePrincipale as MainCategory]?.color || 'var(--premium-accent)', color: 'white', border: 'none', padding: '12px', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }} 
                      disabled={generatingIup} 
                      onClick={() => void handleGenerateIupForUnit(currentUnitIndex)}
                    >
                      {generatingIup ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />} {generatingIup ? "Génération..." : "Générer l'IUP Automatiquement"}
                    </button>

                    <Field label="Identifiant Unique (IUP)" error={errors.iup}>
                      <input
                        className="premium-input monospace"
                        style={{ fontSize: '1.1rem', letterSpacing: 1, textAlign: 'center' }}
                        value={individualUnits[currentUnitIndex]?.iup || ""}
                        placeholder="IUP-XXXX-2024-XXXXXX"
                        onChange={(event) => updateUnitField(currentUnitIndex, "iup", event.target.value.toUpperCase())}
                      />
                    </Field>

                    <div className="grid-2" style={{ marginTop: 20 }}>
                      {form.categoriePrincipale === "MATERIEL_ROULANT" ? (
                        <>
                          <Field label="Immatriculation">
                            <input className="premium-input" value={individualUnits[currentUnitIndex]?.immatriculation || ""} onChange={(e) => updateUnitField(currentUnitIndex, "immatriculation", e.target.value.toUpperCase())} />
                          </Field>
                          <Field label="N° Châssis">
                            <input className="premium-input" value={individualUnits[currentUnitIndex]?.numChassis || ""} onChange={(e) => updateUnitField(currentUnitIndex, "numChassis", e.target.value)} />
                          </Field>
                        </>
                      ) : (
                        <Field label="N° de Série" span={form.categoriePrincipale === "IMMOBILIER"}>
                          <input className="premium-input" placeholder={form.categoriePrincipale === "IMMOBILIER" ? "Référence cadastrale" : "Numéro de série fabricant"} value={individualUnits[currentUnitIndex]?.numSerie || ""} onChange={(e) => updateUnitField(currentUnitIndex, "numSerie", e.target.value)} />
                        </Field>
                      )}
                      <Field label="N° Inventaire Physique">
                        <input className="premium-input" value={individualUnits[currentUnitIndex]?.numInventaire || ""} onChange={(e) => updateUnitField(currentUnitIndex, "numInventaire", e.target.value)} />
                      </Field>
                      <Field label="Localisation Spécifique">
                        <input className="premium-input" value={individualUnits[currentUnitIndex]?.localisation || ""} onChange={(e) => updateUnitField(currentUnitIndex, "localisation", e.target.value)} />
                      </Field>
                    </div>
                  </div>

                  <div className="qr-panel glass-card" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center' }}>
                    <h3 className="premium-section-title"><Sparkles size={18} /> Étiquette de l'unité</h3>
                    
                    <div className="print-label glass-card" style={{ background: 'white', color: 'black', padding: 20, width: '100%', maxWidth: 250, margin: '20px 0', border: '2px solid #eee' }}>
                      <strong className="monospace" style={{ fontSize: 16, display: 'block', marginBottom: 10 }}>{individualUnits[currentUnitIndex]?.iup || "IUP-PENDING"}</strong>
                      {qrCode ? (
                        <img src={`data:image/png;base64,${qrCode}`} alt="QR Code" style={{ width: 120, height: 120 }} />
                      ) : (
                        <div className="qr-placeholder" style={{ width: 120, height: 120, background: '#f8f9fa', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto', borderRadius: 8, border: '1px dashed #ccc' }}>
                          <LayoutGrid size={30} style={{ opacity: 0.2 }} />
                        </div>
                      )}
                      <div style={{ marginTop: 10, fontSize: 12, fontWeight: 700 }}>{form.designation}</div>
                      <div style={{ fontSize: 10, opacity: 0.7 }}>{form.service || "Service non défini"}</div>
                    </div>

                    <button
                      type="button"
                      className="btn-export glass-card"
                      style={{ width: '100%' }}
                      disabled={!individualUnits[currentUnitIndex]?.iup || generatingQr}
                      onClick={() => void handleGenerateQrForUnit(currentUnitIndex)}
                    >
                      {generatingQr ? <Loader2 className="animate-spin" size={16} /> : <PlusCircle size={16} style={{ marginRight: 8 }} />} 
                      {generatingQr ? "Génération..." : "Générer QR Code"}
                    </button>
                  </div>
                </div>

                <div className="form-footer glass-card" style={{ display: 'flex', gap: 16, marginTop: 24 }}>
                  <button type="button" className="btn-export glass-card" style={{ flex: 1 }} onClick={() => setActiveStep(1)}>
                    <ArrowLeft size={18} style={{ marginRight: 8 }} /> Recensement
                  </button>
                  
                  {form.quantite > 1 && currentUnitIndex > 0 && (
                    <button type="button" className="btn-export glass-card" onClick={() => setCurrentUnitIndex(prev => prev - 1)}>
                      Précédent
                    </button>
                  )}

                  {form.quantite > 1 && currentUnitIndex < form.quantite - 1 ? (
                    <button 
                      type="button" 
                      className="primary-premium" 
                      style={{ flex: 2, background: 'var(--text-main)', color: 'white' }}
                      onClick={() => {
                        if (!individualUnits[currentUnitIndex].iup) {
                          showToast({ type: 'warning', title: 'IUP Manquant', message: 'Veuillez générer ou saisir un IUP pour cette unité.' });
                          return;
                        }
                        setCurrentUnitIndex(prev => prev + 1);
                      }}
                    >
                      Unité suivante <ArrowRight size={18} style={{ marginLeft: 8 }} />
                    </button>
                  ) : (
                    <button 
                      type="button" 
                      className="primary-premium" 
                      style={{ flex: 2, background: 'var(--premium-accent)', color: 'white', border: 'none', padding: '12px', borderRadius: 12, fontWeight: 800, cursor: 'pointer' }} 
                      disabled={saving} 
                      onClick={() => void saveAllUnits()}
                    >
                      {saving ? <Loader2 className="animate-spin" /> : <Check size={18} style={{ marginRight: 8 }} />} 
                      {saving ? "Enregistrement..." : `Finaliser l'enregistrement (${form.quantite} unité${form.quantite > 1 ? 's' : ''})`}
                    </button>
                  )}
                </div>
              </div>
            ) : null}

            {activeStep === 3 ? (
              <div className="step-panel fade-in-up">
                <div className="glass-card" style={{ textAlign: 'center', padding: '40px 20px' }}>
                  <div style={{ width: 80, height: 80, borderRadius: '50%', background: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px', boxShadow: '0 0 30px rgba(16,185,129,0.4)' }}>
                    <CheckCircle2 size={40} color="white" />
                  </div>
                  <h2 style={{ marginBottom: 10 }}>Actif Enregistré avec Succès !</h2>
                  <p style={{ opacity: 0.7, maxWidth: 500, margin: '0 auto 30px' }}>
                    Le bien <strong>{createdBien?.designation}</strong> ({createdBien?.iup}) est désormais inscrit au registre patrimonial.
                  </p>

                  <div className="glass-card" style={{ background: 'rgba(255,255,255,0.05)', border: '1px dashed var(--glass-border)', maxWidth: 400, margin: '0 auto 40px' }}>
                    <h3 style={{ fontSize: 16, marginBottom: 15 }}>Souhaitez-vous l'affecter immédiatement ?</h3>
                    <div style={{ display: 'flex', gap: 12 }}>
                      <button type="button" className="primary-premium" style={{ flex: 1, background: 'var(--premium-accent)', color: 'white', border: 'none', padding: '12px', borderRadius: 12, fontWeight: 700, cursor: 'pointer' }} disabled={returningToGallery} onClick={() => openAffectationFlow(createdBien)}>
                        Affecter l'Actif
                      </button>
                      <button type="button" className="btn-export glass-card" style={{ flex: 1 }} disabled={returningToGallery} onClick={finalizeWithoutAffectation}>
                        Plus tard
                      </button>
                    </div>
                  </div>

                  {returningToGallery && (
                    <div className="fade-in" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, color: 'var(--primary)', fontWeight: 700 }}>
                      <Loader2 className="animate-spin" /> Retour vers la galerie...
                    </div>
                  )}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      )}

      {showAffectationPrompt ? (
        <div className="modal-overlay-premium">
          <div className="modal-card compact-modal">
            <h3>Voulez-vous affecter ce bien maintenant ?</h3>
            <p>{createdBien?.designation || "Le bien enregistre"} est disponible pour une affectation rapide.</p>
            <div className="modal-actions">
              <button type="button" className="primary" onClick={() => openAffectationFlow(createdBien)}>
                Oui, affecter maintenant
              </button>
              <button type="button" className="btn-export" onClick={finalizeWithoutAffectation}>Non, plus tard</button>
            </div>
          </div>
        </div>
      ) : null}

      {confirmation ? (
        <div className="modal-overlay-premium">
          <div className="modal-card compact-modal">
            <h3>{confirmation.title}</h3>
            <p>{confirmation.message}</p>
            <div className="modal-actions">
              <button
                type="button"
                className="primary btn-danger"
                onClick={async (e) => {
                  const btn = e.currentTarget as HTMLButtonElement;
                  btn.disabled = true;
                  try {
                    await confirmation.onConfirm();
                    setConfirmation(null);
                  } finally {
                    btn.disabled = false;
                  }
                }}
              >
                Confirmer
              </button>
              <button type="button" className="btn-export" onClick={() => setConfirmation(null)}>Annuler</button>
            </div>
          </div>
        </div>
      ) : null}

      {historyPanel ? (
        <>
          <div className="side-panel-overlay" onClick={() => setHistoryPanel(null)} />
          <aside className="side-panel">
            <div className="form-header-premium" style={{ padding: "24px 24px 0" }}>
              <div>
                <span className="badge-pill-glow">Historique du bien</span>
                <h2 style={{ marginTop: 8 }}>{historyPanel.bien.designation}</h2>
                <p className="form-subtitle">{historyPanel.bien.iup || "Sans IUP"} · {historyPanel.bien.service || "Service non renseigne"}</p>
              </div>
              <button type="button" className="btn-export" onClick={() => setHistoryPanel(null)}>Fermer</button>
            </div>

            <div style={{ padding: 24, display: "grid", gap: 16 }}>
              <div className="recap-card">
                <strong>{historyPanel.bien.categoriePrincipale || historyPanel.bien.categorie || "Bien"}</strong>
                <span>Valeur : {formatMoney(historyPanel.bien.valeur)} · VNC : {formatMoney(historyPanel.bien.valeurNetteComptable ?? historyPanel.bien.valeur)}</span>
              </div>

              {historyPanel.loading ? (
                <>
                  <div className="skeleton" style={{ height: 92 }} />
                  <div className="skeleton" style={{ height: 92 }} />
                  <div className="skeleton" style={{ height: 92 }} />
                </>
              ) : historyPanel.entries.length > 0 ? (
                historyPanel.entries.map((entry, index) => (
                  <article key={`${entry.typeEvenement || "evt"}-${entry.date || index}`} className="asset-card" style={{ padding: 18 }}>
                    <div className="card-badge-row">
                      <span className="badge-premium">{entry.typeEvenement || "EVENEMENT"}</span>
                      <span className="field-hint">{entry.date ? new Date(entry.date).toLocaleString("fr-FR") : "Date inconnue"}</span>
                    </div>
                    <h3 style={{ fontSize: 16, marginTop: 12 }}>{entry.description || "Action sans libelle"}</h3>
                    <p style={{ color: "var(--text-dim)", marginTop: 8 }}>{entry.details || "Aucun detail supplementaire."}</p>
                    <small className="field-hint">Acteur : {entry.utilisateur || "systeme"}</small>
                  </article>
                ))
              ) : (
                <div className="recap-card">
                  <strong>Aucun historique disponible</strong>
                  <span>Ce bien n'a pas encore de mouvement ou d'evenement historise.</span>
                </div>
              )}
            </div>
          </aside>
        </>
      ) : null}

      {viewerMedia && (
        <MediaViewer 
          url={viewerMedia.url} 
          type={viewerMedia.type} 
          filename={viewerMedia.filename} 
          onClose={() => setViewerMedia(null)} 
          onDelete={biens.some(b => b.documentsUrls?.some(u => normalizeUrl(u) === viewerMedia.url)) ? () => handleDeleteDocument(viewerMedia.url) : undefined}
        />
      )}
    </div>
  );
}

function Field({ label, error, span = false, children }: React.PropsWithChildren<{ label: string; error?: string; span?: boolean }>) {
  return (
    <div className="form-group-modern" style={span ? { gridColumn: "span 2" } : undefined}>
      <label>{label}</label>
      {children}
      <ErrorText message={error} />
    </div>
  );
}

function SpecificFields({
  form,
  updateField,
  errors,
}: {
  form: BienForm;
  updateField: <K extends keyof BienForm>(key: K, value: BienForm[K]) => void;
  errors: FormErrors;
}) {
  if (form.categoriePrincipale === "IMMOBILIER") {
    return (
      <div className="specific-panel asset-immobilier">
        <h4>Champs spécifiques immobilier</h4>
        <div className="grid-2">
          <Field label="Titre foncier" error={errors.titreFoncier}><input value={form.titreFoncier} onChange={(event) => updateField("titreFoncier", event.target.value)} /></Field>
          <Field label="Superficie m2" error={errors.superficie}><input value={form.superficie} onChange={(event) => updateField("superficie", event.target.value)} /></Field>
          <Field label="Statut juridique">
            <select value={form.statutJuridique} onChange={(event) => updateField("statutJuridique", event.target.value)}>
              {["PROPRIETE_ETAT", "PROPRIETE_PRIVEE", "DOMAINE_PUBLIC", "BAIL"].map((item) => <option key={item}>{item}</option>)}
            </select>
          </Field>
          <label className="checkbox-modern">
            <input type="checkbox" checked={form.permisOccuper} onChange={(event) => updateField("permisOccuper", event.target.checked)} />
            <span>Permis d'occuper disponible</span>
          </label>
        </div>
      </div>
    );
  }

  if (form.categoriePrincipale === "MATERIEL_ROULANT") {
    return (
      <div className="specific-panel asset-roulant">
        <h4>Champs spécifiques matériel roulant</h4>
        <div className="grid-2">
          <Field label="Immatriculation" error={errors.immatriculation}><input value={form.immatriculation} onChange={(event) => updateField("immatriculation", event.target.value.toUpperCase())} /></Field>
          <Field label="Numéro châssis" error={errors.numChassis}><input value={form.numChassis} onChange={(event) => updateField("numChassis", event.target.value)} /></Field>
          <Field label="Marque" error={errors.marque}><input value={form.marque} onChange={(event) => updateField("marque", event.target.value)} /></Field>
          <Field label="Modèle" error={errors.modele}><input value={form.modele} onChange={(event) => updateField("modele", event.target.value)} /></Field>
          <Field label="Puissance fiscale"><input value={form.puissanceFiscale} onChange={(event) => updateField("puissanceFiscale", event.target.value)} /></Field>
          <Field label="Type boîte"><input value={form.typeBoite} onChange={(event) => updateField("typeBoite", event.target.value)} /></Field>
          <Field label="Type carburant"><input value={form.typeCarburant} onChange={(event) => updateField("typeCarburant", event.target.value)} /></Field>
          <Field label="Charge utile"><input value={form.chargeUtile} onChange={(event) => updateField("chargeUtile", event.target.value)} /></Field>
          <Field label="Date prochaine visite technique" error={errors.dateProchaineVisiteTechnique}><input type="date" value={form.dateProchaineVisiteTechnique} onChange={(event) => updateField("dateProchaineVisiteTechnique", event.target.value)} /></Field>
        </div>
      </div>
    );
  }

  return (
    <div className="specific-panel asset-mobilier">
      <h4>Champs spécifiques mobilier</h4>
      <div className="grid-2">
        <Field label="Numéro série"><input value={form.numSerie} onChange={(event) => updateField("numSerie", event.target.value)} /></Field>
        <Field label="Fabricant"><input value={form.fabricant} onChange={(event) => updateField("fabricant", event.target.value)} /></Field>
        <Field label="Marque"><input value={form.marque} onChange={(event) => updateField("marque", event.target.value)} /></Field>
        <Field label="Modèle"><input value={form.modele} onChange={(event) => updateField("modele", event.target.value)} /></Field>
        <Field label="Date fin garantie" error={errors.finGarantie}><input type="date" value={form.finGarantie} onChange={(event) => updateField("finGarantie", event.target.value)} /></Field>
        <Field label="Spécifications techniques" span><textarea rows={3} value={form.specificationsTechniques} onChange={(event) => updateField("specificationsTechniques", event.target.value)} /></Field>
      </div>
    </div>
  );
}

