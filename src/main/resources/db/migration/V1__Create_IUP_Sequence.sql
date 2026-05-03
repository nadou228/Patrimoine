-- Migration initiale pour le système PATRIS
-- Création de la séquence pour les IUP (Identifiant Unique de Patrimoine)
CREATE SEQUENCE IF NOT EXISTS iup_sequence START WITH 1 INCREMENT BY 1;
