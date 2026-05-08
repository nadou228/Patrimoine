package com.patris.service;

import com.patris.enums.StatutUtilisateur;
import com.patris.model.Role;
import com.patris.model.Utilisateur;
import com.patris.repository.RoleRepository;
import com.patris.repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
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

    // ─── Gardes SUPERADMIN ────────────────────────────────────────────────────

    private boolean isCurrentSuperAdmin() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        return auth != null && auth.getAuthorities().stream()
                .anyMatch(a -> a.getAuthority().equals("ROLE_SUPERADMIN"));
    }

    /** Lève une exception si le rôle cible est SUPERADMIN et que l'utilisateur n'est pas SUPERADMIN. */
    private void assertCanAssignRole(String roleCode) {
        if ("SUPERADMIN".equals(roleCode) && !isCurrentSuperAdmin()) {
            throw new RuntimeException("Seul un SUPERADMIN peut attribuer le role SUPERADMIN.");
        }
    }

    /** Lève une exception si la cible est un compte SUPERADMIN et que le demandeur n'est pas SUPERADMIN. */
    private void assertCanManageTarget(Utilisateur utilisateur, String action) {
        if (utilisateur.getRole() != null
                && "SUPERADMIN".equals(utilisateur.getRole().getCode())
                && !isCurrentSuperAdmin()) {
            throw new RuntimeException("Seul un SUPERADMIN peut " + action + " un compte SUPERADMIN.");
        }
    }

    // ─── Création ─────────────────────────────────────────────────────────────

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
            // Premier compte → SUPERADMIN (fallback ADMIN si SUPERADMIN absent en base)
            utilisateur.setRole(roleRepository.findByCode("SUPERADMIN")
                    .orElse(roleRepository.findByCode("ADMIN").orElse(null)));
        } else if (utilisateur.getRole() != null && utilisateur.getRole().getCode() != null) {
            assertCanAssignRole(utilisateur.getRole().getCode());
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
        assertCanManageTarget(user, "modifier");

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
            if (data.getRole().getCode() == null || data.getRole().getCode().isBlank()) {
                throw new RuntimeException("Le code du role est requis.");
            }
            assertCanAssignRole(data.getRole().getCode());
            Role resolvedRole = roleRepository.findByCode(data.getRole().getCode())
                    .orElseThrow(() -> new RuntimeException("Role introuvable : " + data.getRole().getCode()));
            user.setRole(resolvedRole);
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

        assertCanManageTarget(utilisateur, "supprimer");

        if (utilisateur.getRole() != null) {
            if ("SUPERADMIN".equals(utilisateur.getRole().getCode())) {
                throw new RuntimeException("Un compte SUPERADMIN ne peut jamais être supprimé ou suspendu.");
            }
            if ("ADMIN".equals(utilisateur.getRole().getCode()) && !isCurrentSuperAdmin()) {
                long adminCount = utilisateurRepository.countByRole(utilisateur.getRole());
                if (adminCount <= 1) {
                    throw new RuntimeException("Impossible de supprimer le dernier administrateur.");
                }
            }
        }

        utilisateur.setArchived(true);
        utilisateur.setStatut(StatutUtilisateur.SUSPENDU);
        utilisateurRepository.save(utilisateur);
    }

    @Transactional
    public Utilisateur changeRole(Long id, String roleCode) {
        if (roleCode == null || roleCode.isBlank()) {
            throw new IllegalArgumentException("Le code de role est requis.");
        }
        Utilisateur user = findById(id);
        assertCanManageTarget(user, "modifier");
        assertCanAssignRole(roleCode);
        Role role = roleRepository.findByCode(roleCode)
                .orElseThrow(() -> new RuntimeException("Role introuvable : " + roleCode));
        user.setRole(role);
        return utilisateurRepository.save(user);
    }

    @Transactional
    public void resetPassword(Long id, String newPassword) {
        Utilisateur user = findById(id);
        assertCanManageTarget(user, "réinitialiser le mot de passe de");
        if (passwordEncoder.matches(newPassword, user.getPassword())) {
            throw new IllegalArgumentException("Le nouveau mot de passe doit être différent de l'ancien.");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        utilisateurRepository.save(user);
    }

    @Transactional
    public Utilisateur toggleStatut(Long id) {
        Utilisateur user = findById(id);
        assertCanManageTarget(user, "suspendre");
        if (user.getStatut() == StatutUtilisateur.ACTIF) {
            user.setStatut(StatutUtilisateur.SUSPENDU);
        } else {
            user.setStatut(StatutUtilisateur.ACTIF);
        }
        return utilisateurRepository.save(user);
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
            assertCanAssignRole(newData.getRole().getCode());
            existing.setRole(roleRepository.findByCode(newData.getRole().getCode()).orElse(existing.getRole()));
        }
        existing.setService(newData.getService());
        existing.setMatricule(newData.getMatricule());

        // On remet à jour le mot de passe
        existing.setPassword(passwordEncoder.encode(newData.getPassword()));

        return utilisateurRepository.save(existing);
    }
}
