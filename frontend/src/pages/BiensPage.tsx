import React, { useEffect, useMemo, useRef, useState } from "react";
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
import AnimatedNumber from "../components/AnimatedNumber";
import { QRCodeCanvas } from "qrcode.react";
import { 
  Sparkles, Search, CheckCircle2, ChevronRight, X, Loader2, 
  Building2, Armchair, Monitor, Car, Wrench, FileText, Palette, Dog, LayoutGrid, Check, ArrowRight, ArrowLeft, PlusCircle,
  DollarSign, UserCheck, Package
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
  bienId: number | null;
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
        
        // Envoi de l'objet complet pour ne pas écraser les autres champs avec null lors du PUT
        const payload: Partial<BienPayload> = {
          ...targetBien,
          documentsUrls: updatedDocs,
          type
        };
        
        await updateBien(targetBien.id, payload);
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
      // Inférence robuste de la catégorie car le backend ne renvoie pas explicitement "type" ou "categorie"
      let inferedCategory = bien.categoriePrincipale || bien.categorie || bien.type;
      if (!inferedCategory) {
        if ('immatriculation' in bien || 'numChassis' in bien || bien.immatriculation) inferedCategory = 'MATERIEL_ROULANT';
        else if ('titreFoncier' in bien || 'superficie' in bien || bien.titreFoncier) inferedCategory = 'IMMOBILIER';
        else inferedCategory = 'MOBILIER';
      }
      
      const categoryOk = filters.category === "TOUS" || inferedCategory === filters.category;
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
      setShowAffectationPrompt(false); // On utilise Step 3 à la place du modal pour le flux d'enregistrement
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
      // Garantir que toutes les valeurs de type string ne sont jamais null/undefined
      designation: bien.designation ?? "",
      localisation: bien.localisation ?? "",
      service: bien.service ?? "",
      observation: bien.observation ?? "",
      specificationsTechniques: (bien as any).specificationsTechniques ?? "",
      titreFoncier: (bien as any).titreFoncier ?? "",
      superficie: (bien as any).superficie ?? "",
      numSerie: (bien as any).numSerie ?? "",
      fabricant: (bien as any).fabricant ?? "",
      marque: (bien as any).marque ?? "",
      modele: (bien as any).modele ?? "",
      immatriculation: (bien as any).immatriculation ?? "",
      numChassis: (bien as any).numChassis ?? "",
      puissanceFiscale: (bien as any).puissanceFiscale ?? "",
      chargeUtile: (bien as any).chargeUtile ?? "",
      typeBoite: (bien as any).typeBoite ?? "MANUELLE",
      typeCarburant: (bien as any).typeCarburant ?? "ESSENCE",
      finGarantie: (bien as any).finGarantie ?? "",
      dateProchaineVisiteTechnique: (bien as any).dateProchaineVisiteTechnique ?? "",
      numInventaire: (bien as any).numInventaire ?? "",
      photoUrl: bien.photoUrl ?? "",
      nomenclatureCode: (bien as any).nomenclatureCode ?? "",
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
      message: `Supprimer ${bien.designation} ?`,
      bienId: bien.id,
      onConfirm: async () => {
        try {
          await deleteBien(bien.id as number);
          await refresh();
          showToast({ type: "success", title: "Bien supprimé avec succès" });
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
      <header className="page-header-modern">
        <div className="header-meta">
          <span className="badge-pill-glow">Registre patrimonial</span>
          <h1>Gestion des biens</h1>
        </div>
        <div className="export-bar">
          <div className="dropdown-export">
            <button type="button" className="btn-export">Exporter ▼</button>
            <div className="dropdown-content">
              <button onClick={() => exportLivreJournalPremiumExcel(exportRows, "Livre_Journal.xlsx")}>Livre journal</button>
              <button onClick={() => void exportGrandLivrePremiumExcel(exportRows, "Grand_Livre.xlsx")}>Grand livre</button>
              <button onClick={() => exportPdf(exportRows, "Registre", "registre.pdf")}>Rapport PDF</button>
            </div>
          </div>
          <button type="button" className="primary-premium" onClick={openNewForm}>
            <PlusCircle size={18} /> Nouveau bien
          </button>
        </div>
      </header>

      {view === "gallery" ? (
        <section className="patris-gallery fade-in">
          <div className="stats-dashboard">
            <div className="stat-card-premium">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="stat-label">Total actifs</span>
                <div className="icon-box-mini" style={{ background: 'rgba(5, 150, 222, 0.1)', color: 'var(--primary)' }}>
                  <Package size={16} />
                </div>
              </div>
              <span className="stat-value"><AnimatedNumber value={totals.count} /></span>
            </div>
            <div className="stat-card-premium">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="stat-label">Valeur du parc</span>
                <div className="icon-box-mini" style={{ background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)' }}>
                  <DollarSign size={16} />
                </div>
              </div>
              <span className="stat-value"><AnimatedNumber value={totals.value} isMoney /></span>
            </div>
            <div className="stat-card-premium">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="stat-label">Taux d'affectation</span>
                <div className="icon-box-mini" style={{ background: 'rgba(245, 158, 11, 0.1)', color: 'var(--warning)' }}>
                  <UserCheck size={16} />
                </div>
              </div>
              <span className="stat-value">
                <AnimatedNumber value={Math.round((totals.affected / (totals.count || 1)) * 100)} />
                <small style={{ fontSize: 14, marginLeft: 4, opacity: 0.6 }}>%</small>
              </span>
            </div>
            <div className="stat-card-premium">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <span className="stat-label">Actifs Libres</span>
                <div className="icon-box-mini" style={{ background: 'rgba(139, 92, 246, 0.1)', color: '#8b5cf6' }}>
                  <LayoutGrid size={16} />
                </div>
              </div>
              <span className="stat-value"><AnimatedNumber value={totals.free} /></span>
            </div>
          </div>

          <div className="gallery-toolbar">
            <div className="toolbar-search">
              <Search size={18} />
              <input
                value={filters.query}
                onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
                placeholder="Rechercher IUP, designation, service..."
              />
            </div>
            <div className="toolbar-filters">
              {["TOUS", "IMMOBILIER", "MOBILIER", "MATERIEL_ROULANT"].map((category) => (
                <button
                  key={category}
                  type="button"
                  className={`pill-filter ${filters.category === category ? "active" : ""}`}
                  onClick={() => setFilters((current) => ({ ...current, category }))}
                >
                  {category === "TOUS" ? "Tout" : CATEGORY_META[category as MainCategory]?.label || category}
                </button>
              ))}
            </div>
            <div className="toolbar-selects">
              <select value={filters.etat} onChange={(e) => setFilters((c) => ({ ...c, etat: e.target.value }))}>
                {["TOUS", "NEUF", "BON", "MOYEN", "DEGRADE", "HORS_SERVICE"].map((etat) => (
                  <option key={etat} value={etat}>{etat === "TOUS" ? "Tous états" : etat}</option>
                ))}
              </select>
              <select value={filters.affectation} onChange={(e) => setFilters((c) => ({ ...c, affectation: e.target.value }))}>
                <option value="TOUS">Tous statuts</option>
                <option value="AFFECTE">Affecté</option>
                <option value="NON_AFFECTE">Non affecté</option>
                <option value="REFORME">Réformé</option>
              </select>
              <select value={filters.sort} onChange={(e) => setFilters((c) => ({ ...c, sort: e.target.value as SortMode }))}>
                <option value="date">Date</option>
                <option value="valeur">Valeur</option>
                <option value="designation">A→Z</option>
              </select>
            </div>
          </div>

          {loading ? (
            <div className="asset-grid">
              {[1, 2, 3].map((item) => (
                <div key={item} className="skeleton skeleton-card" />
              ))}
            </div>
          ) : (
            <div className="asset-grid-premium">
              {filteredBiens.map((bien) => {
                const category = (bien.categoriePrincipale || bien.categorie || "MOBILIER") as MainCategory;
                const catIcon = CATEGORY_META[category]?.icon || <LayoutGrid size={48} strokeWidth={1} style={{ opacity: 0.2 }} />;
                const catIconSmall = CATEGORY_META[category]?.icon || <LayoutGrid size={14} />;
                const affected = !!bien.service;
                const mainImage = (bien.photoUrl || bien.photo) ? normalizeUrl(bien.photoUrl || bien.photo) : null;
                const vnc = bien.valeurNetteComptable ?? bien.valeur;
                const isConfirmingDelete = confirmation?.bienId === bien.id;

                return (
                  <article key={bien.id || bien.iup} className="asset-card-premium" style={{ position: 'relative' }}>
                    <div className="asset-media-container" onClick={() => mainImage && setViewerMedia({ url: mainImage, type: "image", filename: bien.designation })}>
                      {mainImage ? (
                        <img 
                          src={mainImage} 
                          alt={bien.designation} 
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = ""; // Clear src to show placeholder
                            (e.target as HTMLImageElement).className = "hidden";
                          }}
                        />
                      ) : (
                        <div className="no-image-placeholder">
                          {catIcon}
                        </div>
                      )}
                      
                      {bien.documentsUrls && bien.documentsUrls.length > 0 && (
                        <div 
                          className="asset-docs-badge" 
                          title={`${bien.documentsUrls.length} document(s) joint(s)`} 
                          style={{ top: 16, left: 16, cursor: 'pointer', zIndex: 20 }}
                          onClick={(e) => {
                            e.stopPropagation();
                            const docUrl = bien.documentsUrls![0];
                            const isImage = docUrl.match(/\.(jpg|jpeg|png|webp)$/i);
                            setViewerMedia({ 
                              url: normalizeUrl(docUrl), 
                              type: isImage ? "image" : "document", 
                              filename: `Document - ${bien.designation}` 
                            });
                          }}
                        >
                          <FileText size={16} />
                        </div>
                      )}

                      <div className="asset-status-overlay">
                        <span className={`status-pill ${bien.etat?.toLowerCase() || ""}`}>
                          {bien.etat || "ACTIF"}
                        </span>
                      </div>
                    </div>

                    <div className="asset-content-premium">
                      <div className="asset-header-meta">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <span className="asset-iup-premium">{bien.iup || "SANS IUP"}</span>
                          <span className="field-hint" style={{ fontSize: 10 }}>{bien.sousCategorie || bien.categorie}</span>
                        </div>
                        <h3 className="asset-title-premium">{bien.designation}</h3>
                      </div>

                      <div className="asset-details-grid">
                        <div className="detail-item">
                          <span className="detail-label">Localisation</span>
                          <span className="detail-value">{bien.localisation || "Non définie"}</span>
                        </div>
                        <div className="detail-item">
                          <span className="detail-label">Statut</span>
                          <span className="detail-value">
                            {affected ? `Affecté : ${typeof bien.service === 'object' ? (bien.service.nomService || bien.service.nom || bien.service.code) : bien.service}` : "Libre"}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="asset-footer-premium">
                      <span className="asset-value-premium">
                        {new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF" }).format(bien.valeur || 0)}
                      </span>
                      <div className="asset-actions-premium">
                        <button type="button" className="action-btn-mini" title="Modifier" onClick={() => editBien(bien)}>
                          <Sparkles size={14} />
                        </button>
                        <button type="button" className="action-btn-mini" title="Historique" onClick={() => void openHistory(bien)}>
                          <Search size={14} />
                        </button>
                        <button type="button" className="action-btn-mini danger" title="Supprimer" onClick={() => askDelete(bien)}>
                          <X size={14} />
                        </button>
                      </div>
                    </div>

                    {isConfirmingDelete && (
                      <div className="delete-popover">
                        <p className="delete-popover-msg">{confirmation!.message}</p>
                        <p className="delete-popover-warning">Cette action est irréversible.</p>
                        <div className="delete-popover-actions">
                          <button
                            type="button"
                            className="btn-confirm-delete"
                            onClick={async (e) => {
                              const btn = e.currentTarget as HTMLButtonElement;
                              btn.disabled = true;
                              try {
                                await confirmation!.onConfirm();
                                setConfirmation(null);
                              } catch (err) {
                                btn.disabled = false;
                              }
                            }}
                          >
                            Supprimer
                          </button>
                          <button type="button" className="btn-cancel-delete" onClick={() => setConfirmation(null)}>
                            Annuler
                          </button>
                        </div>
                      </div>
                    )}
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

            <div className="form-body-premium" style={{ marginTop: 32 }}>
            {activeStep === 0 && (
              <div className="step-panel fade-in-up">
                <div style={{ textAlign: 'center', marginBottom: 40 }}>
                  <h3 style={{ fontSize: '1.5rem', fontWeight: 800, marginBottom: 8 }}>Classification du patrimoine</h3>
                  <p className="form-subtitle">Choisissez une catégorie pour adapter le formulaire</p>
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
                      <div className="family-icon-box" style={{ background: CATEGORY_META[category].color + '15', color: CATEGORY_META[category].color }}>
                        {CATEGORY_META[category].icon}
                      </div>
                      <div className="family-info">
                        <strong>{CATEGORY_META[category].label}</strong>
                        <p>{CATEGORY_META[category].description}</p>
                      </div>
                      <div className="family-arrow">
                        <ChevronRight size={20} />
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {activeStep === 1 && (
              <div className="step-panel fade-in-up">
                {/* Section 1: Classification */}
                <div className="glass-card stagger-1" style={{ marginBottom: 32 }}>
                  <h3 className="premium-section-title">
                    <div className="icon-box-mini"><Monitor size={18} /></div>
                    1. Classification & Nomenclature
                  </h3>
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
                <div className="glass-card stagger-2" style={{ marginBottom: 32 }}>
                  <h3 className="premium-section-title">
                    <div className="icon-box-mini"><Search size={18} /></div>
                    2. Identification de l'Actif
                  </h3>
                  <div className="form-grid-premium">
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
                    <Field label="État initial">
                      <select className="premium-input" value={form.etat} onChange={(event) => updateField("etat", event.target.value)}>
                        {["NEUF", "BON", "MOYEN", "DEGRADE", "HORS_SERVICE"].map((item) => <option key={item}>{item}</option>)}
                      </select>
                    </Field>
                  </div>
                </div>

                {/* Section 3: Acquisition & Valeur */}
                <div className="glass-card stagger-3" style={{ marginBottom: 32 }}>
                  <h3 className="premium-section-title">
                    <div className="icon-box-mini"><DollarSign size={18} /></div>
                    3. Acquisition & Données Comptables
                  </h3>
                  <div className="form-grid-premium">
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
                <div className="glass-card stagger-4" style={{ marginBottom: 32 }}>
                  <h3 className="premium-section-title">
                    <div className="icon-box-mini"><Palette size={18} /></div>
                    4. Détails Supplémentaires & Médias
                  </h3>
                  <div className="form-grid-premium">
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
                      <textarea rows={3} className="premium-input" placeholder="Remarques éventuelles sur l'état ou l'origine du bien..." value={form.observation || ""} onChange={(event) => updateField("observation", event.target.value)} />
                    </Field>
                  </div>
                </div>

                <SpecificFields form={form} updateField={updateField} errors={errors} />

                <div className="form-footer-premium" style={{ marginTop: 40 }}>
                  <button
                    type="button"
                    className="primary-premium large-btn"
                    style={{ width: '100%', justifyContent: 'center', height: 60, fontSize: 16 }}
                    disabled={validatingImmatriculation}
                    onClick={() => void goIdentification()}
                  >
                    {validatingImmatriculation ? <Loader2 className="animate-spin" /> : <ChevronRight size={20} />}
                    {validatingImmatriculation ? "Validation..." : "Continuer vers l'identification du bien"}
                  </button>
                </div>
              </div>
            )}

            {activeStep === 2 && (
              <div className="step-panel fade-in-up">
                <div className="glass-card" style={{ marginBottom: 32, borderLeft: `6px solid ${CATEGORY_META[form.categoriePrincipale as MainCategory]?.color || '#7c3aed'}`, padding: '24px 32px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '1.4rem' }}>{form.designation}</h3>
                      <p style={{ margin: '8px 0', opacity: 0.7, fontWeight: 600 }}>
                        {CATEGORY_META[form.categoriePrincipale as MainCategory]?.label} · {formatMoney(form.valeur)} · {form.service || "Sans service"}
                      </p>
                    </div>
                    <div className="badge-pill-glow">
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
                    <h3 className="premium-section-title">
                      <div className="icon-box-mini"><CheckCircle2 size={18} /></div>
                      Identification Individuelle
                    </h3>
                    <p style={{ fontSize: 13, marginBottom: 24, color: 'var(--text-dim)' }}>Saisissez les informations spécifiques pour cette unité (N° de série, IUP, etc.).</p>
                    
                    <button 
                      type="button" 
                      className="primary-premium" 
                      style={{ width: '100%', marginBottom: 20, height: 50 }} 
                      disabled={generatingIup} 
                      onClick={() => void handleGenerateIupForUnit(currentUnitIndex)}
                    >
                      {generatingIup ? <Loader2 className="animate-spin" /> : <Sparkles size={18} />} 
                      {generatingIup ? "Génération..." : "Générer l'IUP Automatiquement"}
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

                    <div className="form-grid-premium" style={{ marginTop: 24 }}>
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
                    <h3 className="premium-section-title">
                      <div className="icon-box-mini"><Sparkles size={18} /></div>
                      Étiquette
                    </h3>

                    {/* QR avec vraies données du bien */}
                    {(() => {
                      const unit = individualUnits[currentUnitIndex];
                      const iup = unit?.iup || "IUP-EN-ATTENTE";
                      const qrPayload = JSON.stringify({
                        iup,
                        designation: form.designation || "",
                        categorie: form.categoriePrincipale || "",
                        dateAcquisition: form.dateAcquisition || "",
                        valeur: form.valeur || 0,
                        localisation: unit?.localisation || form.localisation || "",
                        etat: form.etat || "",
                        systeme: "PATRIS",
                      });

                      const canvasRef = React.createRef<HTMLCanvasElement>();

                      const downloadQr = (format: "png" | "jpeg") => {
                        const canvas = document.querySelector(`#qr-canvas-${currentUnitIndex} canvas`) as HTMLCanvasElement;
                        if (!canvas) return;
                        const link = document.createElement("a");
                        link.download = `${iup}.${format}`;
                        link.href = canvas.toDataURL(`image/${format}`, 1.0);
                        link.click();
                      };

                      return (
                        <>
                          <div className="print-label">
                            <strong className="monospace" style={{ fontSize: 14, display: 'block', marginBottom: 10 }}>{iup}</strong>
                            <div id={`qr-canvas-${currentUnitIndex}`} style={{ display: 'flex', justifyContent: 'center', margin: '0 auto' }}>
                              <QRCodeCanvas
                                value={qrPayload}
                                size={140}
                                level="M"
                                includeMargin
                                style={{ borderRadius: 8 }}
                              />
                            </div>
                            <div style={{ marginTop: 10, fontSize: 13, fontWeight: 800 }}>{form.designation}</div>
                            <div style={{ fontSize: 11, opacity: 0.5 }}>{form.localisation || "Localisation non définie"}</div>
                          </div>

                          {/* Boutons de téléchargement stylés */}
                          <div style={{ display: 'flex', gap: 10, marginTop: 16, width: '100%' }}>
                            <button
                              type="button"
                              onClick={() => downloadQr("png")}
                              style={{
                                flex: 1,
                                height: 42,
                                borderRadius: 12,
                                border: '1.5px solid var(--primary)',
                                background: 'rgba(5, 150, 222, 0.06)',
                                color: 'var(--primary)',
                                fontWeight: 800,
                                fontSize: 12,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(5, 150, 222, 0.12)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(5, 150, 222, 0.06)')}
                            >
                              <LayoutGrid size={14} /> PNG
                            </button>
                            <button
                              type="button"
                              onClick={() => downloadQr("jpeg")}
                              style={{
                                flex: 1,
                                height: 42,
                                borderRadius: 12,
                                border: '1.5px solid var(--success)',
                                background: 'rgba(16, 185, 129, 0.06)',
                                color: 'var(--success)',
                                fontWeight: 800,
                                fontSize: 12,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: 6,
                                transition: 'all 0.2s'
                              }}
                              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.12)')}
                              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(16, 185, 129, 0.06)')}
                            >
                              <LayoutGrid size={14} /> JPG
                            </button>
                          </div>
                        </>
                      );
                    })()}
                  </div>
                </div>

                <div className="form-footer-premium" style={{ marginTop: 40 }}>
                  <button type="button" className="btn-export glass-card" style={{ height: 54, padding: '0 24px' }} onClick={() => setActiveStep(1)}>
                    <ArrowLeft size={18} style={{ marginRight: 8 }} /> Recensement
                  </button>
                  
                  {form.quantite > 1 && currentUnitIndex > 0 && (
                    <button type="button" className="btn-export glass-card" style={{ height: 54, padding: '0 24px' }} onClick={() => setCurrentUnitIndex(prev => prev - 1)}>
                      Précédent
                    </button>
                  )}

                  {form.quantite > 1 && currentUnitIndex < form.quantite - 1 ? (
                    <button 
                      type="button" 
                      className="primary-premium" 
                      style={{ flex: 1, height: 54 }}
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
                      style={{ flex: 1, height: 54 }} 
                      disabled={saving} 
                      onClick={() => void saveAllUnits()}
                    >
                      {saving ? <Loader2 className="animate-spin" /> : <Check size={18} style={{ marginRight: 8 }} />} 
                      {saving ? "Enregistrement..." : `Finaliser (${form.quantite} unité${form.quantite > 1 ? 's' : ''})`}
                    </button>
                  )}
                </div>
              </div>
            )}

            </div>

            {activeStep === 3 && (
              <div className="step-panel fade-in-up">
                <div className="glass-card success-banner-premium" style={{ textAlign: 'center', padding: '60px 40px', background: 'linear-gradient(135deg, rgba(16,185,129,0.1) 0%, rgba(255,255,255,0.02) 100%)' }}>
                  <div className="success-icon-wrapper">
                    <div className="success-pulse" />
                    <CheckCircle2 size={48} className="success-icon-check" />
                  </div>
                  
                  <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: 12 }}>Actif enregistré avec succès !</h2>
                  <p style={{ fontSize: '1.1rem', opacity: 0.8, maxWidth: 600, margin: '0 auto 40px' }}>
                    Le bien <strong>{createdBien?.designation}</strong> est désormais inscrit dans le registre avec l'IUP : <code className="monospace-glow">{createdBien?.iup}</code>
                  </p>

                  <div className="success-actions-grid" style={{ maxWidth: 500, margin: '0 auto' }}>
                    <div className="glass-card stagger-1" style={{ padding: 30, background: 'rgba(255,255,255,0.05)', border: '1px solid var(--glass-border)' }}>
                      <h3 style={{ fontSize: 18, marginBottom: 20 }}>Souhaitez-vous l'affecter maintenant ?</h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                        <button 
                          type="button" 
                          className="primary-premium large-btn" 
                          style={{ width: '100%', height: 56, justifyContent: 'center' }} 
                          disabled={returningToGallery} 
                          onClick={() => openAffectationFlow(createdBien)}
                        >
                          <UserCheck size={20} /> Oui, affecter l'actif
                        </button>
                        
                        <button 
                          type="button" 
                          className="btn-export glass-card" 
                          style={{ width: '100%', height: 50, justifyContent: 'center' }} 
                          disabled={returningToGallery} 
                          onClick={finalizeWithoutAffectation}
                        >
                          Plus tard, retour à la galerie
                        </button>
                      </div>
                    </div>
                  </div>

                  {returningToGallery && (
                    <div className="fade-in-up" style={{ marginTop: 32, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, color: 'var(--primary)', fontWeight: 800 }}>
                      <Loader2 className="animate-spin" /> Finalisation du dossier...
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {showAffectationPrompt && (
        <div className="modal-overlay-premium">
          <div className="compact-modal-premium glass-card">
            <div className="icon-circle-glow">
              <UserCheck size={36} />
            </div>
            
            <h2 style={{ fontSize: '1.8rem', fontWeight: 900, marginBottom: 12, color: 'var(--text-main)' }}>
              Affectation immédiate ?
            </h2>
            
            <p style={{ color: 'var(--text-dim)', fontSize: '1.05rem', lineHeight: 1.6, marginBottom: 36 }}>
              L'enregistrement de l'actif <strong>{createdBien?.designation}</strong> est terminé. <br/>
              Souhaitez-vous l'affecter à un agent ou un service maintenant ?
            </p>
            
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 14 }}>
              <button 
                type="button" 
                className="primary-premium large-btn" 
                style={{ width: '100%', height: 60, justifyContent: 'center', fontSize: '1rem' }} 
                onClick={() => openAffectationFlow(createdBien)}
              >
                <UserCheck size={20} /> Oui, affecter maintenant
              </button>
              
              <button 
                type="button" 
                className="btn-export glass-card" 
                style={{ width: '100%', height: 54, justifyContent: 'center', border: '1px solid var(--glass-border)', fontSize: '0.95rem' }} 
                onClick={finalizeWithoutAffectation}
              >
                Non, terminer plus tard
              </button>
            </div>
          </div>
        </div>
      )}



      {/* Lock body scroll when modal is open */}
      {historyPanel && (
        <style>{`
          body { overflow: hidden !important; }
        `}</style>
      )}

      {historyPanel && (
        <div style={{ 
          position: 'fixed', 
          inset: 0, 
          zIndex: 10000, 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'center',
          padding: 20
        }}>
          <div className="side-panel-overlay" style={{ position: 'absolute' }} onClick={() => setHistoryPanel(null)} />
          <aside className="side-panel" style={{ position: 'relative' }}>
            {/* Header Modal Style */}
            <div style={{ padding: '32px 32px 20px', background: '#ffffff', borderBottom: '1px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h2 style={{ fontSize: 22, fontWeight: 900, margin: 0, color: '#0f172a', letterSpacing: '-0.02em' }}>{historyPanel.bien.designation}</h2>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
                    <code style={{ fontSize: 11, color: 'var(--primary)', fontWeight: 800, background: 'rgba(5, 150, 222, 0.05)', padding: '2px 8px', borderRadius: 6 }}>{historyPanel.bien.iup || "SANS IUP"}</code>
                    <span style={{ fontSize: 13, color: '#94a3b8' }}>•</span>
                    <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>{historyPanel.bien.service || "Service non renseigné"}</span>
                  </div>
                </div>
                <button 
                  onClick={() => setHistoryPanel(null)}
                  style={{ width: 40, height: 40, borderRadius: 14, border: 'none', background: '#f8fafc', color: '#64748b', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'all 0.2s' }}
                >
                  <X size={20} />
                </button>
              </div>
            </div>

            {/* Onglets compacts */}
            <div style={{ display: 'flex', gap: 24, padding: '0 32px', background: '#ffffff', borderBottom: '1px solid #f8fafc' }}>
              {['Détails', 'Historique'].map((tab) => {
                const isActive = (tab === 'Historique' && historyPanel.view === 'history') || (tab === 'Détails' && (!historyPanel.view || historyPanel.view === 'details'));
                return (
                  <button
                    key={tab}
                    onClick={() => setHistoryPanel({ ...historyPanel, view: tab === 'Historique' ? 'history' : 'details' })}
                    style={{
                      padding: '14px 0',
                      background: 'none',
                      border: 'none',
                      borderBottom: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                      color: isActive ? 'var(--primary)' : '#94a3b8',
                      fontSize: 14,
                      fontWeight: 800,
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    {tab}
                  </button>
                );
              })}
            </div>

            <div className="side-panel-content" style={{ flex: 1, overflowY: 'auto', padding: '32px' }}>
              {(!historyPanel.view || historyPanel.view === 'details') ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
                  <div style={{ padding: 20, background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)', border: '1px solid #e2e8f0', borderRadius: 24 }}>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
                      <div>
                        <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, letterSpacing: 1, marginBottom: 6, display: 'block' }}>Valeur d'origine</span>
                        <div style={{ fontSize: 18, fontWeight: 900, color: '#0f172a' }}>{formatMoney(historyPanel.bien.valeur)}</div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, letterSpacing: 1, marginBottom: 6, display: 'block' }}>VNC Actuelle</span>
                        <div style={{ fontSize: 18, fontWeight: 900, color: 'var(--success)' }}>{formatMoney(historyPanel.bien.valeurNetteComptable ?? historyPanel.bien.valeur)}</div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px 32px' }}>
                    {[
                      { label: 'Catégorie Principale', value: historyPanel.bien.categoriePrincipale },
                      { label: 'État Physique', value: historyPanel.bien.etatPhysique },
                      { label: 'Statut Comptable', value: historyPanel.bien.statutComptable },
                      { label: 'Affectation Actuelle', value: historyPanel.bien.localisation },
                    ].map((item, i) => item.value && (
                      <div key={i}>
                        <span style={{ fontSize: 10, color: '#94a3b8', textTransform: 'uppercase', fontWeight: 800, marginBottom: 4, display: 'block' }}>{item.label}</span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: '#334155' }}>{item.value}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
                  {historyPanel.loading ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {[1, 2, 3].map(i => <div key={i} className="skeleton" style={{ height: 70, borderRadius: 16 }} />)}
                    </div>
                  ) : historyPanel.entries.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: '#94a3b8' }}>
                      <p style={{ fontSize: 14 }}>Aucun événement trouvé.</p>
                    </div>
                  ) : (
                    historyPanel.entries.map((entry, idx) => (
                      <div key={idx} style={{ display: 'flex', gap: 16, padding: 16, borderRadius: 16, background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--primary)', marginTop: 4, flexShrink: 0, boxShadow: '0 0 10px var(--primary-glow)' }} />
                        <div style={{ flex: 1 }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                            <span style={{ fontSize: 11, fontWeight: 900, color: 'var(--primary)', textTransform: 'uppercase' }}>{entry.typeEvenement}</span>
                            <span style={{ fontSize: 11, color: '#94a3b8', fontWeight: 600 }}>{entry.date ? new Date(entry.date).toLocaleDateString('fr-FR') : "N/C"}</span>
                          </div>
                          <p style={{ margin: 0, fontSize: 14, color: '#334155', lineHeight: 1.5, fontWeight: 500 }}>{entry.description}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div style={{ padding: '24px 32px', background: '#f8fafc', borderTop: '1px solid #f1f5f9', display: 'flex', gap: 12 }}>
              <button 
                className="primary-premium" 
                style={{ flex: 1, height: 52, borderRadius: 16, fontSize: 14, fontWeight: 800 }}
                onClick={() => {
                  setHistoryPanel(null);
                  editBien(historyPanel.bien);
                }}
              >
                Modifier les informations
              </button>
            </div>
          </aside>
        </div>
      )}

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
      <div className="glass-card stagger-5" style={{ marginBottom: 32 }}>
        <h3 className="premium-section-title">
          <div className="icon-box-mini"><Building2 size={18} /></div>
          Champs spécifiques Immobilier
        </h3>
        <div className="form-grid-premium">
          <Field label="Titre foncier" error={errors.titreFoncier}><input className="premium-input" value={form.titreFoncier} onChange={(event) => updateField("titreFoncier", event.target.value)} /></Field>
          <Field label="Superficie m2" error={errors.superficie}><input className="premium-input" value={form.superficie} onChange={(event) => updateField("superficie", event.target.value)} /></Field>
          <Field label="Statut juridique">
            <select className="premium-input" value={form.statutJuridique} onChange={(event) => updateField("statutJuridique", event.target.value)}>
              {["PROPRIETE_ETAT", "PROPRIETE_PRIVEE", "DOMAINE_PUBLIC", "BAIL"].map((item) => <option key={item}>{item}</option>)}
            </select>
          </Field>
          <div className="form-group-modern" style={{ alignSelf: 'center' }}>
            <label className="checkbox-modern-premium">
              <input type="checkbox" checked={form.permisOccuper} onChange={(event) => updateField("permisOccuper", event.target.checked)} />
              <span>Permis d'occuper disponible</span>
            </label>
          </div>
        </div>
      </div>
    );
  }

  if (form.categoriePrincipale === "MATERIEL_ROULANT") {
    return (
      <div className="glass-card stagger-5" style={{ marginBottom: 32 }}>
        <h3 className="premium-section-title">
          <div className="icon-box-mini"><Car size={18} /></div>
          Champs spécifiques Matériel Roulant
        </h3>
        <div className="form-grid-premium">
          <Field label="Immatriculation" error={errors.immatriculation}><input className="premium-input" value={form.immatriculation} onChange={(event) => updateField("immatriculation", event.target.value.toUpperCase())} /></Field>
          <Field label="Numéro châssis" error={errors.numChassis}><input className="premium-input" value={form.numChassis} onChange={(event) => updateField("numChassis", event.target.value)} /></Field>
          <Field label="Marque" error={errors.marque}><input className="premium-input" value={form.marque} onChange={(event) => updateField("marque", event.target.value)} /></Field>
          <Field label="Modèle" error={errors.modele}><input className="premium-input" value={form.modele} onChange={(event) => updateField("modele", event.target.value)} /></Field>
          <Field label="Puissance fiscale"><input className="premium-input" value={form.puissanceFiscale} onChange={(event) => updateField("puissanceFiscale", event.target.value)} /></Field>
          <Field label="Type boîte"><input className="premium-input" value={form.typeBoite} onChange={(event) => updateField("typeBoite", event.target.value)} /></Field>
          <Field label="Type carburant"><input className="premium-input" value={form.typeCarburant} onChange={(event) => updateField("typeCarburant", event.target.value)} /></Field>
          <Field label="Charge utile"><input className="premium-input" value={form.chargeUtile} onChange={(event) => updateField("chargeUtile", event.target.value)} /></Field>
          <Field label="Date prochaine visite technique" error={errors.dateProchaineVisiteTechnique}><input className="premium-input" type="date" value={form.dateProchaineVisiteTechnique} onChange={(event) => updateField("dateProchaineVisiteTechnique", event.target.value)} /></Field>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-card stagger-5" style={{ marginBottom: 32 }}>
      <h3 className="premium-section-title">
        <div className="icon-box-mini"><Armchair size={18} /></div>
        Champs spécifiques Mobilier
      </h3>
      <div className="form-grid-premium">
        <Field label="Numéro série"><input className="premium-input" value={form.numSerie || ""} onChange={(event) => updateField("numSerie", event.target.value)} /></Field>
        <Field label="Fabricant"><input className="premium-input" value={form.fabricant || ""} onChange={(event) => updateField("fabricant", event.target.value)} /></Field>
        <Field label="Marque"><input className="premium-input" value={form.marque || ""} onChange={(event) => updateField("marque", event.target.value)} /></Field>
        <Field label="Modèle"><input className="premium-input" value={form.modele || ""} onChange={(event) => updateField("modele", event.target.value)} /></Field>
        <Field label="Date fin garantie" error={errors.finGarantie}><input className="premium-input" type="date" value={form.finGarantie || ""} onChange={(event) => updateField("finGarantie", event.target.value)} /></Field>
        <Field label="Spécifications techniques" span><textarea className="premium-input" rows={3} value={form.specificationsTechniques || ""} onChange={(event) => updateField("specificationsTechniques", event.target.value)} /></Field>
      </div>
    </div>
  );
}

