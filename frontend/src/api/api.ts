import axios from 'axios';
import { getCurrentUser } from './auth';

export const API_BASE_URL = 'http://localhost:8082';

// Base axios instance with auth token injection
const api = axios.create({
  baseURL: `${API_BASE_URL}/api`,
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
export const updateInventaireFiche = (id: number, data: ApiRecord) => api.put(`/inventaires/fiches/${id}`, data).then(r => r.data);
export const validerFicheAgent = (id: number, statut: string) => api.post(`/inventaires/fiches/${id}/validation-agent?statut=${statut}`).then(r => r.data);
export const validerFicheSuperviseur = (id: number, statut: string) => api.post(`/inventaires/fiches/${id}/validation-superviseur?statut=${statut}`).then(r => r.data);

export const getInventaireEcarts = (campagneId: number) => api.get(`/inventaires/ecarts?campagneId=${campagneId}`).then(r => r.data);
export const updateInventaireEcart = (id: number, data: ApiRecord) => api.put(`/inventaires/ecarts/${id}`, data).then(r => r.data);
export const validerEcart = (id: number, statut: string) => api.post(`/inventaires/ecarts/${id}/validation?statut=${statut}`).then(r => r.data);
export const validerZoneInventaire = (campagneId: number) => api.post(`/inventaires/campagnes/${campagneId}/valider-zone`).then(r => r.data);
export const certifierInventaire = (campagneId: number) => api.post(`/inventaires/campagnes/${campagneId}/certifier`).then(r => r.data);

// ====== AFFECTATIONS — /api/affectations ======
export const getAffectations = () => api.get('/affectations').then(r => r.data);
export const createAffectation = (data: AffectationPayload) => api.post('/affectations', data).then(r => r.data);
export const updateAffectation = (id: number, data: AffectationPayload) => api.put(`/affectations/${id}`, data).then(r => r.data);
export const deleteAffectation = (id: number) => api.delete(`/affectations/${id}`);
export const validerAffectation = (id: number, validator: string) => api.post(`/affectations/${id}/valider?validator=${validator}`).then(r => r.data);
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

// ====== DASHBOARD — /api/dashboard ======
export const getDashboardStats = () => api.get('/dashboard/stats').then(r => r.data as DashboardStatsResponse);

// ====== NOMENCLATURE — /api/v1/nomenclature ======
export const getNomenclatureComptes = (params?: any) => api.get('/v1/nomenclature/comptes', { params }).then(r => r.data);
export const getNomenclatureCategories = (params?: any) => api.get('/v1/nomenclature/categories', { params }).then(r => r.data);
export const getNomenclatureFamilles = (params?: any) => api.get('/v1/nomenclature/familles', { params }).then(r => r.data);
export const getNomenclatureArticles = (params?: any) => api.get('/v1/nomenclature/articles', { params }).then(r => r.data);
export const searchNomenclature = (q: string, params?: any) => api.get('/v1/nomenclature/search', { params: { q, ...params } }).then(r => r.data);

export default api;
