package com.patris.enums;

public enum Permission {
    // BIENS
    READ_BIENS("Consulter les biens"),
    CREATE_BIENS("Créer/ajouter des biens"),
    UPDATE_BIENS("Modifier les biens"),
    DELETE_BIENS("Supprimer les biens"),
    VALIDATE_BIENS("Valider les biens (Workflow)"),

    // UTILISATEURS
    READ_USERS("Voir les utilisateurs"),
    CREATE_USERS("Créer des utilisateurs"),
    UPDATE_USERS("Modifier les utilisateurs"),
    DELETE_USERS("Supprimer les utilisateurs"),

    // STOCKS
    READ_STOCKS("Consulter les stocks"),
    CREATE_STOCKS("Créer des mouvements de stock"),
    UPDATE_STOCKS("Modifier les stocks"),
    DELETE_STOCKS("Supprimer les stocks"),

    // INVENTAIRES
    READ_INVENTAIRES("Consulter les inventaires"),
    CREATE_INVENTAIRES("Créer des inventaires"),
    UPDATE_INVENTAIRES("Modifier les inventaires"),
    DELETE_INVENTAIRES("Supprimer les inventaires"),

    // AFFECTATIONS
    READ_AFFECTATIONS("Consulter les affectations"),
    CREATE_AFFECTATIONS("Créer des affectations"),
    UPDATE_AFFECTATIONS("Modifier les affectations"),
    DELETE_AFFECTATIONS("Supprimer les affectations"),

    // REFORMES
    READ_REFORMES("Consulter les reformes"),
    CREATE_REFORMES("Créer des reformes"),
    UPDATE_REFORMES("Modifier les reformes"),
    DELETE_REFORMES("Supprimer les reformes"),

    // SINISTRES
    READ_SINISTRES("Consulter les sinistres"),
    CREATE_SINISTRES("Signaler un sinistre"),
    UPDATE_SINISTRES("Modifier les sinistres"),
    DELETE_SINISTRES("Supprimer les sinistres"),

    // ENTRETIENS
    READ_ENTRETIENS("Consulter les entretiens"),
    CREATE_ENTRETIENS("Planifier un entretien"),
    UPDATE_ENTRETIENS("Modifier les entretiens"),
    DELETE_ENTRETIENS("Supprimer les entretiens"),

    // AUDIT & RAPPORTS
    READ_AUDIT("Consulter l'audit"),
    EXPORT_REPORTS("Exporter les rapports"),
    VIEW_DASHBOARD("Accéder au tableau de bord"),

    // ── VALIDATIONS MÉTIER (Matrice Haute Densité) ──────────────────────
    VALIDATE_AFFECTATIONS("Valider les affectations de biens"),
    VALIDATE_REFORMES("Valider les réformes de biens"),
    VALIDATE_STOCKS("Valider les mouvements de stock"),
    VALIDATE_INVENTAIRES_AGENT("Valider les fiches inventaires (Agent)"),
    VALIDATE_INVENTAIRES_SUPERVISEUR("Valider les fiches inventaires (Superviseur)"),
    VALIDATE_INVENTAIRES_ECART("Valider les écarts d'inventaire"),

    // ADMIN
    ADMIN_SYSTEM("Accès administrateur système");

    public final String description;

    Permission(String description) {
        this.description = description;
    }
}
