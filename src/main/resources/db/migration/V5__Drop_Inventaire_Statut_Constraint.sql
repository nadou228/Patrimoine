-- Fix pour permettre le statut CERTIFIE dans les campagnes d'inventaire
ALTER TABLE inventaire_campagne DROP CONSTRAINT IF EXISTS inventaire_campagne_statut_check;
