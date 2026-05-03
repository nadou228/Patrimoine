package com.patris.dto.admin;

import java.util.List;
import java.util.Set;

/**
 * Détail des permissions (héritées du rôle, surcharges, effectif final).
 */
public record UserPermissionsDetailDto(
        Set<String> effectivePermissionCodes,
        Set<String> rolePermissionCodes,
        List<DirectRow> directOverrides
) {
    public record DirectRow(
            String permissionCode,
            boolean accordee,
            String motif,
            String accordeePar,
            String dateAccord
    ) {
    }
}
