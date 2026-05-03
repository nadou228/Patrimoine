package com.patris.dto.admin;

import com.patris.model.Role;

/**
 * Rôle avec effectif utilisateurs (non archivés) rattachés.
 */
public record RoleWithUserCountDto(Role role, long nombreUtilisateurs) {
}
