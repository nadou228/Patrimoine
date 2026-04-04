package com.patris.dto;

import java.util.List;
import java.util.Set;

import com.patris.enums.Permission;

import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
@AllArgsConstructor
public class PermissionsResponse {
    private String role;
    private List<PermissionDetail> permissions;

    @Getter
    @Setter
    @AllArgsConstructor
    public static class PermissionDetail {
        private String code;
        private String description;
        private boolean granted;
    }

    public static PermissionsResponse fromPermissions(String role, Set<Permission> grantedPermissions) {
        List<PermissionDetail> details = new java.util.ArrayList<>();
        
        for (Permission perm : Permission.values()) {
            details.add(new PermissionDetail(
                perm.name(),
                perm.description,
                grantedPermissions.contains(perm)
            ));
        }

        return new PermissionsResponse(role, details);
    }
}
