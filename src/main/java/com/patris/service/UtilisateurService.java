package com.patris.service;

import com.patris.enums.StatutUtilisateur;
import com.patris.model.Role;
import com.patris.model.Utilisateur;
import com.patris.repository.RoleRepository;
import com.patris.repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class UtilisateurService {

    private final UtilisateurRepository utilisateurRepository;
    private final PasswordEncoder passwordEncoder;
    private final RoleRepository roleRepository;

    private static boolean looksLikeBcryptHash(String value) {
        return value != null && value.startsWith("$2");
    }

    /**
     * Crée un utilisateur : mot de passe toujours stocké en BCrypt (jamais en clair).
     */
    public Utilisateur createUser(Utilisateur utilisateur) {
        if (utilisateur.getEmail() == null || utilisateur.getEmail().isBlank()) {
            throw new IllegalArgumentException("L'email est requis.");
        }
        if (utilisateur.getUsername() == null || utilisateur.getUsername().isBlank()) {
            throw new IllegalArgumentException("Le nom d'utilisateur est requis.");
        }
        if (utilisateur.getPassword() == null || utilisateur.getPassword().isBlank()) {
            throw new IllegalArgumentException("Le mot de passe est requis.");
        }
        if (looksLikeBcryptHash(utilisateur.getPassword())) {
            throw new IllegalArgumentException(
                    "Mot de passe invalide : envoyez un mot de passe en clair, le serveur applique le hachage BCrypt.");
        }

        // 🛡️ Gestion intelligente et verbeuse des doublons
        Optional<Utilisateur> existingByUsername = utilisateurRepository.findByUsername(utilisateur.getUsername());
        if (existingByUsername.isPresent()) {
            Utilisateur u = existingByUsername.get();
            if (u.isArchived()) {
                return reactivateAndUpdate(u, utilisateur);
            }
            throw new RuntimeException("Le nom d'utilisateur '" + utilisateur.getUsername() + "' est déjà utilisé par " + u.getNom());
        }

        Optional<Utilisateur> existingByEmail = utilisateurRepository.findByEmail(utilisateur.getEmail());
        if (existingByEmail.isPresent()) {
            Utilisateur u = existingByEmail.get();
            if (u.isArchived()) {
                return reactivateAndUpdate(u, utilisateur);
            }
            throw new RuntimeException("L'email '" + utilisateur.getEmail() + "' appartient déjà à " + u.getNom());
        }

        if (utilisateur.getMatricule() != null && !utilisateur.getMatricule().isBlank()) {
            String m = utilisateur.getMatricule().trim();
            Optional<Utilisateur> existingByMatricule = utilisateurRepository.findByMatricule(m);
            if (existingByMatricule.isPresent()) {
                Utilisateur u = existingByMatricule.get();
                if (u.isArchived()) {
                    return reactivateAndUpdate(u, utilisateur);
                }
                throw new RuntimeException("Le matricule '" + m + "' est déjà attribué à " + u.getNom());
            }
        }

        long totalUsers = utilisateurRepository.count();

        if (totalUsers == 0) {
            utilisateur.setRole(roleRepository.findByCode("ADMIN").orElse(null));
        } else if (utilisateur.getRole() != null && utilisateur.getRole().getCode() != null) {
            utilisateur.setRole(roleRepository.findByCode(utilisateur.getRole().getCode()).orElse(null));
        }

        if (utilisateur.getRole() == null) {
            utilisateur.setRole(roleRepository.findByCode("AGENT_INVENTAIRE").orElse(null));
        }

        if (utilisateur.getStatut() == null) {
            utilisateur.setStatut(StatutUtilisateur.ACTIF);
        }

        utilisateur.setPassword(passwordEncoder.encode(utilisateur.getPassword()));
        return utilisateurRepository.save(utilisateur);
    }

    public List<Utilisateur> getAllUsers() {
        return utilisateurRepository.findByArchivedFalse();
    }

    public Utilisateur getByUsername(String username) {
        return utilisateurRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable."));
    }

    public Utilisateur findByMatricule(String matricule) {
        if (matricule == null || matricule.isBlank()) {
            throw new RuntimeException("Matricule introuvable.");
        }
        return utilisateurRepository.findByMatricule(matricule.trim())
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable."));
    }

    public Utilisateur findById(Long id) {
        return utilisateurRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur introuvable."));
    }

    public Utilisateur save(Utilisateur user) {
        return utilisateurRepository.save(user);
    }

    /**
     * Mise à jour du profil (sans mot de passe). Le mot de passe doit passer par les endpoints dédiés.
     */
    @Transactional
    public Utilisateur updateProfile(Long id, Utilisateur data) {
        Utilisateur user = findById(id);
        if (data.getNom() != null) {
            user.setNom(data.getNom());
        }
        if (data.getPrenom() != null) {
            user.setPrenom(data.getPrenom());
        }
        if (data.getFonction() != null) {
            user.setFonction(data.getFonction());
        }
        if (data.getEmail() != null) {
            utilisateurRepository.findByEmail(data.getEmail()).ifPresent(other -> {
                if (!other.getId().equals(id)) {
                    throw new RuntimeException("Cet email est déjà utilisé par un autre compte.");
                }
            });
            user.setEmail(data.getEmail());
        }
        if (data.getTelephone() != null) {
            user.setTelephone(data.getTelephone());
        }
        if (data.getRole() != null) {
            user.setRole(data.getRole());
        }
        if (data.getStatut() != null) {
            user.setStatut(data.getStatut());
        }
        if (data.getService() != null) {
            user.setService(data.getService());
        }
        if (data.getMatricule() != null) {
            String m = data.getMatricule().trim();
            if (m.isEmpty()) {
                user.setMatricule(null);
            } else {
                utilisateurRepository.findByMatricule(m).ifPresent(other -> {
                    if (!other.getId().equals(id)) {
                        throw new RuntimeException("Ce matricule est déjà attribué.");
                    }
                });
                user.setMatricule(m);
            }
        }
        if (data.isMustChangePassword()) {
            user.setMustChangePassword(true);
        }
        return utilisateurRepository.save(user);
    }

    /**
     * Met à jour la date de dernière connexion après authentification réussie.
     */
    @Transactional
    public void recordSuccessfulLogin(Long utilisateurId) {
        Utilisateur u = findById(utilisateurId);
        u.setDerniereConnexion(LocalDateTime.now());
        utilisateurRepository.save(u);
    }

    public void deleteUser(Long id) {
        Utilisateur utilisateur = utilisateurRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Utilisateur avec l'ID " + id + " introuvable."));

        if (utilisateur.getRole() != null && "ADMIN".equals(utilisateur.getRole().getCode())) {
            long adminCount = utilisateurRepository.countByRole(utilisateur.getRole());
            if (adminCount <= 1) {
                throw new RuntimeException("Impossible de supprimer le dernier administrateur.");
            }
        }

        utilisateur.setArchived(true);
        utilisateur.setStatut(StatutUtilisateur.SUSPENDU);
        utilisateurRepository.save(utilisateur);
    }

    @Transactional
    public Utilisateur reactivateAndUpdate(Utilisateur existing, Utilisateur newData) {
        existing.setArchived(false);
        existing.setStatut(StatutUtilisateur.ACTIF);
        existing.setNom(newData.getNom());
        existing.setPrenom(newData.getPrenom());
        existing.setFonction(newData.getFonction());
        existing.setEmail(newData.getEmail());
        existing.setTelephone(newData.getTelephone());
        if (newData.getRole() != null && newData.getRole().getCode() != null) {
            existing.setRole(roleRepository.findByCode(newData.getRole().getCode()).orElse(existing.getRole()));
        }
        existing.setService(newData.getService());
        existing.setMatricule(newData.getMatricule());
        
        // On remet à jour le mot de passe
        existing.setPassword(passwordEncoder.encode(newData.getPassword()));
        
        return utilisateurRepository.save(existing);
    }
}
