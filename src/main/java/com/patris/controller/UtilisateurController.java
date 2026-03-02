package com.patris.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import com.patris.model.Utilisateur;
import com.patris.service.UtilisateurService;

import lombok.RequiredArgsConstructor;

import java.util.List;

@RestController
@RequestMapping("/utilisateurs")
@RequiredArgsConstructor
public class UtilisateurController {

    private final UtilisateurService utilisateurService;

    // ---------------- TEST -------------------------
    @GetMapping("/test")
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<String> testAdmin() {
        return ResponseEntity.ok("Accès autorisé : role ADMIN");
    }

    // ---------------- REGISTER --------------------
    @PostMapping("/register")
    public ResponseEntity<Utilisateur> register(@RequestBody Utilisateur utilisateur) {
        Utilisateur saved = utilisateurService.createUser(utilisateur);
        return ResponseEntity.ok(saved);
    }

    // ---------------- GET ALL USERS ----------------
    @GetMapping
    @PreAuthorize("hasRole('ADMIN')")
    public ResponseEntity<List<Utilisateur>> getAllUsers() {
        List<Utilisateur> users = utilisateurService.getAllUsers();
        return ResponseEntity.ok(users);
    }

    // 🟢 ---------------- DELETE USER ----------------
    @DeleteMapping("/{id}")
    @PreAuthorize("hasRole('ADMIN')")  // Seul l'ADMIN peut supprimer
    public ResponseEntity<String> deleteUser(@PathVariable Long id) {
        try {
            utilisateurService.deleteUser(id);
            return ResponseEntity.ok("Utilisateur supprimé avec succès");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(e.getMessage());
        }
    }
}


