-- ============================================================
-- V2 : Ajout des colonnes manquantes pour la refonte PATRIS
-- ============================================================

-- 1. Table ROLES : ajout de la colonne actif
ALTER TABLE roles ADD COLUMN IF NOT EXISTS actif BOOLEAN NOT NULL DEFAULT TRUE;

-- 2. Table BIEN : ajout des colonnes hiérarchie (remplacement de la relation categorie)
ALTER TABLE bien ADD COLUMN IF NOT EXISTS code_categorie VARCHAR(50) DEFAULT NULL;
ALTER TABLE bien ADD COLUMN IF NOT EXISTS code_famille VARCHAR(50) DEFAULT NULL;
ALTER TABLE bien ADD COLUMN IF NOT EXISTS code_sous_categorie VARCHAR(50) DEFAULT NULL;
ALTER TABLE bien ADD COLUMN IF NOT EXISTS code_article VARCHAR(50) DEFAULT NULL;

-- 3. Table UTILISATEUR : colonnes de gestion de compte
ALTER TABLE utilisateur ADD COLUMN IF NOT EXISTS archived BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE utilisateur ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE utilisateur ADD COLUMN IF NOT EXISTS statut VARCHAR(30) DEFAULT 'ACTIF';

-- 4. Table BENEFICIAIRE : ajout de la colonne actif et utilisateur_id
ALTER TABLE beneficiaire ADD COLUMN IF NOT EXISTS actif BOOLEAN DEFAULT TRUE;
ALTER TABLE beneficiaire ADD COLUMN IF NOT EXISTS utilisateur_id BIGINT DEFAULT NULL;

-- 5. Table MOUVEMENT_STOCK : colonne bien_cree_id (renommage de bien_id)
ALTER TABLE mouvement_stock ADD COLUMN IF NOT EXISTS bien_cree_id BIGINT DEFAULT NULL;

-- 6. Table AUDIT (package com.patris.audit)
CREATE TABLE IF NOT EXISTS audit (
    id BIGSERIAL PRIMARY KEY,
    action VARCHAR(255),
    entite VARCHAR(255),
    entite_id BIGINT,
    username VARCHAR(255),
    date_action TIMESTAMP,
    detail VARCHAR(2000)
);

-- 7. Table AUDIT_LOGS (package com.patris.model — maintenant supprimé, utiliser audit)
-- Aucune action nécessaire, la table audit ci-dessus est utilisée.
