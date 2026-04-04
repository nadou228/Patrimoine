package com.patris.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.patris.model.Utilisateur;
import com.patris.service.UtilisateurService;

import lombok.RequiredArgsConstructor;

import java.util.List;

@RestController
@RequestMapping("/api/utilisateurs")
@RequiredArgsConstructor
public class UtilisateurController {

    private final UtilisateurService utilisateurService;

    // ---------------- TEST -------------------------
    @GetMapping("/test")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> testAdmin() {
        return ResponseEntity.ok("AccÃ¨s autorisÃ© : role ADMIN");
    }

    // ---------------- REGISTER --------------------
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
            return ResponseEntity.status(500).body("Erreur serveur lors de la création de l'utilisateur");
        }
    }

    // ---------------- GET ALL USERS ----------------
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Utilisateur>> getAllUsers() {
        List<Utilisateur> users = utilisateurService.getAllUsers();
        return ResponseEntity.ok(users);
    }

    // ðŸŸ¢ ---------------- DELETE USER ----------------
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")  // Seul l'ADMIN peut supprimer
    public ResponseEntity<String> deleteUser(@PathVariable Long id) {
        try {
            utilisateurService.deleteUser(id);
            return ResponseEntity.ok("Utilisateur supprimÃ© avec succÃ¨s");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}


