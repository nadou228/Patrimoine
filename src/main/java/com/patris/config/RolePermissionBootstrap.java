package com.patris.config;

import com.patris.enums.Permission;
import com.patris.enums.role;

import java.util.EnumSet;
import java.util.Set;

/**
 * Jeux de permissions par rôle système (source unique pour le seed en base).
 * Inclut la Matrice de Validation Dynamique Haute Densité.
 */
public final class RolePermissionBootstrap {

    private RolePermissionBootstrap() {
    }

    public static Set<Permission> getPermissionsForRole(role userRole) {
        switch (userRole) {
            case SUPERADMIN:
            case ADMIN:
                return EnumSet.allOf(Permission.class);

            case AGENT_INVENTAIRE:
                return EnumSet.of(
                        Permission.READ_BIENS,
                        Permission.CREATE_BIENS,
                        Permission.READ_STOCKS,
                        Permission.CREATE_STOCKS,
                        Permission.READ_INVENTAIRES,
                        Permission.CREATE_INVENTAIRES,
                        Permission.UPDATE_INVENTAIRES,
                        Permission.VALIDATE_INVENTAIRES_AGENT,
                        Permission.VIEW_DASHBOARD
                );

            case GESTIONNAIRE_TECHNIQUE:
                return EnumSet.of(
                        Permission.READ_BIENS,
                        Permission.CREATE_BIENS,
                        Permission.UPDATE_BIENS,
                        Permission.READ_STOCKS,
                        Permission.CREATE_STOCKS,
                        Permission.UPDATE_STOCKS,
                        Permission.VALIDATE_STOCKS,
                        Permission.READ_INVENTAIRES,
                        Permission.CREATE_INVENTAIRES,
                        Permission.UPDATE_INVENTAIRES,
                        Permission.READ_AFFECTATIONS,
                        Permission.CREATE_AFFECTATIONS,
                        Permission.READ_ENTRETIENS,
                        Permission.CREATE_ENTRETIENS,
                        Permission.VIEW_DASHBOARD,
                        Permission.EXPORT_REPORTS
                );

            case RESPONSABLE_PATRIMOINE:
                return EnumSet.of(
                        Permission.READ_BIENS,
                        Permission.CREATE_BIENS,
                        Permission.UPDATE_BIENS,
                        Permission.DELETE_BIENS,
                        Permission.VALIDATE_BIENS,
                        Permission.READ_STOCKS,
                        Permission.READ_INVENTAIRES,
                        Permission.READ_AFFECTATIONS,
                        Permission.VALIDATE_AFFECTATIONS,
                        Permission.READ_REFORMES,
                        Permission.CREATE_REFORMES,
                        Permission.UPDATE_REFORMES,
                        Permission.DELETE_REFORMES,
                        Permission.VALIDATE_REFORMES,
                        Permission.VALIDATE_INVENTAIRES_SUPERVISEUR,
                        Permission.VALIDATE_INVENTAIRES_ECART,
                        Permission.READ_SINISTRES,
                        Permission.READ_ENTRETIENS,
                        Permission.READ_AUDIT,
                        Permission.CREATE_ENTRETIENS,
                        Permission.VIEW_DASHBOARD,
                        Permission.EXPORT_REPORTS
                );

            case RESPONSABLE_FINANCIER:
                return EnumSet.of(
                        Permission.READ_BIENS,
                        Permission.VALIDATE_BIENS,
                        Permission.READ_STOCKS,
                        Permission.READ_INVENTAIRES,
                        Permission.READ_REFORMES,
                        Permission.READ_SINISTRES,
                        Permission.READ_ENTRETIENS,
                        Permission.VIEW_DASHBOARD,
                        Permission.EXPORT_REPORTS,
                        Permission.READ_AUDIT
                );

            case AUDITEUR:
                return EnumSet.of(
                        Permission.READ_BIENS,
                        Permission.READ_STOCKS,
                        Permission.READ_INVENTAIRES,
                        Permission.READ_AFFECTATIONS,
                        Permission.READ_REFORMES,
                        Permission.READ_SINISTRES,
                        Permission.READ_ENTRETIENS,
                        Permission.READ_AUDIT,
                        Permission.VIEW_DASHBOARD,
                        Permission.EXPORT_REPORTS
                );

            case ELU:
                return EnumSet.of(
                        Permission.READ_BIENS,
                        Permission.VIEW_DASHBOARD,
                        Permission.EXPORT_REPORTS
                );

            case MAGASINIER:
                return EnumSet.of(
                        Permission.READ_BIENS,
                        Permission.READ_STOCKS,
                        Permission.CREATE_STOCKS,
                        Permission.UPDATE_STOCKS,
                        Permission.VALIDATE_STOCKS,
                        Permission.READ_INVENTAIRES,
                        Permission.VIEW_DASHBOARD
                );

            case RESPONSABLE_PARC_AUTOMOBILE:
                return EnumSet.of(
                        Permission.READ_BIENS,
                        Permission.CREATE_BIENS,
                        Permission.UPDATE_BIENS,
                        Permission.READ_STOCKS,
                        Permission.READ_AFFECTATIONS,
                        Permission.CREATE_AFFECTATIONS,
                        Permission.UPDATE_AFFECTATIONS,
                        Permission.READ_REFORMES,
                        Permission.CREATE_REFORMES,
                        Permission.READ_ENTRETIENS,
                        Permission.CREATE_ENTRETIENS,
                        Permission.VIEW_DASHBOARD
                );

            default:
                return EnumSet.noneOf(Permission.class);
        }
    }
}
