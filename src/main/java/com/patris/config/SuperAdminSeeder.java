package com.patris.config;

import com.patris.enums.StatutUtilisateur;
import com.patris.model.Utilisateur;
import com.patris.repository.RoleRepository;
import com.patris.repository.UtilisateurRepository;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.annotation.Order;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Order(2) // S'exécute APRES RolePermissionSeeder (Order 1)
public class SuperAdminSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(SuperAdminSeeder.class);
    private final UtilisateurRepository utilisateurRepository;
    private final RoleRepository roleRepository;
    private final PasswordEncoder passwordEncoder;

    @Override
    public void run(String... args) throws Exception {
        String username = "brahim";
        String email = "super@patris.tg";

        if (utilisateurRepository.findByUsername(username).isEmpty() &&
            utilisateurRepository.findByEmail(email).isEmpty()) {

            log.info("Initialisation du compte SUPERADMIN : {}", username);

            Utilisateur superAdmin = new Utilisateur();
            superAdmin.setUsername(username);
            superAdmin.setEmail(email);
            superAdmin.setNom("Brahim");
            superAdmin.setPrenom("SuperAdmin");
            superAdmin.setPassword(passwordEncoder.encode("12345678"));
            superAdmin.setStatut(StatutUtilisateur.ACTIF);
            superAdmin.setArchived(false);

            roleRepository.findByCode("SUPERADMIN").ifPresentOrElse(
                superAdmin::setRole,
                () -> log.error("Role SUPERADMIN introuvable ! Verifiez le RolePermissionSeeder.")
            );

            utilisateurRepository.save(superAdmin);
            log.info("SUPERADMIN '{}' cree avec succes.", username);
        } else {
            log.info("Le compte SUPERADMIN '{}' existe deja.", username);
        }
    }
}
