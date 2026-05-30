import React, { useEffect, useMemo, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  ArrowRight,
  ArrowUpFromLine,
  Boxes,
  CheckCircle2,
  ClipboardList,
  FilePlus2,
  FileText,
  Gauge,
  History,
  Info,
  Package,
  PlusCircle,
  ReceiptText,
  Search,
  ShieldCheck,
  TrendingDown,
  TrendingUp,
  Warehouse,
  X,
} from "lucide-react";
import {
  createConsommable,
  createMagasin,
  createMouvementStock,
  getConsommables,
  getMagasins,
  getMouvementsStock,
  getServices,
  getStocks,
  validerMouvementStock,
} from "../api/api";
import AnimatedNumber from "../components/AnimatedNumber";
import BeneficiaireSelect from "../components/BeneficiaireSelect";
import NomenclatureSelector from "../components/NomenclatureSelector";
import { usePermissions } from "../contexts/PermissionsContext";
import { useToast } from "../contexts/ToastContext";
import { exportFicheStockExcel } from "../utils/exporters";
import "./StocksPage.css";

type StockView = "DASHBOARD" | "MOUVEMENT" | "CATALOGUE" | "MAGASINS";
type MovementType = "ENTREE" | "SORTIE";

const formatDate = (value?: string) => {
  if (!value) return "Date inconnue";
  return new Date(value).toLocaleString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getMovementType = (movement: any): MovementType => {
  return (movement.typeOperation || movement.typeMouvement || "ENTREE") === "SORTIE" ? "SORTIE" : "ENTREE";
};

const getMovementDate = (movement: any) => movement.dateOperation || movement.dateMouvement || movement.createdAt;

const getMovementArticle = (movement: any) =>
  movement.stock?.consommable?.nomProduit || movement.consommable?.nomProduit || "Article inconnu";

const getMovementUnit = (movement: any) =>
  movement.stock?.consommable?.unite || movement.consommable?.unite || "unités";

const StocksPage: React.FC = () => {
  const { showToast } = useToast();
  const { hasPermission } = usePermissions();
  const canValidate = hasPermission("VALIDATE_STOCKS");
  const [view, setView] = useState<StockView>("DASHBOARD");
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [magasins, setMagasins] = useState<any[]>([]);
  const [mouvements, setMouvements] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [mouvType, setMouvType] = useState<MovementType>("ENTREE");
  const [showMouvementModal, setShowMouvementModal] = useState(false);
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [showMagasinModal, setShowMagasinModal] = useState(false);

  const [articleForm, setArticleForm] = useState({
    codeArticle: "",
    nomProduit: "",
    seuilAlerte: 10,
    unite: "Unité",
    prixMoyenPondere: 0,
    serviceAffiche: "",
    nomenclatureCode: "",
    profilArticle: "CONSOMMABLE_COURANT",
    conditionnement: "",
    rythmeConsommation: "REGULIER",
    criticite: "NORMALE",
    emplacementReference: "",
    descriptionUsage: "",
  });

  const [magasinForm, setMagasinForm] = useState({
    nom: "",
    code: "",
    localisation: "",
    responsable: "",
  });

  const [mouvForm, setMouvForm] = useState({
    consommableId: "",
    magasinId: "",
    quantite: 1,
    prixUnitaire: 0,
    fournisseur: "",
    pieceJustificative: "",
    observations: "",
    beneficiaire: "",
    beneficiaireLibre: "",
    destination: "",
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [articlesData, stocksData, magasinsData, mouvementsData, servicesData] = await Promise.all([
        getConsommables().catch(() => []),
        getStocks().catch(() => []),
        getMagasins().catch(() => []),
        getMouvementsStock().catch(() => []),
        getServices().catch(() => []),
      ]);
      setArticles(articlesData || []);
      setStocks(stocksData || []);
      setMagasins(magasinsData || []);
      setMouvements(mouvementsData || []);
      setServices(servicesData || []);
    } finally {
      setLoading(false);
    }
  };

  const stockByArticleId = useMemo(() => {
    const map = new Map<number, any>();
    stocks.forEach(stock => {
      if (stock.consommable?.id != null) {
        map.set(stock.consommable.id, stock);
      }
    });
    return map;
  }, [stocks]);

  const articleCards = useMemo(() => {
    return articles
      .map(article => {
        const stock = stockByArticleId.get(article.id);
        const quantite = Number(stock?.quantite || 0);
        const seuil = Number(stock?.seuilAlerte || article.seuilAlerte || 0);
        const prix = Number(stock?.prixMoyenPondere || article.prixMoyenPondere || 0);
        const ratio = seuil > 0 ? Math.min(100, Math.round((quantite / seuil) * 100)) : 100;
        return {
          ...article,
          stock,
          quantite,
          seuil,
          prix,
          ratio,
          low: quantite <= seuil,
          empty: quantite <= 0,
        };
      })
      .filter(article =>
        [article.nomProduit, article.codeArticle, article.serviceAffiche, article.unite, article.profilArticle, article.conditionnement, article.criticite, article.emplacementReference]
          .some(value => String(value || "").toLowerCase().includes(search.toLowerCase())),
      );
  }, [articles, stockByArticleId, search]);

  const dashboard = useMemo(() => {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    const monthMovements = mouvements.filter(movement => {
      const dateValue = getMovementDate(movement);
      if (!dateValue) return false;
      const date = new Date(dateValue);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });
    const entreesMonth = monthMovements
      .filter(movement => getMovementType(movement) === "ENTREE")
      .reduce((sum, movement) => sum + Number(movement.quantite || 0), 0);
    const sortiesMonth = monthMovements
      .filter(movement => getMovementType(movement) === "SORTIE")
      .reduce((sum, movement) => sum + Number(movement.quantite || 0), 0);
    const totalStock = articleCards.reduce((sum, article) => sum + article.quantite, 0);
    const totalValue = articleCards.reduce((sum, article) => sum + article.quantite * article.prix, 0);
    const lowCount = articleCards.filter(article => article.low).length;
    const emptyCount = articleCards.filter(article => article.empty).length;
    const pending = mouvements.filter(movement => !movement.estValide).length;
    const pendingCost = mouvements
      .filter(movement => !movement.estValide)
      .reduce((sum, movement) => sum + Number(movement.quantite || 0) * Number(movement.prixUnitaire || 0), 0);
    const pendingQuantity = mouvements
      .filter(movement => !movement.estValide)
      .reduce((sum, movement) => sum + Number(movement.quantite || 0), 0);
    const totalArticles = articleCards.length;
    const healthyCount = Math.max(0, totalArticles - lowCount);
    const alertRate = totalArticles ? Math.round((lowCount / totalArticles) * 100) : 0;
    const validationRate = mouvements.length ? Math.round(((mouvements.length - pending) / mouvements.length) * 100) : 100;
    const netMonth = entreesMonth - sortiesMonth;
    const replenishmentUnits = articleCards
      .filter(article => article.low)
      .reduce((sum, article) => sum + Math.max(0, article.seuil - article.quantite), 0);
    const critical = [...articleCards].filter(article => article.low).sort((a, b) => a.quantite - b.quantite);
    const lastMovements = [...mouvements]
      .sort((a, b) => new Date(getMovementDate(b) || 0).getTime() - new Date(getMovementDate(a) || 0).getTime())
      .slice(0, 8);
    return {
      totalStock,
      totalValue,
      lowCount,
      emptyCount,
      pending,
      pendingCost,
      pendingQuantity,
      entreesMonth,
      sortiesMonth,
      totalArticles,
      healthyCount,
      alertRate,
      validationRate,
      netMonth,
      replenishmentUnits,
      critical,
      lastMovements,
    };
  }, [articleCards, mouvements]);

  const selectedArticle = useMemo(
    () => articleCards.find(article => String(article.id) === mouvForm.consommableId),
    [articleCards, mouvForm.consommableId],
  );

  const submitArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    await createConsommable({
      ...articleForm,
      nomenclature: articleForm.nomenclatureCode ? { code: articleForm.nomenclatureCode } : null,
      commune: null,
    });
    setArticleForm({
      codeArticle: "",
      nomProduit: "",
      seuilAlerte: 10,
      unite: "Unité",
      prixMoyenPondere: 0,
      serviceAffiche: "",
      nomenclatureCode: "",
      profilArticle: "CONSOMMABLE_COURANT",
      conditionnement: "",
      rythmeConsommation: "REGULIER",
      criticite: "NORMALE",
      emplacementReference: "",
      descriptionUsage: "",
    });
    showToast({ type: "success", title: "Article créé", message: "Le consommable est ajouté au catalogue." });
    await loadData();
    setShowArticleModal(false);
    setView("CATALOGUE");
  };

  const submitMagasin = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMagasin(magasinForm);
    setMagasinForm({ nom: "", code: "", localisation: "", responsable: "" });
    showToast({ type: "success", title: "Magasin créé", message: "Le point de stockage est disponible." });
    await loadData();
    setShowMagasinModal(false);
  };

  const submitMouvement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mouvForm.consommableId || Number(mouvForm.consommableId) <= 0) {
      showToast({ type: "warning", title: "Article obligatoire", message: "Sélectionnez l'article concerné par le mouvement." });
      return;
    }
    if (Number(mouvForm.quantite) <= 0) {
      showToast({ type: "warning", title: "Quantité invalide", message: "La quantité doit être supérieure à zéro." });
      return;
    }
    if (mouvType === "SORTIE" && !mouvForm.beneficiaire && !mouvForm.beneficiaireLibre?.trim()) {
      showToast({
        type: "warning",
        title: "Bénéficiaire obligatoire",
        message: "Une sortie doit indiquer la personne, le service ou le projet destinataire.",
      });
      return;
    }

    await createMouvementStock({
      consommableId: Number(mouvForm.consommableId),
      magasinId: mouvForm.magasinId ? Number(mouvForm.magasinId) : null,
      quantite: Number(mouvForm.quantite),
      prixUnitaire: Number(mouvForm.prixUnitaire),
      fournisseur: mouvForm.fournisseur,
      pieceJustificative: mouvForm.pieceJustificative,
      observations: mouvForm.observations,
      destination: mouvForm.destination,
      beneficiaireLibre: mouvForm.beneficiaireLibre,
      typeOperation: mouvType,
      dateOperation: new Date().toISOString().slice(0, 19),
      beneficiaireId: mouvType === "SORTIE" && mouvForm.beneficiaire ? Number(mouvForm.beneficiaire) : null,
    });
    setMouvForm({
      consommableId: "",
      magasinId: "",
      quantite: 1,
      prixUnitaire: 0,
      fournisseur: "",
      pieceJustificative: "",
      observations: "",
      beneficiaire: "",
      beneficiaireLibre: "",
      destination: "",
    });
    showToast({
      type: "success",
      title: "Mouvement en attente de validation",
      message: mouvType === "ENTREE"
        ? "L'entrée est enregistrée, mais le stock et le coût officiel changeront seulement après validation."
        : "La sortie est enregistrée, mais le stock et le coût officiel changeront seulement après validation.",
    });
    await loadData();
    setShowMouvementModal(false);
    setView("DASHBOARD");
  };

  const exportArticleLedger = (article: any) => {
    const linkedMovements = mouvements
      .filter(movement => movement.stock?.consommable?.id === article.id || movement.consommable?.id === article.id)
      .map(movement => ({
        date: getMovementDate(movement),
        piece: movement.referencePiece || movement.pieceJustificative,
        type: getMovementType(movement),
        qte: movement.quantite,
        pu: movement.prixUnitaire || article.prix,
        observations: movement.destination || movement.observations || movement.serviceDemandeur,
      }));
    exportFicheStockExcel(
      { id: article.codeArticle || article.id, article: article.nomProduit, unite: article.unite },
      linkedMovements,
      `fiche_stock_${article.codeArticle || article.id}.xls`,
    );
  };

  return (
    <div className="dashboard-container stock-workspace fade-in">
      <header className="stock-hero">
        <div>
          <span className="stock-eyebrow">Logistique & consommables</span>
          <h1>Stocks</h1>
          <p>
            Créez d'abord la fiche d'un article, puis enregistrez ses entrées et sorties.
            Le cockpit sépare clairement le référentiel, les quantités et les validations.
          </p>
        </div>
        <div className="stock-hero-actions">
          <button className="stock-primary-action" onClick={() => { setView("MOUVEMENT"); setMouvType("ENTREE"); }}>
            <ArrowDownToLine size={18} />
            Entrée de stock
          </button>
          <button className="stock-secondary-action" onClick={() => { setView("MOUVEMENT"); setMouvType("SORTIE"); }}>
            <ArrowUpFromLine size={18} />
            Sortie de stock
          </button>
        </div>
      </header>

      <nav className="stock-tabs" aria-label="Navigation stocks">
        {[
          { id: "DASHBOARD", label: "Cockpit", icon: <Gauge size={17} /> },
          { id: "MOUVEMENT", label: "Mouvements", icon: <Activity size={17} /> },
          { id: "CATALOGUE", label: "Fiches articles", icon: <Package size={17} /> },
          { id: "MAGASINS", label: "Magasins", icon: <Warehouse size={17} /> },
        ].map(item => (
          <button
            key={item.id}
            className={`stock-tab ${view === item.id ? "active" : ""}`}
            onClick={() => setView(item.id as StockView)}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>

      {loading ? (
        <div className="stock-loading">Chargement du module stock...</div>
      ) : (
        <>
          <section className="stock-kpi-grid">
            <article className="stock-kpi-card featured">
              <span>Stock disponible</span>
              <strong><AnimatedNumber value={dashboard.totalStock} /></strong>
              <p>{dashboard.totalArticles} fiche(s) article suivie(s)</p>
            </article>
            <article className="stock-kpi-card">
              <span>Valeur estimée</span>
              <strong><AnimatedNumber value={dashboard.totalValue} isMoney /></strong>
              <p>Montant officiel, hors mouvements en attente</p>
            </article>
            <article className="stock-kpi-card danger">
              <span>Articles critiques</span>
              <strong><AnimatedNumber value={dashboard.lowCount} /></strong>
              <p>{dashboard.emptyCount} article(s) à zéro</p>
            </article>
            <article className="stock-kpi-card warning">
              <span>À valider</span>
              <strong><AnimatedNumber value={dashboard.pending} /></strong>
              <p>{dashboard.validationRate}% des mouvements déjà validés</p>
            </article>
          </section>

          {dashboard.pending > 0 && (
            <div className="stock-pending-banner">
              <Info size={20} />
              <div>
                <strong>{dashboard.pending} mouvement(s) en attente de validation</strong>
                <p>
                  Les quantités et les coûts officiels ne changent pas encore.
                  Impact en attente : {dashboard.pendingQuantity} unité(s), soit {dashboard.pendingCost} FCFA à intégrer après validation.
                </p>
              </div>
            </div>
          )}

          {view === "DASHBOARD" && (
            <div className="stock-dashboard-grid">
              <section className="stock-command-panel">
                <div className="stock-section-heading">
                  <div>
                    <span>Tour de contrôle</span>
                    <h2>Santé du stock</h2>
                  </div>
                  <ShieldCheck size={24} />
                </div>
                <div className="stock-health-panel">
                  <div className="health-score">
                    <span>Couverture catalogue</span>
                    <strong>{dashboard.totalArticles ? Math.max(0, 100 - dashboard.alertRate) : 100}%</strong>
                    <p>{dashboard.healthyCount} article(s) au-dessus du seuil</p>
                  </div>
                  <div className="health-meter" aria-label="Niveau de santé du stock">
                    <span style={{ width: `${dashboard.totalArticles ? Math.max(0, 100 - dashboard.alertRate) : 100}%` }} />
                  </div>
                  <div className="health-facts">
                    <div>
                      <span>Ruptures</span>
                      <strong>{dashboard.emptyCount}</strong>
                    </div>
                    <div>
                      <span>À commander</span>
                      <strong>{dashboard.replenishmentUnits}</strong>
                    </div>
                    <div>
                      <span>Flux net mois</span>
                      <strong>{dashboard.netMonth >= 0 ? "+" : ""}{dashboard.netMonth}</strong>
                    </div>
                    <div>
                      <span>Coûts en attente</span>
                      <strong>{dashboard.pendingCost}</strong>
                    </div>
                  </div>
                </div>
                <div className="stock-flow-summary">
                  <div className="flow-card in">
                    <ArrowDownToLine size={22} />
                    <span>Entrées</span>
                    <strong>{dashboard.entreesMonth}</strong>
                    <p>Réceptions, achats ou retours en magasin</p>
                  </div>
                  <div className="flow-card out">
                    <ArrowUpFromLine size={22} />
                    <span>Sorties</span>
                    <strong>{dashboard.sortiesMonth}</strong>
                    <p>Consommations, distributions ou projets</p>
                  </div>
                </div>
                <div className="stock-quick-actions">
                  <button type="button" onClick={() => { setView("MOUVEMENT"); setMouvType("ENTREE"); setShowMouvementModal(true); }}>
                    <ArrowDownToLine size={18} />
                    Nouvelle entrée
                  </button>
                  <button type="button" onClick={() => { setView("MOUVEMENT"); setMouvType("SORTIE"); setShowMouvementModal(true); }}>
                    <ArrowUpFromLine size={18} />
                    Nouvelle sortie
                  </button>
                  <button type="button" onClick={() => { setView("CATALOGUE"); setShowArticleModal(true); }}>
                    <FilePlus2 size={18} />
                    Fiche article
                  </button>
                </div>
                <div className="stock-logic-strip">
                  <div>
                    <strong>Fiche article</strong>
                    <p>Décrit l'article une seule fois : nom, unité, famille, seuil et prix indicatif.</p>
                  </div>
                  <ArrowRight size={18} />
                  <div>
                    <strong>Mouvement</strong>
                    <p>Change la quantité réelle : entrée quand on reçoit, sortie quand on distribue.</p>
                  </div>
                </div>
              </section>

              <section className="stock-panel">
                <div className="stock-section-heading">
                  <div>
                    <span>Priorité</span>
                    <h2>Articles à réapprovisionner</h2>
                  </div>
                  <AlertTriangle size={24} />
                </div>
                <div className="stock-list">
                  {dashboard.critical.slice(0, 6).map(article => (
                    <article key={article.id} className="stock-alert-row">
                      <div>
                        <strong>{article.nomProduit}</strong>
                        <span>{article.codeArticle || "Sans code"} · seuil {article.seuil} {article.unite}</span>
                      </div>
                      <em>{article.quantite} {article.unite}</em>
                    </article>
                  ))}
                  {dashboard.critical.length === 0 && (
                    <div className="stock-empty">Aucun article sous le seuil d'alerte.</div>
                  )}
                </div>
              </section>

              <section className="stock-panel wide">
                <div className="stock-section-heading">
                  <div>
                    <span>Traçabilité</span>
                    <h2>Derniers mouvements</h2>
                  </div>
                  <History size={24} />
                </div>
                <div className="stock-timeline">
                  {dashboard.lastMovements.map(movement => (
                    <article key={movement.id} className="stock-movement-row">
                      <div className={`movement-mark ${getMovementType(movement).toLowerCase()}`}>
                        {getMovementType(movement) === "ENTREE" ? <TrendingUp size={18} /> : <TrendingDown size={18} />}
                      </div>
                      <div>
                        <strong>{getMovementArticle(movement)}</strong>
                        <span>{formatDate(getMovementDate(movement))} · {movement.pieceJustificative || movement.referencePiece || "Sans pièce"}</span>
                      </div>
                      <div className="movement-side">
                        <strong>{getMovementType(movement) === "ENTREE" ? "+" : "-"}{movement.quantite} {getMovementUnit(movement)}</strong>
                        <span className={movement.estValide ? "status-chip valid" : "status-chip pending"}>
                          {movement.estValide ? "Validé" : "À valider"}
                        </span>
                      </div>
                    </article>
                  ))}
                  {dashboard.lastMovements.length === 0 && (
                    <div className="stock-empty">Aucun mouvement enregistré.</div>
                  )}
                </div>
              </section>
            </div>
          )}

          {view === "MOUVEMENT" && (
            <div className="stock-movement-layout">
              <section className="stock-panel movement-guide">
                <div className="stock-section-heading">
                  <div>
                    <span>Assistant mouvement</span>
                    <h2>{mouvType === "ENTREE" ? "Ajouter une quantité reçue" : "Retirer une quantité distribuée"}</h2>
                  </div>
                  {mouvType === "ENTREE" ? <ArrowDownToLine size={24} /> : <ArrowUpFromLine size={24} />}
                </div>

                <div className="stock-process-strip">
                  <div className="process-step done">
                    <span>1</span>
                    <strong>Reprendre une carte article</strong>
                    <p>Son identité est déjà personnalisée.</p>
                  </div>
                  <div className="process-step active">
                    <span>2</span>
                    <strong>Décrire l'opération</strong>
                    <p>{mouvType === "ENTREE" ? "Réception, origine et preuve." : "Remise, destinataire et motif."}</p>
                  </div>
                  <div className="process-step">
                    <span>3</span>
                    <strong>Mesurer l'impact</strong>
                    <p>Le niveau change après validation.</p>
                  </div>
                </div>

                <div className="movement-choice">
                  <button className={mouvType === "ENTREE" ? "active" : ""} type="button" onClick={() => { setMouvType("ENTREE"); setShowMouvementModal(true); }}>
                    <ArrowDownToLine size={20} />
                    <strong>Entrée de stock</strong>
                    <span>J'ai reçu des articles : achat, réception, retour ou ajustement positif.</span>
                  </button>
                  <button className={mouvType === "SORTIE" ? "active" : ""} type="button" onClick={() => { setMouvType("SORTIE"); setShowMouvementModal(true); }}>
                    <ArrowUpFromLine size={20} />
                    <strong>Sortie de stock</strong>
                    <span>Je donne ou consomme des articles : service, agent, projet ou patrimoine.</span>
                  </button>
                </div>
                <div className="stock-help-grid">
                  <button type="button" onClick={() => { setView("CATALOGUE"); setShowArticleModal(true); }}>
                    <Package size={18} />
                    <strong>Article absent ?</strong>
                    <span>Créez d'abord sa carte, puis revenez au mouvement.</span>
                  </button>
                  <button type="button" onClick={() => { setView("MAGASINS"); setShowMagasinModal(true); }}>
                    <Warehouse size={18} />
                    <strong>Magasin absent ?</strong>
                    <span>Ajoutez le lieu de stockage en quelques champs.</span>
                  </button>
                  <div>
                    <Info size={18} />
                    <strong>Prix expliqué</strong>
                    <span>Prix unitaire = prix d'une seule unité. Le total est calculé automatiquement.</span>
                  </div>
                </div>

                {showMouvementModal && (
                  <div className="stock-modal-backdrop" role="dialog" aria-modal="true" aria-label={mouvType === "ENTREE" ? "Entrée de stock" : "Sortie de stock"}>
                    <div className="stock-modal stock-modal-wide movement-modal">
                      <div className="stock-modal-header">
                        <div>
                          <span>{mouvType === "ENTREE" ? "Réception stock" : "Sortie stock"}</span>
                          <h2>{mouvType === "ENTREE" ? "Nouvelle entrée de stock" : "Nouvelle sortie de stock"}</h2>
                        </div>
                        <button type="button" className="stock-modal-close" onClick={() => setShowMouvementModal(false)} aria-label="Fermer">
                          <X size={18} />
                        </button>
                      </div>
                      <div className="movement-modal-switch">
                        <button type="button" className={mouvType === "ENTREE" ? "active" : ""} onClick={() => setMouvType("ENTREE")}>
                          <ArrowDownToLine size={17} />
                          Entrée
                        </button>
                        <button type="button" className={mouvType === "SORTIE" ? "active" : ""} onClick={() => setMouvType("SORTIE")}>
                          <ArrowUpFromLine size={17} />
                          Sortie
                        </button>
                      </div>
                      <form className="stock-form movement-form" onSubmit={submitMouvement}>
                  <div className="stock-form-note movement-note">
                    <ReceiptText size={18} />
                    <div>
                      <strong>{mouvType === "ENTREE" ? "Ici, on enregistre une réception réelle." : "Ici, on trace une consommation réelle."}</strong>
                      <p>{mouvType === "ENTREE" ? "La fiche article existe déjà : vous ajoutez seulement une quantité, son origine et sa preuve." : "La fiche article existe déjà : vous indiquez qui reçoit, pourquoi et quelle quantité sort."}</p>
                    </div>
                  </div>
                  <div className="stock-form-grid operation-grid">
                    <label>
                      Article déjà référencé
                      <select value={mouvForm.consommableId} onChange={e => setMouvForm({ ...mouvForm, consommableId: e.target.value })} required>
                        <option value="">Sélectionner la fiche à mouvementer</option>
                        {articleCards.map(article => <option key={article.id} value={article.id}>{article.codeArticle || "Sans code"} — {article.nomProduit}</option>)}
                      </select>
                    </label>
                    <label>
                      Lieu physique de l'opération
                      <select value={mouvForm.magasinId} onChange={e => setMouvForm({ ...mouvForm, magasinId: e.target.value })}>
                        <option value="">Magasin principal / non précisé</option>
                        {magasins.map(magasin => <option key={magasin.id} value={magasin.id}>{magasin.nom}</option>)}
                      </select>
                    </label>
                    <label>
                      Nombre d'unités {mouvType === "ENTREE" ? "qui arrivent" : "qui sortent"}
                      <input type="number" min={1} value={mouvForm.quantite} onChange={e => setMouvForm({ ...mouvForm, quantite: Number(e.target.value) })} required />
                      <small>Exemple : 10 rames, 3 bidons ou 25 pièces selon l'unité de la fiche.</small>
                    </label>
                    <label>
                      Prix d'une seule unité (FCFA)
                      <input type="number" min={0} value={mouvForm.prixUnitaire} onChange={e => setMouvForm({ ...mouvForm, prixUnitaire: Number(e.target.value) })} />
                      <small>Si 1 carton coûte 15 000 FCFA, inscrivez 15 000. Le total se calcule avec la quantité.</small>
                    </label>
                    {mouvType === "ENTREE" && (
                      <label>
                        Origine / fournisseur
                        <input value={mouvForm.fournisseur} onChange={e => setMouvForm({ ...mouvForm, fournisseur: e.target.value })} placeholder="Fournisseur, donateur, retour de service..." />
                      </label>
                    )}
                    <label>
                      Référence de preuve
                      <input value={mouvForm.pieceJustificative} onChange={e => setMouvForm({ ...mouvForm, pieceJustificative: e.target.value })} placeholder={mouvType === "ENTREE" ? "Bon de livraison, facture, PV de réception..." : "Bon de sortie, demande service, ordre de mission..."} required />
                    </label>
                    <label>
                      Note de contrôle
                      <input value={mouvForm.observations} onChange={e => setMouvForm({ ...mouvForm, observations: e.target.value })} placeholder={mouvType === "ENTREE" ? "État à la réception, lot, remarque qualité..." : "Motif d'utilisation, urgence, observation remise..."} />
                    </label>
                    {mouvType === "SORTIE" && (
                      <>
                        <label>
                          Bénéficiaire enregistré
                          <BeneficiaireSelect
                            value={mouvForm.beneficiaire}
                            onChange={value => setMouvForm({ ...mouvForm, beneficiaire: value })}
                          />
                        </label>
                        <label>
                          Bénéficiaire libre
                          <input
                            value={mouvForm.beneficiaireLibre}
                            onChange={e => setMouvForm({ ...mouvForm, beneficiaireLibre: e.target.value })}
                            placeholder="Service, agent ou entité externe"
                          />
                        </label>
                        <label>
                          Destination
                          <select value={mouvForm.destination} onChange={e => setMouvForm({ ...mouvForm, destination: e.target.value })}>
                            <option value="">Destination non précisée</option>
                            <option value="PATRIMOINE">Affectation au patrimoine</option>
                            <option value="SERVICE">Consommation service</option>
                            <option value="PROJET">Projet spécifique</option>
                          </select>
                        </label>
                      </>
                    )}
                  </div>
                  <div className="movement-price-summary">
                    <span>Montant estimé du mouvement</span>
                    <strong>{Number(mouvForm.quantite || 0) * Number(mouvForm.prixUnitaire || 0)} FCFA</strong>
                    <p>Calcul : nombre d'unités × prix d'une unité. Laissez le prix à 0 si le coût n'est pas connu.</p>
                  </div>
                  <div className="pending-validation-note">
                    <Info size={18} />
                    <div>
                      <strong>Après enregistrement : en attente de validation</strong>
                      <p>La ligne sera visible dans le registre, mais le stock réel et les coûts officiels changeront uniquement quand un validateur confirmera le mouvement.</p>
                    </div>
                  </div>
                  <button className="stock-submit" type="submit">
                    {mouvType === "ENTREE" ? <ArrowDownToLine size={18} /> : <ArrowUpFromLine size={18} />}
                    {mouvType === "ENTREE" ? "Ajouter cette quantité au stock" : "Retirer cette quantité du stock"}
                  </button>
                      </form>
                    </div>
                  </div>
                )}
              </section>

              <aside className="stock-panel stock-context-card">
                <span>Impact prévu</span>
                {selectedArticle ? (
                  <>
                    <h3>{selectedArticle.nomProduit}</h3>
                    <div className="context-identity">
                      <span>{selectedArticle.codeArticle || "Sans code"}</span>
                      <span>{selectedArticle.profilArticle || "Profil non défini"}</span>
                      <span>{selectedArticle.conditionnement || selectedArticle.unite}</span>
                    </div>
                    <div className="context-stock-number">{selectedArticle.quantite} {selectedArticle.unite}</div>
                    <p>Stock actuel avant mouvement · seuil minimum : {selectedArticle.seuil} {selectedArticle.unite}</p>
                    <div className="stock-progress">
                      <span style={{ width: `${selectedArticle.ratio}%` }} />
                    </div>
                    <div className={`impact-preview ${mouvType.toLowerCase()}`}>
                      <strong>
                        {mouvType === "ENTREE" ? "+" : "-"}{Number(mouvForm.quantite || 0)} {selectedArticle.unite}
                      </strong>
                      <span>{mouvType === "ENTREE" ? "sera ajouté après validation" : "sera retiré après validation"}</span>
                    </div>
                    <div className="context-after">
                      <span>Niveau prévisionnel</span>
                      <strong>
                        {Math.max(0, selectedArticle.quantite + (mouvType === "ENTREE" ? Number(mouvForm.quantite || 0) : -Number(mouvForm.quantite || 0)))} {selectedArticle.unite}
                      </strong>
                    </div>
                    <em className={selectedArticle.low ? "context-warning" : "context-ok"}>
                      {selectedArticle.low ? "Stock fragile : attention avant une sortie." : "Niveau disponible confortable."}
                    </em>
                  </>
                ) : (
                  <div className="stock-empty compact">Choisissez une fiche article pour voir le stock actuel et l'impact du mouvement.</div>
                )}
              </aside>
            </div>
          )}

          {view === "CATALOGUE" && (
            <div className="stock-catalogue-layout">
              <section className="stock-panel">
                <div className="stock-section-heading">
                  <div>
                    <span>Référentiel</span>
                    <h2>Fiches articles et niveaux</h2>
                  </div>
                  <ClipboardList size={24} />
                </div>
                <div className="stock-search">
                  <Search size={18} />
                  <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Rechercher par nom, code, service..." />
                </div>
                <div className="stock-table">
                  {articleCards.map(article => (
                    <article key={article.id} className="stock-article-row">
                      <div className="article-icon"><Boxes size={19} /></div>
                      <div>
                        <strong>{article.nomProduit}</strong>
                        <span>{article.codeArticle || "Sans code"} · {article.serviceAffiche || "Service non défini"}</span>
                        <div className="article-profile-tags">
                          <em>{article.profilArticle || "Profil non défini"}</em>
                          <em>{article.conditionnement || "Conditionnement libre"}</em>
                          <em>{article.criticite || "Criticité normale"}</em>
                        </div>
                      </div>
                      <div className="article-stock">
                        <strong className={article.low ? "danger-text" : ""}>{article.quantite} {article.unite}</strong>
                        <span>Seuil {article.seuil}</span>
                      </div>
                      <button className="stock-icon-button" title="Exporter la fiche de stock" onClick={() => exportArticleLedger(article)}>
                        <FileText size={16} />
                      </button>
                    </article>
                  ))}
                  {articleCards.length === 0 && <div className="stock-empty">Aucun article trouvé.</div>}
                </div>
              </section>

              <section className="stock-panel">
                <div className="stock-section-heading">
                  <div>
                    <span>Personnaliser l'article</span>
                    <h2>Carte d'identité du consommable</h2>
                  </div>
                  <FilePlus2 size={24} />
                </div>
                <div className="stock-explain-card">
                  <Info size={18} />
                  <div>
                    <strong>Cette zone décrit l'article. Elle ne reçoit aucune quantité.</strong>
                    <p>On y précise la famille, l'usage, le format, la criticité et le seuil. L'entrée de stock vient ensuite pour raconter une réception réelle avec fournisseur, pièce et quantité.</p>
                  </div>
                </div>
                <button className="stock-modal-launch" type="button" onClick={() => setShowArticleModal(true)}>
                  <FilePlus2 size={18} />
                  Ouvrir la personnalisation article
                </button>
                {showArticleModal && (
                  <div className="stock-modal-backdrop" role="dialog" aria-modal="true" aria-label="Personnalisation article">
                    <div className="stock-modal stock-modal-wide">
                      <div className="stock-modal-header">
                        <div>
                          <span>Carte article</span>
                          <h2>Personnaliser le consommable</h2>
                        </div>
                        <button type="button" className="stock-modal-close" onClick={() => setShowArticleModal(false)} aria-label="Fermer">
                          <X size={18} />
                        </button>
                      </div>
                      <form className="stock-form article-profile-form" onSubmit={submitArticle}>
                  <div className="article-form-zone nomenclature-zone">
                    <div className="zone-title">
                      <span>1</span>
                      <div>
                        <strong>Classification officielle</strong>
                        <p>Choisir l'article dans la nomenclature de stock.</p>
                      </div>
                    </div>
                    <NomenclatureSelector
                      partie="B"
                      onSelect={(article) => {
                        setArticleForm(current => ({
                          ...current,
                          nomenclatureCode: article.code,
                          codeArticle: article.code,
                          nomProduit: article.intitule,
                          unite: article.unite_defaut || current.unite,
                        }));
                      }}
                    />
                  </div>
                  <div className="article-form-zone">
                    <div className="zone-title">
                      <span>2</span>
                      <div>
                        <strong>Identité visible</strong>
                        <p>Ce que l'utilisateur verra dans le registre.</p>
                      </div>
                    </div>
                    <div className="stock-form-grid single">
                    <label>
                      Code article officiel
                      <input value={articleForm.codeArticle} readOnly />
                    </label>
                    <label>
                      Nom normalisé de l'article
                      <input value={articleForm.nomProduit} readOnly />
                    </label>
                    <label>
                      Usage local / description métier
                      <input value={articleForm.descriptionUsage} onChange={e => setArticleForm({ ...articleForm, descriptionUsage: e.target.value })} placeholder="Ex: papier utilisé pour les impressions administratives courantes" />
                    </label>
                    <label>
                      Unité de comptage
                      <input value={articleForm.unite} onChange={e => setArticleForm({ ...articleForm, unite: e.target.value })} required />
                    </label>
                    <label>
                      Conditionnement habituel
                      <input value={articleForm.conditionnement} onChange={e => setArticleForm({ ...articleForm, conditionnement: e.target.value })} placeholder="Carton de 5 rames, boîte de 12, bidon 20 L..." />
                    </label>
                    </div>
                  </div>

                  <div className="article-form-zone">
                    <div className="zone-title">
                      <span>3</span>
                      <div>
                        <strong>Règles de gestion</strong>
                        <p>Paramètres qui aident à piloter le stock dans le temps.</p>
                      </div>
                    </div>
                    <div className="stock-form-grid single">
                    <label>
                      Profil de l'article
                      <select value={articleForm.profilArticle} onChange={e => setArticleForm({ ...articleForm, profilArticle: e.target.value })}>
                        <option value="CONSOMMABLE_COURANT">Consommable courant</option>
                        <option value="FOURNITURE_BUREAU">Fourniture de bureau</option>
                        <option value="PIECE_RECHANGE">Pièce de rechange</option>
                        <option value="PRODUIT_TECHNIQUE">Produit technique</option>
                        <option value="ARTICLE_SENSIBLE">Article sensible</option>
                      </select>
                    </label>
                    <label>
                      Rythme de consommation
                      <select value={articleForm.rythmeConsommation} onChange={e => setArticleForm({ ...articleForm, rythmeConsommation: e.target.value })}>
                        <option value="REGULIER">Régulier</option>
                        <option value="SAISONNIER">Saisonnier</option>
                        <option value="OCCASIONNEL">Occasionnel</option>
                        <option value="URGENCE">Réservé aux urgences</option>
                      </select>
                    </label>
                    <label>
                      Criticité métier
                      <select value={articleForm.criticite} onChange={e => setArticleForm({ ...articleForm, criticite: e.target.value })}>
                        <option value="NORMALE">Normale</option>
                        <option value="A_SURVEILLER">À surveiller</option>
                        <option value="CRITIQUE">Critique</option>
                        <option value="STRATEGIQUE">Stratégique</option>
                      </select>
                    </label>
                    <label>
                      Seuil minimum d'alerte
                      <input type="number" min={0} value={articleForm.seuilAlerte} onChange={e => setArticleForm({ ...articleForm, seuilAlerte: Number(e.target.value) })} required />
                    </label>
                    <label>
                      Prix repère catalogue
                      <input type="number" min={0} value={articleForm.prixMoyenPondere} onChange={e => setArticleForm({ ...articleForm, prixMoyenPondere: Number(e.target.value) })} />
                    </label>
                    <label>
                      Service propriétaire de la référence
                      <input list="services-list" value={articleForm.serviceAffiche} onChange={e => setArticleForm({ ...articleForm, serviceAffiche: e.target.value })} />
                      <datalist id="services-list">
                        {services.map(service => <option key={service.id} value={service.nomService || service.nom} />)}
                      </datalist>
                    </label>
                    <label>
                      Emplacement conseillé
                      <input value={articleForm.emplacementReference} onChange={e => setArticleForm({ ...articleForm, emplacementReference: e.target.value })} placeholder="Rayon, armoire, zone froide, magasin technique..." />
                    </label>
                    </div>
                  </div>
                  <button className="stock-submit" type="submit">
                    <ReceiptText size={18} />
                    Créer la carte article personnalisée
                  </button>
                      </form>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}

          {view === "MAGASINS" && (
            <div className="stock-catalogue-layout">
              <section className="stock-panel">
                <div className="stock-section-heading">
                  <div>
                    <span>Réseau logistique</span>
                    <h2>Points de stockage</h2>
                  </div>
                  <Warehouse size={24} />
                </div>
                <div className="stock-list">
                  {magasins.map(magasin => (
                    <article key={magasin.id} className="stock-store-row">
                      <div>
                        <strong>{magasin.nom}</strong>
                        <span>{magasin.code || "Sans code"} · {magasin.localisation || "Localisation non précisée"}</span>
                      </div>
                      <em>{magasin.responsable || "Sans responsable"}</em>
                    </article>
                  ))}
                  {magasins.length === 0 && <div className="stock-empty">Aucun magasin enregistré.</div>}
                </div>
              </section>

              <section className="stock-panel">
                <div className="stock-section-heading">
                  <div>
                    <span>Configuration</span>
                    <h2>Nouveau magasin</h2>
                  </div>
                  <PlusCircle size={24} />
                </div>
                <div className="stock-explain-card">
                  <Warehouse size={18} />
                  <div>
                    <strong>Un magasin est un lieu de rangement et de contrôle.</strong>
                    <p>Créez-le une seule fois, puis utilisez-le dans les entrées et sorties pour savoir où le stock bouge.</p>
                  </div>
                </div>
                <button className="stock-modal-launch" type="button" onClick={() => setShowMagasinModal(true)}>
                  <PlusCircle size={18} />
                  Ouvrir la configuration magasin
                </button>
                {showMagasinModal && (
                  <div className="stock-modal-backdrop" role="dialog" aria-modal="true" aria-label="Nouveau magasin">
                    <div className="stock-modal">
                      <div className="stock-modal-header">
                        <div>
                          <span>Point de stockage</span>
                          <h2>Configurer un magasin</h2>
                        </div>
                        <button type="button" className="stock-modal-close" onClick={() => setShowMagasinModal(false)} aria-label="Fermer">
                          <X size={18} />
                        </button>
                      </div>
                      <form className="stock-form" onSubmit={submitMagasin}>
                        <div className="stock-form-grid single">
                          <label>
                            Nom du magasin
                            <input value={magasinForm.nom} onChange={e => setMagasinForm({ ...magasinForm, nom: e.target.value })} placeholder="Ex: Magasin central, Dépôt technique" required />
                          </label>
                          <label>
                            Code interne
                            <input value={magasinForm.code} onChange={e => setMagasinForm({ ...magasinForm, code: e.target.value })} placeholder="Ex: MAG-CENTRAL" />
                          </label>
                          <label>
                            Localisation précise
                            <input value={magasinForm.localisation} onChange={e => setMagasinForm({ ...magasinForm, localisation: e.target.value })} placeholder="Bâtiment, étage, salle, commune..." />
                          </label>
                          <label>
                            Responsable du magasin
                            <input value={magasinForm.responsable} onChange={e => setMagasinForm({ ...magasinForm, responsable: e.target.value })} placeholder="Nom du gestionnaire ou service responsable" />
                          </label>
                        </div>
                        <button className="stock-submit" type="submit">
                          <PlusCircle size={18} />
                          Créer le magasin
                        </button>
                      </form>
                    </div>
                  </div>
                )}
              </section>
            </div>
          )}

          {view === "DASHBOARD" && dashboard.pending > 0 && canValidate && (
            <section className="stock-panel stock-validation-panel">
              <div className="stock-section-heading">
                <div>
                  <span>Validation</span>
                  <h2>Mouvements en attente</h2>
                </div>
                <CheckCircle2 size={24} />
              </div>
              <div className="stock-timeline">
                {mouvements.filter(movement => !movement.estValide).slice(0, 6).map(movement => (
                  <article key={movement.id} className="stock-movement-row">
                    <div className={`movement-mark ${getMovementType(movement).toLowerCase()}`}>
                      {getMovementType(movement) === "ENTREE" ? <ArrowDownToLine size={18} /> : <ArrowUpFromLine size={18} />}
                    </div>
                    <div>
                      <strong>{getMovementArticle(movement)}</strong>
                      <span>{movement.quantite} {getMovementUnit(movement)} · {movement.pieceJustificative || "Sans pièce"}</span>
                    </div>
                    <button className="stock-validate-button" onClick={() => validerMouvementStock(movement.id).then(loadData)}>
                      Valider
                    </button>
                  </article>
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </div>
  );
};

export default StocksPage;
