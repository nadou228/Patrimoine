-- Validation globale : marque toutes les fiches EN_ATTENTE (anomalie null ou false) comme VALIDE
UPDATE inventaire_fiche
SET validation_superviseur = 'VALIDE',
    superviseur_username = 'admin'
WHERE validation_superviseur = 'EN_ATTENTE'
  AND (anomalie IS NULL OR anomalie = false);

-- Supprime la contrainte bloquante sur le statut des campagnes
ALTER TABLE inventaire_campagne DROP CONSTRAINT IF EXISTS inventaire_campagne_statut_check;
