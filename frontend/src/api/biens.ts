import { api } from './api';

export interface Bien {
  id: number | null;
  codeBien: string;
  iup: string;
  designation: string;
  categorie: string;
  type?: "IMMOBILIER" | "MOBILIER" | "MATERIEL_ROULANT";
  categoriePrincipale?: string;
  codeFamille?: string;
  familleCatalogue?: string;
  codeSousCategorie?: string;
  sousCategorie?: string;
  sectionCatalogue?: string;
  codeCategorie?: string;
  profilFormulaire?: string;
  dateAcquisition: string;
  valeur: number;
  etat: string;
  localisation: string;
  observation: string;
  photoUrl?: string;
  coordonneeGps?: string;

  // Champs Spécifiques (Annexes)
  numInventaire?: string;
  tauxAmortissement?: number;
  dureeVie?: number;
  valeurComptable?: number;
  dureeAmortissement?: number;
  valeurNetteComptable?: number;
  amortissementCumule?: number;
  validerPar?: string;
  dateValidation?: string | null;
  statutValidation?: "EN_ATTENTE" | "VALIDE" | "REFUSE";
  archived?: boolean;

  // Immobilier
  titreFoncier?: string;
  superficie?: string;
  coordonneesGps?: string;
  modeAcquisition?: string;

  // Matériel Roulant
  immatriculation?: string;
  numChassis?: string;
  marque?: string;
  modele?: string;

  // Mobilier / Equipement
  numSerie?: string;
  fabricant?: string;

  dateMaintenance?: string;
  dateDernierEntretien?: string;
  dateProchaineMaintenance?: string;
  dateProchaineVisiteTechnique?: string;
  quantite?: number;
  service?: string;
  specificationsTechniques?: string;
  puissanceFiscale?: string;
  typeCarburant?: string;
  typeBoite?: string;
  chargeUtile?: string;
  statutOperationnel?: string;
  statutJuridique?: string;
  finGarantie?: string;
  permisOccuper?: boolean;
  documentsUrls?: string[];
  serviceAffectataire?: string;
  dateAffectation?: string;
}

export interface BienCatalogueItem {
  id: number;
  code: string;
  libelle: string;
  niveau: "FAMILLE" | "ARTICLE";
  codeParent?: string;
  codeFamille: string;
  libelleFamille: string;
  section: string;
  categoriePrincipale: string;
  categorieMetier: string;
  profilFormulaire: string;
  ordreAffichage: number;
}


const MOCK_BIENS: Bien[] = [
  { 
    id: 1, iup: 'CT-LME-2024-001', designation: 'Immeuble Siège', categorie: 'IMMOBILIER', 
    valeur: 50000000, etat: 'NEUF', localisation: 'Lomé', codeBien: 'B001', 
    dateAcquisition: '2020-01-01', observation: 'Siège social',
    titreFoncier: 'TF 12345/RT', superficie: '450 m²', coordonneesGps: '6.1319° N, 1.2228° E'
  },
  { 
    id: 2, iup: 'CT-LME-2024-002', designation: 'Toyota Hilux 4x4', categorie: 'MATERIEL_ROULANT', 
    valeur: 25000000, etat: 'BON', localisation: 'Garage Central', codeBien: 'V001', 
    dateAcquisition: '2022-05-15', observation: 'Véhicule de service',
    immatriculation: 'TG-8899-AZ', numChassis: 'HILUX77889900X', marque: 'Toyota', modele: 'Hilux'
  },
  { 
    id: 3, iup: 'CT-LME-2024-003', designation: 'Ordinateur Dell XPS', categorie: 'MOBILIER', 
    valeur: 1200000, etat: 'NEUF', localisation: 'Bureau DG', codeBien: 'E001', 
    dateAcquisition: '2024-02-10', observation: 'Équipement informatique',
    numSerie: 'DELL-XPS-998877', fabricant: 'Dell'
  },
];

export type BienPayload = Omit<Bien, "id"> & { id?: number | null };

export type GenerateIupPayload = {
  nomenclatureCode: string;
  annee: number;
};

export type GenerateIupResponse = {
  iup: string;
  prefixe?: string;
  categorie?: string;
  annee?: number;
  sequence?: string;
};

export type ValidateIupResponse = {
  unique: boolean;
};

export type ValidateImmatriculationResponse = {
  unique: boolean;
};

export type QrCodeResponse = {
  qrCodeBase64: string;
};

export type BienHistoriqueEntry = {
  date?: string;
  typeEvenement?: string;
  description?: string;
  utilisateur?: string;
  details?: string;
};

export const getBiens = async (archived = false): Promise<Bien[]> => {
  const response = await api.get('/biens', { params: { archived } });
  return response.data;
};

export const getBienById = async (id: number): Promise<Bien> => {
  const response = await api.get(`/biens/${id}`);
  return response.data;
};

export const searchBiens = async (query: string, archived = false): Promise<Bien[]> => {
  const response = await api.get('/biens', { params: { q: query, archived } });
  return response.data;
};

export const createBien = async (bien: BienPayload): Promise<Bien> => {
  const response = await api.post('/biens', bien);
  return response.data;
};

export const updateBien = async (id: number, bien: Partial<BienPayload>): Promise<Bien> => {
  const response = await api.put(`/biens/${id}`, bien);
  return response.data;
};

export const updateBienStatus = async (
  id: number,
  payload: { statutOperationnel: string; service?: string; quantite?: number }
): Promise<Bien> => {
  const response = await api.put(`/biens/${id}/statut`, payload);
  return response.data;
};

export const deleteBien = async (id: number) => {
  await api.delete(`/biens/${id}`);
};

export const uploadBienPhoto = async (id: number, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  const response = await api.post(`/biens/${id}/photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return response.data;
};

export const generateIup = async (payload: GenerateIupPayload): Promise<GenerateIupResponse> => {
  const response = await api.post('/biens/generate-iup', payload);
  return response.data;
};

export const validateIup = async (iup: string): Promise<ValidateIupResponse> => {
  const response = await api.get('/biens/validate-iup', { params: { iup } });
  return response.data;
};

export const validateImmatriculation = async (
  immatriculation: string,
  excludeId?: number | null
): Promise<ValidateImmatriculationResponse> => {
  const response = await api.get('/biens/validate-immatriculation', {
    params: { immatriculation, excludeId: excludeId ?? undefined },
  });
  return response.data;
};

export const getBienQrCode = async (iup: string): Promise<QrCodeResponse> => {
  const response = await api.get('/biens/qrcode', { params: { iup } });
  return response.data;
};

export const validateBien = async (id: number, statut: string) => {
  const response = await api.put(`/biens/${id}/validate?statut=${statut}`);
  return response.data;
};

export const getBienCatalogue = async (): Promise<BienCatalogueItem[]> => {
  const response = await api.get('/biens/catalogue');
  return response.data;
};

export const getBienHistorique = async (id: number): Promise<BienHistoriqueEntry[]> => {
  const response = await api.get(`/biens/${id}/historique`);
  return response.data;
};

export interface CategoriePatrimoineDto {
  id: number;
  code: string;
  libelle: string;
  niveau: string;
  codeParent?: string;
  icone?: string;
  couleur?: string;
  ordre: number;
  actif: boolean;
  enfants: CategoriePatrimoineDto[];
}

export const getCategoryTree = async (): Promise<CategoriePatrimoineDto[]> => {
  const response = await api.get('/categories/tree');
  return response.data;
};

export const getFlatCategories = async (): Promise<CategoriePatrimoineDto[]> => {
  const response = await api.get('/categories/flat');
  return response.data;
};
