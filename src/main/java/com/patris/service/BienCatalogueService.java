package com.patris.service;

import com.patris.model.BienCatalogueItem;
import com.patris.repository.BienCatalogueItemRepository;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
@Slf4j
public class BienCatalogueService implements CommandLineRunner {

    private final BienCatalogueItemRepository repository;

    public List<BienCatalogueItem> findAllActive() {
        return repository.findAllByActifTrueOrderByOrdreAffichageAscCodeAsc();
    }

    @Override
    @Transactional
    public void run(String... args) throws Exception {
        if (repository.count() > 0) {
            return;
        }

        ClassPathResource resource = new ClassPathResource("referentiels/annexe-nomact-catalogue.csv");
        if (!resource.exists()) {
            log.warn("Référentiel ANNEXE NOMACT introuvable dans les ressources.");
            return;
        }

        List<BienCatalogueItem> items = new ArrayList<>();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(resource.getInputStream(), StandardCharsets.UTF_8))) {
            String line = reader.readLine();
            while ((line = reader.readLine()) != null) {
                String[] parts = line.split(";", -1);
                if (parts.length < 11) {
                    continue;
                }

                BienCatalogueItem item = new BienCatalogueItem();
                item.setCode(parts[0]);
                item.setLibelle(parts[1]);
                item.setNiveau(parts[2]);
                item.setCodeParent(blankToNull(parts[3]));
                item.setCodeFamille(parts[4]);
                item.setLibelleFamille(parts[5]);
                item.setSection(parts[6]);
                item.setCategoriePrincipale(parts[7]);
                item.setCategorieMetier(parts[8]);
                item.setProfilFormulaire(parts[9]);
                item.setOrdreAffichage(parseInteger(parts[10]));
                item.setActif(true);
                items.add(item);
            }
        }

        repository.saveAll(items);
        log.info("Référentiel NOMACT importé: {} éléments.", items.size());
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value;
    }

    private Integer parseInteger(String value) {
        try {
            return Integer.parseInt(value);
        } catch (Exception e) {
            return 0;
        }
    }
}
