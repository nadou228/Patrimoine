import React, { useState, useEffect } from "react";
import { getConsommables, createMouvementStock, getMouvementsStock, createConsommable } from "../api/api";
import { exportFicheStockExcel } from "../utils/exporters";

interface MouvementStock {
  id: string;
  date: string;
  type: 'ENTREE' | 'SORTIE';
  piece: string;
  qte: number;
  pu?: number;
  valeur?: number;
  observations: string;
}

interface FicheStock {
  id: string; // Code Matière
  article: string; // Désignation
  categorie: string;
  unite: string;
  seuil: number;
  localisation: string; 
  mouvements: MouvementStock[];
}

const StocksPage: React.FC = () => {
  const [view, setView] = useState<'LIST' | 'FICHE'>('LIST');
  const [data, setData] = useState<FicheStock[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentFiche, setCurrentFiche] = useState<FicheStock | null>(null);

  // Formulaire pour nouveau consommable
  const [showProductModal, setShowProductModal] = useState(false);
  const [productForm, setProductForm] = useState({
    nomProduit: '',
    categorie: 'FOURNITURES',
    unite: 'Pcs',
    seuilAlerte: '10'
  });

  // Formulaire pour ajouter un mouvement à une fiche
  const [mouvForm, setMouvForm] = useState({
    date: new Date().toISOString().split('T')[0],
    type: 'ENTREE' as 'ENTREE' | 'SORTIE',
    piece: '',
    qte: '',
    pu: '',
    observations: ''
  });

  const [showMouvModal, setShowMouvModal] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [consommables, mouvements] = await Promise.all([
        getConsommables(),
        getMouvementsStock()
      ]);

      const fiches: FicheStock[] = (consommables || []).map((c: any) => ({
        id: c.id?.toString() || 'MAT-' + Date.now(),
        article: c.nomProduit || c.designation || 'Sans désignation',
        categorie: c.serviceAffiche || 'FOURNITURES',
        unite: c.unite || 'Pcs',
        seuil: c.seuilAlerte || 10,
        localisation: 'Magasin Central',
        mouvements: (mouvements || [])
          .filter((m: any) => (m.stock?.consommable?.id === c.id) || (m.consommableId === c.id))
          .map((m: any) => ({
            id: m.id?.toString() || 'M-' + Date.now(),
            date: m.dateMouvement || m.dateOperation || new Date().toISOString().split('T')[0],
            type: m.typeMouvement || m.typeOperation || 'ENTREE',
            piece: m.pieceJustificative || '-',
            qte: m.quantite || 0,
            pu: m.prixUnitaire,
            observations: m.observations || ''
          }))
      }));

      setData(fiches || []);
    } catch (error) {
      console.error('Erreur chargement stocks:', error);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createConsommable({
        nomProduit: productForm.nomProduit,
        unite: productForm.unite,
        seuilAlerte: Number(productForm.seuilAlerte),
        serviceAffiche: productForm.categorie
      });
      alert("Produit ajouté au catalogue !");
      setShowProductModal(false);
      setProductForm({ nomProduit: '', categorie: 'FOURNITURES', unite: 'Pcs', seuilAlerte: '10' });
      loadData();
    } catch (error) {
      alert("Erreur creation produit: " + error);
    }
  };

  const getStockActuel = (fiche: FicheStock) => {
    return fiche.mouvements.reduce((acc, m) => acc + (m.type === 'ENTREE' ? m.qte : -m.qte), 0);
  };

  const openFiche = (fiche: FicheStock) => {
    setCurrentFiche(fiche);
    setView('FICHE');
  };

  const handleAddMouvement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentFiche) return;

    try {
      await createMouvementStock({
        consommableId: Number(currentFiche.id),
        dateOperation: mouvForm.date,
        typeOperation: mouvForm.type,
        pieceJustificative: mouvForm.piece,
        quantite: Number(mouvForm.qte),
        prixUnitaire: mouvForm.pu ? Number(mouvForm.pu) : undefined,
        observations: mouvForm.observations
      });

      alert("Mouvement enregistré !");
      setShowMouvModal(false);
      setMouvForm({ date: new Date().toISOString().split('T')[0], type: 'ENTREE', piece: '', qte: '', pu: '', observations: '' });
      loadData().then(() => {
          // Refresh current fiche
          const updated = data.find(d => d.id === currentFiche.id);
          if (updated) setCurrentFiche(updated);
      });
    } catch (error) {
      alert("Erreur lors de l'ajout du mouvement: " + error);
    }
  };

  return (
    <div className="module-container fade-in" style={{padding: '24px'}}>
      <header className="page-header-modern">
        <div className="header-meta">
          <span className="badge-premium">Logistique & Entrepôt</span>
          <h2 style={{fontSize: '32px', marginTop: '8px'}}>Gestion des Stocks</h2>
        </div>
        <div style={{display: 'flex', gap: '10px'}}>
          {view === 'LIST' ? (
            <button className="primary" onClick={() => setShowProductModal(true)}>+ Nouveau Produit</button>
          ) : (
            <>
              <button className="primary" onClick={() => setShowMouvModal(true)}>+ Nouveau Mouvement</button>
              <button className="btn-export" onClick={() => setView('LIST')}>Retour</button>
            </>
          )}
        </div>
      </header>

      {view === 'LIST' ? (
        <div className="asset-grid">
          {data.map(item => {
            const stock = getStockActuel(item);
            return (
              <div key={item.id} className="asset-card" style={{display: 'flex', flexDirection: 'column'}}>
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '16px'}}>
                  <span className="badge-premium" style={{fontSize: '9px'}}>{item.categorie}</span>
                  <span className={`status-pill ${stock <= item.seuil ? 'status-degrade' : 'status-neuf'}`} style={{fontSize: '9px'}}>
                    {stock <= item.seuil ? '⚠️ RÉAPPRO' : 'STOCK OK'}
                  </span>
                </div>
                
                <h3 style={{fontSize: '20px', marginBottom: '8px'}}>{item.article}</h3>
                <p style={{color: 'var(--text-dim)', fontSize: '11px', marginBottom: '20px'}}>ID : {item.id}</p>

                <div style={{display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '12px'}}>
                  <span style={{fontSize: '40px', fontWeight: '900'}}>{stock}</span>
                  <span style={{fontSize: '14px', color: 'var(--text-dim)', fontWeight: '600'}}>{item.unite.toUpperCase()}</span>
                </div>

                <div style={{marginTop: 'auto', display: 'flex', gap: '8px', paddingTop: '16px', borderTop: '1px solid var(--glass-border)'}}>
                  <button className="btn-export" style={{flex: 1}} onClick={() => openFiche(item)}>📄 Ouvrir la Fiche</button>
                </div>
              </div>
            );
          })}
        </div>
      ) : currentFiche ? (
        <div className="glass-card-high" style={{padding: '40px', position: 'relative'}}>
          <div style={{display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid var(--glass-border)', paddingBottom: '20px', marginBottom: '30px'}}>
            <div>
              <h3 style={{fontSize: '24px', color: 'var(--text-main)'}}>{currentFiche.article}</h3>
              <p style={{color: 'var(--text-dim)'}}>ID Produit: {currentFiche.id} • Unité: {currentFiche.unite}</p>
            </div>
            <div style={{textAlign: 'right'}}>
              <h1 style={{fontSize: '36px', color: 'var(--primary)', margin: 0}}>{getStockActuel(currentFiche)}</h1>
              <p style={{color: 'var(--text-dim)', fontSize: '12px', fontWeight: 'bold'}}>{currentFiche.unite.toUpperCase()} DISPONIBLES</p>
            </div>
          </div>

          <div style={{overflowX: 'auto'}}>
            <table style={{width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '14px'}}>
              <thead>
                <tr style={{borderBottom: '2px solid var(--glass-border)', color: 'var(--text-dim)'}}>
                  <th style={{padding: '12px'}}>Date</th>
                  <th style={{padding: '12px'}}>Type</th>
                  <th style={{padding: '12px'}}>Pièce</th>
                  <th style={{padding: '12px'}}>Qté</th>
                  <th style={{padding: '12px'}}>Observations</th>
                </tr>
              </thead>
              <tbody>
                {currentFiche.mouvements.map((m, i) => (
                  <tr key={i} style={{borderBottom: '1px solid rgba(255,255,255,0.05)'}}>
                    <td style={{padding: '12px'}}>{m.date}</td>
                    <td style={{padding: '12px'}}>
                      <span className={`status-pill ${m.type === 'ENTREE' ? 'status-bon' : 'status-degrade'}`}>
                        {m.type}
                      </span>
                    </td>
                    <td style={{padding: '12px'}}>{m.piece}</td>
                    <td style={{padding: '12px', fontWeight: 'bold'}}>{m.qte}</td>
                    <td style={{padding: '12px', color: 'var(--text-dim)'}}>{m.observations}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Modal Nouveau Produit */}
      {showProductModal && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
          <div className="glass-card-high" style={{width: '100%', maxWidth: '500px', padding: '40px'}}>
            <h3 style={{marginBottom: '24px'}}>Nouveau Produit au Catalogue</h3>
            <form onSubmit={handleCreateProduct} style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
              <div>
                <label>Nom du Produit</label>
                <input required value={productForm.nomProduit} onChange={e => setProductForm({...productForm, nomProduit: e.target.value})} placeholder="Ex: Rames de papier A4" />
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
                <div>
                  <label>Catégorie</label>
                  <select value={productForm.categorie} onChange={e => setProductForm({...productForm, categorie: e.target.value})}>
                    <option value="FOURNITURES">📦 Fournitures</option>
                    <option value="CONSOMMABLES">🔋 Consommables</option>
                    <option value="ENTRETIEN">🧹 Entretien</option>
                  </select>
                </div>
                <div>
                  <label>Unité</label>
                  <input required value={productForm.unite} onChange={e => setProductForm({...productForm, unite: e.target.value})} placeholder="Pcs, Rames, Litres" />
                </div>
              </div>
              <div>
                <label>Seuil d'Alerte</label>
                <input type="number" value={productForm.seuilAlerte} onChange={e => setProductForm({...productForm, seuilAlerte: e.target.value})} />
              </div>
              <div style={{display: 'flex', gap: '16px'}}>
                <button type="button" className="btn-export" style={{flex: 1}} onClick={() => setShowProductModal(false)}>Annuler</button>
                <button type="submit" className="primary" style={{flex: 1}}>Créer le Produit</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal Nouveau Mouvement */}
      {showMouvModal && (
        <div style={{position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15,23,42,0.85)', backdropFilter: 'blur(12px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000}}>
          <div className="glass-card-high" style={{width: '100%', maxWidth: '500px', padding: '40px'}}>
            <h3 style={{marginBottom: '24px'}}>Nouveau Mouvement</h3>
            <form onSubmit={handleAddMouvement} style={{display: 'flex', flexDirection: 'column', gap: '20px'}}>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
                <div>
                  <label>Date</label>
                  <input type="date" required value={mouvForm.date} onChange={e => setMouvForm({...mouvForm, date: e.target.value})} />
                </div>
                <div>
                  <label>Flux</label>
                  <select value={mouvForm.type} onChange={e => setMouvForm({...mouvForm, type: e.target.value as any})}>
                    <option value="ENTREE">↗️ Entrée</option>
                    <option value="SORTIE">↘️ Sortie</option>
                  </select>
                </div>
              </div>
              <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
                <div>
                  <label>Pièce Justif.</label>
                  <input required value={mouvForm.piece} onChange={e => setMouvForm({...mouvForm, piece: e.target.value})} placeholder="BL-001" />
                </div>
                <div>
                  <label>Quantité</label>
                  <input type="number" required value={mouvForm.qte} onChange={e => setMouvForm({...mouvForm, qte: e.target.value})} />
                </div>
              </div>
              <div>
                <label>Observations</label>
                <input value={mouvForm.observations} onChange={e => setMouvForm({...mouvForm, observations: e.target.value})} placeholder="Motif ou destination" />
              </div>
              <div style={{display: 'flex', gap: '16px'}}>
                <button type="button" className="btn-export" style={{flex: 1}} onClick={() => setShowMouvModal(false)}>Annuler</button>
                <button type="submit" className="primary" style={{flex: 1}}>Valider</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default StocksPage;
