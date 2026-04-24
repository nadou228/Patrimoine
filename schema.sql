-- schema.sql
-- Généré à partir des modèles Java du projet Patris

-- 1. Tables de base (Sans clés étrangères)
CREATE TABLE IF NOT EXISTS region (
    id SERIAL PRIMARY KEY,
    nom_region VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255),
    username VARCHAR(255),
    role VARCHAR(255),
    derniere_connexion TIMESTAMP,
    statut VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS utilisateur (
    id SERIAL PRIMARY KEY,
    nom VARCHAR(255),
    prenom VARCHAR(255),
    fonction VARCHAR(255),
    username VARCHAR(255) UNIQUE,
    email VARCHAR(255) UNIQUE,
    telephone VARCHAR(255),
    password VARCHAR(255),
    role VARCHAR(50), -- Enum role
    two_factor_enabled BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS bien (
    id SERIAL PRIMARY KEY,
    code_bien VARCHAR(255),
    iup VARCHAR(255) UNIQUE,
    designation VARCHAR(255),
    categorie_principale VARCHAR(255),
    code_famille VARCHAR(255),
    famille_catalogue VARCHAR(500),
    code_sous_categorie VARCHAR(255),
    sous_categorie VARCHAR(500),
    section_catalogue VARCHAR(255),
    profil_formulaire VARCHAR(255),
    categorie VARCHAR(50), -- Enum categorie
    date_acquisition DATE,
    valeur DOUBLE PRECISION,
    etat VARCHAR(255),
    localisation VARCHAR(255),
    photo_url VARCHAR(255),
    observation TEXT,
    num_inventaire VARCHAR(255),
    titre_foncier VARCHAR(255),
    superficie VARCHAR(255),
    coordonnees_gps VARCHAR(255),
    mode_acquisition VARCHAR(255),
    immatriculation VARCHAR(255),
    num_chassis VARCHAR(255),
    marque VARCHAR(255),
    modele VARCHAR(255),
    num_serie VARCHAR(255),
    fabricant VARCHAR(255),
    duree_amortissement INTEGER,
    duree_vie INTEGER,
    taux_amortissement DOUBLE PRECISION,
    valeur_nette_comptable DOUBLE PRECISION,
    valeur_comptable DOUBLE PRECISION,
    amortissement_cumule DOUBLE PRECISION,
    valider_par VARCHAR(255),
    date_validation TIMESTAMP,
    statut_validation VARCHAR(50), -- Enum statutValidation
    statut_operationnel VARCHAR(50) DEFAULT 'ACTIF', -- Enum statutOperationnel
    puissance_fiscale VARCHAR(255),
    type_carburant VARCHAR(255),
    usage_immobilier VARCHAR(255),
    specifications_techniques TEXT,
    statut_juridique VARCHAR(255),
    charge_utile VARCHAR(255),
    type_boite VARCHAR(255),
    fin_garantie DATE,
    date_maintenance DATE,
    date_dernier_entretien DATE,
    date_prochaine_maintenance DATE,
    date_prochaine_visite_technique DATE,
    quantite INTEGER DEFAULT 1,
    permis_occuper BOOLEAN DEFAULT FALSE,
    archived BOOLEAN DEFAULT FALSE
);

CREATE TABLE IF NOT EXISTS bien_catalogue_item (
    id SERIAL PRIMARY KEY,
    code VARCHAR(255) UNIQUE NOT NULL,
    libelle VARCHAR(1200) NOT NULL,
    niveau VARCHAR(255),
    code_parent VARCHAR(255),
    code_famille VARCHAR(255),
    libelle_famille VARCHAR(600),
    section VARCHAR(255),
    categorie_principale VARCHAR(255),
    categorie_metier VARCHAR(255),
    profil_formulaire VARCHAR(255),
    ordre_affichage INTEGER,
    actif BOOLEAN DEFAULT TRUE
);

-- 2. Tables avec clés étrangères (Hiérarchie géographique)
CREATE TABLE IF NOT EXISTS prefectures (
    id SERIAL PRIMARY KEY,
    nom_prefecture VARCHAR(255),
    region_id BIGINT REFERENCES region(id)
);

CREATE TABLE IF NOT EXISTS commune (
    id SERIAL PRIMARY KEY,
    nom_commune VARCHAR(255),
    prefecture_id BIGINT REFERENCES prefectures(id)
);

CREATE TABLE IF NOT EXISTS services (
    id SERIAL PRIMARY KEY,
    nom_service VARCHAR(255),
    region_id BIGINT REFERENCES region(id)
);

-- 3. Tables de gestion des biens
CREATE TABLE IF NOT EXISTS affectation (
    id SERIAL PRIMARY KEY,
    beneficaire VARCHAR(255),
    fonction VARCHAR(255),
    date_affectation TIMESTAMP,
    date_fin TIMESTAMP,
    bien_id BIGINT REFERENCES bien(id),
    service_id BIGINT REFERENCES services(id),
    statut_validation VARCHAR(50) DEFAULT 'EN_ATTENTE',
    valide_par VARCHAR(255),
    date_validation TIMESTAMP,
    signature_url VARCHAR(255),
    ministere VARCHAR(255),
    poste_comptable VARCHAR(255),
    detenteur_a VARCHAR(255)
);

CREATE TABLE IF NOT EXISTS mouvement (
    id SERIAL PRIMARY KEY,
    type VARCHAR(50), -- Enum type_mouvement
    date_creation TIMESTAMP,
    service_source_id BIGINT REFERENCES services(id),
    service_destination_id BIGINT REFERENCES services(id),
    observation TEXT,
    statut_validation VARCHAR(50), -- Enum statutValidation
    valide_par VARCHAR(255),
    date_validation TIMESTAMP,
    bien_id BIGINT REFERENCES bien(id)
);

CREATE TABLE IF NOT EXISTS document (
    id SERIAL PRIMARY KEY,
    nom_fichier VARCHAR(255),
    type_document VARCHAR(50), -- Enum typeDocument
    date_upload TIMESTAMP,
    chemin_fichier VARCHAR(255),
    bien_id BIGINT REFERENCES bien(id)
);

CREATE TABLE IF NOT EXISTS entretien (
    id SERIAL PRIMARY KEY,
    date_prevue DATE,
    date_realisee DATE,
    cout DOUBLE PRECISION,
    prestataire VARCHAR(255),
    observation TEXT,
    bien_id BIGINT REFERENCES bien(id)
);

CREATE TABLE IF NOT EXISTS sinistre (
    id SERIAL PRIMARY KEY,
    date_sinistre DATE,
    type VARCHAR(255),
    montant_estime DOUBLE PRECISION,
    description TEXT,
    statut VARCHAR(255),
    bien_id BIGINT REFERENCES bien(id)
);

-- 4. Tables de gestion des stocks
CREATE TABLE IF NOT EXISTS consommable (
    id SERIAL PRIMARY KEY,
    nom_produit VARCHAR(255),
    seuil_alerte INTEGER,
    unite VARCHAR(255),
    date_entree DATE,
    date_sortie DATE,
    service_affiche VARCHAR(255),
    commune_id BIGINT REFERENCES commune(id)
);

CREATE TABLE IF NOT EXISTS stock (
    id SERIAL PRIMARY KEY,
    quantite INTEGER,
    seuil_alerte INTEGER,
    unite VARCHAR(255),
    consommable_id BIGINT REFERENCES consommable(id)
);

CREATE TABLE IF NOT EXISTS mouvement_stock (
    id SERIAL PRIMARY KEY,
    type_mouvement VARCHAR(50), -- Enum type_mouvement
    quantite INTEGER,
    date_mouvement TIMESTAMP,
    destination VARCHAR(255),
    stock_id BIGINT REFERENCES stock(id)
);

CREATE TABLE IF NOT EXISTS reforme (
    id SERIAL PRIMARY KEY,
    bien_id BIGINT REFERENCES bien(id),
    type_reforme VARCHAR(255), -- REBUT, VENTE, DON, CESSION
    motif TEXT,
    rapport_technique_url VARCHAR(255),
    valeur_residuelle DOUBLE PRECISION,
    decision VARCHAR(255),
    date_reforme DATE,
    statut VARCHAR(50) -- EN_COURS, VALIDE, REJETE
);
