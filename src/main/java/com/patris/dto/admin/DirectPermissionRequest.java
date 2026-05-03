package com.patris.dto.admin;

import lombok.Data;

/**
 * Accorder ou retirer une permission directe sur un utilisateur.
 */
@Data
public class DirectPermissionRequest {
    private String permission;
    private boolean accordee = true;
    private String motif;
}
