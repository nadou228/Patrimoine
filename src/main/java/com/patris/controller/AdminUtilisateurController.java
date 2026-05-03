package com.patris.controller;

import com.patris.dto.admin.DirectPermissionRequest;
import com.patris.dto.admin.UserPermissionsDetailDto;
import com.patris.enums.StatutUtilisateur;
import com.patris.model.Role;
import com.patris.model.Utilisateur;
import com.patris.repository.RoleRepository;
import com.patris.security.CustomUserDetails;
import com.patris.audit.AuditService;
import com.patris.service.UtilisateurDirectPermissionService;
import com.patris.service.UtilisateurService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Administration des comptes utilisateurs (CRUD, rôle, mot de passe, permissions directes).
 */
@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminUtilisateurController {

    private final UtilisateurService utilisateurService;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;
    private final UtilisateurDirectPermissionService directPermissionService;
    private final AuditService auditService;

    @GetMapping({"/utilisateurs", "/users"})
    @PreAuthorize("hasAuthority('ADMIN_SYSTEM')")
    public List<Utilisateur> listUsers() {
        return utilisateurService.getAllUsers();
    }

    @PostMapping({"/utilisateurs", "/users"})
    @PreAuthorize("hasAuthority('ADMIN_SYSTEM')")
    public ResponseEntity<Utilisateur> createUser(@RequestBody Utilisateur user) {
        Utilisateur saved = utilisateurService.createUser(user);
        auditService.save("UTILISATEUR_CREATION", "Utilisateur", saved.getId(), "username=" + saved.getUsername());
        return ResponseEntity.ok(saved);
    }

    @PutMapping({"/utilisateurs/{id}", "/users/{id}"})
    @PreAuthorize("hasAuthority('ADMIN_SYSTEM')")
    public ResponseEntity<Utilisateur> updateUser(@PathVariable Long id, @RequestBody Utilisateur data) {
        Utilisateur updated = utilisateurService.updateProfile(id, data);
        auditService.save("UTILISATEUR_MODIFICATION", "Utilisateur", id, null);
        return ResponseEntity.ok(updated);
    }

    @PutMapping({"/utilisateurs/{id}/role", "/users/{id}/role"})
    @PreAuthorize("hasAuthority('ADMIN_SYSTEM')")
    public ResponseEntity<Utilisateur> changeRole(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String code = body.get("code");
        if (code == null || code.isBlank()) {
            throw new IllegalArgumentException("Le code de rôle est requis.");
        }
        Role role = roleRepository.findByCode(code)
                .orElseThrow(() -> new RuntimeException("Rôle introuvable : " + code));
        Utilisateur u = utilisateurService.findById(id);
        u.setRole(role);
        Utilisateur saved = utilisateurService.save(u);
        auditService.save("UTILISATEUR_ROLE", "Utilisateur", id, "role=" + code);
        return ResponseEntity.ok(saved);
    }

    @PutMapping({"/utilisateurs/{id}/reset-password", "/users/{id}/reset-password"})
    @PreAuthorize("hasAuthority('ADMIN_SYSTEM')")
    public ResponseEntity<Map<String, String>> resetPassword(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String newPassword = body.get("password");
        if (newPassword == null || newPassword.isBlank()) {
            throw new IllegalArgumentException("Le mot de passe est requis.");
        }
        Utilisateur user = utilisateurService.findById(id);
        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new IllegalArgumentException("Le nouveau mot de passe doit être différent de l'ancien.");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        utilisateurService.save(user);
        auditService.save("UTILISATEUR_RESET_MDP", "Utilisateur", id, null);
        return ResponseEntity.ok(Map.of("message", "Mot de passe réinitialisé."));
    }

    @PutMapping({"/utilisateurs/{id}/toggle-statut", "/users/{id}/toggle-active"})
    @PreAuthorize("hasAuthority('ADMIN_SYSTEM')")
    public ResponseEntity<Utilisateur> toggleStatut(@PathVariable Long id) {
        Utilisateur user = utilisateurService.findById(id);
        if (user.getStatut() == StatutUtilisateur.ACTIF) {
            rejectSelfSuspend(id);
            user.setStatut(StatutUtilisateur.SUSPENDU);
        } else {
            user.setStatut(StatutUtilisateur.ACTIF);
        }
        Utilisateur saved = utilisateurService.save(user);
        auditService.save("UTILISATEUR_TOGGLE_STATUT", "Utilisateur", id, "statut=" + saved.getStatut());
        return ResponseEntity.ok(saved);
    }

    @GetMapping({"/utilisateurs/{id}/activite", "/users/{id}/activite"})
    @PreAuthorize("hasAuthority('ADMIN_SYSTEM')")
    public List<Map<String, Object>> activite(@PathVariable Long id) {
        Utilisateur u = utilisateurService.findById(id);
        List<Map<String, Object>> out = new ArrayList<>();
        if (u.getDerniereConnexion() != null) {
            Map<String, Object> m = new HashMap<>();
            m.put("type", "CONNEXION");
            m.put("date", u.getDerniereConnexion().toString());
            out.add(m);
        }
        out.add(Map.of("type", "INFO", "date", LocalDateTime.now().toString(), "message",
                "Historique détaillé à enrichir (phase audits avancés)."));
        return out;
    }

    @GetMapping({"/utilisateurs/{id}/permissions", "/users/{id}/permissions"})
    @PreAuthorize("hasAuthority('ADMIN_SYSTEM')")
    public UserPermissionsDetailDto effectivePermissions(@PathVariable Long id) {
        Utilisateur u = utilisateurService.findById(id);
        return directPermissionService.buildDetail(u);
    }

    @PostMapping({"/utilisateurs/{id}/permissions", "/users/{id}/permissions"})
    @PreAuthorize("hasAuthority('ADMIN_SYSTEM')")
    public ResponseEntity<Void> grantRevokeDirect(@PathVariable Long id, @RequestBody DirectPermissionRequest req) {
        String admin = SecurityContextHolder.getContext().getAuthentication().getName();
        if (req.getPermission() == null || req.getPermission().isBlank()) {
            throw new IllegalArgumentException("Le code permission est requis.");
        }
        directPermissionService.applyDirectPermission(id, req.getPermission(), req.isAccordee(), req.getMotif(), admin);
        return ResponseEntity.ok().build();
    }

    @DeleteMapping({"/utilisateurs/{id}/permissions/{perm}", "/users/{id}/permissions/{perm}"})
    @PreAuthorize("hasAuthority('ADMIN_SYSTEM')")
    public ResponseEntity<Void> deleteDirect(@PathVariable Long id, @PathVariable String perm) {
        directPermissionService.removeDirectPermission(id, perm);
        return ResponseEntity.noContent().build();
    }

    private void rejectSelfSuspend(Long targetId) {
        var auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof CustomUserDetails ud) {
            if (ud.getUtilisateur().getId().equals(targetId)) {
                throw new IllegalArgumentException("Un administrateur ne peut pas suspendre son propre compte.");
            }
        }
    }
}
