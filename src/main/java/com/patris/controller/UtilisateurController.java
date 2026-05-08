package com.patris.controller;

import com.patris.model.Utilisateur;
import com.patris.service.UtilisateurService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/utilisateurs")
@RequiredArgsConstructor
public class UtilisateurController {

    private final UtilisateurService utilisateurService;

    /**
     * Vérifie que le filtre de sécurité autorise bien le rôle ADMIN sur cet endpoint de test.
     */
    @GetMapping("/test")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERADMIN')")
    public ResponseEntity<String> testAdmin() {
        return ResponseEntity.ok("Accès autorisé : rôle ADMIN");
    }

    /**
     * Inscription publique (premier compte ou comptes suivants selon règles métier).
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Utilisateur utilisateur) {
        try {
            Utilisateur saved = utilisateurService.createUser(utilisateur);
            return ResponseEntity.ok(saved);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        } catch (RuntimeException e) {
            return ResponseEntity.status(409).body(e.getMessage());
        } catch (Exception e) {
            return ResponseEntity.status(500).body("Erreur serveur lors de la création de l'utilisateur.");
        }
    }

    /**
     * Liste complète des utilisateurs (administration).
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERADMIN')")
    public ResponseEntity<?> getAllUsers(@RequestParam(required = false) String matricule) {
        if (matricule != null && !matricule.isBlank()) {
            try {
                return ResponseEntity.ok(utilisateurService.findByMatricule(matricule));
            } catch (RuntimeException e) {
                return ResponseEntity.notFound().build();
            }
        }
        return ResponseEntity.ok(utilisateurService.getAllUsers());
    }

    /**
     * Détail d'un utilisateur.
     */
    @GetMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERADMIN')")
    public ResponseEntity<Utilisateur> getUser(@PathVariable Long id) {
        return ResponseEntity.ok(utilisateurService.findById(id));
    }

    /**
     * Mise à jour du profil, du rôle et du statut (sans réinitialisation de mot de passe).
     */
    @PutMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERADMIN')")
    public ResponseEntity<Utilisateur> updateUser(@PathVariable Long id, @RequestBody Utilisateur data) {
        return ResponseEntity.ok(utilisateurService.updateProfile(id, data));
    }

    /**
     * Suppression physique du compte (une suppression logique sera introduite en phase ultérieure).
     */
    @DeleteMapping("/{id}")
    @PreAuthorize("hasAnyRole('ADMIN', 'SUPERADMIN')")
    public ResponseEntity<String> deleteUser(@PathVariable Long id) {
        try {
            utilisateurService.deleteUser(id);
            return ResponseEntity.ok("Utilisateur supprimé avec succès.");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}
