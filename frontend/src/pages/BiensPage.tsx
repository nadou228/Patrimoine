import { useEffect, useMemo, useState } from "react";
import { Bien as BienType, createBien, deleteBien, getBiens, updateBien, validateBien } from "../api/biens";
import { uploadDocument } from "../api/documents";
import { usePermissions } from "../contexts/PermissionsContext";
import { exportXlsx, exportPdf, exportOrdreEntreeExcel, exportLivreJournalExcel, exportGrandLivreExcel } from "../utils/exporters";

type Categorie = "MOBILIER" | "IMMOBILIER" | "MATERIEL_ROULANT";

const EMPTY_BIEN: BienType = {
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
  coordonneesGps: "",
  modeAcquisition: "ACHAT",
  immatriculation: "",
  numChassis: "",
  marque: "",
  modele: "",
  numSerie: "",
  fabricant: "",
  dureeAmortissement: 0,
  tauxAmortissement: 0,
  valeurNetteComptable: 0,
  amortissementCumule: 0,
  validerPar: "",
  dateValidation: null,
  statutValidation: "EN_ATTENTE",
  archived: false,
};

export default function BiensPage() {
  const [biens, setBiens] = useState<BienType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<Categorie | null>(null);
  const [view, setView] = useState<'GALLERY' | 'FORM'>('GALLERY');
  const [editingBienId, setEditingBienId] = useState<number | null>(null);
  const { hasPermission } = usePermissions();

  const handleValidate = async (id: number, statut: string) => {
    try {
      await validateBien(id, statut);
      alert(`Bien ${statut === 'VALIDE' ? 'validé' : 'refusé'} avec succès !`);
      loadBiens();
    } catch (error: any) {
      alert("Erreur validation: " + error.message);
    }
  };

  const [form, setForm] = useState<BienType>({ ...EMPTY_BIEN });

  const calculateVNC = (valeur: number, dateAcq: string, duree: number) => {
    if (!valeur || !dateAcq || !duree || duree <= 0) return { vnc: valeur, amort: 0 };
    
    const acqDate = new Date(dateAcq);
    const now = new Date();
    let years = now.getFullYear() - acqDate.getFullYear();
    if (now.getMonth() < acqDate.getMonth() || (now.getMonth() === acqDate.getMonth() && now.getDate() < acqDate.getDate())) {
      years--;
    }
    
    const anneesEcoulees = Math.max(0, Math.min(years, duree));
    const amortAnnuel = valeur / duree;
    const amortCumule = amortAnnuel * anneesEcoulees;
    const vnc = Math.max(0, valeur - amortCumule);
    
    return { vnc, amort: amortCumule };
  };

  useEffect(() => {
    const { vnc, amort } = calculateVNC(Number(form.valeur), form.dateAcquisition, Number(form.dureeAmortissement));
    if (vnc !== form.valeurNetteComptable || amort !== form.amortissementCumule) {
      setForm(prev => ({
        ...prev,
        valeurNetteComptable: vnc,
        amortissementCumule: amort,
        tauxAmortissement: form.dureeAmortissement ? 100 / Number(form.dureeAmortissement) : 0
      }));
    }
  }, [form.valeur, form.dateAcquisition, form.dureeAmortissement]);

  const resetForm = () => {
    setForm({ ...EMPTY_BIEN });
    setSelectedCategory(null);
    setEditingBienId(null);
  };

  const loadBiens = async () => {
    setLoading(true);
    const data = await getBiens();
    setBiens(data);
    setLoading(false);
  };

  useEffect(() => { loadBiens(); }, []);

  const filtered = useMemo(() => {
    return biens.filter(b => 
      b.designation.toLowerCase().includes(search.toLowerCase()) ||
      (b.iup || "").toLowerCase().includes(search.toLowerCase())
    );
  }, [biens, search]);

  const handleEdit = (bien: BienType) => {
    setForm({
      ...bien,
      valeur: bien.valeur || 0,
      dateAcquisition: bien.dateAcquisition ? bien.dateAcquisition.split('T')[0] : new Date().toISOString().split('T')[0],
    });
    setSelectedCategory(bien.categorie as Categorie);
    setEditingBienId(bien.id || null);
    setView('FORM');
  };

  const handleToggleArchive = async (bien: BienType) => {
    try {
      const updated = { ...bien, archived: !bien.archived };
      if (bien.id !== null) await updateBien(bien.id, updated);
      loadBiens();
      alert(`Bien ${bien.archived ? 'réactivé' : 'archivé'} !`);
    } catch (error: any) {
      console.error('Erreur archive: ', error);
      alert('Erreur sur archivage : ' + (error?.message || 'erreur inconnue'));
    }
  };

  const normalizeDateParam = (value?: string | null) => {
    if (!value) {
      return new Date().toISOString().split('T')[0];
    }
    // Accept dd/MM/yyyy or dd-MM-yyyy by converting to ISO yyyy-MM-dd
    const normalized = value.replace(/\//g, '-').trim();
    const parts = normalized.split('-');
    if (parts.length === 3 && parts[0].length === 2 && parts[2].length === 4) {
      return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
    }
    if (parts.length === 3 && parts[0].length === 4) {
      return normalized;
    }
    try {
      return new Date(value).toISOString().split('T')[0];
    } catch {
      return new Date().toISOString().split('T')[0];
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCategory) {
      alert("Veuillez sélectionner une catégorie");
      return;
    }

    const payload = {
      ...form,
      // Conversion stricte des types pour correspondre au DTO Java
      dateAcquisition: form.dateAcquisition ? form.dateAcquisition.split('/').reverse().join('-') : '',
      valeur: Number(form.valeur) || 0,
      dureeAmortissement: Number(form.dureeAmortissement) || 0,
      dureeVie: Number(form.dureeVie) || 0,
      tauxAmortissement: Number(form.tauxAmortissement) || 0,
      valeurComptable: Number(form.valeurComptable) || 0,
      categorie: selectedCategory?.toUpperCase() || 'MOBILIER',
    };

    console.debug('Payload création/mise à jour bien:', payload);

    try {
      if (editingBienId) {
        await updateBien(editingBienId, payload);
        alert("Bien mis à jour avec succès !");
      } else {
        await createBien(payload);
        alert("Bien créé avec succès !");
      }
      setView('GALLERY');
      resetForm();
      loadBiens();
    } catch (error: any) {
      console.error('Erreur sauvegarde bien:', error);
      const message = error?.response?.data?.message || error?.message || 'Erreur inconnue';
      alert('Erreur lors de l’enregistrement : ' + message);
    }
  };


  const [linkedDocs, setLinkedDocs] = useState<Record<number, any[]>>({});

  const handleFileUpload = async (bienId: number, file: File) => {
    try {
      const savedDoc = await uploadDocument(file, bienId, file.type);
      // Supposons que savedDoc contient { nomFichier, cheminFichier }
      const newDoc = { 
        name: savedDoc.nomFichier, 
        type: file.type.toUpperCase(), 
        url: `http://localhost:8082/uploads/${savedDoc.cheminFichier}` 
      };
      setLinkedDocs(prev => ({
        ...prev,
        [bienId]: [...(prev[bienId] || []), newDoc]
      }));
      alert("Document uploadé avec succès!");
    } catch (error: any) {
      console.error('Erreur upload:', error);
      alert("Erreur lors de l'upload: " + (error.message || "Erreur inconnue"));
    }
  };

  return (
    <div className="biens-module fade-in">
      <header className="page-header-modern">
        <div className="header-meta">
          <span className="badge-premium">Gestion du Patrimoine</span>
          <h2 style={{fontSize: '32px', marginTop: '8px'}}>Registre Interactif</h2>
        </div>
        <div className="header-actions" style={{display: 'flex', gap: '15px'}}>
          <input 
            className="search-input"
            placeholder="Rechercher un actif..." 
            value={search} 
            onChange={e => setSearch(e.target.value)} 
            style={{width: '300px'}}
          />
          <button className="primary" onClick={() => setView('FORM')}>+ Recenser</button>
        </div>
      </header>

      {view === 'FORM' ? (
        <section className="registration-flow">
          {!selectedCategory ? (
            <div className="category-selection">
              <div className="category-hero-card" onClick={() => setSelectedCategory('IMMOBILIER')}>
                <span className="cat-icon">🏛️</span>
                <h3>Immobilier</h3>
                <p>Terrains, Bâtiments, Infrastructures</p>
              </div>
              <div className="category-hero-card" onClick={() => setSelectedCategory('MATERIEL_ROULANT')}>
                <span className="cat-icon">🚚</span>
                <h3>Matériel Roulant</h3>
                <p>Véhicules, Engins, Motos</p>
              </div>
              <div className="category-hero-card" onClick={() => setSelectedCategory('MOBILIER')}>
                <span className="cat-icon">💻</span>
                <h3>Mobilier & Équipement</h3>
                <p>Bureautique, Informatique, Meubles</p>
              </div>
              <button className="btn-export" style={{gridColumn: 'span 3', marginTop: '20px'}} onClick={() => setView('GALLERY')}>Annuler</button>
            </div>
          ) : (
            <div className="glass-card-high" style={{padding: '40px', maxWidth: '900px', margin: '0 auto'}}>
              <h3 style={{marginBottom: '30px', color: 'var(--primary)', display: 'flex', alignItems: 'center', gap: '15px'}}>
                <span style={{fontSize: '32px'}}>{selectedCategory === 'IMMOBILIER' ? '🏛️' : selectedCategory === 'MATERIEL_ROULANT' ? '🚚' : '💻'}</span>
                Recensement {selectedCategory}
              </h3>
              
              <form onSubmit={handleSave} style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px'}}>
                {/* Champs Communs */}
                <div className="form-group" style={{gridColumn: 'span 2'}}>
                  <label>Désignation de l'actif</label>
                  <input required value={form.designation} onChange={e => setForm({...form, designation: e.target.value})} placeholder="Ex: Groupe Électrogène 50kVA" />
                </div>

                <div className="form-group">
                  <label>Valeur d'acquisition (FCFA)</label>
                  <input type="number" required value={form.valeur} onChange={e => setForm({...form, valeur: Number(e.target.value)})} />
                </div>
                <div className="form-group">
                  <label>Date d'entrée / Mise en service</label>
                  <input type="date" required value={form.dateAcquisition} onChange={e => setForm({...form, dateAcquisition: e.target.value})} />
                </div>

                {/* Champs Spécifiques par Catégorie */}
                {selectedCategory === 'IMMOBILIER' && (
                  <>
                    <div className="form-group">
                      <label>Numéro Titre Foncier</label>
                      <input value={form.titreFoncier} onChange={e => setForm({...form, titreFoncier: e.target.value})} placeholder="Ex: TF 1234/RT" />
                    </div>
                    <div className="form-group">
                      <label>Superficie (m²)</label>
                      <input value={form.superficie} onChange={e => setForm({...form, superficie: e.target.value})} placeholder="Ex: 600 m²" />
                    </div>
                    <div className="form-group">
                      <label>Coordonnées GPS</label>
                      <input value={form.coordonneesGps} onChange={e => setForm({...form, coordonneesGps: e.target.value})} placeholder="Ex: 6.1° N, 1.2° E" />
                    </div>
                    <div className="form-group">
                      <label>Mode d'acquisition</label>
                      <select value={form.modeAcquisition} onChange={e => setForm({...form, modeAcquisition: e.target.value})}>
                        <option value="ACHAT">Achat direct</option>
                        <option value="DON">Don / Legs</option>
                        <option value="ECHANGE">Échange</option>
                        <option value="INFRASTRUCTURE">Infrastructures publiques</option>
                      </select>
                    </div>
                  </>
                )}

                {selectedCategory === 'MATERIEL_ROULANT' && (
                  <>
                    <div className="form-group">
                      <label>Immatriculation</label>
                      <input value={form.immatriculation} onChange={e => setForm({...form, immatriculation: e.target.value})} placeholder="Ex: TG-1234-AZ" />
                    </div>
                    <div className="form-group">
                      <label>Numéro de Châssis</label>
                      <input value={form.numChassis} onChange={e => setForm({...form, numChassis: e.target.value})} placeholder="Ex: ABC123DEF456" />
                    </div>
                    <div className="form-group">
                      <label>Marque</label>
                      <input value={form.marque} onChange={e => setForm({...form, marque: e.target.value})} placeholder="Ex: Toyota" />
                    </div>
                    <div className="form-group">
                      <label>Modèle</label>
                      <input value={form.modele} onChange={e => setForm({...form, modele: e.target.value})} placeholder="Ex: Hilux 2023" />
                    </div>
                  </>
                )}

                {selectedCategory === 'MOBILIER' && (
                  <>
                    <div className="form-group">
                      <label>Numéro de Série</label>
                      <input value={form.numSerie} onChange={e => setForm({...form, numSerie: e.target.value})} placeholder="Ex: SN-99887766" />
                    </div>
                    <div className="form-group">
                      <label>Fabricant / Marque</label>
                      <input value={form.fabricant} onChange={e => setForm({...form, fabricant: e.target.value})} placeholder="Ex: Dell / HP" />
                    </div>
                  </>
                )}

                {/* Champs Communs Suite */}
                <div className="form-group" style={{gridColumn: 'span 2'}}>
                  <label>Photo & Localisation GPS (Obligatoire pour Immobilier & Véhicules)</label>
                  <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
                    <button type="button" className="btn-export" style={{flex: 1}} onClick={() => {
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition((pos) => {
                          const coords = `${pos.coords.latitude}, ${pos.coords.longitude}`;
                          setForm({...form, coordonneesGps: coords});
                        });
                      } else {
                        alert("Géolocalisation non disponible.");
                      }
                    }}>
                      {form.coordonneesGps ? '📍 Coordonnées acquises' : '📍 Capturer GPS'}
                    </button>
                  </div>
                  {form.coordonneesGps && <p style={{fontSize: '12px', marginTop: '5px', color: 'var(--accent)'}}>GPS: {form.coordonneesGps}</p>}
                </div>

                {/* Section Amortissement */}
                <div style={{gridColumn: 'span 2', background: 'rgba(99, 102, 241, 0.05)', padding: '20px', borderRadius: '16px', border: '1px dashed var(--primary)'}}>
                  <h4 style={{marginBottom: '15px', color: 'var(--primary)'}}>Calcul Comptable (Automatique)</h4>
                  <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '15px'}}>
                    <div className="form-group">
                      <label>Durée d'amort. (Années)</label>
                      <input type="number" value={form.dureeAmortissement} onChange={e => setForm({...form, dureeAmortissement: Number(e.target.value)})} />
                    </div>
                    <div className="form-group">
                      <label>Amort. Cumulé (FCFA)</label>
                      <input type="number" disabled value={Math.round(form.amortissementCumule || 0)} style={{background: 'rgba(0,0,0,0.1)'}} />
                    </div>
                    <div className="form-group">
                      <label>VNC Actuelle (FCFA)</label>
                      <input type="number" disabled value={Math.round(form.valeurNetteComptable || 0)} style={{background: 'rgba(16, 185, 129, 0.1)', color: 'var(--success)', fontWeight: 'bold'}} />
                    </div>
                  </div>
                </div>

                <div style={{gridColumn: 'span 2', display: 'flex', gap: '15px', marginTop: '20px'}}>
                  <button type="submit" className="primary" style={{flex: 2}}>Enregistrer l'actif au registre</button>
                  <button type="button" className="btn-export" style={{flex: 1}} onClick={() => setSelectedCategory(null)}>Changer catégorie</button>
                </div>
              </form>
            </div>
          )}
        </section>
      ) : (
        <section className="registry-gallery">
          <div className="export-bar" style={{display: 'flex', justifyContent: 'flex-end', gap: '10px', marginBottom: '20px'}}>
            <button className="btn-export" onClick={() => {
              const exportData = filtered.map(b => ({
                'IUP / CODE': b.iup || b.codeBien,
                'DÉSIGNATION': b.designation,
                'CATÉGORIE': b.categorie,
                'DATE ACQUISITION': b.dateAcquisition,
                'VALEUR ORIGINE (FCFA)': b.valeur,
                'ETAT / STATUT': b.etat,
                'LOCALISATION': b.localisation,
                'TITRE FONCIER / REF': b.titreFoncier || b.numSerie || '-',
                'IMMATRICULATION': b.immatriculation || '-',
                'CHASSIS': b.numChassis || '-',
                'MARQUE / MODÈLE': b.marque ? `${b.marque} ${b.modele || ''}` : b.fabricant || '-',
                'SUPERFICIE': b.superficie || '-',
                'LATITUDE/LONGITUDE': b.coordonneesGps || '-'
              }));
              exportXlsx(exportData, `registre_patrimoine_${new Date().getFullYear()}.xlsx`);
            }}>📊 Exporter Liste Simple XLS</button>
            <button className="btn-export" onClick={() => exportLivreJournalExcel(filtered, `Livre_Journal_${new Date().getFullYear()}.xls`)}>📙 Livre Journal (Officiel)</button>
            <button className="btn-export" onClick={() => exportGrandLivreExcel(filtered, `Grand_Livre_${new Date().getFullYear()}.xls`)}>📘 Grand Livre (Officiel)</button>
            <button className="btn-export" onClick={() => exportPdf(filtered, 'REGISTRE DU PATRIMOINE', 'biens_patris.pdf')}>📕 PDF</button>
          </div>

          <div className="asset-grid">
            {filtered.map(bien => (
              <div key={bien.id} className="asset-card">
                <div style={{display: 'flex', justifyContent: 'space-between', marginBottom: '16px'}}>
                  <span className="badge-premium" style={{fontSize: '9px'}}>{bien.iup || 'IUP EN ATTENTE'}</span>
                  <span className={`status-pill status-${bien.etat.toLowerCase()}`}>{bien.etat}</span>
                </div>
                
                <h3 style={{fontSize: '18px', marginBottom: '4px'}}>{bien.designation}</h3>
                
                {bien.photoUrl && (
                  <div style={{marginBottom: '12px'}}>
                    <img 
                      src={bien.photoUrl.startsWith('http') ? bien.photoUrl : `http://localhost:8082/uploads/${bien.photoUrl}`} 
                      alt={bien.designation} 
                      style={{width: '100%', height: '150px', objectFit: 'cover', borderRadius: '12px'}} 
                    />
                  </div>
                )}

                <p style={{color: 'var(--text-dim)', fontSize: '12px', marginBottom: '12px'}}>📍 {bien.localisation}</p>

                {/* Détails spécifiques sur la carte */}
                <div style={{display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '16px', fontSize: '11px'}}>
                  {bien.titreFoncier && <div><span style={{opacity: 0.6}}>📜 TF:</span> {bien.titreFoncier}</div>}
                  {bien.immatriculation && <div><span style={{opacity: 0.6}}>🚘 Immat:</span> {bien.immatriculation}</div>}
                  {bien.numChassis && <div><span style={{opacity: 0.6}}>⚙️ Châssis:</span> {bien.numChassis}</div>}
                  {bien.numSerie && <div><span style={{opacity: 0.6}}>🔢 S/N:</span> {bien.numSerie}</div>}
                  {bien.marque && <div><span style={{opacity: 0.6}}>🏢 Marque:</span> {bien.marque}</div>}
                  {bien.superficie && <div><span style={{opacity: 0.6}}>📏 Surf:</span> {bien.superficie}</div>}
                </div>
                
                <div className="doc-list" style={{background: 'rgba(255,255,255,0.03)', padding: '16px', borderRadius: '16px', marginBottom: '20px', border: '1px solid var(--glass-border)'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px'}}>
                    <p style={{fontSize: '11px', fontWeight: '800', color: 'var(--primary)', letterSpacing: '0.5px'}}>📄 JUSTIFICATIFS ({linkedDocs[bien.id!]?.length || 0})</p>
                    <div style={{width: '20px', height: '1px', background: 'var(--glass-border)'}}></div>
                  </div>
                  
                  <div style={{display: 'grid', gap: '8px'}}>
                    {linkedDocs[bien.id!]?.map((doc: any, i: number) => (
                      <div key={i} className="doc-item" style={{
                        fontSize: '11px', 
                        color: 'var(--text-main)', 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '10px',
                        padding: '8px 12px',
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: '8px',
                        border: '1px solid transparent',
                        transition: 'all 0.2s'
                      }}>
                        {doc.type === 'IMAGE' || doc.type === 'IMG' || doc.type?.startsWith('IMAGE') ? (
                          <img src={doc.url || '#'} alt={doc.name} style={{width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px', border: '1px solid var(--glass-border)'}} />
                        ) : (
                          <span style={{fontSize: '20px'}}>
                            {doc.type === 'PDF' ? '📕' : doc.type === 'JSON' ? '📦' : '📄'}
                          </span>
                        )}
                        <span style={{flexGrow: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'}}>{doc.name}</span>
                        <span className="badge-premium" style={{fontSize: '8px', padding: '2px 6px', background: 'rgba(99,102,241,0.1)'}}>{doc.type}</span>
                      </div>
                    ))}
                    {(!linkedDocs[bien.id!] || linkedDocs[bien.id!].length === 0) && (
                      <div style={{textAlign: 'center', padding: '10px', opacity: 0.4, fontStyle: 'italic', fontSize: '11px'}}>
                        Aucune pièce jointe
                      </div>
                    )}
                  </div>
                </div>

                {bien.id && (
                <button 
                  className="btn-export" 
                  style={{width: '100%', padding: '10px', marginBottom: '16px', fontWeight: 'bold'}}
                  onClick={() => exportOrdreEntreeExcel(bien, `Ordre_Entree_${bien.id}.xls`)}
                >
                  📄 Ordre d'Entrée (XLS)
                </button>
                )}

                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid var(--glass-border)', paddingTop: '16px'}}>
                  <span style={{fontWeight: '800', color: 'var(--accent)'}}>{bien.valeur.toLocaleString()} FCFA</span>
                  <div style={{display: 'flex', gap: '8px'}}>
                    {hasPermission('VALIDATE_BIENS') && bien.statutValidation !== 'VALIDE' && (
                      <>
                        <button className="btn-export" style={{color: 'var(--success)', padding: '6px'}} onClick={() => bien.id && handleValidate(bien.id, 'VALIDE')}>✅</button>
                        <button className="btn-export" style={{color: 'var(--danger)', padding: '6px'}} onClick={() => bien.id && handleValidate(bien.id, 'REFUSE')}>❌</button>
                      </>
                    )}
                    <label className="btn-export" title="Lier un document (PDF, Image, DOC, JSON)" style={{cursor: 'pointer', padding: '6px'}}>
                      📎 <input type="file" accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.json" hidden onChange={e => {
                        if (e.target.files && e.target.files[0] && bien.id) handleFileUpload(bien.id, e.target.files[0]);
                      }} />
                    </label>
                    <button className="btn-export" style={{color: 'var(--danger)', padding: '6px'}} onClick={() => bien.id && deleteBien(bien.id).then(loadBiens)}>🗑️</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
