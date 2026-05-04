package com.patris.config;

import com.patris.model.NomenclatureCompte;
import com.patris.repository.NomenclatureCompteRepository;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;

@Component
@Slf4j
public class NomenclatureSeeder implements CommandLineRunner {

    @Autowired
    private NomenclatureCompteRepository repository;

    @Override
    public void run(String... args) throws Exception {
        if (repository.count() > 0) {
            log.info("Nomenclature already seeded. Skipping.");
            return;
        }

        log.info("🌱 Starting Nomenclature Seeding from CSV...");

        List<NomenclatureCompte> allItems = new ArrayList<>();
        
        try {
            ClassPathResource resource = new ClassPathResource("referentiels/annexe-nomact-catalogue.csv");
            try (BufferedReader reader = new BufferedReader(new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
                String line;
                boolean firstLine = true;
                while ((line = reader.readLine()) != null) {
                    if (firstLine) {
                        firstLine = false;
                        continue;
                    }
                    
                    String[] parts = line.split(";", -1);
                    if (parts.length >= 10) {
                        NomenclatureCompte nc = new NomenclatureCompte();
                        nc.setCode(parts[0].trim());
                        nc.setIntitule(parts[1].trim());
                        nc.setNiveau(parts[2].trim());
                        nc.setCodeParent(parts[3].trim());
                        nc.setComptePrincipal(parts[4].trim());
                        nc.setLibelleCompte(parts[5].trim());
                        nc.setSection(parts[6].trim());
                        nc.setCategoriePrincipale(parts[7].trim());
                        nc.setCategorieMetier(parts[8].trim());
                        
                        // Mapping for legacy fields
                        nc.setPartie(parts[6].contains("IMMOBILISATION") ? "A" : "B");
                        nc.setCategorie(parts[7].trim());
                        nc.setFamille(parts[8].trim());
                        nc.setTypeBien(parts[9].trim()); // profil_formulaire maps to typeBien
                        
                        nc.setActif(true);
                        allItems.add(nc);
                    }
                }
            }
            
            repository.saveAll(allItems);
            log.info("✅ Seeded {} nomenclature entries from CSV.", allItems.size());
            
        } catch (Exception e) {
            log.error("❌ Error seeding nomenclature from CSV: {}", e.getMessage(), e);
        }
    }
}
