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

    // CrÃ©ation d'un utilisateur
    public Utilisateur createUser(Utilisateur utilisateur) {
        if (utilisateur.getEmail() == null || utilisateur.getEmail().isBlank()) {
            throw new IllegalArgumentException("L'email est requis");
        }
        if (utilisateur.getUsername() == null || utilisateur.getUsername().isBlank()) {
            throw new IllegalArgumentException("Le nom d'utilisateur est requis");
        }
        if (utilisateur.getPassword() == null || utilisateur.getPassword().isBlank()) {
            throw new IllegalArgumentException("Le mot de passe est requis");
        }

        utilisateurRepository.findByUsername(utilisateur.getUsername()).ifPresent(u -> {
            throw new RuntimeException("Ce nom d'utilisateur existe déjà");
        });
        utilisateurRepository.findByEmail(utilisateur.getEmail()).ifPresent(u -> {
            throw new RuntimeException("Cet email existe déjà");
        });

        long totalUsers = utilisateurRepository.count();

        if (totalUsers == 0) {
            // Premier utilisateur — devient ADMIN
            utilisateur.setRole(role.ADMIN);
        } else {
            // Par défaut, si le rôle n'est pas défini, mettre AGENT
            if (utilisateur.getRole() == null) {
                utilisateur.setRole(role.AGENT_INVENTAIRE);
            }
        }

        if (utilisateur.getRole() == null) {
            utilisateur.setRole(role.AGENT_INVENTAIRE);
        }

        // Encodage du mot de passe
        utilisateur.setPassword(passwordEncoder.encode(utilisateur.getPassword()));
        return utilisateurRepository.save(utilisateur);
    }

    // RÃ©cupÃ©ration de tous les utilisateurs
    public List<Utilisateur> getAllUsers() {
        return utilisateurRepository.findAll();
    }

    // RÃ©cupÃ©ration par username
    public Utilisateur getByUsername(String username) {
        return utilisateurRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Utilisateur non trouvÃ©"));
    }

    // ðŸŸ¢ Suppression d'un utilisateur
    public void deleteUser(Long id) {
        // VÃ©rifier si l'utilisateur existe
        Utilisateur utilisateur = utilisateurRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur avec l'ID " + id + " introuvable"));

        // ðŸ”’ EmpÃªcher la suppression du dernier ADMIN
        if (utilisateur.getRole() == role.ADMIN) {
            long adminCount = utilisateurRepository.countByRole(role.ADMIN);
            if (adminCount <= 1) {
                throw new RuntimeException("Impossible de supprimer le dernier administrateur");
            }
        }

        utilisateurRepository.deleteById(id);}
}
