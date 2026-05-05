-- Migration V4 : Création de la table pour les documents attachés
CREATE TABLE IF NOT EXISTS bien_documents (
    bien_id BIGINT NOT NULL,
    document_url VARCHAR(1024),
    CONSTRAINT fk_bien_documents_bien FOREIGN KEY (bien_id) REFERENCES bien (id) ON DELETE CASCADE
);

-- Index pour accélérer les jointures
CREATE INDEX IF NOT EXISTS idx_bien_documents_bien_id ON bien_documents(bien_id);
