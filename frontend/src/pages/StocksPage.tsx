import React, { useState, useEffect } from "react";
import { 
  getConsommables, 
  createMouvementStock, 
  getMouvementsStock, 
  createConsommable, 
  getStocks,
  getMagasins,
  createMagasin,
  validerMouvementStock,
  getServices
} from "../api/api";
import { exportFicheStockExcel } from "../utils/exporters";

const StocksPage: React.FC = () => {
  const [view, setView] = useState<'DASHBOARD' | 'CATALOGUE' | 'MOVEMENTS' | 'MAGASINS' | 'INVENTAIRE' | 'ARTICLE_FORM' | 'MOUV_FORM'>('DASHBOARD');
  const [loading, setLoading] = useState(true);
  const [articles, setArticles] = useState<any[]>([]);
  const [stocks, setStocks] = useState<any[]>([]);
  const [magasins, setMagasins] = useState<any[]>([]);
  const [mouvements, setMouvements] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);

  const [mouvType, setMouvType] = useState<'ENTREE' | 'SORTIE'>('ENTREE');

  const [articleForm, setArticleForm] = useState({
    codeArticle: '',
    nomProduit: '',
    categorie: 'FOURNITURES',
    unite: 'Pièce',
    seuilAlerte: 10
  });

  const [mouvForm, setMouvForm] = useState({
    articleId: '',
    magasinId: '',
    quantite: 0,
    prixUnitaire: 0,
    referencePiece: '',
    fournisseur: '',
    serviceDemandeur: '',
    observations: ''
  });

  useEffect(() => {
    loadAllData();
  }, []);

  const loadAllData = async () => {
    setLoading(true);
    try {
      const [artRes, stockRes, magRes, mouvRes, servRes] = await Promise.all([
        getConsommables(),
        getStocks(),
        getMagasins(),
        getMouvementsStock(),
        getServices()
      ]);
      setArticles(artRes || []);
      setStocks(stockRes || []);
      setMagasins(magRes || []);
      setMouvements(mouvRes || []);
      setServices(servRes || []);
    } catch (err) {
      console.error("Erreur chargement:", err);
    } finally {
      setLoading(false);
    }
  };

  const totals = {
    valeurTotale: articles.reduce((acc, art) => acc + (art.prixMoyenPondere || 0) * (stocks.filter((s:any) => s.consommable?.id === art.id).reduce((sum:number, s:any) => sum + s.quantite, 0)), 0),
    alertes: articles.filter(art => {
      const totalQte = stocks.filter((s:any) => s.consommable?.id === art.id).reduce((sum:number, s:any) => sum + s.quantite, 0);
      return totalQte <= (art.seuilAlerte || 0);
    }).length,
    enAttente: mouvements.filter(m => !m.estValide).length
  };

  const handleCreateArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createConsommable(articleForm);
      setView('CATALOGUE');
      loadAllData();
    } catch (err) { alert("Erreur: " + err); }
  };

  const handleCreateMouvement = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createMouvementStock({
        ...mouvForm,
        typeMouvement: mouvType,
        dateMouvement: new Date().toISOString()
      });
      setView('MOVEMENTS');
      loadAllData();
    } catch (err) { alert("Erreur: " + err); }
  };

  const handleValidateMouvement = async (id: number) => {
    try {
      await validerMouvementStock(id);
      loadAllData();
    } catch (err) { alert("Erreur validation: " + err); }
  };

  return (
    <div className="stocks-module fade-in">
      <header className="page-header-premium">
        <div className="header-meta">
           <span className="badge-pill-glow">Logistique & Entrepôt</span>
           <h1>Gestion des Stocks</h1>
        </div>
        <div className="header-nav-premium" style={{display: 'flex', gap: '15px'}}>
            <button className={`nav-btn ${view === 'DASHBOARD' ? 'active' : ''}`} onClick={() => setView('DASHBOARD')}>Dashboard</button>
            <button className={`nav-btn ${['CATALOGUE', 'ARTICLE_FORM'].includes(view) ? 'active' : ''}`} onClick={() => setView('CATALOGUE')}>Articles</button>
            <button className={`nav-btn ${['MOVEMENTS', 'MOUV_FORM'].includes(view) ? 'active' : ''}`} onClick={() => setView('MOVEMENTS')}>Flux</button>
            <button className={`nav-btn ${view === 'MAGASINS' ? 'active' : ''}`} onClick={() => setView('MAGASINS')}>Magasins</button>
        </div>
      </header>

      {view === 'DASHBOARD' && (
        <div className="stock-dashboard" style={{padding: '30px 0'}}>
            <div className="stats-grid-modern" style={{marginBottom: '40px'}}>
                <div className="stat-pill-modern">
                    <span className="pill-label">Valeur (PMP)</span>
                    <span className="pill-value">{totals.valeurTotale.toLocaleString()} <small>FCFA</small></span>
                </div>
                <div className="stat-pill-modern">
                    <span className="pill-label">Alertes Seuil</span>
                    <span className="pill-value" style={{color: 'var(--danger)'}}>{totals.alertes}</span>
                </div>
                <div className="stat-pill-modern">
                    <span className="pill-label">En Attente</span>
                    <span className="pill-value" style={{color: 'var(--warning)'}}>{totals.enAttente}</span>
                </div>
            </div>

            <div className="dashboard-grid" style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px'}}>
                <div className="glass-card-high" style={{padding: '30px'}}>
                    <h3 style={{marginBottom: '20px', fontSize: '18px'}}>📢 Seuils Critiques</h3>
                    {articles.filter(art => {
                        const qte = stocks.filter((s:any) => s.consommable?.id === art.id).reduce((sum:number, s:any) => sum + s.quantite, 0);
                        return qte <= (art.seuilAlerte || 0);
                    }).map(art => (
                        <div key={art.id} style={{display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid var(--glass-border)'}}>
                            <span>{art.nomProduit}</span>
                            <strong style={{color: 'var(--danger)'}}>{stocks.filter((s:any) => s.consommable?.id === art.id).reduce((sum:number, s:any) => sum + s.quantite, 0)} {art.unite}</strong>
                        </div>
                    ))}
                </div>
                <div className="glass-card-high" style={{padding: '30px'}}>
                    <h3 style={{marginBottom: '20px', fontSize: '18px'}}>🕒 Flux Récents</h3>
                    {mouvements.slice(0, 5).map(m => (
                        <div key={m.id} style={{display: 'flex', justifyContent: 'space-between', padding: '12px', borderBottom: '1px solid var(--glass-border)', fontSize: '13px'}}>
                            <span>{m.typeMouvement === 'ENTREE' ? '📥 Entrée' : '📤 Sortie'} - {articles.find(a => a.id === m.stock?.consommable?.id)?.nomProduit}</span>
                            <span>{m.quantite} pcs</span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
      )}

      {view === 'CATALOGUE' && (
        <div className="catalogue-view">
           <div className="toolbar" style={{display: 'flex', justifyContent: 'flex-end', marginBottom: '30px'}}>
              <button className="primary" onClick={() => setView('ARTICLE_FORM')}>+ Nouvel Article</button>
           </div>
           <div className="asset-grid">
              {articles.map(art => {
                  const qte = stocks.filter((s:any) => s.consommable?.id === art.id).reduce((sum:number, s:any) => sum + s.quantite, 0);
                  return (
                    <div key={art.id} className="asset-card">
                       <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px'}}>
                          <span className="badge-premium">{art.categorie}</span>
                          <span className={`status-pill status-${qte <= art.seuilAlerte ? 'degrade' : 'neuf'}`}>Stock: {qte}</span>
                       </div>
                       <h3 style={{fontSize: '18px', marginBottom: '8px'}}>{art.nomProduit}</h3>
                       <p style={{color: 'var(--text-dim)', fontSize: '12px'}}>PMP : {art.prixMoyenPondere?.toLocaleString()} FCFA</p>
                       <div style={{marginTop: '20px'}}>
                          <button className="btn-export" style={{width: '100%'}} onClick={() => {
                             setMouvType('ENTREE');
                             setMouvForm({...mouvForm, articleId: art.id});
                             setView('MOUV_FORM');
                          }}>Enregistrer Mouvement</button>
                       </div>
                    </div>
                  )
              })}
           </div>
        </div>
      )}

      {view === 'ARTICLE_FORM' && (
        <div className="centered-form-card fade-in">
           <div className="form-header-premium">
              <h2>📦 Ajout au Catalogue</h2>
              <button className="btn-back-cat" onClick={() => setView('CATALOGUE')}>Retour</button>
           </div>
           <form onSubmit={handleCreateArticle} className="premium-dynamic-form">
              <div className="form-group-modern">
                 <label>Nom du Produit</label>
                 <input required value={articleForm.nomProduit} onChange={e => setArticleForm({...articleForm, nomProduit: e.target.value})} />
              </div>
              <div className="grid-2">
                 <div className="form-group-modern">
                    <label>Catégorie</label>
                    <select value={articleForm.categorie} onChange={e => setArticleForm({...articleForm, categorie: e.target.value})}>
                        <option value="FOURNITURES">Fournitures</option>
                        <option value="CARBURANT">Carburant</option>
                        <option value="DIVERS">Divers</option>
                    </select>
                 </div>
                 <div className="form-group-modern">
                    <label>Unité de mesure</label>
                    <input required value={articleForm.unite} onChange={e => setArticleForm({...articleForm, unite: e.target.value})} />
                 </div>
              </div>
              <button type="submit" className="primary" style={{width: '100%', marginTop: '20px'}}>Enregistrer l'Article</button>
           </form>
        </div>
      )}

      {view === 'MOUV_FORM' && (
        <div className="centered-form-card fade-in">
           <div className="form-header-premium">
              <h2>{mouvType === 'ENTREE' ? '📥 Réception' : '📤 Sortie / Demande'}</h2>
              <button className="btn-back-cat" onClick={() => setView('CATALOGUE')}>Annuler</button>
           </div>
           <div style={{display: 'flex', gap: '10px', marginBottom: '30px'}}>
              <button className={`nav-btn ${mouvType === 'ENTREE' ? 'active' : ''}`} style={{flex: 1}} onClick={() => setMouvType('ENTREE')}>ENTRÉE</button>
              <button className={`nav-btn ${mouvType === 'SORTIE' ? 'active' : ''}`} style={{flex: 1}} onClick={() => setMouvType('SORTIE')}>SORTIE</button>
           </div>
           <form onSubmit={handleCreateMouvement} className="premium-dynamic-form">
              <div className="form-group-modern">
                 <label>Sélectionner l'article</label>
                 <select required value={mouvForm.articleId} onChange={e => setMouvForm({...mouvForm, articleId: e.target.value})}>
                    <option value="">-- Choisir --</option>
                    {articles.map(a => <option key={a.id} value={a.id}>{a.nomProduit}</option>)}
                 </select>
              </div>
              <div className="grid-2">
                 <div className="form-group-modern">
                    <label>Quantité</label>
                    <input type="number" required value={mouvForm.quantite} onChange={e => setMouvForm({...mouvForm, quantite: Number(e.target.value)})} />
                 </div>
                 <div className="form-group-modern">
                    <label>Magasin</label>
                    <select required value={mouvForm.magasinId} onChange={e => setMouvForm({...mouvForm, magasinId: e.target.value})}>
                        <option value="">-- Choisir --</option>
                        {magasins.map(m => <option key={m.id} value={m.id}>{m.nom}</option>)}
                    </select>
                 </div>
              </div>
              <div className="form-group-modern">
                 <label>{mouvType === 'ENTREE' ? 'N° Bon de Réception' : 'N° Demande de Sortie'}</label>
                 <input required value={mouvForm.referencePiece} onChange={e => setMouvForm({...mouvForm, referencePiece: e.target.value})} />
              </div>
              <button type="submit" className="primary" style={{width: '100%', marginTop: '20px'}}>Finaliser le Mouvement</button>
           </form>
        </div>
      )}

      {view === 'MOVEMENTS' && (
        <div className="glass-card-high" style={{padding: '30px'}}>
           <h3 style={{marginBottom: '20px'}}>Registre des Flux</h3>
           <table className="premium-table">
              <thead>
                <tr>
                   <th>Date</th>
                   <th>Type</th>
                   <th>Article</th>
                   <th>Qté</th>
                   <th>Statut</th>
                   <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {mouvements.map(m => (
                    <tr key={m.id}>
                        <td>{new Date(m.dateMouvement).toLocaleDateString()}</td>
                        <td>{m.typeMouvement}</td>
                        <td>{articles.find(a => a.id === m.stock?.consommable?.id)?.nomProduit}</td>
                        <td>{m.quantite}</td>
                        <td><span className={`status-pill status-${m.estValide ? 'neuf' : 'degrade'}`}>{m.estValide ? 'Validé' : 'Attente'}</span></td>
                        <td>{!m.estValide && <button className="btn-export" onClick={() => handleValidateMouvement(m.id)}>Valider</button>}</td>
                    </tr>
                ))}
              </tbody>
           </table>
        </div>
      )}

      {view === 'MAGASINS' && (
         <div className="asset-grid">
            {magasins.map(m => (
                <div key={m.id} className="asset-card">
                    <h3>🏬 {m.nom}</h3>
                    <p style={{fontSize: '12px', color: 'var(--text-dim)'}}>{m.localisation}</p>
                    <div style={{marginTop: '15px'}}><span className="badge-premium">Responsable: {m.responsable}</span></div>
                </div>
            ))}
         </div>
      )}

    </div>
  );
};

export default StocksPage;
