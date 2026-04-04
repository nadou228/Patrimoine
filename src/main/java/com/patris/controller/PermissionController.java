package com.patris.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import com.patris.dto.PermissionsResponse;
import com.patris.security.CustomUserDetails;
import com.patris.security.RolePermissionMapper;

import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/permissions")
@RequiredArgsConstructor
public class PermissionController {

    @GetMapping("/my-permissions")
    public ResponseEntity<PermissionsResponse> getMyPermissions() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        
        if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails)) {
            return ResponseEntity.status(401).build();
        }

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        String roleName = userDetails.getUtilisateur().getRole().name();
        var permissions = RolePermissionMapper.getPermissionsForRole(userDetails.getUtilisateur().getRole());
        
        return ResponseEntity.ok(PermissionsResponse.fromPermissions(roleName, permissions));
    }
}
