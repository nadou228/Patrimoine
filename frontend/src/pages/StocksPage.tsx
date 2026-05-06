import React, { useEffect, useMemo, useState } from "react";
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
import BeneficiaireSelect from "../components/BeneficiaireSelect";
import { useToast } from "../contexts/ToastContext";
import { exportFicheStockExcel } from "../utils/exporters";
import NomenclatureSelector from "../components/NomenclatureSelector";
import AnimatedNumber from "../components/AnimatedNumber";
import { 
  Package, Warehouse, ArrowLeftRight, ClipboardList, Search, PlusCircle, 
  AlertTriangle, CheckCircle2, History, TrendingUp, DollarSign, Activity, ChevronRight, X, FileText
} from "lucide-react";

const StocksPage: React.FC = () => {
  const { showToast } = useToast();
  const [view, setView] = useState<"DASHBOARD" | "CATALOGUE" | "MOUVEMENTS" | "MAGASINS">("DASHBOARD");
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [magasins, setMagasins] = useState<any[]>([]);
  const [mouvements, setMouvements] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [mouvType, setMouvType] = useState<"ENTREE" | "SORTIE">("ENTREE");

  const [articleForm, setArticleForm] = useState({
    codeArticle: "",
    nomProduit: "",
    seuilAlerte: 10,
    unite: "Unité",
    prixMoyenPondere: 0,
    serviceAffiche: "",
    nomenclatureCode: "",
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
    quantite: 0,
    prixUnitaire: 0,
    pieceJustificative: "",
    observations: "",
    beneficiaire: "",
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
      if (stock.consommable?.id != null) map.set(stock.consommable.id, stock);
    });
    return map;
  }, [stocks]);

  const articleCards = useMemo(() => {
    return articles
      .map(article => {
        const stock = stockByArticleId.get(article.id);
        const quantite = Number(stock?.quantite || 0);
        const seuil = Number(stock?.seuilAlerte || article.seuilAlerte || 0);
        return {
          ...article,
          stock,
          quantite,
          seuil,
          low: quantite <= seuil,
        };
      })
      .filter(article =>
        [article.nomProduit, article.codeArticle, article.serviceAffiche, article.unite]
          .some(value => String(value || "").toLowerCase().includes(search.toLowerCase())),
      );
  }, [articles, stockByArticleId, search]);

  const totals = useMemo(() => {
    const totalStock = articleCards.reduce((sum, article) => sum + article.quantite, 0);
    const totalValue = articleCards.reduce((sum, article) => sum + article.quantite * Number(article.prixMoyenPondere || 0), 0);
    const lowCount = articleCards.filter(article => article.low).length;
    const pending = mouvements.filter(m => !m.estValide).length;
    return { totalStock, totalValue, lowCount, pending };
  }, [articleCards, mouvements]);

  const submitArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    await createConsommable({
      ...articleForm,
      nomenclature: articleForm.nomenclatureCode ? { code: articleForm.nomenclatureCode } : null,
      commune: null,
    });
    setArticleForm({ codeArticle: "", nomProduit: "", seuilAlerte: 10, unite: "Unité", prixMoyenPondere: 0, serviceAffiche: "", nomenclatureCode: "" });
    await loadData();
    setView("CATALOGUE");
  };

  const submitMagasin = async (e: React.FormEvent) => {
    e.preventDefault();
    await createMagasin(magasinForm);
    setMagasinForm({ nom: "", code: "", localisation: "", responsable: "" });
    await loadData();
  };

  const submitMouvement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mouvType === "SORTIE" && !mouvForm.beneficiaire) {
      showToast({
        type: "warning",
        title: "Beneficiaire obligatoire",
        message: "Une sortie de stock doit etre rattachee a un beneficiaire identifie.",
      });
      return;
    }

    await createMouvementStock({
      consommableId: Number(mouvForm.consommableId),
      magasinId: mouvForm.magasinId ? Number(mouvForm.magasinId) : null,
      quantite: Number(mouvForm.quantite),
      prixUnitaire: Number(mouvForm.prixUnitaire),
      pieceJustificative: mouvForm.pieceJustificative,
      observations: mouvForm.observations,
      destination: mouvForm.destination,
      typeOperation: mouvType,
      dateOperation: new Date().toISOString().slice(0, 19),
      beneficiaireId: mouvType === "SORTIE" && mouvForm.beneficiaire ? Number(mouvForm.beneficiaire) : null,
    });
    setMouvForm({ consommableId: "", magasinId: "", quantite: 0, prixUnitaire: 0, pieceJustificative: "", observations: "", beneficiaire: "", destination: "" });
    await loadData();
    setView("MOUVEMENTS");
  };

  const exportArticleLedger = (article: any) => {
    const linkedMovements = mouvements
      .filter(m => m.stock?.consommable?.id === article.id)
      .map(m => ({
        date: m.dateMouvement,
        piece: m.referencePiece,
        type: m.typeMouvement,
        qte: m.quantite,
        pu: m.prixUnitaire || article.prixMoyenPondere,
        observations: m.destination || m.serviceDemandeur,
      }));
    exportFicheStockExcel(
      { id: article.codeArticle || article.id, article: article.nomProduit, unite: article.unite },
      linkedMovements,
      `fiche_stock_${article.codeArticle || article.id}.xls`,
    );
  };

  return (
    <div className="dashboard-container stocks-page-shell fade-in">
      <header className="page-header-modern">
        <div className="header-meta">
          <span className="badge-pill-glow">Logistique & Consommables</span>
          <h1>Gestion des stocks</h1>
        </div>
        <div className="toolbar-filters">
          {[
            { id: "DASHBOARD", label: "Tableau de bord", icon: <Activity size={16} /> },
            { id: "CATALOGUE", label: "Articles", icon: <Package size={16} /> },
            { id: "MOUVEMENTS", label: "Flux & Mouvements", icon: <ArrowLeftRight size={16} /> },
            { id: "MAGASINS", label: "Points de stockage", icon: <Warehouse size={16} /> },
          ].map((item) => (
            <button
              key={item.id}
              className={`pill-filter ${view === item.id ? "active" : ""}`}
              onClick={() => setView(item.id as any)}
            >
              {item.icon}
              {item.label}
            </button>
          ))}
        </div>
      </header>

      {loading ? (
        <div className="empty-state-modern">Chargement du module stock...</div>
      ) : (
        <>
          <div className="stats-dashboard">
            <div className="stat-card-premium">
              <span className="stat-label">Stock total</span>
              <span className="stat-value"><AnimatedNumber value={totals.totalStock} /></span>
              <p className="stat-hint">Unités disponibles</p>
            </div>
            <div className="stat-card-premium">
              <span className="stat-label">Valeur stockée</span>
              <span className="stat-value"><AnimatedNumber value={totals.totalValue} isMoney /></span>
              <p className="stat-hint">Valorisation PMP</p>
            </div>
            <div className="stat-card-premium">
              <span className="stat-label">Alertes seuil</span>
              <span className="stat-value text-danger"><AnimatedNumber value={totals.lowCount} /></span>
              <p className="stat-hint">Ruptures probables</p>
            </div>
            <div className="stat-card-premium">
              <span className="stat-label">En attente</span>
              <span className="stat-value text-warning"><AnimatedNumber value={totals.pending} /></span>
              <p className="stat-hint">Flux à valider</p>
            </div>
          </div>

          {view === "DASHBOARD" && (
            <div className="dashboard-shell-grid">
              <section className="glass-card premium-card">
                <div className="card-header-premium">
                  <div className="icon-box-premium">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h3>Articles en tension</h3>
                    <p className="card-subtitle">Réapprovisionnement nécessaire</p>
                  </div>
                </div>
                <div className="dashboard-mini-list">
                  {articleCards.filter(article => article.low).slice(0, 10).map(article => (
                    <div key={article.id} className="dashboard-mini-row-premium">
                      <div className="row-main">
                        <strong>{article.nomProduit}</strong>
                        <span className="row-sub">{article.codeArticle || "Sans code"} • {article.serviceAffiche || "Service non défini"}</span>
                      </div>
                      <div className="row-side">
                        <strong className="text-danger">{article.quantite} {article.unite}</strong>
                        <span className="row-sub">Seuil {article.seuil}</span>
                      </div>
                    </div>
                  ))}
                  {articleCards.filter(article => article.low).length === 0 && (
                    <div className="empty-state-mini">Aucune alerte de stock actuelle.</div>
                  )}
                </div>
              </section>

              <section className="glass-card premium-card">
                <div className="card-header-premium">
                  <div className="icon-box-premium">
                    <ArrowLeftRight size={20} />
                  </div>
                  <div>
                    <h3>Nouveau mouvement</h3>
                    <p className="card-subtitle">Flux entrants et sortants</p>
                  </div>
                </div>
                <form className="form-content-premium" onSubmit={submitMouvement}>
                  <div className="toggle-toolbar" style={{ marginBottom: 20 }}>
                    <button type="button" className={`pill-filter ${mouvType === "ENTREE" ? "active" : ""}`} onClick={() => setMouvType("ENTREE")}>Entrée</button>
                    <button type="button" className={`pill-filter ${mouvType === "SORTIE" ? "active" : ""}`} onClick={() => setMouvType("SORTIE")}>Sortie</button>
                  </div>
                  <div className="grid-2">
                    <div className="form-group-modern">
                      <label>Article</label>
                      <select value={mouvForm.consommableId} onChange={e => setMouvForm({ ...mouvForm, consommableId: e.target.value })} required>
                        <option value="">-- Choisir --</option>
                        {articles.map(article => <option key={article.id} value={article.id}>{article.nomProduit}</option>)}
                      </select>
                    </div>
                    <div className="form-group-modern">
                      <label>Magasin</label>
                      <select value={mouvForm.magasinId} onChange={e => setMouvForm({ ...mouvForm, magasinId: e.target.value })}>
                        <option value="">-- Choisir --</option>
                        {magasins.map(magasin => <option key={magasin.id} value={magasin.id}>{magasin.nom}</option>)}
                      </select>
                    </div>
                    <div className="form-group-modern">
                      <label>Quantité</label>
                      <input type="number" min={1} value={mouvForm.quantite} onChange={e => setMouvForm({ ...mouvForm, quantite: Number(e.target.value) })} required />
                    </div>
                    <div className="form-group-modern">
                      <label>Prix unitaire</label>
                      <input type="number" min={0} value={mouvForm.prixUnitaire} onChange={e => setMouvForm({ ...mouvForm, prixUnitaire: Number(e.target.value) })} />
                    </div>
                    <div className="form-group-modern">
                      <label>Pièce justificative</label>
                      <input value={mouvForm.pieceJustificative} onChange={e => setMouvForm({ ...mouvForm, pieceJustificative: e.target.value })} required />
                    </div>
                    <div className="form-group-modern" style={{ gridColumn: "span 2" }}>
                      <label>Observations</label>
                      <input value={mouvForm.observations} onChange={e => setMouvForm({ ...mouvForm, observations: e.target.value })} />
                    </div>
                    {mouvType === "SORTIE" && (
                      <>
                        <div className="form-group-modern" style={{ gridColumn: "span 1" }}>
                          <label>Bénéficiaire (Obligatoire)</label>
                          <BeneficiaireSelect 
                            value={mouvForm.beneficiaire} 
                            onChange={val => setMouvForm({ ...mouvForm, beneficiaire: val })} 
                          />
                        </div>
                        <div className="form-group-modern" style={{ gridColumn: "span 1" }}>
                          <label>Destination</label>
                          <select value={mouvForm.destination} onChange={e => setMouvForm({...mouvForm, destination: e.target.value})}>
                            <option value="">-- Autre --</option>
                            <option value="PATRIMOINE">Affectation au Patrimoine (Immobilisation)</option>
                            <option value="SERVICE">Consommation Service</option>
                            <option value="PROJET">Projet Spécifique</option>
                          </select>
                        </div>
                      </>
                    )}
                  </div>
                  <button className="primary-premium" type="submit" style={{ width: "100%", marginTop: 14 }}>
                    <PlusCircle size={18} />
                    Enregistrer le mouvement
                  </button>
                </form>
              </section>
            </div>
          )}

          {view === "CATALOGUE" && (
            <>
              <div className="gallery-toolbar glass-card" style={{ marginBottom: 24 }}>
                <div className="search-box-premium">
                  <Search size={18} />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Rechercher une référence, un nom, un service..."
                  />
                </div>
              </div>
              <div className="dashboard-shell-grid">
                <section className="glass-card premium-card">
                  <div className="card-header-premium">
                    <div className="icon-box-premium">
                      <PlusCircle size={20} />
                    </div>
                    <div>
                      <h3>Nouveau consommable</h3>
                      <p className="card-subtitle">Référencer un article</p>
                    </div>
                  </div>
                  <form className="form-content-premium" onSubmit={submitArticle}>
                    <div className="full-span" style={{ gridColumn: "span 2", marginBottom: 20 }}>
                      <NomenclatureSelector
                        partie="B"
                        onSelect={(article) => {
                          setArticleForm((cur) => ({
                            ...cur,
                            nomenclatureCode: article.code,
                            codeArticle: article.code,
                            nomProduit: article.intitule,
                            unite: article.unite_defaut || cur.unite
                          }));
                        }}
                      />
                    </div>
                    <div className="grid-2">
                      <div className="form-group-modern">
                        <label>Code article (Rappel)</label>
                        <input value={articleForm.codeArticle} readOnly className="monospace" />
                      </div>
                      <div className="form-group-modern">
                        <label>Nom produit (Rappel)</label>
                        <input value={articleForm.nomProduit} readOnly />
                      </div>
                      <div className="form-group-modern">
                        <label>Unité</label>
                        <input value={articleForm.unite} onChange={e => setArticleForm({ ...articleForm, unite: e.target.value })} required />
                      </div>
                      <div className="form-group-modern">
                        <label>Seuil d'alerte</label>
                        <input type="number" min={0} value={articleForm.seuilAlerte} onChange={e => setArticleForm({ ...articleForm, seuilAlerte: Number(e.target.value) })} required />
                      </div>
                      <div className="form-group-modern">
                        <label>PMP initial</label>
                        <input type="number" min={0} value={articleForm.prixMoyenPondere} onChange={e => setArticleForm({ ...articleForm, prixMoyenPondere: Number(e.target.value) })} />
                      </div>
                      <div className="form-group-modern">
                        <label>Service affiché</label>
                        <input list="services-list" value={articleForm.serviceAffiche} onChange={e => setArticleForm({ ...articleForm, serviceAffiche: e.target.value })} />
                        <datalist id="services-list">
                          {services.map(service => <option key={service.id} value={service.nomService || service.nom} />)}
                        </datalist>
                      </div>
                    </div>
                    <button className="primary-premium" type="submit" style={{ width: "100%", marginTop: 14 }}>
                      <PlusCircle size={18} />
                      Créer l'article
                    </button>
                  </form>
                </section>

                <section className="glass-card premium-card">
                  <div className="card-header-premium">
                    <div className="icon-box-premium">
                      <ClipboardList size={20} />
                    </div>
                    <div>
                      <h3>Catalogue stock</h3>
                      <p className="card-subtitle">Articles & quantités</p>
                    </div>
                  </div>
                  <div className="dashboard-mini-list">
                    {articleCards.map(article => (
                      <div key={article.id} className="dashboard-mini-row-premium">
                        <div className="row-main">
                          <strong>{article.nomProduit}</strong>
                          <span className="row-sub">{article.codeArticle} • {article.unite} • {article.serviceAffiche || "Sans service"}</span>
                        </div>
                        <div className="row-side" style={{ display: "flex", gap: 12, alignItems: "center" }}>
                          <div className="text-right">
                            <strong className={article.low ? "text-danger" : "text-primary"}>
                              {article.quantite} / {article.seuil}
                            </strong>
                            <span className="row-sub">Stock / Seuil</span>
                          </div>
                          <button className="action-btn-mini" title="Fiche de stock" onClick={() => exportArticleLedger(article)}>
                            <FileText size={14} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </>
          )}

          {view === "MOUVEMENTS" && (
            <section className="glass-card premium-card">
              <div className="card-header-premium">
                <div className="icon-box-premium">
                  <History size={20} />
                </div>
                <div>
                  <h3>Registre des mouvements</h3>
                  <p className="card-subtitle">Traçabilité des flux</p>
                </div>
              </div>
              <div className="dashboard-mini-list">
                {mouvements.map(mouvement => (
                  <div key={mouvement.id} className="dashboard-mini-row-premium">
                    <div className="row-main">
                      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                        <strong className={mouvement.typeOperation === "ENTREE" ? "text-success" : "text-danger"}>
                          {mouvement.typeOperation}
                        </strong>
                        <ChevronRight size={14} className="muted-icon" />
                        <strong>{mouvement.stock?.consommable?.nomProduit || "Article inconnu"}</strong>
                      </div>
                      <span className="row-sub">
                        {mouvement.pieceJustificative || "Sans pièce"} • {mouvement.dateOperation ? new Date(mouvement.dateOperation).toLocaleString("fr-FR") : "Date inconnue"}
                      </span>
                    </div>
                    <div className="row-side" style={{ display: "flex", gap: 12, alignItems: "center" }}>
                      <div className="text-right">
                        <strong className={mouvement.estValide ? "text-success" : "text-warning"}>
                          {mouvement.quantite} unités
                        </strong>
                        <span className="row-sub">{mouvement.estValide ? "Validé" : "En attente"}</span>
                      </div>
                      {!mouvement.estValide && (
                        <button className="action-btn-mini" title="Valider le mouvement" onClick={() => validerMouvementStock(mouvement.id).then(loadData)}>
                          <CheckCircle2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {view === "MAGASINS" && (
            <div className="dashboard-shell-grid">
              <section className="glass-card premium-card">
                <div className="card-header-premium">
                  <div className="icon-box-premium">
                    <PlusCircle size={20} />
                  </div>
                  <div>
                    <h3>Nouveau magasin</h3>
                    <p className="card-subtitle">Configuration logistique</p>
                  </div>
                </div>
                <form className="form-content-premium" onSubmit={submitMagasin}>
                  <div className="grid-2">
                    <div className="form-group-modern">
                      <label>Nom</label>
                      <input value={magasinForm.nom} onChange={e => setMagasinForm({ ...magasinForm, nom: e.target.value })} required />
                    </div>
                    <div className="form-group-modern">
                      <label>Code</label>
                      <input value={magasinForm.code} onChange={e => setMagasinForm({ ...magasinForm, code: e.target.value })} />
                    </div>
                    <div className="form-group-modern">
                      <label>Localisation</label>
                      <input value={magasinForm.localisation} onChange={e => setMagasinForm({ ...magasinForm, localisation: e.target.value })} />
                    </div>
                    <div className="form-group-modern">
                      <label>Responsable</label>
                      <input value={magasinForm.responsable} onChange={e => setMagasinForm({ ...magasinForm, responsable: e.target.value })} />
                    </div>
                  </div>
                  <button className="primary-premium" type="submit" style={{ width: "100%", marginTop: 14 }}>
                    <PlusCircle size={18} />
                    Créer le magasin
                  </button>
                </form>
              </section>

              <section className="glass-card premium-card">
                <div className="card-header-premium">
                  <div className="icon-box-premium">
                    <Warehouse size={20} />
                  </div>
                  <div>
                    <h3>Points de stockage</h3>
                    <p className="card-subtitle">Réseau logistique</p>
                  </div>
                </div>
                <div className="dashboard-mini-list">
                  {magasins.map(magasin => (
                    <div key={magasin.id} className="dashboard-mini-row-premium">
                      <div className="row-main">
                        <strong>{magasin.nom}</strong>
                        <span className="row-sub">{magasin.code || "Sans code"} • {magasin.localisation || "Localisation non précisée"}</span>
                      </div>
                      <div className="row-side text-right">
                        <strong>{magasin.responsable || "Sans responsable"}</strong>
                        <span className="row-sub">Responsable</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default StocksPage;
