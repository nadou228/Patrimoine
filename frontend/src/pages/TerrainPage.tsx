import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Html5QrcodeScanner } from 'html5-qrcode';
import { motion } from 'framer-motion';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import { 
  QrCode, Camera, CheckCircle2, AlertTriangle, MapPin, 
  Search, RefreshCw, AlertCircle, FileText, Send, UserCheck, ShieldAlert, ExternalLink, Satellite
} from 'lucide-react';
import { 
  getInventaires, 
  getInventaireFiches, 
  scanTerrainInventaire,
  recenserTerrainInventaire,
  getInventaireStats,
  createSinistre 
} from '../api/api';
import ImageUpload from '../components/ImageUpload';
import { useGeolocation } from '../hooks/useGeolocation';
import { usePermissions } from '../contexts/PermissionsContext';
import { parseQrPayload } from '../utils/qrParser';
import { ETATS_CONSTATES } from '../utils/inventaireConstants';

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("fr-FR", { style: "currency", currency: "XOF" }).format(value || 0);
};


type Campagne = {
  id: number;
  nom: string;
  sites?: string;
  statut: string;
};

type Bien = {
  id: number;
  iup: string;
  designation: string;
  codeCategorie: string;
  localisation?: string;
  service?: string;
  valeur: number;
  statutOperationnel?: string;
};

type Fiche = {
  id: number;
  campagne: { id: number };
  bien: Bien;
  codeIup: string;
  etatConstate: string;
  localisationReelle: string;
  observation?: string;
  anomalie: boolean;
  validationAgent?: string;
  validationSuperviseur?: string;
  photoUrl?: string;
  coordonneeGps?: string;
};

type CampagneStats = {
  tauxCouverture: number;
  fichesRecensees: number;
  totalFiches: number;
  ecartsEnAttente: number;
};

export const TerrainPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { hasPermission } = usePermissions();
  const canValidateAgent = hasPermission('VALIDATE_INVENTAIRES_AGENT');
  const { coords, setCoords, capture: captureGPS, loading: gpsLoading, error: gpsError } = useGeolocation();

  const [campagnes, setCampagnes] = useState<Campagne[]>([]);
  const [selectedCampagneId, setSelectedCampagneId] = useState<number | ''>('');
  const [fichesCampagne, setFichesCampagne] = useState<Fiche[]>([]);
  const [stats, setStats] = useState<CampagneStats | null>(null);
  const [selectedBien, setSelectedBien] = useState<Bien | null>(null);
  const [existingFiche, setExistingFiche] = useState<Fiche | null>(null);
  const [scanAlertes, setScanAlertes] = useState<string[]>([]);
  const [lastEcartsCount, setLastEcartsCount] = useState(0);
  
  // Tab control
  const [activeTab, setActiveTab] = useState<'scan' | 'manual'>('scan');
  const [manualIup, setManualIup] = useState('');
  
  // Scanning state
  const [isScanning, setIsScanning] = useState(false);
  const [scanError, setScanError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);

  // Census Form state
  const [etatConstate, setEtatConstate] = useState('BON');
  const [localisationReelle, setLocalisationReelle] = useState('');
  const [observation, setObservation] = useState('');
  const [anomalie, setAnomalie] = useState(false);
  const [photoUrl, setPhotoUrl] = useState('');
  const [isSubmittingCensus, setIsSubmittingCensus] = useState(false);
  const [censusSuccess, setCensusSuccess] = useState(false);

  // Incident Form state
  const [incidentType, setIncidentType] = useState('DEGRADATION');
  const [incidentDesc, setIncidentDesc] = useState('');
  const [isSubmittingIncident, setIsSubmittingIncident] = useState(false);
  const [incidentSuccess, setIncidentSuccess] = useState(false);

  const loadCampagneData = useCallback(async (campagneId: number) => {
    try {
      const [fList, s] = await Promise.all([
        getInventaireFiches(campagneId),
        getInventaireStats(campagneId).catch(() => null),
      ]);
      setFichesCampagne(fList || []);
      setStats(s);
    } catch (err) {
      console.error('Failed to load campaign data', err);
    }
  }, []);

  useEffect(() => {
    const loadInitialData = async () => {
      try {
        const cList = await getInventaires();
        const actives = cList.filter((c: Campagne) =>
          c.statut !== 'TERMINE' && c.statut !== 'CLOTURE' && c.statut !== 'CERTIFIE');
        setCampagnes(actives);

        const fromUrl = searchParams.get('campagne');
        const urlId = fromUrl ? Number(fromUrl) : NaN;
        const initial = !isNaN(urlId) && actives.some((c: Campagne) => c.id === urlId)
          ? urlId
          : actives[0]?.id;
        if (initial) {
          setSelectedCampagneId(initial);
          await loadCampagneData(initial);
        }
      } catch (err) {
        console.error('Failed to load campaigns', err);
      }
    };
    loadInitialData();
  }, [searchParams, loadCampagneData]);

  useEffect(() => {
    if (selectedCampagneId) {
      loadCampagneData(Number(selectedCampagneId));
      navigate(`/terrain?campagne=${selectedCampagneId}`, { replace: true });
    }
  }, [selectedCampagneId, loadCampagneData, navigate]);

  // When a campaign or a bien is selected, check if a fiche already exists
  useEffect(() => {
    if (!selectedCampagneId || !selectedBien) {
      setExistingFiche(null);
      return;
    }
    const checkFiche = async () => {
      try {
        const fiches: Fiche[] = await getInventaireFiches(Number(selectedCampagneId));
        const matched = fiches.find(f => f.bien?.id === selectedBien.id || f.codeIup === selectedBien.iup);
        if (matched) {
          setExistingFiche(matched);
          setEtatConstate(matched.etatConstate || 'BON');
          setLocalisationReelle(matched.localisationReelle || selectedBien.localisation || '');
          setObservation(matched.observation || '');
          setAnomalie(!!matched.anomalie);
          setPhotoUrl(matched.photoUrl || '');
          setCoords(matched.coordonneeGps || '');
        } else {
          setExistingFiche(null);
          setEtatConstate('BON');
          setLocalisationReelle(selectedBien.localisation || '');
          setObservation('');
          setAnomalie(false);
          setPhotoUrl('');
          setCoords('');
        }
      } catch (err) {
        console.error('Failed to load campaign sheets', err);
      }
    };
    checkFiche();
  }, [selectedCampagneId, selectedBien]);

  // Start QR Scanner
  const startScanner = () => {
    setScanError(null);
    setIsScanning(true);
    setCensusSuccess(false);
    
    // Defer initialization to let the div render
    setTimeout(() => {
      try {
        const scanner = new Html5QrcodeScanner(
          'qr-reader',
          { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0
          },
          /* verbose= */ false
        );
        
        scanner.render(
          (decodedText) => {
            // Success
            handleScanSuccess(decodedText);
            scanner.clear();
            setIsScanning(false);
          },
          (err) => {
            // Silent error on every frame failure (expected)
          }
        );
        scannerRef.current = scanner;
      } catch (e) {
        setScanError("Erreur d'accès à la caméra. Vérifiez les permissions.");
        setIsScanning(false);
      }
    }, 100);
  };

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear().catch(err => console.error(err));
      scannerRef.current = null;
    }
    setIsScanning(false);
  };

  const handleScanSuccess = async (text: string) => {
    const iup = parseQrPayload(text);
    setScanAlertes([]);
    setScanError(null);

    if (!selectedCampagneId) {
      setScanError('Sélectionnez une campagne avant de scanner.');
      return;
    }

    try {
      const result = await scanTerrainInventaire(Number(selectedCampagneId), iup);
      if (result.bien) {
        setSelectedBien(result.bien);
        setScanAlertes(result.alertes || []);
        if (result.fiche) {
          setExistingFiche(result.fiche);
          setEtatConstate(result.fiche.etatConstate || 'BON');
          setLocalisationReelle(result.fiche.localisationReelle || result.bien.localisation || '');
          setObservation(result.fiche.observation || '');
          setAnomalie(!!result.fiche.anomalie);
          setPhotoUrl(result.fiche.photoUrl || '');
          setCoords(result.fiche.coordonneeGps || '');
        }
        setCensusSuccess(false);
        setIncidentSuccess(false);
      }
    } catch {
      setScanError(`Aucun bien trouvé pour : "${iup}"`);
      setSelectedBien(null);
    }
  };

  const handleManualSearch = async () => {
    setScanError(null);
    setScanAlertes([]);
    setCensusSuccess(false);
    setIncidentSuccess(false);

    if (!selectedCampagneId) {
      setScanError('Sélectionnez une campagne active.');
      return;
    }

    const iup = parseQrPayload(manualIup);
    try {
      await handleScanSuccess(iup);
    } catch {
      setScanError(`Aucun bien trouvé pour l'IUP : "${manualIup}"`);
      setSelectedBien(null);
    }
  };

  const submitCensus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBien || !selectedCampagneId) return;
    if (!canValidateAgent) {
      alert('Permission insuffisante : VALIDATE_INVENTAIRES_AGENT requise.');
      return;
    }

    setIsSubmittingCensus(true);
    try {
      const result = await recenserTerrainInventaire({
        campagneId: Number(selectedCampagneId),
        iup: selectedBien.iup,
        etatConstate,
        localisationReelle,
        photoUrl,
        coordonneeGps: coords,
        observation,
        anomalie,
        validerAgent: true,
      });
      setExistingFiche(result.fiche);
      setScanAlertes(result.alertes || []);
      setLastEcartsCount((result.ecartsGeneres || []).length);
      setCensusSuccess(true);
      await loadCampagneData(Number(selectedCampagneId));
      setTimeout(() => setCensusSuccess(false), 5000);
    } catch (err) {
      console.error('Census submission failed', err);
      alert('Une erreur est survenue lors de la validation du recensement.');
    } finally {
      setIsSubmittingCensus(false);
    }
  };

  const submitIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBien) return;

    setIsSubmittingIncident(true);
    try {
      await createSinistre({
        bien: { id: selectedBien.id },
        description: `[Incident Terrain] Type: ${incidentType}. Description: ${incidentDesc}`,
        statut: 'EN_ATTENTE',
        dateDeclaration: new Date().toISOString().split('T')[0]
      });
      setIncidentSuccess(true);
      setIncidentDesc('');
      setTimeout(() => setIncidentSuccess(false), 5000);
    } catch (err) {
      console.error('Incident submission failed', err);
      alert('Une erreur est survenue lors du signalement.');
    } finally {
      setIsSubmittingIncident(false);
    }
  };

  return (
    <div className="terrain-container">
      {/* HEADER */}
      <div className="terrain-header">
        <div className="badge-terrain">
          <Camera size={14} />
          <span>Mode Mobile & Terrain</span>
        </div>
        <h1>Recensement de Terrain</h1>
        <p className="subtitle">
          Scannez les QR codes (JSON, URL ou IUP), capturez photo + GPS, et synchronisez avec la mission d'inventaire en temps réel.
        </p>
        {stats && selectedCampagneId && (
          <div className="terrain-stats-bar">
            <span>Couverture : <strong>{stats.tauxCouverture}%</strong> ({stats.fichesRecensees}/{stats.totalFiches})</span>
            {stats.ecartsEnAttente > 0 && (
              <span className="text-warning"> · {stats.ecartsEnAttente} écart(s) en attente</span>
            )}
            <Link to={`/inventaire?campagne=${selectedCampagneId}`} className="link-inventaire">
              <ExternalLink size={14} /> Voir mission inventaire
            </Link>
          </div>
        )}
      </div>

      {/* SETUP ROW (CAMPAGNE SELECTOR) */}
      <div className="setup-card">
        <div className="form-group">
          <label htmlFor="campagne-select">Campagne de Recensement Active</label>
          <select 
            id="campagne-select"
            value={selectedCampagneId} 
            onChange={(e) => setSelectedCampagneId(e.target.value ? Number(e.target.value) : '')}
          >
            <option value="">-- Aucune campagne sélectionnée (Mode Lecture seule) --</option>
            {campagnes.map(c => (
              <option key={c.id} value={c.id}>
                {c.nom} {c.sites ? `(${c.sites})` : ''}
              </option>
            ))}
          </select>
          {!selectedCampagneId && (
            <p className="help-text text-warning">
              ⚠️ Sélectionnez une campagne active pour recenser (périmètre : {fichesCampagne.length} fiches théoriques).
            </p>
          )}
          {selectedCampagneId && (
            <p className="help-text">
              Périmètre campagne : <strong>{fichesCampagne.length}</strong> biens à inventorier
            </p>
          )}
        </div>
      </div>

      {/* SCANNING & INPUT TABS */}
      <div className="scan-controls-layout">
        <div className="tab-card">
          <div className="tab-headers">
            <button 
              className={`tab-btn ${activeTab === 'scan' ? 'active' : ''}`}
              onClick={() => { setActiveTab('scan'); stopScanner(); }}
            >
              <QrCode size={16} /> Scanner QR Code
            </button>
            <button 
              className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
              onClick={() => { setActiveTab('manual'); stopScanner(); }}
            >
              <Search size={16} /> Saisie Manuelle
            </button>
          </div>

          <div className="tab-content">
            {activeTab === 'scan' && (
              <div className="scanner-tab-body">
                {!isScanning ? (
                  <button onClick={startScanner} className="start-scan-btn">
                    <Camera size={20} /> Démarrer la Caméra
                  </button>
                ) : (
                  <div className="scanner-active-wrapper">
                    <div id="qr-reader" className="qr-reader-mount" />
                    <button onClick={stopScanner} className="stop-scan-btn">
                      Arrêter le Scanner
                    </button>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'manual' && (
              <div className="manual-tab-body">
                <div className="search-flex">
                  <input 
                    type="text" 
                    placeholder="Saisir l'IUP du bien (ex: PATRIS-000123)"
                    value={manualIup}
                    onChange={(e) => setManualIup(e.target.value)}
                  />
                  <button onClick={handleManualSearch} className="search-btn">
                    Rechercher
                  </button>
                </div>
              </div>
            )}

            {scanError && (
              <div className="scan-error-alert">
                <AlertCircle size={18} />
                <span>{scanError}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* SELECTED ASSET & FORMS PANEL */}
      {scanAlertes.length > 0 && (
        <div className="terrain-alertes">
          {scanAlertes.map((a, i) => (
            <div key={i} className="alert-item"><AlertCircle size={14} /> {a}</div>
          ))}
        </div>
      )}

      {selectedBien && (
        <div className="asset-details-grid">
          {/* ASSET SPEC CARD */}
          <div className="detail-card">
            <div className="card-header-premium">
              <h3>Fiche Technique de l'Actif</h3>
              <span className="iup-badge">{selectedBien.iup}</span>
            </div>
            
            <div className="info-grid">
              <div className="info-row">
                <span className="info-label">Désignation</span>
                <span className="info-val">{selectedBien.designation}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Catégorie</span>
                <span className="info-val category-badge">{selectedBien.codeCategorie}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Localisation Théorique</span>
                <span className="info-val">
                  <MapPin size={12} className="inline-icon" /> {selectedBien.localisation || 'Non spécifiée'}
                </span>
              </div>
              <div className="info-row">
                <span className="info-label">Service Affectataire</span>
                <span className="info-val">{selectedBien.service || 'Non affecté'}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Valeur Brute</span>
                <span className="info-val font-semibold">{formatCurrency(selectedBien.valeur)}</span>
              </div>
              <div className="info-row">
                <span className="info-label">Statut Opérationnel</span>
                <span className="info-val">{selectedBien.statutOperationnel || 'FONCTIONNEL'}</span>
              </div>
            </div>
          </div>

          {/* CENSUS VALIDATION FORM */}
          {selectedCampagneId ? (
            <div className="detail-card">
              <div className="card-header-premium">
                <h3>Recensement Terrain</h3>
                {existingFiche?.validationAgent === 'VALIDE' ? (
                  <span className="status-badge success">Recensé & Validé</span>
                ) : (
                  <span className="status-badge pending">En attente de recensement</span>
                )}
              </div>

              <form onSubmit={submitCensus} className="census-form">
                <div className="form-group-grid">
                  <div className="form-group">
                    <label>État Constaté sur Place</label>
                    <select value={etatConstate} onChange={(e) => setEtatConstate(e.target.value)}>
                      {ETATS_CONSTATES.map(e => (
                        <option key={e.value} value={e.value}>{e.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-group">
                    <label>Localisation Réelle Constatée</label>
                    <input 
                      type="text" 
                      value={localisationReelle} 
                      onChange={(e) => setLocalisationReelle(e.target.value)} 
                      placeholder="Bureau, Salle, Site..."
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label><Satellite size={14} className="inline-icon" /> Géolocalisation (obligatoire CDC)</label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <input readOnly value={coords} placeholder="Capturer la position GPS" style={{ flex: 1 }} />
                    <button type="button" className="gps-btn" onClick={captureGPS} disabled={gpsLoading}>
                      {gpsLoading ? '...' : 'Capturer GPS'}
                    </button>
                  </div>
                  {gpsError && <p className="help-text text-warning">{gpsError}</p>}
                </div>

                <div className="form-group">
                  <label>Photo de preuve (obligatoire pour certification)</label>
                  <ImageUpload value={photoUrl} onChange={setPhotoUrl} label="Prendre / uploader une photo" />
                </div>

                <div className="form-group">
                  <label>Observations / Notes de terrain</label>
                  <textarea 
                    value={observation} 
                    onChange={(e) => setObservation(e.target.value)} 
                    placeholder="Signaler des remarques particulières..."
                    rows={3}
                  />
                </div>

                <div className="form-checkbox-group">
                  <input 
                    type="checkbox" 
                    id="anomalie-check"
                    checked={anomalie}
                    onChange={(e) => setAnomalie(e.target.checked)}
                  />
                  <label htmlFor="anomalie-check" className="text-danger font-semibold">
                    <AlertTriangle size={14} className="inline-icon" /> Signaler une Anomalie / Écart majeur
                  </label>
                </div>

                <button type="submit" disabled={isSubmittingCensus || !canValidateAgent} className="submit-census-btn">
                  {isSubmittingCensus ? (
                    <RefreshCw size={16} className="spinner" />
                  ) : (
                    <UserCheck size={16} />
                  )}
                  <span>{canValidateAgent ? 'Enregistrer & Valider le Recensement' : 'Permission agent requise'}</span>
                </button>

                {censusSuccess && (
                  <motion.div 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="success-alert"
                  >
                    <CheckCircle2 size={16} /> Recensement synchronisé avec l'inventaire !
                    {lastEcartsCount > 0 && (
                      <span> · {lastEcartsCount} écart(s) généré(s) → voir onglet Écarts</span>
                    )}
                  </motion.div>
                )}
              </form>
            </div>
          ) : (
            <div className="detail-card alert-read-only">
              <ShieldAlert size={24} />
              <h4>Mode Consultation</h4>
              <p>Sélectionnez une campagne active en haut de la page pour activer le formulaire de recensement de terrain.</p>
            </div>
          )}

          {/* COLLAPSIBLE INCIDENT REPORT */}
          <div className="detail-card incident-card">
            <div className="card-header-premium text-danger">
              <h3>🚨 Signaler un Incident ou Sinistre</h3>
            </div>
            
            <form onSubmit={submitIncident} className="incident-form">
              <div className="form-group">
                <label>Type d'incident</label>
                <select value={incidentType} onChange={(e) => setIncidentType(e.target.value)}>
                  <option value="DEGRADATION">Dégradation / Casse</option>
                  <option value="VOL">Vol ou Perte</option>
                  <option value="PANNE">Panne technique</option>
                  <option value="ACCIDENT">Accident / Sinistre</option>
                </select>
              </div>

              <div className="form-group">
                <label>Description des faits</label>
                <textarea 
                  value={incidentDesc}
                  onChange={(e) => setIncidentDesc(e.target.value)}
                  placeholder="Décrivez précisément l'incident rencontré sur le terrain..."
                  required
                  rows={3}
                />
              </div>

              <button type="submit" disabled={isSubmittingIncident} className="submit-incident-btn">
                {isSubmittingIncident ? (
                  <RefreshCw size={16} className="spinner" />
                ) : (
                  <Send size={16} />
                )}
                <span>Signaler l'incident au service patrimoine</span>
              </button>

              {incidentSuccess && (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="success-alert bg-green"
                >
                  <CheckCircle2 size={16} /> Incident signalé avec succès !
                </motion.div>
              )}
            </form>
          </div>
        </div>
      )}

      <style>{`
        .terrain-container {
          padding: 30px;
          background: #f8fafc;
          min-height: 100vh;
        }

        .badge-terrain {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: #ffe4e6;
          color: #e11d48;
          padding: 6px 12px;
          border-radius: 9999px;
          font-size: 11px;
          font-weight: 800;
          text-transform: uppercase;
          margin-bottom: 12px;
        }

        .terrain-header h1 {
          font-size: 2.2rem;
          font-weight: 900;
          color: #0f172a;
          margin: 0 0 8px 0;
          letter-spacing: -1px;
        }

        .terrain-stats-bar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 12px;
          margin-top: 12px;
          font-size: 13px;
          color: #475569;
        }

        .link-inventaire {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          color: #6366f1;
          font-weight: 700;
          text-decoration: none;
        }

        .terrain-alertes {
          background: #fff7ed;
          border: 1px solid #fed7aa;
          border-radius: 12px;
          padding: 12px 16px;
          margin-bottom: 16px;
        }

        .terrain-alertes .alert-item {
          display: flex;
          align-items: center;
          gap: 8px;
          font-size: 13px;
          color: #c2410c;
          margin: 4px 0;
        }

        .gps-btn {
          background: #6366f1;
          color: white;
          border: none;
          border-radius: 8px;
          padding: 8px 14px;
          font-weight: 700;
          cursor: pointer;
        }

        .setup-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          padding: 20px;
          margin-bottom: 25px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 8px;
          width: 100%;
        }

        .form-group label {
          font-size: 13px;
          font-weight: 700;
          color: #334155;
        }

        .form-group select, .form-group input, .form-group textarea {
          border: 1px solid #cbd5e1;
          border-radius: 12px;
          padding: 10px 14px;
          font-size: 13px;
          outline: none;
          background: white;
          transition: all 0.2s;
        }

        .form-group select:focus, .form-group input:focus, .form-group textarea:focus {
          border-color: #4f46e5;
          box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
        }

        .help-text {
          font-size: 11px;
          font-weight: 600;
          margin-top: 4px;
        }

        .text-warning { color: #d97706; }

        .scan-controls-layout {
          margin-bottom: 30px;
        }

        .tab-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 20px;
          overflow: hidden;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
        }

        .tab-headers {
          display: flex;
          border-bottom: 1px solid #f1f5f9;
          background: #f8fafc;
        }

        .tab-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          border: none;
          background: none;
          padding: 16px;
          font-size: 13px;
          font-weight: 700;
          color: #64748b;
          cursor: pointer;
          transition: all 0.2s;
        }

        .tab-btn.active {
          color: #4f46e5;
          background: white;
          border-bottom: 2px solid #4f46e5;
        }

        .tab-content {
          padding: 24px;
        }

        .scanner-tab-body {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
        }

        .start-scan-btn {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #4f46e5;
          color: white;
          border: none;
          border-radius: 12px;
          padding: 12px 24px;
          font-weight: 700;
          font-size: 14px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .start-scan-btn:hover { background: #4338ca; }

        .scanner-active-wrapper {
          width: 100%;
          max-width: 400px;
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .qr-reader-mount {
          width: 100%;
          border: 2px solid #e2e8f0;
          border-radius: 16px;
          overflow: hidden;
        }

        .stop-scan-btn {
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 12px;
          padding: 10px 20px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
        }

        .search-flex {
          display: flex;
          gap: 12px;
          width: 100%;
        }

        .search-flex input {
          flex: 1;
        }

        .search-btn {
          background: #0f172a;
          color: white;
          border: none;
          border-radius: 12px;
          padding: 10px 20px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .search-btn:hover { background: #1e293b; }

        .scan-error-alert {
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fee2e2;
          color: #ef4444;
          padding: 12px;
          border-radius: 12px;
          margin-top: 16px;
          font-size: 12px;
          font-weight: 700;
        }

        .asset-details-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 24px;
        }

        @media (min-width: 992px) {
          .asset-details-grid {
            grid-template-columns: repeat(3, 1fr);
          }
        }

        .detail-card {
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          padding: 24px;
          box-shadow: 0 4px 6px -1px rgba(0,0,0,0.05);
          display: flex;
          flex-direction: column;
          gap: 20px;
        }

        .card-header-premium {
          display: flex;
          justify-content: space-between;
          align-items: center;
          border-bottom: 1px solid #f1f5f9;
          padding-bottom: 12px;
        }

        .card-header-premium h3 {
          margin: 0;
          font-size: 15px;
          font-weight: 800;
          color: #0f172a;
        }

        .iup-badge {
          background: #f1f5f9;
          color: #0f172a;
          font-weight: 800;
          font-size: 11px;
          padding: 4px 8px;
          border-radius: 6px;
        }

        .info-grid {
          display: flex;
          flex-direction: column;
          gap: 14px;
        }

        .info-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          font-size: 13px;
        }

        .info-label {
          color: #64748b;
          font-weight: 700;
        }

        .info-val {
          color: #1e293b;
          font-weight: 700;
          text-align: right;
        }

        .category-badge {
          background: #e0f2fe;
          color: #0369a1;
          padding: 2px 6px;
          border-radius: 6px;
          font-size: 11px;
        }

        .inline-icon {
          display: inline;
          vertical-align: middle;
          margin-right: 4px;
        }

        .status-badge {
          font-size: 10px;
          font-weight: 800;
          text-transform: uppercase;
          padding: 4px 8px;
          border-radius: 6px;
        }

        .status-badge.success { background: #d1fae5; color: #065f46; }
        .status-badge.pending { background: #fef3c7; color: #92400e; }

        .census-form, .incident-form {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .form-group-grid {
          display: grid;
          grid-template-columns: 1fr;
          gap: 16px;
        }

        @media (min-width: 576px) {
          .form-group-grid {
            grid-template-columns: 1fr 1fr;
          }
        }

        .form-checkbox-group {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .form-checkbox-group label {
          font-size: 12px;
          cursor: pointer;
        }

        .submit-census-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #10b981;
          color: white;
          border: none;
          border-radius: 12px;
          padding: 12px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .submit-census-btn:hover { background: #059669; }

        .submit-incident-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          background: #ef4444;
          color: white;
          border: none;
          border-radius: 12px;
          padding: 12px;
          font-weight: 700;
          font-size: 13px;
          cursor: pointer;
          transition: background 0.2s;
        }

        .submit-incident-btn:hover { background: #dc2626; }

        .success-alert {
          display: flex;
          align-items: center;
          gap: 8px;
          background: #d1fae5;
          color: #065f46;
          padding: 10px;
          border-radius: 10px;
          font-size: 11px;
          font-weight: 700;
        }

        .bg-green { background: #d1fae5; color: #065f46; }

        .alert-read-only {
          background: #f8fafc;
          border: 1px dashed #cbd5e1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          text-align: center;
          color: #64748b;
          padding: 40px;
        }

        .alert-read-only h4 {
          margin: 12px 0 6px 0;
          color: #334155;
          font-weight: 800;
        }

        .alert-read-only p {
          font-size: 12px;
          margin: 0;
        }

        .spinner {
          animation: spin 1s linear infinite;
        }

        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default TerrainPage;
