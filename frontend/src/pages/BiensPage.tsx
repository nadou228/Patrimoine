import { useEffect, useMemo, useState } from "react";
import { BienCatalogueItem, createBien, deleteBien, getBienCatalogue, getBiens, updateBien } from "../api/biens";
import ImageUpload from "../components/ImageUpload";
import FileUpload from "../components/FileUpload";
import { exportPdf, exportLivreJournalPremiumExcel, exportGrandLivrePremiumExcel } from "../utils/exporters";
import MouvementTimeline from "../components/MouvementTimeline";
import { usePermissions } from "../contexts/PermissionsContext";

const EMPTY_BIEN: any = {
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
  coordonneeGps: "",
  coordonneesGps: "",
  photoUrl: "",
  observation: "",
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
  puissanceFiscale: "",
  typeCarburant: "ESSENCE",
  specificationsTechniques: "",
  dureeAmortissement: 0,
  tauxAmortissement: 0,
  valeurNetteComptable: 0,
  amortissementCumule: 0,
  service: "",
  statutValidation: "EN_ATTENTE",
  statutOperationnel: "ACTIF",
  statutJuridique: "PROPRIETE_PRIVEE",
  chargeUtile: "",
  typeBoite: "MANUELLE",
  finGarantie: "",
  dateMaintenance: "",
  dateDernierEntretien: "",
  dateProchaineMaintenance: "",
  dateProchaineVisiteTechnique: "",
  quantite: 1,
  permisOccuper: false,
  documentsUrls: [] as string[],
  archived: false,
};

const API_BASE_URL = "http://localhost:8082";

const CATEGORY_DECOR: Record<string, { icon: string; accent: string; description: string }> = {
  "IMMOBILISATIONS INCORPORELLES": {
    icon: "IA",
    accent: "linear-gradient(135deg, #1d4ed8 0%, #2563eb 100%)",
    description: "Logiciels, droits, licences et actifs immatériels issus de l'annexe.",
  },
  IMMOBILIER: {
    icon: "IM",
    accent: "linear-gradient(135deg, #0f766e 0%, #14b8a6 100%)",
    description: "Terrains, bâtiments, ouvrages, réseaux et infrastructures codifiés NOMACT.",
  },
  "MOBILIER ET BUREAU": {
    icon: "MB",
    accent: "linear-gradient(135deg, #b45309 0%, #f59e0b 100%)",
    description: "Mobilier de bureau et de logement tel que défini dans le document.",
  },
  "MATERIEL INFORMATIQUE": {
    icon: "IT",
    accent: "linear-gradient(135deg, #7c3aed 0%, #8b5cf6 100%)",
    description: "Ordinateurs, serveurs, périphériques, appareils photo et équipements réseau.",
  },
  "MATERIEL ROULANT ET TRANSPORT": {
    icon: "TR",
    accent: "linear-gradient(135deg, #be123c 0%, #f43f5e 100%)",
    description: "Véhicules, motos, transports de service, en commun et de marchandises.",
  },
  "COLLECTIONS ET EQUIPEMENTS SPECIAUX": {
    icon: "SP",
    accent: "linear-gradient(135deg, #4338ca 0%, #6366f1 100%)",
    description: "Outillage technique, œuvres d'art, cheptels et équipements spécialisés.",
  },
  "STOCKS ET CONSOMMABLES": {
    icon: "ST",
    accent: "linear-gradient(135deg, #166534 0%, #22c55e 100%)",
    description: "Fournitures et consommables gérés avec quantité et référentiel codifié.",
  },
};

export default function BiensPage() {
  const [biens, setBiens] = useState<any[]>([]);
  const [catalogue, setCatalogue] = useState<BienCatalogueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [alertFilter, setAlertFilter] = useState<"ALL" | "MAINTENANCE" | "VISITE" | "STOCK">("ALL");
  const [selectedPrincipalCategory, setSelectedPrincipalCategory] = useState<string | null>(null);
  const [view, setView] = useState<"GALLERY" | "FORM">("GALLERY");
  const [editingBienId, setEditingBienId] = useState<number | null>(null);
  const [servicesList, setServicesList] = useState<any[]>([]);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [showTimeline, setShowTimeline] = useState(false);
  const [detailBien, setDetailBien] = useState<any | null>(null);
  const [form, setForm] = useState<any>({ ...EMPTY_BIEN });
  const { permissions } = usePermissions();
  const isAdmin = permissions?.role === "ADMIN";

  useEffect(() => {
    loadBiens();
    getBienCatalogue().then(setCatalogue).catch(() => setCatalogue([]));
    import("../api/api").then(api => {
      api.getServices().then(setServicesList).catch(() => setServicesList([]));
    });
  }, []);

  const loadBiens = async () => {
    try {
      setLoading(true);
      const data = await getBiens();
      setBiens(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const calculateVNC = (valeur: number, dateAcq: string, duree: number) => {
    if (!valeur || !dateAcq || !duree || duree <= 0) return { vnc: valeur, amort: 0 };
    const acqDate = new Date(dateAcq);
    const now = new Date();
    const diffTime = now.getTime() - acqDate.getTime();
    const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
    const anneesEcoulees = Math.max(0, Math.min(diffYears, duree));
    const amortAnnuel = valeur / duree;
    const amortCumule = amortAnnuel * anneesEcoulees;
    return { vnc: Math.max(0, valeur - amortCumule), amort: amortCumule };
  };

  useEffect(() => {
    const { vnc, amort } = calculateVNC(Number(form.valeur), form.dateAcquisition, Number(form.dureeAmortissement));
    setForm((prev: any) => ({
      ...prev,
      valeurNetteComptable: vnc,
      amortissementCumule: amort,
      tauxAmortissement: form.dureeAmortissement ? 100 / Number(form.dureeAmortissement) : 0,
    }));
  }, [form.valeur, form.dateAcquisition, form.dureeAmortissement]);

  const captureGPS = () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      pos => {
        const coords = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
        setForm((prev: any) => ({ ...prev, coordonneesGps: coords, coordonneeGps: coords }));
        alert(`Position capturée : ${coords}`);
      },
      err => alert(`Erreur GPS : ${err.message}`),
    );
  };

  const filtered = biens.filter(b =>
    [
      b.designation,
      b.iup,
      b.service,
      b.sousCategorie,
      b.codeSousCategorie,
      b.familleCatalogue,
      b.categoriePrincipale,
      b.localisation,
      b.immatriculation,
      b.titreFoncier,
    ].some(value => value?.toLowerCase().includes(search.toLowerCase())),
  );

  const today = new Date();
  const addDays = (date: Date, days: number) => {
    const copy = new Date(date);
    copy.setDate(copy.getDate() + days);
    return copy;
  };

  const isDueSoon = (dateValue?: string, days = 30) => {
    if (!dateValue) return false;
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return false;
    return date >= today && date <= addDays(today, days);
  };

  const isOverdue = (dateValue?: string) => {
    if (!dateValue) return false;
    const date = new Date(dateValue);
    if (Number.isNaN(date.getTime())) return false;
    return date < today;
  };

  const enrichedBiens = filtered.map(bien => {
    const maintenanceCritical = isOverdue(bien.dateProchaineMaintenance) || isDueSoon(bien.dateProchaineMaintenance, 30);
    const visiteCritical = isOverdue(bien.dateProchaineVisiteTechnique) || isDueSoon(bien.dateProchaineVisiteTechnique, 30);
    const stockCritical = (bien.categorie === "STOCKS" || bien.profilFormulaire === "stock") && Number(bien.quantite || 0) <= 5;
    return {
      ...bien,
      maintenanceCritical,
      visiteCritical,
      stockCritical,
      hasAlert: maintenanceCritical || visiteCritical || stockCritical,
    };
  });

  const displayedBiens = enrichedBiens.filter(bien => {
    if (alertFilter === "MAINTENANCE") return bien.maintenanceCritical;
    if (alertFilter === "VISITE") return bien.visiteCritical;
    if (alertFilter === "STOCK") return bien.stockCritical;
    return true;
  });

  const alertStats = {
    maintenance: enrichedBiens.filter(b => b.maintenanceCritical).length,
    visite: enrichedBiens.filter(b => b.visiteCritical).length,
    stock: enrichedBiens.filter(b => b.stockCritical).length,
    total: enrichedBiens.filter(b => b.hasAlert).length,
  };

  const principalCategories = useMemo(() => {
    const grouped = new Map<string, { count: number; sampleFamilies: string[] }>();
    catalogue.filter(item => item.niveau === "ARTICLE").forEach(item => {
      const current = grouped.get(item.categoriePrincipale) ?? { count: 0, sampleFamilies: [] };
      current.count += 1;
      if (!current.sampleFamilies.includes(item.libelleFamille) && current.sampleFamilies.length < 3) {
        current.sampleFamilies.push(item.libelleFamille);
      }
      grouped.set(item.categoriePrincipale, current);
    });

    return Array.from(grouped.entries()).map(([name, data]) => ({
      name,
      ...data,
      decor: CATEGORY_DECOR[name] ?? {
        icon: "BI",
        accent: "linear-gradient(135deg, #475569 0%, #64748b 100%)",
        description: "Référentiel de biens issu du document NOMACT.",
      },
    }));
  }, [catalogue]);

  const availableFamilies = useMemo(() => {
    if (!selectedPrincipalCategory) return [];
    const seen = new Map<string, BienCatalogueItem>();
    catalogue
      .filter(item => item.categoriePrincipale === selectedPrincipalCategory && item.niveau === "ARTICLE")
      .forEach(item => {
        if (!seen.has(item.codeFamille)) {
          seen.set(item.codeFamille, item);
        }
      });
    return Array.from(seen.values()).sort((a, b) => a.codeFamille.localeCompare(b.codeFamille));
  }, [catalogue, selectedPrincipalCategory]);

  const availableArticles = useMemo(() => {
    if (!form.codeFamille) return [];
    return catalogue
      .filter(item => item.niveau === "ARTICLE" && item.codeFamille === form.codeFamille)
      .sort((a, b) => a.code.localeCompare(b.code));
  }, [catalogue, form.codeFamille]);

  const currentArticle = useMemo(
    () => availableArticles.find(item => item.code === form.codeSousCategorie) ?? null,
    [availableArticles, form.codeSousCategorie],
  );

  const selectPrincipalCategory = (categoryName: string) => {
    setSelectedPrincipalCategory(categoryName);
    setForm((prev: any) => ({
      ...prev,
      categoriePrincipale: categoryName,
      codeFamille: "",
      familleCatalogue: "",
      codeSousCategorie: "",
      sousCategorie: "",
      sectionCatalogue: "",
      profilFormulaire: "",
    }));
  };

  const selectFamily = (familyCode: string) => {
    const familyRef = availableFamilies.find(item => item.codeFamille === familyCode);
    setForm((prev: any) => ({
      ...prev,
      categoriePrincipale: selectedPrincipalCategory,
      codeFamille: familyCode,
      familleCatalogue: familyRef?.libelleFamille ?? "",
      codeSousCategorie: "",
      sousCategorie: "",
      sectionCatalogue: familyRef?.section ?? "",
      profilFormulaire: familyRef?.profilFormulaire ?? "",
      categorie: familyRef?.categorieMetier ?? "MOBILIER",
    }));
  };

  const selectArticle = (code: string) => {
    const article = availableArticles.find(item => item.code === code);
    if (!article) return;
    setForm((prev: any) => ({
      ...prev,
      categorie: article.categorieMetier,
      categoriePrincipale: article.categoriePrincipale,
      codeFamille: article.codeFamille,
      familleCatalogue: article.libelleFamille,
      codeSousCategorie: article.code,
      sousCategorie: article.libelle,
      sectionCatalogue: article.section,
      profilFormulaire: article.profilFormulaire,
      designation: editingBienId ? prev.designation : article.libelle,
    }));
  };

  const openNewForm = () => {
    setForm({ ...EMPTY_BIEN });
    setSelectedPrincipalCategory(null);
    setEditingBienId(null);
    setView("FORM");
  };

  const openEditForm = (bien: any) => {
    setForm({ ...EMPTY_BIEN, ...bien });
    setSelectedPrincipalCategory(bien.categoriePrincipale || null);
    setEditingBienId(bien.id);
    setView("FORM");
  };

  const showHistory = async (bienId: number) => {
    try {
      const history = await import("../api/api").then(api => api.getMouvementsByBien(bienId));
      setTimelineData(history);
      setShowTimeline(true);
    } catch {
      alert("Historique indisponible");
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPrincipalCategory || !form.codeSousCategorie) {
      alert("Veuillez sélectionner une catégorie principale, une famille et une sous-catégorie.");
      return;
    }
    try {
      const payload = { ...form };
      if (editingBienId) {
        await updateBien(editingBienId, payload);
        alert("Bien mis à jour avec succès.");
      } else {
        await createBien(payload);
        alert("Bien enregistré avec succès.");
      }
      setView("GALLERY");
      setSelectedPrincipalCategory(null);
      setEditingBienId(null);
      setForm({ ...EMPTY_BIEN });
      loadBiens();
    } catch (err) {
      alert(`Erreur : ${err}`);
    }
  };

  const renderProfileFields = () => {
    const profile = form.profilFormulaire || currentArticle?.profilFormulaire || "generic";

    if (profile === "immobilier") {
      return (
        <>
          <div className="form-group-modern">
            <label>Référence foncière / titre</label>
            <input value={form.titreFoncier} onChange={e => setForm({ ...form, titreFoncier: e.target.value })} />
          </div>
          <div className="form-group-modern">
            <label>Superficie</label>
            <input value={form.superficie} onChange={e => setForm({ ...form, superficie: e.target.value })} placeholder="Ex: 1 500 m²" />
          </div>
          <div className="form-group-modern">
            <label>Mode d'acquisition</label>
            <input value={form.modeAcquisition} onChange={e => setForm({ ...form, modeAcquisition: e.target.value })} placeholder="Achat, construction, concession..." />
          </div>
          <div className="form-group-modern">
            <label>Statut juridique</label>
            <select value={form.statutJuridique} onChange={e => setForm({ ...form, statutJuridique: e.target.value })}>
              <option value="PROPRIETE_PRIVEE">Domaine privé</option>
              <option value="DOMAINE_PUBLIC">Domaine public</option>
              <option value="LOCATION">Location / bail</option>
            </select>
          </div>
          <div className="form-group-modern" style={{ gridColumn: "span 2" }}>
            <label>Conformité</label>
            <div className="checkbox-modern">
              <input type="checkbox" checked={form.permisOccuper} onChange={e => setForm({ ...form, permisOccuper: e.target.checked })} />
              <span>Permis d'occuper ou justificatif de conformité disponible</span>
            </div>
          </div>
        </>
      );
    }

    if (profile === "roulant") {
      return (
        <>
          <div className="form-group-modern">
            <label>Immatriculation</label>
            <input value={form.immatriculation} onChange={e => setForm({ ...form, immatriculation: e.target.value })} />
          </div>
          <div className="form-group-modern">
            <label>Numéro de châssis</label>
            <input value={form.numChassis} onChange={e => setForm({ ...form, numChassis: e.target.value })} />
          </div>
          <div className="form-group-modern">
            <label>Marque</label>
            <input value={form.marque} onChange={e => setForm({ ...form, marque: e.target.value })} />
          </div>
          <div className="form-group-modern">
            <label>Modèle</label>
            <input value={form.modele} onChange={e => setForm({ ...form, modele: e.target.value })} />
          </div>
          <div className="form-group-modern">
            <label>Puissance fiscale</label>
            <input value={form.puissanceFiscale} onChange={e => setForm({ ...form, puissanceFiscale: e.target.value })} />
          </div>
          <div className="form-group-modern">
            <label>Type de boîte</label>
            <select value={form.typeBoite} onChange={e => setForm({ ...form, typeBoite: e.target.value })}>
              <option value="MANUELLE">Manuelle</option>
              <option value="AUTO">Automatique</option>
            </select>
          </div>
          <div className="form-group-modern">
            <label>Charge utile</label>
            <input value={form.chargeUtile} onChange={e => setForm({ ...form, chargeUtile: e.target.value })} placeholder="Ex: 2,5 tonnes" />
          </div>
          <div className="form-group-modern">
            <label>Carburant / énergie</label>
            <select value={form.typeCarburant} onChange={e => setForm({ ...form, typeCarburant: e.target.value })}>
              <option value="ESSENCE">Essence</option>
              <option value="DIESEL">Diesel</option>
              <option value="HYBRIDE">Hybride / électrique</option>
            </select>
          </div>
        </>
      );
    }

    if (profile === "stock") {
      return (
        <>
          <div className="form-group-modern">
            <label>Quantité</label>
            <input type="number" min={1} value={form.quantite} onChange={e => setForm({ ...form, quantite: Number(e.target.value) })} />
          </div>
          <div className="form-group-modern">
            <label>Référence interne / lot</label>
            <input value={form.numSerie} onChange={e => setForm({ ...form, numSerie: e.target.value })} placeholder="Lot, batch ou référence" />
          </div>
          <div className="form-group-modern" style={{ gridColumn: "span 2" }}>
            <label>Précisions techniques</label>
            <textarea value={form.specificationsTechniques} onChange={e => setForm({ ...form, specificationsTechniques: e.target.value })} rows={3} placeholder="Conditionnement, unité, seuil d'alerte ou remarque utile..." />
          </div>
        </>
      );
    }

    return (
      <>
        <div className="form-group-modern">
          <label>Numéro de série</label>
          <input value={form.numSerie} onChange={e => setForm({ ...form, numSerie: e.target.value })} />
        </div>
        <div className="form-group-modern">
          <label>Fabricant / éditeur</label>
          <input value={form.fabricant} onChange={e => setForm({ ...form, fabricant: e.target.value })} />
        </div>
        <div className="form-group-modern">
          <label>Marque</label>
          <input value={form.marque} onChange={e => setForm({ ...form, marque: e.target.value })} />
        </div>
        <div className="form-group-modern">
          <label>Modèle</label>
          <input value={form.modele} onChange={e => setForm({ ...form, modele: e.target.value })} />
        </div>
        <div className="form-group-modern">
          <label>Fin de garantie</label>
          <input type="date" value={form.finGarantie} onChange={e => setForm({ ...form, finGarantie: e.target.value })} />
        </div>
        <div className="form-group-modern">
          <label>Quantité</label>
          <input type="number" min={1} value={form.quantite} onChange={e => setForm({ ...form, quantite: Number(e.target.value) })} />
        </div>
        <div className="form-group-modern" style={{ gridColumn: "span 2" }}>
          <label>Spécifications techniques</label>
          <textarea value={form.specificationsTechniques} onChange={e => setForm({ ...form, specificationsTechniques: e.target.value })} rows={3} placeholder="Configuration, capacité, version, accessoires ou détails métier..." />
        </div>
      </>
    );
  };

  return (
    <div className="biens-module fade-in">
      <header className="page-header-premium">
        <div className="header-meta">
          <span className="badge-pill-glow">Référentiel NOMACT intégré</span>
          <h1>Gestion des biens</h1>
          <p className="header-subtitle">Sélection fidèle à l'annexe, formulaires dynamiques, maintenance et traçabilité consolidées.</p>
        </div>
        <div style={{ display: "flex", gap: "15px" }}>
          <div className="search-box-modern">
            <input
              placeholder="Rechercher un bien, un code ou une sous-catégorie..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              style={{ width: "340px", padding: "10px 20px", borderRadius: "30px", background: "var(--card-bg)", border: "1px solid var(--glass-border)", color: "var(--text-main)" }}
            />
          </div>
          <button className="primary" onClick={openNewForm}>+ Nouveau recensement</button>
        </div>
      </header>

      {view === "GALLERY" ? (
        <section className="registry-gallery">
          <div className="biens-insight-grid">
            <div className="insight-card primary-tone">
              <span className="insight-label">Alertes globales</span>
              <strong>{alertStats.total}</strong>
              <p>Biens nécessitant une attention immédiate ou prochaine.</p>
            </div>
            <div className="insight-card">
              <span className="insight-label">Maintenance</span>
              <strong>{alertStats.maintenance}</strong>
              <p>Biens avec prochaine maintenance échue ou prévue sous 30 jours.</p>
            </div>
            <div className="insight-card">
              <span className="insight-label">Visite technique</span>
              <strong>{alertStats.visite}</strong>
              <p>Suivi des véhicules et équipements soumis à visite planifiée.</p>
            </div>
            <div className="insight-card">
              <span className="insight-label">Quantités faibles</span>
              <strong>{alertStats.stock}</strong>
              <p>Consommables ou stocks avec niveau faible à surveiller.</p>
            </div>
          </div>

          <div className="smart-filter-bar">
            <button className={alertFilter === "ALL" ? "smart-filter active" : "smart-filter"} onClick={() => setAlertFilter("ALL")}>Tous</button>
            <button className={alertFilter === "MAINTENANCE" ? "smart-filter active" : "smart-filter"} onClick={() => setAlertFilter("MAINTENANCE")}>Maintenance</button>
            <button className={alertFilter === "VISITE" ? "smart-filter active" : "smart-filter"} onClick={() => setAlertFilter("VISITE")}>Visite technique</button>
            <button className={alertFilter === "STOCK" ? "smart-filter active" : "smart-filter"} onClick={() => setAlertFilter("STOCK")}>Quantité faible</button>
          </div>

          <div className="export-bar" style={{ justifyContent: "flex-end", marginBottom: "30px" }}>
            <button className="btn-export" onClick={() => exportLivreJournalPremiumExcel(displayedBiens, "Livre_Journal_Premium.xlsx")}>Livre journal</button>
            <button className="btn-export" onClick={() => exportGrandLivrePremiumExcel(displayedBiens, "Grand_Livre_Premium.xlsx")}>Grand livre</button>
            <button className="btn-export" onClick={() => exportPdf(displayedBiens, "REGISTRE", "registre.pdf")}>PDF</button>
          </div>

          {loading ? (
            <div className="empty-state-modern">Chargement des biens...</div>
          ) : (
            <div className="asset-grid">
              {displayedBiens.map(bien => (
                <div key={bien.id} className="asset-card">
                  <div className="card-badge-row" style={{ display: "flex", justifyContent: "space-between", marginBottom: "15px" }}>
                    <span className="badge-premium">{bien.iup || "SANS IUP"}</span>
                    <span className={`status-pill status-${(bien.etat || "neuf").toLowerCase()}`}>{bien.etat}</span>
                  </div>
                  {bien.hasAlert && (
                    <div className="asset-alert-row">
                      {bien.maintenanceCritical && <span className="asset-alert-chip warning">Maintenance</span>}
                      {bien.visiteCritical && <span className="asset-alert-chip danger">Visite technique</span>}
                      {bien.stockCritical && <span className="asset-alert-chip success">Quantité faible</span>}
                    </div>
                  )}
                  <h3 style={{ fontSize: "20px", marginBottom: "10px" }}>{bien.designation}</h3>
                  {bien.photoUrl && (
                    <img src={`${API_BASE_URL}${bien.photoUrl}`} alt="" style={{ width: "100%", height: "180px", objectFit: "cover", borderRadius: "15px", marginBottom: "15px" }} />
                  )}
                  <div className="card-stats-mini" style={{ fontSize: "12px", color: "var(--text-dim)", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div>Service: {bien.service || "Non affecté"}</div>
                    <div>Lieu: {bien.localisation || "Inconnu"}</div>
                    {bien.codeSousCategorie && <div>Code: {bien.codeSousCategorie}</div>}
                    {bien.sousCategorie && <div>Annexe: {bien.sousCategorie}</div>}
                    {bien.immatriculation && <div>Immatriculation: {bien.immatriculation}</div>}
                    {bien.titreFoncier && <div>Titre: {bien.titreFoncier}</div>}
                    {bien.dateProchaineMaintenance && <div>Maint.: {bien.dateProchaineMaintenance}</div>}
                    {bien.dateProchaineVisiteTechnique && <div>Visite: {bien.dateProchaineVisiteTechnique}</div>}
                  </div>

                  <div className="card-financial" style={{ marginTop: "20px", padding: "15px", background: "rgba(29, 78, 216, 0.06)", borderRadius: "12px", border: "1px dashed rgba(29, 78, 216, 0.3)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: "13px" }}>
                      <span>VNC actuelle</span>
                      <strong style={{ color: "var(--primary)" }}>{Math.round(bien.valeurNetteComptable || 0).toLocaleString()} FCFA</strong>
                    </div>
                  </div>

                  <div className="card-actions" style={{ marginTop: "20px", display: "flex", gap: "8px", paddingTop: "15px", borderTop: "1px solid var(--glass-border)" }}>
                    <button className="btn-export" style={{ flex: 1, fontSize: "11px" }} onClick={() => openEditForm(bien)}>Modifier</button>
                    <button className="btn-export" style={{ flex: 1, fontSize: "11px" }} onClick={() => showHistory(bien.id)}>Historique</button>
                    {isAdmin && <button className="btn-export" style={{ flex: 1, fontSize: "11px" }} onClick={() => setDetailBien(bien)}>Détails</button>}
                    <button className="btn-export" style={{ color: "var(--danger)", fontSize: "11px" }} onClick={() => deleteBien(bien.id).then(loadBiens)}>Suppr.</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      ) : (
        <section className="registration-flow">
          {!selectedPrincipalCategory ? (
            <div className="category-selection-premium">
              {principalCategories.map(category => (
                <div key={category.name} className="cat-card-modern" onClick={() => selectPrincipalCategory(category.name)}>
                  <div className="cat-icon-blob" style={{ background: category.decor.accent }}>{category.decor.icon}</div>
                  <h3>{category.name}</h3>
                  <p>{category.decor.description}</p>
                  <div className="category-mini-meta">
                    <span>{category.count} sous-codes</span>
                    <span>{category.sampleFamilies.join(" · ")}</span>
                  </div>
                  <span className="cat-arrow">→</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="centered-form-card fade-in large-form-card">
              <div className="form-header-premium">
                <div>
                  <h2>Recensement : {selectedPrincipalCategory}</h2>
                  <p className="form-subtitle">Choisissez la famille NOMACT, puis la sous-catégorie codifiée. Les champs se configurent ensuite automatiquement.</p>
                </div>
                <button className="btn-back-cat" onClick={() => { setView("GALLERY"); setSelectedPrincipalCategory(null); setEditingBienId(null); }}>Annuler</button>
              </div>

              <form onSubmit={handleSave} className="premium-dynamic-form">
                <div className="selection-shell">
                  <div className="form-group-modern">
                    <label>Catégorie principale du document</label>
                    <div className="selection-pill">{selectedPrincipalCategory}</div>
                  </div>
                  <div className="form-group-modern">
                    <label>Famille de biens</label>
                    <select value={form.codeFamille} onChange={e => selectFamily(e.target.value)}>
                      <option value="">-- Choisir une famille --</option>
                      {availableFamilies.map(item => (
                        <option key={item.codeFamille} value={item.codeFamille}>
                          {item.codeFamille} - {item.libelleFamille}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group-modern" style={{ gridColumn: "span 2" }}>
                    <label>Sous-catégorie codifiée</label>
                    <select value={form.codeSousCategorie} onChange={e => selectArticle(e.target.value)}>
                      <option value="">-- Choisir le bien exactement comme dans l'annexe --</option>
                      {availableArticles.map(item => (
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
                  <h4 className="section-title"><span>01</span> Identification métier</h4>
                  <div className="grid-2">
                    <div className="form-group-modern" style={{ gridColumn: "span 2" }}>
                      <label>Désignation opérationnelle</label>
                      <input required value={form.designation} onChange={e => setForm({ ...form, designation: e.target.value })} placeholder="Nom d'usage, contexte local ou description précise du bien..." />
                    </div>
                    <div className="form-group-modern">
                      <label>Service détenteur</label>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <select style={{ flex: 1 }} value={form.service} onChange={e => setForm({ ...form, service: e.target.value })}>
                          <option value="">-- Choisir --</option>
                          {servicesList.length > 0 ? servicesList.map(s => <option key={s.id} value={s.nomService}>{s.nomService}</option>) : <option value="SERVICE_GENERAL">Service Général</option>}
                        </select>
                        <input placeholder="Saisie libre..." value={form.service} onChange={e => setForm({ ...form, service: e.target.value })} style={{ width: "150px" }} />
                      </div>
                    </div>
                    <div className="form-group-modern">
                      <label>Localisation précise</label>
                      <input value={form.localisation} onChange={e => setForm({ ...form, localisation: e.target.value })} placeholder="Site, bâtiment, étage, bureau, magasin..." />
                    </div>
                    <div className="form-group-modern">
                      <label>Statut opérationnel</label>
                      <select value={form.statutOperationnel} onChange={e => setForm({ ...form, statutOperationnel: e.target.value })}>
                        <option value="ACTIF">Actif / en service</option>
                        <option value="EN_MAINTENANCE">En maintenance</option>
                        <option value="EN_TRANSFERT">En transfert</option>
                        <option value="REFORME">À réformer</option>
                      </select>
                    </div>
                    <div className="form-group-modern">
                      <label>Coordonnées GPS</label>
                      <div style={{ display: "flex", gap: "8px" }}>
                        <input style={{ flex: 1 }} value={form.coordonneesGps} onChange={e => setForm({ ...form, coordonneesGps: e.target.value, coordonneeGps: e.target.value })} placeholder="Lat, Long" />
                        <button type="button" className="btn-export" onClick={captureGPS}>GPS</button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h4 className="section-title"><span>02</span> Détails spécifiques au bien</h4>
                  <div className="grid-2">{renderProfileFields()}</div>
                </div>

                <div className="form-section">
                  <h4 className="section-title"><span>03</span> Maintenance, visites et pièces</h4>
                  <div className="grid-2">
                    <div className="form-group-modern">
                      <label>Date de maintenance</label>
                      <input type="date" value={form.dateMaintenance} onChange={e => setForm({ ...form, dateMaintenance: e.target.value })} />
                    </div>
                    <div className="form-group-modern">
                      <label>Date de prochaine maintenance</label>
                      <input type="date" value={form.dateProchaineMaintenance} onChange={e => setForm({ ...form, dateProchaineMaintenance: e.target.value })} />
                    </div>
                    <div className="form-group-modern">
                      <label>Date de prochaine visite technique</label>
                      <input type="date" value={form.dateProchaineVisiteTechnique} onChange={e => setForm({ ...form, dateProchaineVisiteTechnique: e.target.value })} />
                    </div>
                    <div className="form-group-modern">
                      <label>Date du dernier entretien</label>
                      <input type="date" value={form.dateDernierEntretien} onChange={e => setForm({ ...form, dateDernierEntretien: e.target.value })} />
                    </div>
                    <div className="form-group-modern">
                      <label>Photographie du bien</label>
                      <ImageUpload value={form.photoUrl} onChange={url => setForm({ ...form, photoUrl: url })} />
                    </div>
                    <div className="form-group-modern">
                      <label>Documents et justificatifs</label>
                      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                        <FileUpload onUploadSuccess={url => setForm((prev: any) => ({ ...prev, documentsUrls: [...(prev.documentsUrls || []), url] }))} />
                        <div style={{ fontSize: "11px", color: "var(--text-dim)" }}>{form.documentsUrls?.length || 0} document(s) attaché(s)</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="form-section">
                  <h4 className="section-title"><span>04</span> Valorisation et cycle de vie</h4>
                  <div className="grid-2">
                    <div className="form-group-modern">
                      <label>Valeur d'origine (FCFA)</label>
                      <input type="number" required value={form.valeur} onChange={e => setForm({ ...form, valeur: Number(e.target.value) })} />
                    </div>
                    <div className="form-group-modern">
                      <label>Mise en service</label>
                      <input type="date" required value={form.dateAcquisition} onChange={e => setForm({ ...form, dateAcquisition: e.target.value })} />
                    </div>
                    <div className="form-group-modern">
                      <label>Durée d'amortissement (ans)</label>
                      <input type="number" required value={form.dureeAmortissement} onChange={e => setForm({ ...form, dureeAmortissement: Number(e.target.value) })} />
                    </div>
                    <div className="form-group-modern">
                      <label>État physique</label>
                      <select value={form.etat} onChange={e => setForm({ ...form, etat: e.target.value })}>
                        <option value="NEUF">Neuf</option>
                        <option value="BON">Bon état</option>
                        <option value="MOYEN">Moyen</option>
                        <option value="MAUVAIS">À réformer</option>
                      </select>
                    </div>
                    <div className="form-group-modern">
                      <label>VNC calculée</label>
                      <input disabled value={Math.round(form.valeurNetteComptable || 0).toLocaleString()} />
                    </div>
                    <div className="form-group-modern">
                      <label>Amortissement cumulé</label>
                      <input disabled value={Math.round(form.amortissementCumule || 0).toLocaleString()} />
                    </div>
                  </div>
                </div>

                <div className="form-footer" style={{ marginTop: "30px", display: "flex", justifyContent: "flex-end" }}>
                  <button type="submit" className="primary" style={{ width: "100%", padding: "18px" }}>
                    Confirmer l'enregistrement du bien
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
                <p className="muted-paragraph">Affichage détaillé des mouvements liés au bien sélectionné.</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-export" onClick={() => setShowTimeline(false)}>Masquer</button>
                <button className="btn-export" onClick={() => setTimelineData([])}>Effacer l'affichage</button>
              </div>
            </div>
            <MouvementTimeline mouvements={timelineData} onClose={() => setShowTimeline(false)} />
          </div>
        </div>
      )}

      {detailBien && isAdmin && (
        <div className="admin-detail-overlay" onClick={() => setDetailBien(null)}>
          <div className="admin-detail-panel" onClick={e => e.stopPropagation()}>
            <div className="section-header-inline">
              <div>
                <h3>Données enregistrées en base</h3>
                <p className="muted-paragraph">Vue complète réservée à l'administration pour audit et ajustement.</p>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button className="btn-export" onClick={() => { setDetailBien(null); openEditForm(detailBien); }}>Éditer</button>
                <button className="btn-export" onClick={() => setDetailBien(null)}>Fermer</button>
              </div>
            </div>
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
    </div>
  );
}
