package com.patris.service;

import com.patris.model.Permission;
import com.patris.model.Utilisateur;
import com.patris.model.UtilisateurPermission;
import com.patris.repository.UtilisateurPermissionRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.LinkedHashSet;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * Calcule les permissions effectives : rôle ∪ accords directs \ retraits directs.
 */
@Service
@RequiredArgsConstructor
public class EffectivePermissionService {

    private final UtilisateurPermissionRepository utilisateurPermissionRepository;

    public Set<String> resolveEffectivePermissionCodes(Utilisateur utilisateur) {
        Set<String> codes = new LinkedHashSet<>();
        if (utilisateur.getRole() != null && utilisateur.getRole().getPermissions() != null) {
            codes = utilisateur.getRole().getPermissions().stream()
                    .map(Permission::getCode)
                    .collect(Collectors.toCollection(LinkedHashSet::new));
        }
        for (UtilisateurPermission up : utilisateurPermissionRepository
                .findByUtilisateur_IdOrderByDateAccordDesc(utilisateur.getId())) {
            if (up.isAccordee()) {
                codes.add(up.getPermissionCode());
            } else {
                codes.remove(up.getPermissionCode());
            }
        }
        return codes;
    }
}
