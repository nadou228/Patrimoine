package com.patris.config;

import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@Profile("h2")
public class DevDataSeeder {

    @Bean
    public CommandLineRunner seedData() {
        return args -> {
            // Désactivé manuellement car utilise des patterns Builder supprimés pour Java 25
            System.out.println("DevDataSeeder désactivé pour compatibilité Java 25");
        };
    }
}
