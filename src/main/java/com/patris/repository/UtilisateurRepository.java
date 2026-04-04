package com.patris.repository;

import org.springframework.data.jpa.repository.JpaRepository;

import com.patris.model.Utilisateur;

import java.util.Optional;
import com.patris.enums.role;

public interface UtilisateurRepository extends JpaRepository<Utilisateur, Long> {
    Optional<Utilisateur> findByUsername(String username);
    Optional<Utilisateur> findByEmail(String email);
    
    // 💡 Compter le nombre d'utilisateurs par rôle
    long countByRole(role role);
}
