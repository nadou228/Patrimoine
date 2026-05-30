import axios from 'axios';
import { getCurrentUser } from './auth';
import { API_BASE_URL, resolveApiUrl } from './config';

export { API_BASE_URL, resolveApiUrl };

const api = axios.create({
  baseURL: resolveApiUrl('/api'),
});

api.interceptors.request.use((config) => {
  const user = getCurrentUser();
  if (user?.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
});

export { api };

export type ApiRecord = Record<string, unknown>;

export type ServicePayload = {
  nomService: string;
  code: string;
  direction?: string;
  responsable?: string;
  localisation?: string;
};

export type ServiceDto = ServicePayload & {
  id: number;
  nom?: string;
};

export type UserLookupDto = {
  id: number;
  nom?: string;
  prenom?: string;
  matricule?: string;
  fonction?: string;
  telephone?: string;
  email?: string;
  service?: {
    id?: number;
    nomService?: string;
    nom?: string;
    code?: string;
  } | string | null;
};

export type AffectationPayload = {
  bien?: { id: number } | string;
  bienId?: number;
  detenteur?: string;
  detenteurA?: string;
  service?: string;
  dateAffectation?: string;
  motif?: string;
  signatureUrl?: string;
  typeBeneficiaire?: string;
  responsableReception?: string;
  documentsUrls?: string[];
};

export type RetourAffectationPayload = {
  motif: string;
  dateRetour: string;
};

export type ReformeValidationPayload = {
  validateur?: string;
};

export type DashboardMaintenanceAlert = {
  id: number;
  iup?: string;
  designation?: string;
  categorie?: string;
  service?: string;
  dateEcheance?: string;
  typeAlerte?: string;
};

export type DashboardStockAlert = {
  stockId: number;
  codeArticle?: string;
  nomProduit?: string;
  quantite: number;
  seuilAlerte: number;
  unite?: string;
  magasin?: string;
};

export type DashboardActivity = {
  id: number;
  action?: string;
  entite?: string;
  entiteId?: number;
  acteur?: string;
  timestamp?: string;
  details?: string;
};

export type DashboardStatsResponse = {
  totalBiens: number;
  valeurTotale: number;
  valeurNette: number;
  biensAffectes: number;
  biensNonAffectes: number;
  biensEnMaintenance: number;
  biensSinistres: number;
  biensReformesThisYear: number;
  stocksEnAlerte: number;
  mouvementsThisMois: number;
  prochainesMaintenance: DashboardMaintenanceAlert[];
  alertesStock: DashboardStockAlert[];
  activiteRecente: DashboardActivity[];
  coutEntretienAnnuel: number;
  ecartInventaireComptabilite: number;
  tauxVetusteGlobal: number;
  repartitionCategories: { name: string; count: number; value: number }[];
  evolutionMensuelle: { label: string; value: number }[];
};

export type PagedResponse<T> = {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
};

export type AuditLogDto = {
  id: number;
  action?: string;
  entite?: string;
  entiteId?: number;
  username?: string;
  utilisateurLogin?: string;
  utilisateurNom?: string;
  ipAdresse?: string;
  dateAction?: string;
  detail?: string;
  details?: string;
  ancienneValeur?: string;
  nouvelleValeur?: string;
};

export type DashboardEvolutionPoint = {
  label: string;
  value: number;
};

export type DashboardCategoryDistribution = {
  name: string;
  count: number;
  value: number;
};

// ====== SINISTRES — /api/sinistres ======
export const getSinistres = () => api.get('/sinistres').then(r => r.data);
export const createSinistre = (data: ApiRecord) => api.post('/sinistres', data).then(r => r.data);
export const updateSinistre = (id: number, data: ApiRecord) => api.put(`/sinistres/${id}`, data).then(r => r.data);
export const deleteSinistre = (id: number) => api.delete(`/sinistres/${id}`);

// ====== ENTRETIENS — /api/entretiens ======
export const getEntretiens = () => api.get('/entretiens').then(r => r.data);
export const createEntretien = (data: ApiRecord) => api.post('/entretiens', data).then(r => r.data);
export const cloturerEntretien = (id: number) => api.post(`/entretiens/${id}/cloture`).then(r => r.data);
export const deleteEntretien = (id: number) => api.delete(`/entretiens/${id}`);

// ====== UTILISATEURS — /utilisateurs ======
export const getUsers = () => api.get('/utilisateurs').then(r => r.data);
export const getUserByMatricule = (matricule: string) => api.get('/utilisateurs', { params: { matricule } }).then(r => r.data as UserLookupDto);
export const createUser = (data: ApiRecord) => api.post('/utilisateurs/register', data).then(r => r.data);
export const deleteUser = (id: number) => api.delete(`/utilisateurs/${id}`);

// ====== INVENTAIRE PROFESSIONNEL (CAMPAGNES & RECENSEMENT) ======
export const getInventaires = () => api.get('/inventaires/campagnes').then(r => r.data);
export const createInventaire = (data: ApiRecord) => api.post('/inventaires/campagnes', data).then(r => r.data);
export const deleteInventaire = (id: number) => api.delete(`/inventaires/campagnes/${id}`);

export const getInventaireFiches = (campagneId: number) => api.get(`/inventaires/fiches?campagneId=${campagneId}`).then(r => r.data);
export const createInventaireFiche = (data: ApiRecord) => api.post('/inventaires/fiches', data).then(r => r.data);
export const updateInventaireFiche = (id: number, data: ApiRecord) => api.put(`/inventaires/fiches/${id}`, data).then(r => r.data);
export const validerFicheAgent = (id: number, statut: string) => api.post(`/inventaires/fiches/${id}/validation-agent?statut=${statut}`).then(r => r.data);
export const validerFicheSuperviseur = (id: number, statut: string) => api.post(`/inventaires/fiches/${id}/validation-superviseur?statut=${statut}`).then(r => r.data);

export const getInventaireEcarts = (campagneId: number) => api.get(`/inventaires/ecarts?campagneId=${campagneId}`).then(r => r.data);
export const updateInventaireEcart = (id: number, data: ApiRecord) => api.put(`/inventaires/ecarts/${id}`, data).then(r => r.data);
export const validerEcart = (id: number, statut: string) => api.post(`/inventaires/ecarts/${id}/validation?statut=${statut}`).then(r => r.data);
export const validerZoneInventaire = (campagneId: number) => api.post(`/inventaires/campagnes/${campagneId}/valider-zone`).then(r => r.data);
export const certifierInventaire = (campagneId: number) => api.post(`/inventaires/campagnes/${campagneId}/certifier`).then(r => r.data);

export const getInventaireStats = (campagneId: number) => api.get(`/inventaires/campagnes/${campagneId}/stats`).then(r => r.data);
export const lancerRapprochementInventaire = (campagneId: number) => api.post(`/inventaires/campagnes/${campagneId}/rapprochement`).then(r => r.data);

export const scanTerrainInventaire = (campagneId: number, code: string) =>
  api.get('/inventaires/terrain/scan', { params: { campagneId, code } }).then(r => r.data);

export const recenserTerrainInventaire = (data: ApiRecord) =>
  api.post('/inventaires/terrain/recensement', data).then(r => r.data);

// ====== AFFECTATIONS — /api/affectations ======
export const getAffectations = () => api.get('/affectations').then(r => r.data);
export const createAffectation = (data: AffectationPayload) => api.post('/affectations', data).then(r => r.data);
export const updateAffectation = (id: number, data: AffectationPayload) => api.put(`/affectations/${id}`, data).then(r => r.data);
export const deleteAffectation = (id: number) => api.delete(`/affectations/${id}`);
export const validerAffectation = (id: number, validator: string) => api.post(`/affectations/${id}/valider?validator=${validator}`).then(r => r.data);
export const validerAffectationAvecDocument = (id: number, file: Blob | File, validator: string) => {
  const fd = new FormData();
  fd.append('file', file instanceof File ? file : new File([file], 'signed.pdf', { type: 'application/pdf' }));
  return api.post(`/affectations/${id}/validerAvecDocument?validator=${encodeURIComponent(validator)}`, fd, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then(r => r.data);
};
export const rejeterAffectation = (id: number, validator: string) => api.post(`/affectations/${id}/rejeter?validator=${validator}`).then(r => r.data);
export const getOrigineAffectation = (bienId: number) => api.get(`/affectations/origine/${bienId}`).then(r => r.data);
export const retournerAffectation = (id: number, data: RetourAffectationPayload) => api.put(`/affectations/${id}/retour`, data).then(r => r.data);

// ====== BIENS — /api/biens ======
export const getBiens = () => api.get('/biens').then(r => r.data);
export const getBienById = (id: number) => api.get(`/biens/${id}`).then(r => r.data);
export const createBien = (data: ApiRecord) => api.post('/biens', data).then(r => r.data);
export const updateBien = (id: number, data: ApiRecord) => api.put(`/biens/${id}`, data).then(r => r.data);
export const deleteBien = (id: number) => api.delete(`/biens/${id}`);

// ====== REFORMES — /api/reformes ======
export const getReformes = () => api.get('/reformes').then(r => r.data);
export const createReforme = (data: ApiRecord) => api.post('/reformes', data).then(r => r.data);
export const deleteReforme = (id: number) => api.delete(`/reformes/${id}`);
export const validerReforme = (id: number, data: ReformeValidationPayload = {}) => api.put(`/reformes/${id}/valider`, data).then(r => r.data);
export const annulerReforme = (id: number) => api.put(`/reformes/${id}/annuler`).then(r => r.data);
export const uploadReformeRapport = (id: number, file: Blob | File) => {
  const fd = new FormData();
  fd.append('file', file instanceof File ? file : new File([file], 'report.pdf', { type: 'application/pdf' }));
  return api.post(`/reformes/${id}/rapport`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
};

export const uploadSinistreRapport = (id: number, file: Blob | File) => {
  const fd = new FormData();
  fd.append('file', file instanceof File ? file : new File([file], 'report.pdf', { type: 'application/pdf' }));
  return api.post(`/sinistres/${id}/rapport`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }).then(r => r.data);
};

export const validerSinistre = (id: number, data: Record<string, any> = {}) => api.put(`/sinistres/${id}/valider`, data).then(r => r.data);

// ====== STOCKS / CONSOMMABLES — /api/consommables & /api/mouvement_stock ======
export const getConsommables = () => api.get('/consommables').then(r => r.data);
export const createConsommable = (data: ApiRecord) => api.post('/consommables', data).then(r => r.data);
export const getMouvementsStock = () => api.get('/mouvement_stock').then(r => r.data);
export const createMouvementStock = (data: ApiRecord) => api.post('/mouvement_stock/create', data).then(r => r.data);
export const getMouvementsByBien = (bienId: number) => api.get(`/mouvements/bien/${bienId}`).then(r => r.data);

// ====== STOCKS — /api/stocks ======
export const getStocks = () => api.get('/stocks').then(r => r.data);
export const getStock = (id: number) => api.get(`/stocks/${id}`).then(r => r.data);
export const createStock = (data: ApiRecord) => api.post('/stocks', data).then(r => r.data);
export const updateStock = (id: number, data: ApiRecord) => api.put(`/stocks/${id}`, data).then(r => r.data);
export const deleteStock = (id: number) => api.delete(`/stocks/${id}`).then(r => r.data);
export const validerMouvementStock = (id: number) => api.post(`/stocks/valider/${id}`).then(r => r.data);

// ====== MAGASINS — /api/magasins ======
export const getMagasins = () => api.get('/magasins').then(r => r.data);
export const createMagasin = (data: ApiRecord) => api.post('/magasins', data).then(r => r.data);

// ====== SERVICES — /api/services ======
export const getServices = () => api.get('/services').then(r => r.data);
export const createService = (data: ServicePayload) => api.post('/services', data).then(r => r.data);

// ====== AUDIT — /api/audit ======
export const getAuditLogs = () => api.get('/audit').then(r => r.data);
export const deleteAuditLog = (id: number) => api.delete(`/audit/${id}`);
export const getPagedAuditLogs = (params?: Record<string, string | number | undefined>) => api.get('/audit/logs', { params }).then(r => r.data as PagedResponse<AuditLogDto>);
export const exportAuditLogsExcel = (params?: Record<string, string | number | undefined>) => api.get('/audit/export/excel', { params, responseType: 'blob' }).then(r => r.data as Blob);
export const rollbackAuditAction = (id: number) => api.post(`/audit/rollback/${id}`).then(r => r.data);
export const hardDeleteAuditAction = (id: number) => api.delete(`/audit/hard-delete/${id}`).then(r => r.data);

// ====== DASHBOARD — /api/dashboard ======
export const getDashboardStats = () => api.get('/dashboard/stats').then(r => r.data as DashboardStatsResponse);
export const getDashboardEvolutionMensuelle = () => api.get('/dashboard/evolution-mensuelle').then(r => r.data as DashboardEvolutionPoint[]);
export const getDashboardRepartitionCategories = () => api.get('/dashboard/repartition-categories').then(r => r.data as DashboardCategoryDistribution[]);
export const getDashboardTopAlertes = () => api.get('/dashboard/top-alertes').then(r => r.data as DashboardMaintenanceAlert[]);

// ====== NOMENCLATURE — /api/v1/nomenclature ======
export const getNomenclatureComptes = (params?: any) => api.get('/v1/nomenclature/comptes', { params }).then(r => r.data);
export const getNomenclatureCategories = (params?: any) => api.get('/v1/nomenclature/categories', { params }).then(r => r.data);
export const getNomenclatureFamilles = (params?: any) => api.get('/v1/nomenclature/familles', { params }).then(r => r.data);
export const getNomenclatureArticles = (params?: any) => api.get('/v1/nomenclature/articles', { params }).then(r => r.data);
export const searchNomenclature = (q: string, params?: any) => api.get('/v1/nomenclature/search', { params: { q, ...params } }).then(r => r.data);

// ====== BACKUP / PRA ======
export const getBackups = () => api.get('/admin/backups').then(r => r.data);
export const createBackup = (type: string = "manual") => api.post(`/admin/backups/now?type=${type}`).then(r => r.data);

// ====== SYSTEM SETTINGS ======
export type SystemSettings = {
  IUP_PREFIX: string;
  REFERENCE_YEAR: string;
  AMORTISSEMENT_MODE: string;
  EXPORT_EXERCICE: string;
  EXPORT_INSTITUTION: string;
  EXPORT_POSTE: string;
};

export const getSystemSettings = () =>
  api.get('/admin/system-settings').then(r => r.data as SystemSettings);

export const updateSystemSettings = (settings: Partial<SystemSettings>) =>
  api.put('/admin/system-settings', settings).then(r => r.data as SystemSettings);

// ====== SPRINT 5 — COPILOT & PREDICTIVE ANALYTICS ======
export type CopilotItem = {
  label: string;
  value: string;
  badge: 'danger' | 'warning' | 'success' | 'info';
};

export type CopilotResponse = {
  answer: string;
  type: 'INFO' | 'ALERTE' | 'RECOMMANDATION' | 'RAPPORT';
  items: CopilotItem[];
  suggestion: string | null;
};

export const queryCopilot = (question: string) =>
  api.post('/copilot/query', { question }).then(r => r.data as CopilotResponse);

export type DepreciationPoint = {
  label: string;
  valeurNette: number;
  mois: number;
};

export const getDepreciationForecast = () =>
  api.get('/dashboard/depreciation-forecast').then(r => r.data as DepreciationPoint[]);

export type RiskHeatmapItem = {
  id: number;
  iup: string;
  designation: string;
  categorie: string;
  service: string;
  scoreRisque: number;
  niveau: 'BAS' | 'MOYEN' | 'ÉLEVÉ' | 'CRITIQUE';
  vetuste: number;
};

export const getRiskHeatmap = () =>
  api.get('/dashboard/risk-heatmap').then(r => r.data as RiskHeatmapItem[]);

export type SmartAlerte = {
  id: string;
  titre: string;
  message: string;
  niveau: 'BAS' | 'MOYEN' | 'ÉLEVÉ' | 'CRITIQUE';
  count: number;
  action: string;
};

export const getAlertesIntelligentes = () =>
  api.get('/dashboard/alertes-intelligentes').then(r => r.data as SmartAlerte[]);

export default api;
