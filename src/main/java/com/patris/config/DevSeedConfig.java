package com.patris.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.core.annotation.Order;
import org.springframework.jdbc.core.JdbcTemplate;

import com.patris.enums.StatutUtilisateur;
import com.patris.model.Utilisateur;
import com.patris.repository.UtilisateurRepository;
import com.patris.repository.RoleRepository;
import java.util.Optional;

@Configuration
public class DevSeedConfig {

    @Bean
    @Order(2)
    @ConditionalOnProperty(name = "app.seed.default-user", havingValue = "true", matchIfMissing = true)
    public CommandLineRunner seedDefaultUser(UtilisateurRepository repository, PasswordEncoder encoder, RoleRepository roleRepository, JdbcTemplate jdbcTemplate) {
        return args -> {
            // Fix orphaned base entities which break Hibernate 6 polymorphic queries
            // Instead of deleting, we convert them to BienMobilier to preserve FKs (affectations, etc)
            jdbcTemplate.execute(
                "INSERT INTO bien_mobilier (id) " +
                "SELECT id FROM bien WHERE id NOT IN (SELECT id FROM bien_mobilier) " +
                "AND id NOT IN (SELECT id FROM bien_immobilier) " +
                "AND id NOT IN (SELECT id FROM bien_materiel_roulant)"
            );
            System.out.println("[SEED] Polymorphic base entities fixed.");

            Optional<Utilisateur> optUser = repository.findByUsername("akim");
            if (optUser.isEmpty()) {
                Utilisateur user = new Utilisateur();
                user.setNom("Akim");
                user.setPrenom("");
                user.setFonction("Administrateur");
                user.setUsername("akim");
                user.setEmail("akim@patris.local");
                user.setTelephone("");
                user.setRole(roleRepository.findByCode("ADMIN").orElse(null));
                user.setTwoFactorEnabled(false);
                user.setStatut(StatutUtilisateur.ACTIF);
                user.setMustChangePassword(false);
                user.setPassword(encoder.encode("00000000"));
                repository.save(user);
            } else {
                Utilisateur user = optUser.get();
                if (user.getRole() == null || !"ADMIN".equals(user.getRole().getCode())) {
                    var adminRole = roleRepository.findByCode("ADMIN").orElse(null);
                    if (adminRole != null) {
                        System.out.println("[SEED] Updating user 'akim' to ADMIN role.");
                        user.setRole(adminRole);
                        repository.save(user);
                    } else {
                        System.err.println("[SEED] CRITICAL: ADMIN role not found in database!");
                    }
                } else {
                    System.out.println("[SEED] User 'akim' already has ADMIN role.");
                }
            }
        };
    }
}

