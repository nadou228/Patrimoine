import axios from 'axios';
import { getCurrentUser } from './auth';

// Base axios instance with auth token injection
const api = axios.create({
  baseURL: 'http://localhost:8082/api',
});

api.interceptors.request.use((config) => {
  const user = getCurrentUser();
  if (user?.token) {
    config.headers.Authorization = `Bearer ${user.token}`;
  }
  return config;
});

export { api };

// ====== SINISTRES — /api/sinistres ======
export const getSinistres = () => api.get('/sinistres').then(r => r.data);
export const createSinistre = (data: any) => api.post('/sinistres', data).then(r => r.data);
export const deleteSinistre = (id: number) => api.delete(`/sinistres/${id}`);

// ====== ENTRETIENS — /api/entretiens ======
export const getEntretiens = () => api.get('/entretiens').then(r => r.data);
export const createEntretien = (data: any) => api.post('/entretiens', data).then(r => r.data);
export const deleteEntretien = (id: number) => api.delete(`/entretiens/${id}`);

// ====== UTILISATEURS — /utilisateurs ======
export const getUsers = () => api.get('/utilisateurs').then(r => r.data);
export const createUser = (data: any) => api.post('/utilisateurs/register', data).then(r => r.data);
export const deleteUser = (id: number) => api.delete(`/utilisateurs/${id}`);

// ====== INVENTAIRE PROFESSIONNEL (CAMPAGNES & RECENSEMENT) ======
export const getInventaires = () => api.get('/inventaires/campagnes').then(r => r.data);
export const createInventaire = (data: any) => api.post('/inventaires/campagnes', data).then(r => r.data);
export const deleteInventaire = (id: number) => api.delete(`/inventaires/campagnes/${id}`);

export const getInventaireFiches = (campagneId: number) => api.get(`/inventaires/fiches?campagneId=${campagneId}`).then(r => r.data);
export const updateInventaireFiche = (id: number, data: any) => api.put(`/inventaires/fiches/${id}`, data).then(r => r.data);
export const validerFicheAgent = (id: number, statut: string) => api.post(`/inventaires/fiches/${id}/validation-agent?statut=${statut}`).then(r => r.data);
export const validerFicheSuperviseur = (id: number, statut: string) => api.post(`/inventaires/fiches/${id}/validation-superviseur?statut=${statut}`).then(r => r.data);

export const getInventaireEcarts = (campagneId: number) => api.get(`/inventaires/ecarts?campagneId=${campagneId}`).then(r => r.data);
export const updateInventaireEcart = (id: number, data: any) => api.put(`/inventaires/ecarts/${id}`, data).then(r => r.data);
export const validerEcart = (id: number, statut: string) => api.post(`/inventaires/ecarts/${id}/validation?statut=${statut}`).then(r => r.data);
export const validerZoneInventaire = (campagneId: number) => api.post(`/inventaires/campagnes/${campagneId}/valider-zone`).then(r => r.data);
export const certifierInventaire = (campagneId: number) => api.post(`/inventaires/campagnes/${campagneId}/certifier`).then(r => r.data);

// ====== AFFECTATIONS — /api/affectations ======
export const getAffectations = () => api.get('/affectations').then(r => r.data);
export const createAffectation = (data: any) => api.post('/affectations', data).then(r => r.data);
export const updateAffectation = (id: number, data: any) => api.put(`/affectations/${id}`, data).then(r => r.data);
export const deleteAffectation = (id: number) => api.delete(`/affectations/${id}`);
export const validerAffectation = (id: number, validator: string) => api.post(`/affectations/${id}/valider?validator=${validator}`).then(r => r.data);
export const rejeterAffectation = (id: number, validator: string) => api.post(`/affectations/${id}/rejeter?validator=${validator}`).then(r => r.data);
export const getOrigineAffectation = (bienId: number) => api.get(`/affectations/origine/${bienId}`).then(r => r.data);

// ====== BIENS — /api/biens ======
export const getBiens = () => api.get('/biens').then(r => r.data);
export const getBienById = (id: number) => api.get(`/biens/${id}`).then(r => r.data);
export const createBien = (data: any) => api.post('/biens', data).then(r => r.data);
export const updateBien = (id: number, data: any) => api.put(`/biens/${id}`, data).then(r => r.data);
export const deleteBien = (id: number) => api.delete(`/biens/${id}`);

// ====== REFORMES — /api/reformes ======
export const getReformes = () => api.get('/reformes').then(r => r.data);
export const createReforme = (data: any) => api.post('/reformes', data).then(r => r.data);
export const deleteReforme = (id: number) => api.delete(`/reformes/${id}`);

// ====== STOCKS / CONSOMMABLES — /api/consommables & /api/mouvement_stock ======
export const getConsommables = () => api.get('/consommables').then(r => r.data);
export const createConsommable = (data: any) => api.post('/consommables', data).then(r => r.data);
export const getMouvementsStock = () => api.get('/mouvement_stock').then(r => r.data);
export const createMouvementStock = (data: any) => api.post('/mouvement_stock/create', data).then(r => r.data);
export const getMouvementsByBien = (bienId: number) => api.get(`/mouvements/bien/${bienId}`).then(r => r.data);

// ====== STOCKS — /api/stocks ======
export const getStocks = () => api.get('/stocks').then(r => r.data);
export const getStock = (id: number) => api.get(`/stocks/${id}`).then(r => r.data);
export const createStock = (data: any) => api.post('/stocks', data).then(r => r.data);
export const updateStock = (id: number, data: any) => api.put(`/stocks/${id}`, data).then(r => r.data);
export const deleteStock = (id: number) => api.delete(`/stocks/${id}`).then(r => r.data);
export const validerMouvementStock = (id: number) => api.post(`/stocks/valider/${id}`).then(r => r.data);

// ====== MAGASINS — /api/magasins ======
export const getMagasins = () => api.get('/magasins').then(r => r.data);
export const createMagasin = (data: any) => api.post('/magasins', data).then(r => r.data);

// ====== SERVICES — /api/services ======
export const getServices = () => api.get('/services').then(r => r.data);

// ====== AUDIT — /api/audit ======
export const getAuditLogs = () => api.get('/audit').then(r => r.data);
export const deleteAuditLog = (id: number) => api.delete(`/audit/${id}`);

export default api;

