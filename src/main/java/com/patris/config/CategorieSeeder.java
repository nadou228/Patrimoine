package com.patris.config;

import com.patris.enums.NiveauCategorie;
import com.patris.model.CategoriePatrimoine;
import com.patris.model.SystemConfiguration;
import com.patris.repository.CategoriePatrimoineRepository;
import com.patris.repository.SystemConfigurationRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;

@Component
@RequiredArgsConstructor
@Slf4j
public class CategorieSeeder implements CommandLineRunner {

    private final CategoriePatrimoineRepository repository;
    private final SystemConfigurationRepository configRepository;

    @Override
    public void run(String... args) throws Exception {
        if (repository.count() == 0) {
            log.info("Initialisation du catalogue CategoriePatrimoine...");

            // Racines (Catégories)
            CategoriePatrimoine imm = new CategoriePatrimoine("IMMOBILIER", "IMMOBILIER", NiveauCategorie.CATEGORIE, null, "fa-building", "#3b82f6", 1);
            CategoriePatrimoine mob = new CategoriePatrimoine("MOBILIER", "MOBILIER", NiveauCategorie.CATEGORIE, null, "fa-chair", "#10b981", 2);
            CategoriePatrimoine roulant = new CategoriePatrimoine("MATERIEL_ROULANT", "MATERIEL_ROULANT", NiveauCategorie.CATEGORIE, null, "fa-car", "#f59e0b", 3);

            // Familles Immobilier
            CategoriePatrimoine batiment = new CategoriePatrimoine("IMM-BAT", "Bâtiments", NiveauCategorie.FAMILLE, "IMMOBILIER", "fa-home", null, 1);
            CategoriePatrimoine terrain = new CategoriePatrimoine("IMM-TER", "Terrains", NiveauCategorie.FAMILLE, "IMMOBILIER", "fa-map", null, 2);

            // Familles Mobilier
            CategoriePatrimoine bureau = new CategoriePatrimoine("MOB-BUR", "Mobilier de bureau", NiveauCategorie.FAMILLE, "MOBILIER", "fa-desk", null, 1);
            CategoriePatrimoine info = new CategoriePatrimoine("MOB-INF", "Matériel Informatique", NiveauCategorie.FAMILLE, "MOBILIER", "fa-laptop", null, 2);

            // Familles Roulant
            CategoriePatrimoine vl = new CategoriePatrimoine("VEH-VL", "Véhicules Légers", NiveauCategorie.FAMILLE, "MATERIEL_ROULANT", "fa-car", null, 1);
            CategoriePatrimoine pl = new CategoriePatrimoine("VEH-PL", "Poids Lourds", NiveauCategorie.FAMILLE, "MATERIEL_ROULANT", "fa-truck", null, 2);

            repository.saveAll(Arrays.asList(
                    imm, mob, roulant,
                    batiment, terrain, bureau, info, vl, pl
            ));
            
            log.info("Catalogue CategoriePatrimoine initialisé conformément à la Tâche 1.1.");
        }

        if (configRepository.count() == 0) {
            log.info("Initialisation SystemConfiguration...");
            configRepository.save(new SystemConfiguration("IUP_PREFIX", "CT-LME", "Préfixe utilisé pour la génération des IUP"));
            log.info("SystemConfiguration initialisée.");
        }
    }
}
