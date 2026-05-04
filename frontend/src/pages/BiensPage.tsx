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

type MainCategory = "IMMOBILIER" | "MOBILIER" | "MATERIEL_ROULANT";
type StepKey = 1 | 2 | 3;
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

const CATEGORY_META: Record<MainCategory, { label: string; short: string; color: string; icon: React.ReactNode }> = {
  IMMOBILIER: {
    label: "Immobilier",
    short: "IMMO",
    color: "asset-immobilier",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 10.5 12 4l9 6.5" />
        <path d="M5 10v10h14V10" />
        <path d="M10 20v-5h4v5" />
      </svg>
    ),
  },
  MOBILIER: {
    label: "Mobilier",
    short: "MOB",
    color: "asset-mobilier",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <rect x="4" y="5" width="16" height="11" rx="2" />
        <path d="M9 19h6" />
        <path d="M12 16v3" />
      </svg>
    ),
  },
  MATERIEL_ROULANT: {
    label: "Materiel roulant",
    short: "ROUL",
    color: "asset-roulant",
    icon: (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M5 16 7 9h10l2 7" />
        <path d="M4 16h16v3H4Z" />
        <circle cx="7.5" cy="18.5" r="1.5" />
        <circle cx="16.5" cy="18.5" r="1.5" />
      </svg>
    ),
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
  categorie: form.categoriePrincipale || form.categorie,
  nomenclature: form.nomenclatureCode ? { code: form.nomenclatureCode } : undefined,
  type:
    form.categoriePrincipale === "IMMOBILIER"
      ? "immobilier"
      : form.categoriePrincipale === "MATERIEL_ROULANT"
      ? "roulant"
      : "mobilier",
  coordonneeGps: form.coordonneesGps,
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
  const steps: Array<{ key: StepKey; label: string }> = [
    { key: 1, label: "Recensement" },
    { key: 2, label: "Identification" },
    { key: 3, label: "Affectation" },
  ];

  return (
    <div className="stepper-bar">
      {steps.map((step) => {
        const done = step.key < active || step.key < maxStep;
        const clickable = step.key <= maxStep;
        return (
          <button
            key={step.key}
            type="button"
            disabled={!clickable}
            onClick={() => clickable && onGo(step.key)}
            className={`stepper-step ${active === step.key ? "active" : done ? "done" : "pending"}`}
          >
            <span className="stepper-circle">{done ? "✓" : step.key}</span>
            <span>{step.label}</span>
            {step.key < 3 ? <i className="stepper-line" /> : null}
          </button>
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
  const [activeStep, setActiveStep] = useState<StepKey>(1);
  const [maxStep, setMaxStep] = useState<StepKey>(1);
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
    setActiveStep(1);
    setMaxStep(1);
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

  const handleGenerateQr = async () => {
    if (!form.iup) {
      setErrors((current) => ({ ...current, iup: "Generez ou saisissez un IUP avant le QR Code." }));
      return;
    }
    try {
      setGeneratingQr(true);
      const result = await getBienQrCode(form.iup).catch(() => null);
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

  const saveBien = async () => {
    if (!form.iup.trim()) {
      setErrors((current) => ({ ...current, iup: "L'IUP est obligatoire avant l'enregistrement." }));
      return;
    }
    const liveValidation = await validateIup(form.iup.trim()).catch(() => ({ unique: false }));
    setIupUnique(liveValidation.unique);
    if (!liveValidation.unique) {
      setErrors((current) => ({ ...current, iup: "L'IUP doit respecter le format attendu et rester unique." }));
      return;
    }
    try {
      setSaving(true);
      const saved = form.id ? await updateBien(form.id, toPayload(form)) : await createBien(toPayload(form));
      setCreatedBien(saved);
      await refresh();
      showToast({ type: "success", title: `Bien ${saved.iup || form.iup} enregistre avec succes` });
      setMaxStep(3);
      setActiveStep(3);
      setShowAffectationPrompt(true);
    } catch {
      showToast({ type: "error", title: "Enregistrement impossible", message: "Le bien n'a pas pu etre enregistre. Verifiez les champs puis reessayez." });
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
    if (!bien.id) return;
    setConfirmation({
      title: "Supprimer le bien",
      message: `Confirmer la suppression de ${bien.designation} ?`,
      onConfirm: async () => {
        await deleteBien(bien.id as number);
        await refresh();
        showToast({ type: "success", title: "Bien supprime" });
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
    setActiveStep(1);
    setMaxStep(1);
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
                      <img src={normalizeUrl(bien.photoUrl)} alt={bien.designation} className="asset-photo" />
                    ) : (
                      <div className="asset-photo asset-placeholder">{CATEGORY_META[category]?.icon}</div>
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
          <div className="centered-form-card large-form-card slide-in-right">
            <div className="form-header-premium">
              <div>
                <h2>{form.id ? "Modifier le bien" : "Enregistrer un bien"}</h2>
                <p className="form-subtitle">Flux ministeriel en trois phases : recensement, identification, affectation.</p>
              </div>
              <button type="button" className="btn-export" onClick={() => setView("gallery")}>Retour galerie</button>
            </div>

            <Stepper active={activeStep} maxStep={maxStep} onGo={setActiveStep} />

            {activeStep === 1 ? (
              <div className="step-panel slide-in-right">
                <div className="category-card-row">
                  {(Object.keys(CATEGORY_META) as MainCategory[]).map((category) => (
                    <button
                      key={category}
                      type="button"
                      className={`category-choice ${CATEGORY_META[category].color} ${form.categoriePrincipale === category ? "selected" : ""}`}
                      onClick={() => selectCategory(category)}
                    >
                      <span>{CATEGORY_META[category].icon}</span>
                      <strong>{CATEGORY_META[category].label}</strong>
                      <small className="badge-premium monospace">{category}</small>
                    </button>
                  ))}
                </div>
                <ErrorText message={errors.categoriePrincipale} />



                <div className="full-span" style={{ marginBottom: 24 }}>
                  <NomenclatureSelector
                    partie="A"
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

                <div className="grid-2">
                  <Field label="Designation" error={errors.designation}>
                    <input value={form.designation} onChange={(event) => updateField("designation", event.target.value)} />
                  </Field>
                  <Field label="Date acquisition" error={errors.dateAcquisition}>
                    <input type="date" value={form.dateAcquisition} onChange={(event) => updateField("dateAcquisition", event.target.value)} />
                  </Field>
                  <Field label="Mode acquisition" error={errors.modeAcquisition}>
                    <select value={form.modeAcquisition} onChange={(event) => updateField("modeAcquisition", event.target.value)}>
                      {["ACHAT", "DON", "LEGS", "TRANSFERT", "PRODUCTION_PROPRE"].map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </Field>
                  <Field label="Valeur acquisition FCFA" error={errors.valeur}>
                    <input type="number" min={0} value={form.valeur} onChange={(event) => updateField("valeur", Number(event.target.value))} />
                    <small className="field-hint">{formatMoney(form.valeur)}</small>
                  </Field>
                  <Field label="Duree amortissement">
                    <input type="number" min={0} value={form.dureeAmortissement} onChange={(event) => updateField("dureeAmortissement", Number(event.target.value))} />
                  </Field>
                  <Field label="VNC calculee">
                    <input readOnly value={formatMoney(form.valeurNetteComptable)} />
                  </Field>
                  <Field label="Localisation precise" error={errors.localisation}>
                    <input value={form.localisation} onChange={(event) => updateField("localisation", event.target.value)} />
                  </Field>
                  <Field label="Coordonnees GPS" error={errors.coordonneesGps}>
                    <div className="field-inline">
                      <input value={form.coordonneesGps} onChange={(event) => updateField("coordonneesGps", event.target.value)} />
                      <button type="button" className="btn-export" onClick={captureGps}>GPS</button>
                    </div>
                  </Field>
                  <Field label="Service detenteur" error={errors.service}>
                    <select value={form.service} onChange={(event) => updateField("service", event.target.value)}>
                      <option value="">-- Choisir --</option>
                      {services.map((service) => {
                        const name = serviceName(service);
                        return <option key={service.id || name} value={name}>{name}</option>;
                      })}
                    </select>
                  </Field>
                  <Field label="Etat initial">
                    <select value={form.etat} onChange={(event) => updateField("etat", event.target.value)}>
                      {["NEUF", "BON", "MOYEN", "DEGRADE", "HORS_SERVICE"].map((item) => <option key={item}>{item}</option>)}
                    </select>
                  </Field>
                  {form.categoriePrincipale !== "IMMOBILIER" ? (
                    <Field label="Quantite" error={errors.quantite}>
                      <input type="number" min={1} value={form.quantite} onChange={(event) => updateField("quantite", Number(event.target.value))} />
                    </Field>
                  ) : (
                    <Field label="Quantite">
                      <input readOnly value="1" />
                    </Field>
                  )}
                  <Field label="Photo">
                    <ImageUpload value={form.photoUrl} onChange={(url) => updateField("photoUrl", url)} />
                  </Field>
                  <Field label="Documents joints">
                    <FileUpload onUploadSuccess={(url) => updateField("documentsUrls", [...form.documentsUrls, url])} />
                    {form.documentsUrls.length > 0 ? (
                      <small className="field-hint">{form.documentsUrls.length} document(s) deja joint(s).</small>
                    ) : null}
                  </Field>
                  <Field label="Observations" span>
                    <textarea rows={3} value={form.observation} onChange={(event) => updateField("observation", event.target.value)} />
                  </Field>
                </div>

                <SpecificFields form={form} updateField={updateField} errors={errors} />

                <div className="form-footer">
                  <button
                    type="button"
                    className="primary"
                    disabled={validatingImmatriculation}
                    onClick={() => void goIdentification()}
                  >
                    {validatingImmatriculation ? "Verification immatriculation..." : "Suivant > Identification du bien"}
                  </button>
                </div>
              </div>
            ) : null}

            {activeStep === 2 ? (
              <div className="step-panel slide-in-left">
                <div className="recap-card">
                  <strong>{form.designation}</strong>
                  <span>{form.categoriePrincipale} - {formatMoney(form.valeur)} - {form.service || "Sans service"}</span>
                  <small className="field-hint">
                    {renderCataloguePath(
                      form.categoriePrincipale,
                      form.codeFamille,
                      form.familleCatalogue,
                      form.codeSousCategorie,
                      form.sousCategorie
                    )}
                  </small>
                </div>
                <div className="identification-grid">
                  <div className="iup-panel">
                    <div className="asset-card" style={{ padding: 16 }}>
                      <div className="card-badge-row">
                        <strong>Resume phase 1</strong>
                        <span className="field-hint">Lecture seule</span>
                      </div>
                      <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }}>
                          <div>
                            <small className="field-hint">Designation</small>
                            <strong>{form.designation || "Non renseignee"}</strong>
                          </div>
                          <div>
                            <small className="field-hint">Valeur acquisition</small>
                            <strong>{formatMoney(form.valeur)}</strong>
                          </div>
                          <div>
                            <small className="field-hint">Service detenteur</small>
                            <strong>{form.service || "Non renseigne"}</strong>
                          </div>
                          <div>
                            <small className="field-hint">Localisation</small>
                            <strong>{form.localisation || "Non renseignee"}</strong>
                          </div>
                        </div>
                        <div>
                          <small className="field-hint">Codification</small>
                          <div className="badge-premium monospace" style={{ width: "fit-content" }}>
                            {`${form.categoriePrincipale || "CAT"} / ${form.codeFamille || "FAM"} / ${form.codeSousCategorie || "SCAT"}`}
                          </div>
                        </div>
                      </div>
                    </div>
                    <button type="button" className="primary" disabled={generatingIup} onClick={() => void handleGenerateIup()}>
                      {generatingIup ? "Generation IUP..." : "Generer l'IUP"}
                    </button>
                    <label className="checkbox-modern">
                      <input
                        type="checkbox"
                        checked={manualIup}
                        onChange={(event) => {
                          const checked = event.target.checked;
                          setManualIup(checked);
                          if (checked) {
                            setQrCode("");
                          }
                        }}
                      />
                      <span>Saisie manuelle de l'IUP</span>
                    </label>
                    <Field label="IUP" error={errors.iup}>
                      <input
                        className="monospace"
                        readOnly={!manualIup && Boolean(form.iup)}
                        value={form.iup}
                        onChange={(event) => updateField("iup", event.target.value.toUpperCase())}
                      />
                    </Field>
                    {form.iup ? (
                      <button type="button" className="iup-display" onClick={() => void copyIup(form.iup)}>
                        <strong>{form.iup}</strong>
                        <span>
                          {(iupMeta?.prefixe || "PREFIXE") +
                            "-" +
                            (iupMeta?.categorie || "CAT") +
                            "-" +
                            String(iupMeta?.annee || new Date(form.dateAcquisition || today).getFullYear()) +
                            "-" +
                            (iupMeta?.sequence || "SEQUENCE")}
                        </span>
                      </button>
                    ) : null}
                    {iupUnique !== null ? (
                      <span className={iupUnique ? "badge-ok" : "badge-danger"}>
                        {iupUnique ? "Identifiant unique verifie" : "Format invalide ou deja utilise"}
                      </span>
                    ) : null}
                    <Field label="Numero inventaire physique">
                      <input value={form.numInventaire} onChange={(event) => updateField("numInventaire", event.target.value)} />
                    </Field>
                  </div>
                  <div className="qr-panel">
                    <button
                      type="button"
                      className="btn-export"
                      disabled={!form.iup.trim() || iupUnique === false || generatingQr}
                      onClick={() => void handleGenerateQr()}
                    >
                      {generatingQr ? "Generation QR..." : "Generer le QR Code"}
                    </button>
                    <div className="print-label">
                      <strong className="monospace">{form.iup || "IUP"}</strong>
                      {qrCode ? <img src={`data:image/png;base64,${qrCode}`} alt="QR Code" /> : <div className="qr-placeholder">QR</div>}
                      <span>{form.designation}</span>
                      <small>{form.service} - {form.localisation}</small>
                    </div>
                    <button type="button" className="btn-export" onClick={() => window.print()}>Imprimer l'etiquette</button>
                  </div>
                </div>
                <div className="form-footer">
                  <button type="button" className="btn-export" onClick={() => setActiveStep(1)}>Retour recensement</button>
                  <button type="button" className="primary" disabled={saving} onClick={() => void saveBien()}>
                    {saving ? "Enregistrement..." : "Enregistrer le bien"}
                  </button>
                </div>
              </div>
            ) : null}

            {activeStep === 3 ? (
              <div className="step-panel">
                <div className="recap-card">
                  <strong>Affectation immediate</strong>
                  <span>Le bien peut etre affecte maintenant ou plus tard depuis la galerie.</span>
                </div>
                <div className="asset-card" style={{ padding: 18 }}>
                  <div className="card-badge-row">
                    <strong>{createdBien?.designation || form.designation || "Bien enregistre"}</strong>
                    <span className="badge-ok">{createdBien?.iup || form.iup || "IUP"}</span>
                  </div>
                  <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
                    <span>{renderCataloguePath(form.categoriePrincipale, form.codeFamille, form.familleCatalogue, form.codeSousCategorie, form.sousCategorie)}</span>
                    <span>{formatMoney(form.valeur)} - {form.service || "Sans service"} - {form.localisation || "Sans localisation"}</span>
                    <small className="field-hint">
                      {returningToGallery
                        ? "Retour en cours vers la galerie..."
                        : "Choisissez une affectation immediate ou laissez le bien revenir dans la galerie."}
                    </small>
                  </div>
                </div>
                <div className="form-footer">
                  <button type="button" className="primary" disabled={returningToGallery} onClick={() => openAffectationFlow(createdBien)}>
                    Oui, affecter maintenant
                  </button>
                  <button type="button" className="btn-export" disabled={returningToGallery} onClick={finalizeWithoutAffectation}>
                    {returningToGallery ? "Retour galerie..." : "Non, affecter plus tard"}
                  </button>
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
                className="primary danger-bg"
                onClick={async () => {
                  await confirmation.onConfirm();
                  setConfirmation(null);
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
        <h4>Champs specifiques immobilier</h4>
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
        <h4>Champs specifiques materiel roulant</h4>
        <div className="grid-2">
          <Field label="Immatriculation" error={errors.immatriculation}><input value={form.immatriculation} onChange={(event) => updateField("immatriculation", event.target.value.toUpperCase())} /></Field>
          <Field label="Numero chassis" error={errors.numChassis}><input value={form.numChassis} onChange={(event) => updateField("numChassis", event.target.value)} /></Field>
          <Field label="Marque" error={errors.marque}><input value={form.marque} onChange={(event) => updateField("marque", event.target.value)} /></Field>
          <Field label="Modele" error={errors.modele}><input value={form.modele} onChange={(event) => updateField("modele", event.target.value)} /></Field>
          <Field label="Puissance fiscale"><input value={form.puissanceFiscale} onChange={(event) => updateField("puissanceFiscale", event.target.value)} /></Field>
          <Field label="Type boite"><input value={form.typeBoite} onChange={(event) => updateField("typeBoite", event.target.value)} /></Field>
          <Field label="Type carburant"><input value={form.typeCarburant} onChange={(event) => updateField("typeCarburant", event.target.value)} /></Field>
          <Field label="Charge utile"><input value={form.chargeUtile} onChange={(event) => updateField("chargeUtile", event.target.value)} /></Field>
          <Field label="Date prochaine visite technique" error={errors.dateProchaineVisiteTechnique}><input type="date" value={form.dateProchaineVisiteTechnique} onChange={(event) => updateField("dateProchaineVisiteTechnique", event.target.value)} /></Field>
        </div>
      </div>
    );
  }

  return (
    <div className="specific-panel asset-mobilier">
      <h4>Champs specifiques mobilier</h4>
      <div className="grid-2">
        <Field label="Numero serie"><input value={form.numSerie} onChange={(event) => updateField("numSerie", event.target.value)} /></Field>
        <Field label="Fabricant"><input value={form.fabricant} onChange={(event) => updateField("fabricant", event.target.value)} /></Field>
        <Field label="Marque"><input value={form.marque} onChange={(event) => updateField("marque", event.target.value)} /></Field>
        <Field label="Modele"><input value={form.modele} onChange={(event) => updateField("modele", event.target.value)} /></Field>
        <Field label="Date fin garantie" error={errors.finGarantie}><input type="date" value={form.finGarantie} onChange={(event) => updateField("finGarantie", event.target.value)} /></Field>
        <Field label="Specifications techniques" span><textarea rows={3} value={form.specificationsTechniques} onChange={(event) => updateField("specificationsTechniques", event.target.value)} /></Field>
      </div>
    </div>
  );
}
