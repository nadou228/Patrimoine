# PATRIS : Guide Complet de Gestion du Patrimoine National

Ce document constitue la documentation de référence pour l'application PATRIS, couvrant les aspects fonctionnels, techniques et sécuritaires.

---

## 🏗️ Architecture du Projet

PATRIS est une plateforme ERP moderne structurée en deux pôles principaux :

1.  **Backend (API Rest)** : Développé en **Java 17** avec **Spring Boot**. Il centralise la logique métier (calcul PMP, règlements comptables, sécurité JWT).
2.  **Frontend (SPA)** : Développé en **React 18** avec **Vite** et **TypeScript**. L'interface utilise un design "Indigo Premium" avec un focus sur l'ergonomie (Cartes centrées, Glassmorphism).
3.  **Base de Données** : **PostgreSQL** assure la persistance et l'intégrité des données patrimoniales.

---

## 🔒 Sécurité, Rôles et Permissions (RBAC)

L'accès aux fonctionnalités est strictement contrôlé par un système de **Contrôle d'Accès Basé sur les Rôles (RBAC)**.

### Les Rôles Principaux
- **ADMIN** : Accès total au système, gestion des utilisateurs et des configurations critiques.
- **RESPONSABLE_PATRIMOINE** : Supervise le cycle de vie des biens, valide les réformes et les inventaires.
- **GESTIONNAIRE_TECHNIQUE** : Enregistre les nouveaux actifs, gère les flux de stocks et la maintenance.
- **AGENT_INVENTAIRE** : Effectue les contrôles de terrain, crée des actifs et exécute les campagnes d'audit.
- **MAGASINIER** : Gère uniquement les entrées/sorties de consommables et les niveaux de stock.
- **AUDITEUR / ELU** : Accès en lecture seule aux registres et au tableau de bord pour le contrôle législatif.

> [!TIP]
> Si un bouton (ex: "Valider") est grisé ou absent, c'est que votre rôle actuel ne possède pas la permission nécessaire pour déclencher cette action spécifique.

---

## 📦 Modules et Fonctionnalités Détaillées

### 1. Gestion des Biens (Le Registre Central)
C'est le cœur de l'application. Il permet de recenser tout le patrimoine (Immobilier, Véhicules, Équipements).

- **Nouveau Recensement** : Déclenche un sélecteur de catégorie.
    - **Formulaire Dynamique** : S'adapte selon la catégorie (ex: affiche les champs "N° de Châssis" pour les véhicules, ou "Titre Foncier" pour l'immobilier).
- **Validation** : Un bien créé reste en statut "En attente" jusqu'à sa validation par un responsable, garantissant l'intégrité comptable.
- **Exports** : Boutons permettant de générer le **Livre Journal**, le **Grand Livre** ou le **Registre du Patrimoine** en format Excel ou PDF.

### 2. Gestion des Stocks (Logistique & Consommables)
Gère les biens qui transitent par les magasins (fournitures, carburant).

- **Valorisation PMP (Prix Moyen Pondéré)** : Le système recalcule automatiquement la valeur unitaire moyenne à chaque réception de marchandise.
- **Workflow de Validation** :
    - **Entrée** : Déclenchée par un Bon de Réception. Elle n'augmente le stock réel qu'après validation.
    - **Sortie** : Déclenchée par une demande de service. Elle nécessite une validation du magasinier pour confirmer la distribution physique.
- **Alertes de Seuil** : Notifications automatiques quand un article descend en dessous du stock de sécurité défini.

### 3. Inventaire Physique Certifié
Permet de s'assurer que ce qui est écrit "dans les livres" existe réellement "sur le terrain".

- **Campagne d'Audit** : Déclenche la génération automatique de fiches de scan pour un site ou une catégorie donnée.
- **Rapprochement** : Après le passage des agents sur le terrain, le système compare les données réelles et théoriques et affiche les **Écarts** (Biens manquants, biens déplacés).

### 4. Affectations & Mutations
Gère le mouvement des biens entre les différents services ou personnels.

- **Mutation** : Déclenche le transfert de responsabilité. Un bouton permet de générer le **Bordereau de Mutation** (document officiel à signer).

### 5. Sinistres, Maintenance & Réforme
Gère les incidents et la fin de vie des biens.

- **Sinistres** : Déclaration d'accidents ou de vols pour suivi assurance.
- **Réforme** : Procédure de sortie définitive du patrimoine (Don, Vente, Rebut). Calcule la valeur résiduelle au moment de la sortie.

---

## 🕹️ Guide des Boutons et Actions

| Icône / Bouton | Action Déclenchée | Impact Système |
| :--- | :--- | :--- |
| **+ Nouveau [X]** | Ouvre une carte de saisie centrée. | Initialise un nouvel objet en base (souvent en brouillon). |
| **✅ Valider** | Confirme une saisie ou un mouvement. | Met à jour les quantités réelles ou les statuts officiels. |
| **📄 Exporter (XLS)** | Génère un fichier Excel formaté. | Téléchargement local d'un rapport conforme aux normes. |
| **✏️ Modifier** | Ouvre le formulaire de modification. | Met à jour les données existantes. |
| **🗑️ Supprimer** | Supprime l'objet (Demande confirmation). | Retrait définitif (nécessite rôle ADMIN ou RESPONSABLE). |
| **🔄 Synchroniser** | Recharge les données depuis le serveur. | Actualise l'interface sans recharger la page entière. |

---

## ⚙️ Guide Technique & Configuration

### Prérequis Système
- **JDK 17** (minimum) installé sur le serveur.
- **Node.js 18+** et **NPM** pour le frontend.
- **PostgreSQL 14+** pour la base de données.

### Configuration Backend (`src/main/resources/application.properties`)
1. **Base de données** :
   ```properties
   spring.datasource.url=jdbc:postgresql://localhost:5432/patris_togo
   spring.datasource.username=[VOTRE_USER]
   spring.datasource.password=[VOTRE_MOT_DE_PASSE]
   ```
2. **Sécurité JWT** : Modifier `jwt.secret` par une chaîne longue et aléatoire en production.
3. **IUP Prefix** : Le paramètre `iup.prefix` définit le début des codes d'inventaire générés (ex: `CT-LME`).

### Installation et Lancement (Développement)
1. **Démarrer la base PostgreSQL**.
2. **Lancer le Backend** :
   ```bash
   mvn spring-boot:run
   ```
   (Le serveur écoute sur le port **8082**).
3. **Lancer le Frontend** :
   ```bash
   cd frontend
   npm install
   npm run dev
   ```
   (Accessible via `http://localhost:5173`).

---

## 📘 Dictionnaire des Termes Métier
- **VNC (Valeur Nette Comptable)** : Valeur d'achat - amortissements cumulés.
- **PMP** : Prix Moyen Pondéré calculé à chaque entrée en stock.
- **IUP** : Identifiant Unique du Patrimoine (Code inventaire).
- **Mutation** : Changement de détenteur ou de lieu d'un actif.
- **Réforme** : Retrait officiel d'un bien des registres de la collectivité.

---
*Documentation générée par Antigravity pour PATRIS - © 2026*
