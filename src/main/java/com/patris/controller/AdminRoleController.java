package com.patris.controller;

import com.patris.dto.admin.RoleWithUserCountDto;
import com.patris.model.Permission;
import com.patris.model.Role;
import com.patris.repository.UtilisateurRepository;
import com.patris.repository.PermissionRepository;
import com.patris.service.RoleService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Administration des rôles et de leurs permissions en base.
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminRoleController {

    private final RoleService roleService;
    private final UtilisateurRepository utilisateurRepository;
    private final PermissionRepository permissionRepository;

    /**
     * Liste des rôles avec effectif utilisateurs (comptes non archivés).
     */
    @GetMapping("/roles")
    @PreAuthorize("hasAuthority('ADMIN_SYSTEM')")
    public List<RoleWithUserCountDto> listRoles() {
        return roleService.findAll().stream()
                .map(r -> new RoleWithUserCountDto(r, utilisateurRepository.countByRoleAndArchivedFalse(r)))
                .collect(Collectors.toList());
    }

    /**
     * Liste de toutes les permissions disponibles dans le système.
     */
    @GetMapping("/permissions")
    @PreAuthorize("hasAuthority('ADMIN_SYSTEM')")
    public List<Permission> listAllPermissions() {
        return permissionRepository.findAll();
    }

    @PostMapping("/roles")
    @PreAuthorize("hasAuthority('ADMIN_SYSTEM')")
    public ResponseEntity<Role> createRole(@RequestBody Role role) {
        return ResponseEntity.ok(roleService.createRole(role));
    }

    @PutMapping("/roles/{code}")
    @PreAuthorize("hasAuthority('ADMIN_SYSTEM')")
    public ResponseEntity<Role> updateRoleMeta(@PathVariable String code, @RequestBody Map<String, String> body) {
        String libelle = body.get("libelle");
        String description = body.get("description");
        return ResponseEntity.ok(roleService.updateRoleMetadataByCode(code, libelle, description));
    }

    @DeleteMapping("/roles/{code}")
    @PreAuthorize("hasAuthority('ADMIN_SYSTEM')")
    public ResponseEntity<Void> deactivateRole(@PathVariable String code) {
        roleService.deactivateRoleByCode(code);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/roles/{code}/permissions")
    @PreAuthorize("hasAuthority('ADMIN_SYSTEM')")
    public Set<Permission> getRolePermissions(@PathVariable String code) {
        return roleService.findByCode(code).getPermissions();
    }

    @PutMapping("/roles/{code}/permissions")
    @PreAuthorize("hasAuthority('ADMIN_SYSTEM')")
    public ResponseEntity<Role> updateRolePermissionsByCode(
            @PathVariable String code,
            @RequestBody Set<String> permissionCodes
    ) {
        return ResponseEntity.ok(roleService.updatePermissionsByCode(code, permissionCodes));
    }
}
