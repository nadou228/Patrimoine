package com.patris.dto;

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

import com.patris.enums.Permission;

public class PermissionsResponse {
    private String role;
    private List<PermissionDetail> permissions;

    public PermissionsResponse() {}

    public PermissionsResponse(String role, List<PermissionDetail> permissions) {
        this.role = role;
        this.permissions = permissions;
    }

    public String getRole() { return role; }
    public void setRole(String role) { this.role = role; }
    public List<PermissionDetail> getPermissions() { return permissions; }
    public void setPermissions(List<PermissionDetail> permissions) { this.permissions = permissions; }

    public static class PermissionDetail {
        private String code;
        private String description;
        private boolean granted;

        public PermissionDetail() {}

        public PermissionDetail(String code, String description, boolean granted) {
            this.code = code;
            this.description = description;
            this.granted = granted;
        }

        public String getCode() { return code; }
        public void setCode(String code) { this.code = code; }
        public String getDescription() { return description; }
        public void setDescription(String description) { this.description = description; }
        public boolean isGranted() { return granted; }
        public void setGranted(boolean granted) { this.granted = granted; }
    }

    public static PermissionsResponse fromPermissions(com.patris.model.Role role) {
        List<PermissionDetail> details = new java.util.ArrayList<>();
        
        // Toutes les permissions possibles (enum)
        for (Permission perm : Permission.values()) {
            boolean granted = role.getPermissions().stream()
                .anyMatch(p -> p.getCode().equals(perm.name()));
                
            details.add(new PermissionDetail(
                perm.name(),
                perm.description,
                granted
            ));
        }

        return new PermissionsResponse(role.getCode(), details);
    }

    /**
     * Vue complète des permissions enum avec indicateur accordé selon l'ensemble effectif calculé.
     */
    public static PermissionsResponse fromEffective(String roleCode, Set<String> effectiveCodes) {
        List<PermissionDetail> details = new ArrayList<>();
        for (Permission perm : Permission.values()) {
            details.add(new PermissionDetail(
                    perm.name(),
                    perm.description,
                    effectiveCodes.contains(perm.name())
            ));
        }
        return new PermissionsResponse(roleCode != null ? roleCode : "GUEST", details);
    }
}
