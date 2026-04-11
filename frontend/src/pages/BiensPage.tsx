import { useEffect, useState } from "react";
import { Bien as BienType, createBien, deleteBien, getBiens, updateBien, validateBien } from "../api/biens";
import ImageUpload from "../components/ImageUpload";
import FileUpload from "../components/FileUpload";
import { usePermissions } from "../contexts/PermissionsContext";
import { exportXlsx, exportPdf, exportOrdreEntreeExcel, exportLivreJournalExcel, exportGrandLivreExcel } from "../utils/exporters";
import MouvementTimeline from "../components/MouvementTimeline";

type Categorie = "MOBILIER" | "IMMOBILIER" | "MATERIEL_ROULANT";

const EMPTY_BIEN: any = {
  id: null,
  codeBien: "",
  iup: "",
  designation: "",
  categorie: "MOBILIER",
  dateAcquisition: new Date().toISOString().split('T')[0],
  valeur: 0,
  etat: "NEUF",
  localisation: "",
  coordonneeGps: "",
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
  usageImmobilier: "ADMINISTRATIF",
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
  dateDernierEntretien: "",
  permisOccuper: false,
  documentsUrls: [] as string[],
  archived: false,
};

const API_BASE_URL = "http://localhost:8082";

export default function BiensPage() {
  const [biens, setBiens] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Categorie | null>(null);
  const [view, setView] = useState<'GALLERY' | 'FORM'>('GALLERY');
  const [editingBienId, setEditingBienId] = useState<number | null>(null);
  const [servicesList, setServicesList] = useState<any[]>([]);
  const [timelineData, setTimelineData] = useState<any[]>([]);
  const [showTimeline, setShowTimeline] = useState(false);
  const [linkedDocs, setLinkedDocs] = useState<Record<number, any[]>>({});
  const { hasPermission } = usePermissions();

  const [form, setForm] = useState<any>({ ...EMPTY_BIEN });

  useEffect(() => {
    loadBiens();
    // Load services if available
    import('../api/api').then(api => {
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
    const vnc = Math.max(0, valeur - amortCumule);
    return { vnc, amort: amortCumule };
  };

  useEffect(() => {
    const { vnc, amort } = calculateVNC(Number(form.valeur), form.dateAcquisition, Number(form.dureeAmortissement));
    setForm((prev: any) => ({
      ...prev,
      valeurNetteComptable: vnc,
      amortissementCumule: amort,
      tauxAmortissement: form.dureeAmortissement ? 100 / Number(form.dureeAmortissement) : 0
    }));
  }, [form.valeur, form.dateAcquisition, form.dureeAmortissement]);

  const captureGPS = () => {
    if (!navigator.geolocation) {
      alert("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }
    navigator.geolocation.getCurrentPosition((pos) => {
      const coords = `${pos.coords.latitude.toFixed(6)}, ${pos.coords.longitude.toFixed(6)}`;
      setForm((prev: any) => ({ ...prev, coordonneesGps: coords, coordonneeGps: coords }));
      alert("Position capturée : " + coords);
    }, (err) => {
      alert("Erreur GPS : " + err.message);
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) return;
    try {
      const payload = { ...form, categorie: selectedCategory.toUpperCase() };
      if (editingBienId) {
        await updateBien(editingBienId, payload);
        alert("Actif mis à jour !");
      } else {
        await createBien(payload);
        alert("Nouvel actif enregistré !");
      }
      setView('GALLERY');
      setSelectedCategory(null);
      setForm({ ...EMPTY_BIEN });
      loadBiens();
    } catch (err) { alert("Erreur: " + err); }
  };

  const showHistory = async (bienId: number) => {
    try {
      const history = await import('../api/api').then(api => api.getMouvementsByBien(bienId));
      setTimelineData(history);
      setShowTimeline(true);
    } catch (err) { alert("Historique indisponible"); }
  };

  const filtered = biens.filter(b => 
    b.designation?.toLowerCase().includes(search.toLowerCase()) || 
    b.iup?.toLowerCase().includes(search.toLowerCase()) ||
    b.service?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="biens-module fade-in">
      {showTimeline && <MouvementTimeline mouvements={timelineData} onClose={() => setShowTimeline(false)} />}
      <header className="page-header-premium">
        <div className="header-meta">
           <span className="badge-pill-glow">Patrimoine National</span>
           <h1>Registre des Actifs</h1>
        </div>
        <div style={{display: 'flex', gap: '15px'}}>
          <div className="search-box-modern">
            <input 
              placeholder="Rechercher..." 
              value={search} 
              onChange={e => setSearch(e.target.value)} 
              style={{width: '300px', padding: '10px 20px', borderRadius: '30px', background: 'var(--card-bg)', border: '1px solid var(--glass-border)', color: 'var(--text-main)'}}
            />
          </div>
          <button className="primary" onClick={() => { setForm({...EMPTY_BIEN}); setSelectedCategory(null); setView('FORM'); }}>
            + Nouveau Recensement
          </button>
        </div>
      </header>

      {view === 'GALLERY' ? (
        <section className="registry-gallery">
          <div className="export-bar" style={{justifyContent: 'flex-end', marginBottom: '30px'}}>
             <button className="btn-export" onClick={() => exportLivreJournalExcel(filtered, 'Livre_Journal.xls')}>📙 Livre Journal</button>
             <button className="btn-export" onClick={() => exportGrandLivreExcel(filtered, 'Grand_Livre.xls')}>📘 Grand Livre</button>
             <button className="btn-export" onClick={() => exportPdf(filtered, 'REGISTRE', 'registre.pdf')}>📕 PDF</button>
          </div>

          <div className="asset-grid">
            {filtered.map(bien => (
              <div key={bien.id} className="asset-card">
                 <div className="card-badge-row" style={{display: 'flex', justifyContent: 'space-between', marginBottom: '15px'}}>
                    <span className="badge-premium">{bien.iup || 'SANS IUP'}</span>
                    <span className={`status-pill status-${bien.etat.toLowerCase()}`}>{bien.etat}</span>
                 </div>
                 <h3 style={{fontSize: '20px', marginBottom: '10px'}}>{bien.designation}</h3>
                 
                 {bien.photoUrl && (
                   <img src={`${API_BASE_URL}${bien.photoUrl}`} alt="" style={{width: '100%', height: '180px', objectFit: 'cover', borderRadius: '15px', marginBottom: '15px'}} />
                 )}
                 
                 <div className="card-stats-mini" style={{fontSize: '12px', color: 'var(--text-dim)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px'}}>
                    <div>🏢 {bien.service || 'Non affecté'}</div>
                    <div>📍 {bien.localisation || 'Inconnu'}</div>
                    {bien.immatriculation && <div>🚗 {bien.immatriculation}</div>}
                    {bien.titreFoncier && <div>📜 TF: {bien.titreFoncier}</div>}
                 </div>

                 <div className="card-financial" style={{marginTop: '20px', padding: '15px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '12px', border: '1px dashed var(--primary)'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', fontSize: '13px'}}>
                       <span>VNC Actuelle:</span>
                       <strong style={{color: 'var(--primary)'}}>{Math.round(bien.valeurNetteComptable || 0).toLocaleString()} FCFA</strong>
                    </div>
                 </div>

                 <div className="card-actions" style={{marginTop: '20px', display: 'flex', gap: '8px', paddingTop: '15px', borderTop: '1px solid var(--glass-border)'}}>
                    <button className="btn-export" style={{flex: 1, fontSize: '11px'}} onClick={() => { setForm({...bien}); setSelectedCategory(bien.categorie); setView('FORM'); setEditingBienId(bien.id); }}>Modifier</button>
                    <button className="btn-export" style={{flex: 1, fontSize: '11px'}} onClick={() => showHistory(bien.id)}>🕵️ Parcours</button>
                    <button className="btn-export" style={{color: 'var(--danger)', fontSize: '11px'}} onClick={() => deleteBien(bien.id).then(loadBiens)}>🗑️</button>
                 </div>
              </div>
            ))}
          </div>
        </section>
      ) : (
        <section className="registration-flow">
          {!selectedCategory ? (
            <div className="category-selection-premium">
               <div className="cat-card-modern" onClick={() => setSelectedCategory('IMMOBILIER')}>
                  <div className="cat-icon-blob">🏛️</div>
                  <h3>IMMOBILIER</h3>
                  <p>Bâtiments, terrains administratifs et infrastructures</p>
                  <span className="cat-arrow">→</span>
               </div>
               <div className="cat-card-modern" onClick={() => setSelectedCategory('MATERIEL_ROULANT')}>
                  <div className="cat-icon-blob" style={{background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)'}}>🚚</div>
                  <h3>MATÉRIEL ROULANT</h3>
                  <p>Flotte automobile, engins et motocycles de service</p>
                  <span className="cat-arrow">→</span>
               </div>
               <div className="cat-card-modern" onClick={() => setSelectedCategory('MOBILIER')}>
                  <div className="cat-icon-blob" style={{background: 'linear-gradient(135deg, #F59E0B 0%, #D97706 100%)'}}>💻</div>
                  <h3>ÉQUIPEMENTS & MOBILIER</h3>
                  <p>Matériel informatique, mobilier et actifs techniques</p>
                  <span className="cat-arrow">→</span>
               </div>
            </div>
          ) : (
            <div className="centered-form-card fade-in">
               <div className="form-header-premium">
                  <h2>Recensement : {selectedCategory.replace('_', ' ')}</h2>
                  <button className="btn-back-cat" onClick={() => { setView('GALLERY'); setSelectedCategory(null); }}>Annuler</button>
               </div>

               <form onSubmit={handleSave} className="premium-dynamic-form">
                  {/* IDENTIFICATION */}
                  <div className="form-section">
                     <h4 className="section-title"><span>01</span> Identification Professionnelle</h4>
                     <div className="grid-2">
                        <div className="form-group-modern" style={{gridColumn: 'span 2'}}>
                           <label>
                             {selectedCategory === 'IMMOBILIER' ? "Nom de l'Édifice / Site" : 
                              selectedCategory === 'MATERIEL_ROULANT' ? "Désignation du Véhicule" : "Libellé de l'Équipement"}
                           </label>
                           <input required value={form.designation} onChange={e => setForm({...form, designation: e.target.value})} placeholder="Ex: Hôtel de Ville, Toyota Hilux G-45..." />
                        </div>
                        <div className="form-group-modern">
                           <label>Service détenteur</label>
                           <div style={{display: 'flex', gap: '8px'}}>
                              <select style={{flex: 1}} value={form.service} onChange={e => setForm({...form, service: e.target.value})}>
                                 <option value="">-- Choisir --</option>
                                 {servicesList.length > 0 ? servicesList.map(s => <option key={s.id} value={s.nomService}>{s.nomService}</option>) : <option value="SERVICE_GENERAL">Service Général</option>}
                              </select>
                              <input placeholder="Saisie libre..." value={form.service} onChange={e => setForm({...form, service: e.target.value})} style={{width: '120px'}} />
                           </div>
                        </div>
                        <div className="form-group-modern">
                           <label>Localisation Précise</label>
                           <input value={form.localisation} onChange={e => setForm({...form, localisation: e.target.value})} placeholder="Ex: Étage 2, Bureau 204" />
                        </div>
                        <div className="form-group-modern">
                           <label>Statut Opérationnel</label>
                           <select value={form.statutOperationnel} onChange={e => setForm({...form, statutOperationnel: e.target.value})}>
                              <option value="ACTIF">🟢 Actif / En Service</option>
                              <option value="EN_MAINTENANCE">🟠 En Maintenance</option>
                              <option value="EN_TRANSFERT">🔵 En Transfert</option>
                              <option value="REFORME">🔴 À Réformer</option>
                           </select>
                        </div>
                        <div className="form-group-modern">
                           <label>Coordonnées GPS</label>
                           <div style={{display: 'flex', gap: '8px'}}>
                              <input style={{flex: 1}} value={form.coordonneesGps} onChange={e => setForm({...form, coordonneesGps: e.target.value})} placeholder="Lat, Long" />
                              <button type="button" className="btn-export" onClick={captureGPS} title="Capturer ma position actuelle">📍</button>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* SPECIFIQUES */}
                  <div className="form-section">
                     <h4 className="section-title"><span>02</span> Détails Techniques & Innovations</h4>
                     <div className="grid-2">
                        {selectedCategory === 'MATERIEL_ROULANT' && (
                           <>
                              <div className="form-group-modern">
                                 <label>Immatriculation Officielle</label>
                                 <input value={form.immatriculation} onChange={e => setForm({...form, immatriculation: e.target.value})} />
                              </div>
                              <div className="form-group-modern">
                                 <label>N° Châssis (Système VIN)</label>
                                 <input value={form.numChassis} onChange={e => setForm({...form, numChassis: e.target.value})} />
                              </div>
                              <div className="form-group-modern">
                                 <label>Marque & Modèle</label>
                                 <input value={form.marque} onChange={e => setForm({...form, marque: e.target.value})} placeholder="Ex: Toyota Camry" />
                              </div>
                              <div className="form-group-modern">
                                 <label>Puissance Fiscale / Type Boîte</label>
                                 <div style={{display: 'flex', gap: '8px'}}>
                                    <input value={form.puissanceFiscale} onChange={e => setForm({...form, puissanceFiscale: e.target.value})} placeholder="7 CV" />
                                    <select value={form.typeBoite} onChange={e => setForm({...form, typeBoite: e.target.value})}>
                                       <option value="MANUELLE">Manuelle</option>
                                       <option value="AUTO">Automatique</option>
                                    </select>
                                 </div>
                              </div>
                              <div className="form-group-modern">
                                 <label>Charge Utile / Capacité</label>
                                 <input value={form.chargeUtile} onChange={e => setForm({...form, chargeUtile: e.target.value})} placeholder="Ex: 2.5 Tonnes" />
                              </div>
                              <div className="form-group-modern">
                                 <label>Énergie / Carburant</label>
                                 <select value={form.typeCarburant} onChange={e => setForm({...form, typeCarburant: e.target.value})}>
                                    <option value="ESSENCE">⛽ Essence</option>
                                    <option value="DIESEL">⛽ Diesel</option>
                                    <option value="HYBRIDE">🔌 Hybride / Élec.</option>
                                 </select>
                              </div>
                           </>
                        )}
                        {selectedCategory === 'IMMOBILIER' && (
                           <>
                              <div className="form-group-modern">
                                 <label>N° Titre Foncier / Réf Cadastrale</label>
                                 <input value={form.titreFoncier} onChange={e => setForm({...form, titreFoncier: e.target.value})} />
                              </div>
                              <div className="form-group-modern">
                                 <label>Superficie au Sol (m²)</label>
                                 <input value={form.superficie} onChange={e => setForm({...form, superficie: e.target.value})} />
                              </div>
                              <div className="form-group-modern">
                                 <label>Statut Juridique</label>
                                 <select value={form.statutJuridique} onChange={e => setForm({...form, statutJuridique: e.target.value})}>
                                    <option value="PROPRIETE_PRIVEE">Domaine Privé de l'État</option>
                                    <option value="DOMAINE_PUBLIC">Domaine Public</option>
                                    <option value="LOCATION">Bail / Location</option>
                                 </select>
                              </div>
                              <div className="form-group-modern">
                                 <label>Permis d'Occuper / Conformité</label>
                                 <div style={{padding: '10px', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '10px'}}>
                                    <input type="checkbox" checked={form.permisOccuper} onChange={e => setForm({...form, permisOccuper: e.target.checked})} /> Certificat de conformité disponible
                                 </div>
                              </div>
                           </>
                        )}
                        {selectedCategory === 'MOBILIER' && (
                           <>
                              <div className="form-group-modern">
                                 <label>N° de Série (S/N)</label>
                                 <input value={form.numSerie} onChange={e => setForm({...form, numSerie: e.target.value})} />
                              </div>
                              <div className="form-group-modern">
                                 <label>Garantie technique jusqu'au</label>
                                 <input type="date" value={form.finGarantie} onChange={e => setForm({...form, finGarantie: e.target.value})} />
                              </div>
                              <div className="form-group-modern" style={{gridColumn: 'span 2'}}>
                                 <label>Architecture & Specs (CPU, RAM, Stockage, OS)</label>
                                 <textarea value={form.specificationsTechniques} onChange={e => setForm({...form, specificationsTechniques: e.target.value})} rows={2} placeholder="Ex: Intel Core i7, 16GB RAM, Windows 11..." />
                              </div>
                           </>
                        )}
                     </div>
                  </div>

                  {/* DOCUMENTS & PHOTOS */}
                  <div className="form-section">
                     <h4 className="section-title"><span>03</span> Médias & Justificatifs</h4>
                     <div className="grid-2">
                        <div className="form-group-modern">
                           <label>Photographie de l'Actif</label>
                           <ImageUpload value={form.photoUrl} onChange={url => setForm({...form, photoUrl: url})} />
                        </div>
                        <div className="form-group-modern">
                           <label>Documents & Justificatifs (PDF, DOC)</label>
                           <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
                              <FileUpload onUploadSuccess={url => setForm((prev:any) => ({...prev, documentsUrls: [...(prev.documentsUrls || []), url]}))} />
                              <div style={{fontSize: '11px', color: 'var(--text-dim)'}}>
                                 {form.documentsUrls?.length || 0} document(s) attaché(s)
                              </div>
                           </div>
                        </div>
                     </div>
                  </div>

                  {/* VALORISATION */}
                  <div className="form-section">
                     <h4 className="section-title"><span>04</span> Valorisation & Cycle de Vie</h4>
                     <div className="grid-2">
                        <div className="form-group-modern">
                           <label>Valeur d'origine (FCFA)</label>
                           <input type="number" required value={form.valeur} onChange={e => setForm({...form, valeur: Number(e.target.value)})} />
                        </div>
                        <div className="form-group-modern">
                           <label>Mise en service</label>
                           <input type="date" required value={form.dateAcquisition} onChange={e => setForm({...form, dateAcquisition: e.target.value})} />
                        </div>
                        <div className="form-group-modern">
                           <label>Durée d'amort. (Ans)</label>
                           <input type="number" required value={form.dureeAmortissement} onChange={e => setForm({...form, dureeAmortissement: Number(e.target.value)})} />
                        </div>
                        <div className="form-group-modern">
                           <label>État physique</label>
                           <select value={form.etat} onChange={e => setForm({...form, etat: e.target.value})}>
                              <option value="NEUF">Neuf</option>
                              <option value="BON">Bon État</option>
                              <option value="MOYEN">Moyen</option>
                              <option value="MAUVAIS">À Réformer</option>
                           </select>
                        </div>
                     </div>
                  </div>

                  <div className="form-footer" style={{marginTop: '30px', display: 'flex', justifyContent: 'flex-end'}}>
                     <button type="submit" className="primary" style={{width: '100%', padding: '18px'}}>
                        Confirmer l'Enregistrement de l'Actif
                     </button>
                  </div>
               </form>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
