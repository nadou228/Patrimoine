# 📦 Seed Nomenclature SYSCOHADA
## Application de Gestion du Patrimoine Public

---

## 📊 Statistiques du fichier ANNEXE_NOMACT

| Partie | Type | Comptes | Articles |
|--------|------|---------|---------|
| **A** | Immobilisations (2xx) | 201, 202, 211–215, 219, 221–227, 231–237, 239, 241–247, 249 | ~780 |
| **B** | Consommables/Stock (6xx) | 601, 605, 606, 607, 609, 614 | ~500 |
| **TOTAL** | | **~25 groupes** | **~1 280 entrées** |

---

## 🗂 Structure des fichiers

```
patrimoine-seed/
├── src/
│   ├── data/
│   │   ├── partie_a_immobilisations.ts   ← Codes 2xx (biens durables)
│   │   ├── partie_b_stock.ts             ← Codes 6xx (consommables)
│   │   └── index.ts                      ← Exports unifiés + helpers
│   ├── routes/
│   │   └── nomenclature.ts               ← API REST Express complète
│   ├── components/
│   │   └── NomenclatureSelector.tsx      ← Dropdown cascade 4 niveaux (React)
│   └── generate-seed.ts                  ← Générateur SQL + JSON
├── prisma/
│   ├── schema.prisma                     ← Schéma DB avec NomenclatureCompte
│   └── seed.ts                           ← Seed Prisma officiel
├── dist/                                 ← Générés par npm run generate
│   ├── nomenclature.sql
│   └── nomenclature.json
└── package.json
```

---

## 🚀 Utilisation

### Option 1 — Via Prisma (recommandée)
```bash
# 1. Installer les dépendances
npm install

# 2. Configurer la base de données
echo 'DATABASE_URL="postgresql://user:pass@localhost:5432/patrimoine_db"' > .env

# 3. Appliquer les migrations
npx prisma migrate dev --name init

# 4. Lancer le seed
npx prisma db seed
```

### Option 2 — Via SQL brut
```bash
# Générer les fichiers SQL + JSON
npm run generate

# Injecter dans PostgreSQL
psql -U postgres -d patrimoine_db -f dist/nomenclature.sql
```

### Option 3 — Via l'API (import bulk)
```bash
# Après génération du JSON
curl -X POST http://localhost:3000/api/v1/nomenclature/import \
  -H "Authorization: Bearer {SUPER_ADMIN_TOKEN}" \
  -H "Content-Type: application/json" \
  -d @dist/nomenclature.json
```

---

## 🔗 Intégration dans le formulaire d'ajout de bien

```tsx
import NomenclatureSelector from "./components/NomenclatureSelector";

function AjouterBienForm() {
  const [articleSelectionne, setArticleSelectionne] = useState(null);

  return (
    <div>
      {/* Étape 1 — Classification SYSCOHADA */}
      <NomenclatureSelector
        partie="A"              // "A" = Immobilisations | "B" = Stock | undefined = tout
        onSelect={(article) => {
          setArticleSelectionne(article);
          // article contient : code, intitule, compte_principal, 
          //                    libelle_compte, categorie, famille,
          //                    type_bien, unite_defaut, partie
        }}
      />
      
      {/* Suite du formulaire après sélection */}
      {articleSelectionne && (
        <div>
          <p>Code sélectionné : {articleSelectionne.code}</p>
          <p>Désignation (pré-remplie, modifiable) : {articleSelectionne.intitule}</p>
          {/* ... autres champs du wizard */}
        </div>
      )}
    </div>
  );
}
```

---

## 📡 Endpoints API disponibles

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/v1/nomenclature/comptes?partie=A` | Comptes principaux (niveau 1) |
| GET | `/api/v1/nomenclature/categories?compte=241` | Catégories (niveau 2) |
| GET | `/api/v1/nomenclature/familles?categorie=...` | Familles (niveau 3) |
| GET | `/api/v1/nomenclature/articles?famille=...` | Articles (niveau 4) |
| GET | `/api/v1/nomenclature/search?q=bureau` | Recherche full-text |
| GET | `/api/v1/nomenclature/:code` | Détail d'un code |
| POST | `/api/v1/nomenclature` | Créer un code (ADMIN) |
| POST | `/api/v1/nomenclature/import` | Import bulk (SUPER_ADMIN) |
| PUT | `/api/v1/nomenclature/:code` | Modifier (ADMIN) |
| DELETE | `/api/v1/nomenclature/:code` | Archiver (ADMIN) |

---

## 🔑 Règles métier fondamentales

1. **Partie A (codes 2xx)** → Module IMMOBILISATIONS uniquement
   - Chaque bien reçoit un identifiant unique (IMM-YYYY-CODE-XXXXX)
   - Génération QR Code automatique
   - Suivi individuel + amortissement

2. **Partie B (codes 6xx)** → Module STOCK uniquement
   - Suivi en quantité (pas d'ID individuel)
   - Toute sortie DOIT avoir un bénéficiaire identifié
   - Alertes de seuil configurable

3. **L'administrateur** peut ajouter/modifier/archiver des codes via le module Système
   - Impossible d'archiver un code utilisé par des biens ou articles de stock
   - Les codes archivés n'apparaissent plus dans les dropdowns

---

## 🏗 Modèle DB — Table `nomenclature_comptes`

```sql
CREATE TABLE nomenclature_comptes (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code             VARCHAR(10) UNIQUE NOT NULL,  -- "241.011"
  intitule         TEXT NOT NULL,                -- "Bureau"
  partie           CHAR(1) NOT NULL,             -- "A" | "B"
  compte_principal VARCHAR(3) NOT NULL,           -- "241"
  libelle_compte   TEXT NOT NULL,
  categorie        VARCHAR(150) NOT NULL,
  famille          VARCHAR(150) NOT NULL,
  type_bien        VARCHAR(20) NOT NULL,          -- immobilisation | consommable | entretien
  unite_defaut     VARCHAR(30),                  -- NULL pour Partie A
  actif            BOOLEAN DEFAULT true,
  created_at       TIMESTAMPTZ DEFAULT NOW(),
  updated_at       TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_nc_partie          ON nomenclature_comptes(partie);
CREATE INDEX idx_nc_compte          ON nomenclature_comptes(compte_principal);
CREATE INDEX idx_nc_type            ON nomenclature_comptes(type_bien);
CREATE INDEX idx_nc_actif           ON nomenclature_comptes(actif);
CREATE INDEX idx_nc_search          ON nomenclature_comptes
  USING gin(to_tsvector('french', intitule || ' ' || libelle_compte));
```
