import { api } from './api';

export interface Bien {
  id: number | null;
  codeBien: string;
  iup: string;
  designation: string;
  categorie: string;
  categoriePrincipale?: string;
  codeFamille?: string;
  familleCatalogue?: string;
  codeSousCategorie?: string;
  sousCategorie?: string;
  sectionCatalogue?: string;
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

export const getBiens = async (): Promise<Bien[]> => {
  const response = await api.get('/biens');
  return response.data;
};

export const getBienById = async (id: number): Promise<Bien> => {
  const response = await api.get(`/biens/${id}`);
  return response.data;
};

export const createBien = async (bien: any) => {
  const response = await api.post('/biens', bien);
  return response.data;
};

export const updateBien = async (id: number, bien: any) => {
  const response = await api.put(`/biens/${id}`, bien);
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

export const validateBien = async (id: number, statut: string) => {
  const response = await api.put(`/biens/${id}/validate?statut=${statut}`);
  return response.data;
};

export const getBienCatalogue = async (): Promise<BienCatalogueItem[]> => {
  const response = await api.get('/biens/catalogue');
  return response.data;
};
