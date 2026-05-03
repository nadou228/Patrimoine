package com.patris.config;

import com.patris.enums.Permission;
import com.patris.enums.role;
import com.patris.model.Role;
import com.patris.repository.PermissionRepository;
import com.patris.repository.RoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.util.Set;
import java.util.stream.Collectors;

@Component
@RequiredArgsConstructor
@Order(1)
public class RolePermissionSeeder implements CommandLineRunner {

    private final RoleRepository roleRepository;
    private final PermissionRepository permissionRepository;

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        seedPermissions();
        seedRoles();
    }

    private void seedPermissions() {
        for (Permission p : Permission.values()) {
            if (permissionRepository.findByCode(p.name()).isEmpty()) {
                permissionRepository.save(new com.patris.model.Permission(p.name(), p.description));
            }
        }
    }

    private void seedRoles() {
        for (role r : role.values()) {
            if (roleRepository.findByCode(r.name()).isEmpty()) {
                Role roleEntity = new Role(
                    r.name(), 
                    r.name(),
                    "Rôle système : " + r.name(),
                    true
                );
                
                Set<Permission> enumPermissions = RolePermissionBootstrap.getPermissionsForRole(r);
                Set<com.patris.model.Permission> entities = enumPermissions.stream()
                    .map(p -> permissionRepository.findByCode(p.name()).get())
                    .collect(Collectors.toSet());
                
                roleEntity.setPermissions(entities);
                roleRepository.save(roleEntity);
            }
        }
    }
}
