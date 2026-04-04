package com.patris.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.crypto.password.PasswordEncoder;

import com.patris.enums.role;
import com.patris.model.Utilisateur;
import com.patris.repository.UtilisateurRepository;

@Configuration
public class DevSeedConfig {

    @Bean
    @ConditionalOnProperty(name = "app.seed.default-user", havingValue = "true", matchIfMissing = true)
    public CommandLineRunner seedDefaultUser(UtilisateurRepository repository, PasswordEncoder encoder) {
        return args -> {
            if (repository.findByUsername("akim").isEmpty()) {
                Utilisateur user = new Utilisateur();
                user.setNom("Akim");
                user.setPrenom("");
                user.setFonction("Administrateur");
                user.setUsername("akim");
                user.setEmail("akim@patris.local");
                user.setTelephone("");
                user.setRole(role.ADMIN);
                user.setTwoFactorEnabled(false);
                user.setPassword(encoder.encode("00000000"));
                repository.save(user);
            }
        };
    }
}
