package com.patris.service;

import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import com.patris.model.Utilisateur;
import com.patris.repository.UtilisateurRepository;
import com.patris.enums.role;

import java.util.List;


@Service
@RequiredArgsConstructor
public class UtilisateurService {

    private final UtilisateurRepository utilisateurRepository;
    private final PasswordEncoder passwordEncoder;

    // Création d'un utilisateur
    public Utilisateur createUser(Utilisateur utilisateur) {
        long totalUsers = utilisateurRepository.count();

        if (totalUsers == 0) {
            // Premier utilisateur → devient ADMIN
            utilisateur.setRole(role.ADMIN);
        } else {
            // Par défaut, si le rôle n'est pas défini, mettre AGENT
            if (utilisateur.getRole() == null) {
                utilisateur.setRole(role.AGENT_INVENTAIRE);
            }
        }

        // Encodage du mot de passe
        utilisateur.setPassword(passwordEncoder.encode(utilisateur.getPassword()));
        return utilisateurRepository.save(utilisateur);
    }

    // Récupération de tous les utilisateurs
    public List<Utilisateur> getAllUsers() {
        return utilisateurRepository.findAll();
    }

    // Récupération par username
    public Utilisateur getByUsername(String username) {
        return utilisateurRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvé"));
    }

    // 🟢 Suppression d'un utilisateur
    public void deleteUser(Long id) {
        // Vérifier si l'utilisateur existe
        Utilisateur utilisateur = utilisateurRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur avec l'ID " + id + " introuvable"));

        // 🔒 Empêcher la suppression du dernier ADMIN
        if (utilisateur.getRole() == role.ADMIN) {
            long adminCount = utilisateurRepository.countByRole(role.ADMIN);
            if (adminCount <= 1) {
                throw new RuntimeException("Impossible de supprimer le dernier administrateur");
            }
        }

        utilisateurRepository.deleteById(id);}
}