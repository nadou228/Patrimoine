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
import { exportFicheStockExcel } from "../utils/exporters";

const StocksPage: React.FC = () => {
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
      commune: null,
    });
    setArticleForm({ codeArticle: "", nomProduit: "", seuilAlerte: 10, unite: "Unité", prixMoyenPondere: 0, serviceAffiche: "" });
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
    await createMouvementStock({
      consommableId: Number(mouvForm.consommableId),
      magasinId: mouvForm.magasinId ? Number(mouvForm.magasinId) : null,
      quantite: Number(mouvForm.quantite),
      prixUnitaire: Number(mouvForm.prixUnitaire),
      pieceJustificative: mouvForm.pieceJustificative,
      observations: mouvForm.observations,
      typeOperation: mouvType,
      dateOperation: new Date().toISOString().slice(0, 19),
    });
    setMouvForm({ consommableId: "", magasinId: "", quantite: 0, prixUnitaire: 0, pieceJustificative: "", observations: "" });
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
    <div className="stocks-module fade-in">
      <header className="page-header-premium">
        <div className="header-meta">
          <span className="badge-pill-glow">Logistique, stock & consommation</span>
          <h1>Gestion des stocks</h1>
          <p className="header-subtitle">Catalogue, mouvements, alertes de seuil et pilotage magasin dans le même langage visuel que le reste de la plateforme.</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <button className={view === "DASHBOARD" ? "smart-filter active" : "smart-filter"} onClick={() => setView("DASHBOARD")}>Dashboard</button>
          <button className={view === "CATALOGUE" ? "smart-filter active" : "smart-filter"} onClick={() => setView("CATALOGUE")}>Articles</button>
          <button className={view === "MOUVEMENTS" ? "smart-filter active" : "smart-filter"} onClick={() => setView("MOUVEMENTS")}>Mouvements</button>
          <button className={view === "MAGASINS" ? "smart-filter active" : "smart-filter"} onClick={() => setView("MAGASINS")}>Magasins</button>
        </div>
      </header>

      {loading ? (
        <div className="empty-state-modern">Chargement du module stock...</div>
      ) : (
        <>
          <div className="biens-insight-grid">
            <div className="insight-card primary-tone">
              <span className="insight-label">Quantité en stock</span>
              <strong>{totals.totalStock}</strong>
              <p>Total de toutes les quantités actuellement disponibles.</p>
            </div>
            <div className="insight-card">
              <span className="insight-label">Valeur estimée</span>
              <strong>{Math.round(totals.totalValue).toLocaleString("fr-FR")}</strong>
              <p>Valorisation des stocks au prix moyen pondéré.</p>
            </div>
            <div className="insight-card">
              <span className="insight-label">Alertes de seuil</span>
              <strong>{totals.lowCount}</strong>
              <p>Articles dont la quantité est au-dessous du seuil d'alerte.</p>
            </div>
            <div className="insight-card">
              <span className="insight-label">Validation en attente</span>
              <strong>{totals.pending}</strong>
              <p>Mouvements non encore validés dans le circuit de stock.</p>
            </div>
          </div>

          {view === "DASHBOARD" && (
            <div className="dashboard-shell-grid">
              <section className="asset-card">
                <div className="section-header-inline">
                  <div>
                    <h3>Articles en tension</h3>
                    <p className="muted-paragraph">Focus sur les références qui nécessitent un réapprovisionnement ou un arbitrage rapide.</p>
                  </div>
                </div>
                <div className="dashboard-mini-list">
                  {articleCards.filter(article => article.low).slice(0, 10).map(article => (
                    <div key={article.id} className="dashboard-mini-row">
                      <div>
                        <strong>{article.nomProduit}</strong>
                        <span>{article.codeArticle || "Sans code"} • {article.serviceAffiche || "Service non défini"}</span>
                      </div>
                      <div>
                        <strong>{article.quantite} {article.unite}</strong>
                        <span>Seuil {article.seuil}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="asset-card">
                <div className="section-header-inline">
                  <div>
                    <h3>Créer un mouvement</h3>
                    <p className="muted-paragraph">Entrées et sorties validées par article et magasin.</p>
                  </div>
                </div>
                <form className="premium-dynamic-form" onSubmit={submitMouvement}>
                  <div style={{ display: "flex", gap: 10, marginBottom: 16 }}>
                    <button type="button" className={mouvType === "ENTREE" ? "smart-filter active" : "smart-filter"} onClick={() => setMouvType("ENTREE")}>Entrée</button>
                    <button type="button" className={mouvType === "SORTIE" ? "smart-filter active" : "smart-filter"} onClick={() => setMouvType("SORTIE")}>Sortie</button>
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
                    <div className="form-group-modern">
                      <label>Observations</label>
                      <input value={mouvForm.observations} onChange={e => setMouvForm({ ...mouvForm, observations: e.target.value })} />
                    </div>
                  </div>
                  <button className="primary" type="submit" style={{ width: "100%", marginTop: 14 }}>Enregistrer le mouvement</button>
                </form>
              </section>
            </div>
          )}

          {view === "CATALOGUE" && (
            <>
              <div className="smart-filter-bar">
                <input
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                  placeholder="Rechercher un article..."
                  style={{ minWidth: 280, padding: "10px 14px", borderRadius: 14, border: "1px solid var(--glass-border)", background: "var(--card-bg)", color: "var(--text-main)" }}
                />
              </div>
              <div className="dashboard-shell-grid">
                <section className="asset-card">
                  <div className="section-header-inline">
                    <div>
                      <h3>Nouveau consommable</h3>
                      <p className="muted-paragraph">Création rapide avec seuil, unité et service d'affectation.</p>
                    </div>
                  </div>
                  <form className="premium-dynamic-form" onSubmit={submitArticle}>
                    <div className="grid-2">
                      <div className="form-group-modern">
                        <label>Code article</label>
                        <input value={articleForm.codeArticle} onChange={e => setArticleForm({ ...articleForm, codeArticle: e.target.value })} required />
                      </div>
                      <div className="form-group-modern">
                        <label>Nom produit</label>
                        <input value={articleForm.nomProduit} onChange={e => setArticleForm({ ...articleForm, nomProduit: e.target.value })} required />
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
                    <button className="primary" type="submit" style={{ width: "100%", marginTop: 14 }}>Créer l'article</button>
                  </form>
                </section>

                <section className="asset-card">
                  <div className="section-header-inline">
                    <div>
                      <h3>Catalogue stock</h3>
                      <p className="muted-paragraph">Articles, quantités réelles, seuils et accès à la fiche de stock.</p>
                    </div>
                  </div>
                  <div className="dashboard-mini-list">
                    {articleCards.map(article => (
                      <div key={article.id} className="dashboard-mini-row">
                        <div>
                          <strong>{article.nomProduit}</strong>
                          <span>{article.codeArticle} • {article.unite} • {article.serviceAffiche || "Service non défini"}</span>
                        </div>
                        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                          <span className={article.low ? "asset-alert-chip danger" : "asset-alert-chip success"}>
                            {article.quantite} / seuil {article.seuil}
                          </span>
                          <button className="btn-export" onClick={() => exportArticleLedger(article)}>Fiche</button>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              </div>
            </>
          )}

          {view === "MOUVEMENTS" && (
            <section className="asset-card">
              <div className="section-header-inline">
                <div>
                  <h3>Registre des mouvements</h3>
                  <p className="muted-paragraph">Validation des flux et suivi complet des entrées/sorties.</p>
                </div>
              </div>
              <div className="dashboard-mini-list">
                {mouvements.map(mouvement => (
                  <div key={mouvement.id} className="dashboard-mini-row">
                    <div>
                      <strong>{mouvement.typeMouvement} • {mouvement.stock?.consommable?.nomProduit || "Article"}</strong>
                      <span>{mouvement.referencePiece || "Sans pièce"} • {mouvement.dateMouvement ? new Date(mouvement.dateMouvement).toLocaleString("fr-FR") : "Date inconnue"}</span>
                    </div>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span className={mouvement.estValide ? "asset-alert-chip success" : "asset-alert-chip warning"}>
                        {mouvement.quantite} • {mouvement.estValide ? "Validé" : "En attente"}
                      </span>
                      {!mouvement.estValide && (
                        <button className="btn-export" onClick={() => validerMouvementStock(mouvement.id).then(loadData)}>Valider</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}

          {view === "MAGASINS" && (
            <div className="dashboard-shell-grid">
              <section className="asset-card">
                <div className="section-header-inline">
                  <div>
                    <h3>Nouveau magasin</h3>
                    <p className="muted-paragraph">Structure de stockage et responsabilité associée.</p>
                  </div>
                </div>
                <form className="premium-dynamic-form" onSubmit={submitMagasin}>
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
                  <button className="primary" type="submit" style={{ width: "100%", marginTop: 14 }}>Créer le magasin</button>
                </form>
              </section>

              <section className="asset-card">
                <div className="section-header-inline">
                  <div>
                    <h3>Réseau des magasins</h3>
                    <p className="muted-paragraph">Visualisation rapide des emplacements de stockage.</p>
                  </div>
                </div>
                <div className="dashboard-mini-list">
                  {magasins.map(magasin => (
                    <div key={magasin.id} className="dashboard-mini-row">
                      <div>
                        <strong>{magasin.nom}</strong>
                        <span>{magasin.code || "Sans code"} • {magasin.localisation || "Localisation non précisée"}</span>
                      </div>
                      <div>
                        <strong>{magasin.responsable || "Responsable non défini"}</strong>
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
