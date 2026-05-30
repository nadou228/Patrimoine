package com.patris.service;

import com.patris.model.Permission;
import com.patris.model.Role;
import com.patris.repository.PermissionRepository;
import com.patris.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoleService {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;

    private boolean isCurrentSuperAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null) return false;
        return auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_SUPERADMIN")
                            || a.getAuthority().equals("ROLE_ADMIN")
                            || a.getAuthority().equals("SUPERADMIN")
                            || a.getAuthority().equals("ADMIN"));
    }

    private void assertCanManageRole(String code, String action) {
        if ("SUPERADMIN".equals(code) && !isCurrentSuperAdmin()) {
            throw new RuntimeException("Seul un SUPERADMIN ou un ADMIN peut " + action + " le role SUPERADMIN.");
        }
    }

    public List<Role> findAll() {
        return roleRepository.findAll();
    }

    public Role findById(Long id) {
        return roleRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Rôle introuvable"));
    }

    public Role findByCode(String code) {
        return roleRepository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("Rôle introuvable : " + code));
    }

    @Transactional
    public Role updateRoleMetadataByCode(String code, String libelle, String description) {
        assertCanManageRole(code, "modifier");
        Role role = findByCode(code);
        if (libelle != null) {
            role.setLibelle(libelle);
        }
        if (description != null) {
            role.setDescription(description);
        }
        return roleRepository.save(role);
    }

    @Transactional
    public Role updatePermissionsByCode(String code, java.util.Set<String> permissionCodes) {
        Role role = findByCode(code);
        return updatePermissions(role.getId(), permissionCodes);
    }

    @Transactional
    public void deactivateRoleByCode(String code) {
        assertCanManageRole(code, "désactiver");
        Role role = findByCode(code);
        if (role.isSystemRole()) {
            throw new RuntimeException("Impossible de désactiver un rôle système.");
        }
        role.setActif(false);
        roleRepository.save(role);
    }

    public List<Permission> findAllPermissions() {
        return permissionRepository.findAll();
    }

    @Transactional
    public Role createRole(Role role) {
        if (role.getCode() == null || role.getCode().isBlank()) {
            throw new RuntimeException("Le code du role est requis.");
        }
        assertCanManageRole(role.getCode(), "créer");
        if (roleRepository.findByCode(role.getCode()).isPresent()) {
            throw new RuntimeException("Un rôle avec ce code existe déjà");
        }
        return roleRepository.save(role);
    }

    @Transactional
    public Role updatePermissions(Long roleId, Set<String> permissionCodes) {
        Role role = findById(roleId);
        assertCanManageRole(role.getCode(), "modifier les permissions du");

        // Assurer que chaque permission demandée existe en base avant l'affectation
        for (String code : permissionCodes) {
            if (permissionRepository.findByCode(code).isEmpty()) {
                try {
                    com.patris.enums.Permission enumPerm = com.patris.enums.Permission.valueOf(code);
                    permissionRepository.save(new com.patris.model.Permission(code, enumPerm.description));
                } catch (IllegalArgumentException e) {
                    permissionRepository.save(new com.patris.model.Permission(code, "Droit de validation " + code));
                }
            }
        }

        Set<Permission> permissions = permissionCodes.stream()
                .map(code -> permissionRepository.findByCode(code)
                        .orElseThrow(() -> new RuntimeException("Permission introuvable : " + code)))
                .collect(Collectors.toSet());
        role.setPermissions(permissions);
        return roleRepository.save(role);
    }

    @Transactional
    public void deleteRole(Long id) {
        Role role = findById(id);
        assertCanManageRole(role.getCode(), "supprimer");
        if (role.isSystemRole()) {
            throw new RuntimeException("Impossible de supprimer un rôle système");
        }
        role.setActif(false);
        roleRepository.save(role);
    }
}
