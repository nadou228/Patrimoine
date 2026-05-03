package com.patris.controller;

import com.patris.dto.PermissionsResponse;
import com.patris.security.CustomUserDetails;
import com.patris.service.EffectivePermissionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/**
 * Exposition des permissions effectives de l'utilisateur connecté.
 */
@RestController
@RequestMapping("/api/permissions")
@RequiredArgsConstructor
public class PermissionController {

    private final EffectivePermissionService effectivePermissionService;

    @GetMapping("/my-permissions")
    public ResponseEntity<PermissionsResponse> getMyPermissions() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();

        if (authentication == null || !(authentication.getPrincipal() instanceof CustomUserDetails)) {
            return ResponseEntity.status(401).build();
        }

        CustomUserDetails userDetails = (CustomUserDetails) authentication.getPrincipal();
        var effective = effectivePermissionService.resolveEffectivePermissionCodes(userDetails.getUtilisateur());
        String roleCode = userDetails.getUtilisateur().getRole() != null
                ? userDetails.getUtilisateur().getRole().getCode()
                : "GUEST";
        return ResponseEntity.ok(PermissionsResponse.fromEffective(roleCode, effective));
    }
}
