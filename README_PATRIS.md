# Guide d'Installation et de Connexion - Plateforme PATRIS

Ce document fournit les instructions nécessaires pour installer, configurer et se connecter à la plateforme de gestion de patrimoine **PATRIS**.

## 1. Prérequis Système
Pour faire fonctionner l'application, assurez-vous d'avoir installé :
*   **Java JDK 21** ou supérieur.
*   **Node.js** (v18+) et **npm**.
*   **Maven** (pour le backend).
*   **PostgreSQL** (pour la base de données).

---

## 2. Configuration de la Base de Données
L'application utilise une base de données PostgreSQL nommée `patris_togo`.

### Paramètres par défaut :
*   **URL** : `jdbc:postgresql://localhost:5432/patris_togo`
*   **Utilisateur** : `adm_patrimoine`
*   **Mot de passe** : `patrimoine@patris0609`

> **Note** : Assurez-vous que la base de données est créée avant de lancer le backend.

---

## 3. Lancement du Projet

### A. Backend (Spring Boot)
1.  Ouvrez un terminal à la racine du projet.
2.  Exécutez la commande suivante pour lancer le serveur :
    ```bash
    mvn spring-boot:run
    ```
3.  Le backend sera accessible sur : `http://localhost:8082`

### B. Frontend (React + Vite)
1.  Ouvrez un terminal dans le dossier `frontend`.
2.  Installez les dépendances (si ce n'est pas déjà fait) :
    ```bash
    npm install
    ```
3.  Lancez l'interface utilisateur :
    ```bash
    npm run dev
    ```
4.  L'application sera accessible sur : `http://localhost:5173`

---

## 4. Informations de Connexion (Accès par défaut)

Une fois sur la page de connexion (`http://localhost:5173`), utilisez les identifiants suivants selon le niveau d'accès souhaité :

### 🚀 Accès SUPERADMIN (Contrôle Total)
Ce compte possède tous les droits sur le système, y compris la gestion globale et les configurations sensibles.
*   **Nom d'utilisateur** : `brahim`
*   **Mot de passe** : `12345678`

### 🛠 Accès ADMIN (Administrateur)
Ce compte est destiné à la gestion administrative quotidienne de la plateforme.
*   **Nom d'utilisateur** : `akim`
*   **Mot de passe** : `00000000`

---

## 5. Fonctionnalités Principales
*   **Tableau de Bord** : Vue d'ensemble en temps réel des actifs.
*   **Gestion des Biens** : Inventaire complet (Immobilier, Mobilier, Matériel Roulant).
*   **Affectations** : Suivi des attributions de biens aux services ou agents.
*   **Maintenance & Entretiens** : Planification et suivi des interventions techniques.
*   **Rapports & Exports** : Génération de documents officiels (Excel/PDF) aux normes SYSCOHADA.

---

**IMPORTANT** : Pour des raisons de sécurité, il est fortement recommandé de changer les mots de passe par défaut dès la première connexion via le profil utilisateur.
