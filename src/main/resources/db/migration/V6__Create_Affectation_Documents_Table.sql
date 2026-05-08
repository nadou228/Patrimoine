-- Migration V6 : Création de la table pour les documents attachés aux affectations
CREATE TABLE IF NOT EXISTS affectation_documents (
    affectation_id BIGINT NOT NULL,
    document_url VARCHAR(1024),
    CONSTRAINT fk_affectation_documents_aff FOREIGN KEY (affectation_id) REFERENCES affectation (id) ON DELETE CASCADE
);

-- Index pour accélérer les jointures
CREATE INDEX IF NOT EXISTS idx_aff_documents_id ON affectation_documents(affectation_id);
