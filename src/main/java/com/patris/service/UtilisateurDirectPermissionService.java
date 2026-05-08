package com.patris.service;

import com.patris.dto.admin.UserPermissionsDetailDto;
import com.patris.model.Permission;
import com.patris.model.Utilisateur;
import com.patris.model.UtilisateurPermission;
import com.patris.repository.PermissionRepository;
import com.patris.repository.UtilisateurPermissionRepository;
import com.patris.repository.UtilisateurRepository;
import com.patris.audit.AuditService;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.format.DateTimeFormatter;
import java.util.List;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class UtilisateurDirectPermissionService {

    private final UtilisateurRepository utilisateurRepository;
    private final UtilisateurPermissionRepository utilisateurPermissionRepository;
    private final PermissionRepository permissionRepository;
    private final EffectivePermissionService effectivePermissionService;
    private final AuditService auditService;

    private boolean isCurrentSuperAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_SUPERADMIN"));
    }

    private void assertCanManageTarget(Utilisateur utilisateur, String action) {
        if (utilisateur.getRole() != null
                && "SUPERADMIN".equals(utilisateur.getRole().getCode())
                && !isCurrentSuperAdmin()) {
            throw new RuntimeException("Seul un SUPERADMIN peut " + action + " un compte SUPERADMIN.");
        }
    }

    @Transactional
    public void applyDirectPermission(Long utilisateurId, String permissionCode, boolean accordee, String motif,
                                     String acteurAdmin) {
        if (motif == null || motif.isBlank()) {
            throw new IllegalArgumentException("Le motif est obligatoire pour toute modification de permission directe.");
        }
        permissionRepository.findByCode(permissionCode)
                .orElseThrow(() -> new RuntimeException("Permission inconnue : " + permissionCode));

        Utilisateur u = utilisateurRepository.findById(utilisateurId)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable."));
        assertCanManageTarget(u, "modifier les permissions de");

        UtilisateurPermission up = utilisateurPermissionRepository
                .findByUtilisateur_IdAndPermissionCode(utilisateurId, permissionCode)
                .orElseGet(() -> {
                    UtilisateurPermission n = new UtilisateurPermission();
                    n.setUtilisateur(u);
                    n.setPermissionCode(permissionCode);
                    return n;
                });
        up.setAccordee(accordee);
        up.setMotif(motif);
        up.setAccordeePar(acteurAdmin);
        up.setDateAccord(java.time.LocalDateTime.now());
        utilisateurPermissionRepository.save(up);

        auditService.save(
                accordee ? "PERMISSION_DIRECTE_ACCORDEE" : "PERMISSION_DIRECTE_RETIREE",
                "Utilisateur",
                utilisateurId,
                "permission=" + permissionCode + " — " + motif
        );
    }

    @Transactional
    public void removeDirectPermission(Long utilisateurId, String permissionCode) {
        Utilisateur u = utilisateurRepository.findById(utilisateurId)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable."));
        assertCanManageTarget(u, "modifier les permissions de");
        utilisateurPermissionRepository.deleteByUtilisateur_IdAndPermissionCode(utilisateurId, permissionCode);
        auditService.save("PERMISSION_DIRECTE_SUPPRIMEE", "Utilisateur", utilisateurId, permissionCode);
    }

    public UserPermissionsDetailDto buildDetail(Utilisateur utilisateur) {
        Set<String> effective = effectivePermissionService.resolveEffectivePermissionCodes(utilisateur);
        Set<String> roleCodes = Set.of();
        if (utilisateur.getRole() != null && utilisateur.getRole().getPermissions() != null) {
            roleCodes = utilisateur.getRole().getPermissions().stream()
                    .map(Permission::getCode)
                    .collect(Collectors.toSet());
        }
        var fmt = DateTimeFormatter.ISO_LOCAL_DATE_TIME;
        List<UserPermissionsDetailDto.DirectRow> rows = utilisateurPermissionRepository
                .findByUtilisateur_IdOrderByDateAccordDesc(utilisateur.getId())
                .stream()
                .map(up -> new UserPermissionsDetailDto.DirectRow(
                        up.getPermissionCode(),
                        up.isAccordee(),
                        up.getMotif(),
                        up.getAccordeePar(),
                        up.getDateAccord() != null ? fmt.format(up.getDateAccord()) : ""
                ))
                .toList();
        return new UserPermissionsDetailDto(effective, roleCodes, rows);
    }
}
