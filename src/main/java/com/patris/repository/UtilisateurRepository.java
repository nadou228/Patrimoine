package com.patris.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.patris.model.Utilisateur;

import java.util.List;
import java.util.Optional;
import com.patris.model.Role;

public interface UtilisateurRepository extends JpaRepository<Utilisateur, Long> {
    Optional<Utilisateur> findByUsername(String username);
    Optional<Utilisateur> findByEmail(String email);
    Optional<Utilisateur> findByMatricule(String matricule);

    List<Utilisateur> findByArchivedFalse();
    
    // 💡 Compter le nombre d'utilisateurs par rôle
    long countByRole(Role role);

    long countByRoleAndArchivedFalse(Role role);
}
