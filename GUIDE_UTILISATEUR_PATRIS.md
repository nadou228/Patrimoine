# Guide d'Utilisation Détaillé - Plateforme PATRIS

Ce guide est conçu pour aider les utilisateurs à naviguer et à exploiter pleinement les fonctionnalités de la plateforme de gestion de patrimoine **PATRIS**.

---

## 1. Tableau de Bord (Dashboard)
**But** : Offrir une vision synthétique et stratégique de l'état du patrimoine en temps réel.

*   **Logique** : Agrégation automatique des données issues de tous les modules (Biens, Stocks, Entretiens).
*   **Fonctionnement** :
    *   **Indicateurs Clés (KPIs)** : Visualisez la valeur totale du patrimoine, le nombre de biens par catégorie, et les alertes de maintenance.
    *   **Graphiques** : Répartition par type (Immobilier, Mobilier, Matériel Roulant) et évolution des acquisitions.
    *   **Alertes** : Notification des entretiens en retard ou des stocks critiques.

---

## 2. Gestion des Biens (Inventaire des Actifs)
**But** : Centraliser l'identification, la localisation et la valorisation de chaque actif de l'organisation.

*   **Logique** : Chaque bien possède une identité unique (IUP - Identifiant Unique du Patrimoine) et suit un cycle de vie (Acquisition -> Affectation -> Maintenance -> Réforme).
*   **Fonctionnement** :
    *   **Création** : Enregistrez un bien en précisant sa catégorie (normes SYSCOHADA), sa valeur d'acquisition et sa durée de vie.
    *   **Documents joints** : Possibilité d'attacher des photos, factures ou certificats de garantie.
    *   **Code-barres / QR Code** : Génération automatique d'étiquettes pour faciliter l'identification physique lors des inventaires.

---

## 3. Affectations et Mouvements
**But** : Suivre la traçabilité géographique et la responsabilité des biens.

*   **Logique** : Un bien ne peut pas être "dans la nature". Il est soit en stock, soit affecté à un service, une direction ou un agent spécifique.
*   **Fonctionnement** :
    *   **Attribution** : Sélectionnez un bien et un bénéficiaire (Service/Agent). Le système génère une fiche de décharge.
    *   **Historique** : Consultez l'historique complet des déplacements d'un objet pour savoir qui l'a utilisé par le passé.
    *   **Retour** : Enregistrez la réintégration d'un bien en stock après utilisation.

---

## 4. Maintenance et Entretiens
**But** : Garantir la pérennité des actifs et minimiser les pannes.

*   **Logique** : Planification proactive basée sur des fréquences ou des dates spécifiques.
*   **Fonctionnement** :
    *   **Planification** : Définissez des rappels pour les vidanges (véhicules), les révisions (climatiseurs) ou les contrôles techniques.
    *   **Suivi des coûts** : Enregistrez les factures des prestataires externes pour calculer le coût total de possession (TCO) d'un bien.

---

## 5. Gestion des Inventaires Physiques
**But** : Réconcilier la réalité du terrain avec les données théoriques du système.

*   **Logique** : Campagne périodique (annuelle ou semestrielle) de comptage physique.
*   **Fonctionnement** :
    *   **Lancement de session** : Créez une session d'inventaire par site ou catégorie.
    *   **Certification** : L'agent vérifie la présence du bien via le QR Code.
    *   **Écarts** : Le système génère automatiquement un rapport des biens manquants ou trouvés à un mauvais emplacement.

---

## 6. Réformes et Déclassements
**But** : Sortir officiellement un bien du patrimoine (fin de vie, destruction, vente).

*   **Logique** : Processus de validation rigoureux pour assurer la transparence comptable.
*   **Fonctionnement** :
    *   **Demande de réforme** : Justifiez la sortie (vétusté, accident, obsolescence).
    *   **Commission** : Validation par les responsables financiers et administratifs.
    *   **Sortie comptable** : Une fois réformé, le bien ne figure plus dans les actifs actifs mais reste archivé pour l'audit.

---

## 7. Gestion des Sinistres
**But** : Documenter les incidents (vols, dégradations, accidents) pour le suivi assurance.

*   **Logique** : Lien direct entre l'incident, l'expert et l'éventuel remboursement.
*   **Fonctionnement** : Déclaration du sinistre -> Suivi de l'expertise -> Enregistrement de l'indemnisation ou de la réparation.

---

## 8. Rapports et Exports (Business Intelligence)
**But** : Extraire des données structurées pour la prise de décision et la conformité légale.

*   **Logique** : Exportations conformes aux formats institutionnels (UEMOA / SYSCOHADA).
*   **Fonctionnement** :
    *   **Livre Journal** : Liste chronologique des entrées/sorties.
    *   **Grand Livre du Patrimoine** : État détaillé des actifs valorisés.
    *   **Fiches d'Inventaire (FIA/FIB)** : Documents prêts à être signés lors des audits.

---

## 9. Administration et Sécurité
**But** : Contrôler qui fait quoi dans le système.

*   **Logique** : Système RBAC (Role-Based Access Control).
*   **Fonctionnement** :
    *   **SuperAdmin** : Configuration système et gestion des rôles.
    *   **Admin** : Gestion des utilisateurs et des référentiels (Nomenclature, Localisations).
    *   **Journal d'Audit** : Traçabilité de chaque action (qui a modifié quoi et quand).

---

**Note de fin** : La plateforme PATRIS a été conçue pour être intuitive. En cas de doute, référez-vous toujours aux indicateurs de couleur (Vert: OK, Jaune: Attention, Rouge: Critique).
