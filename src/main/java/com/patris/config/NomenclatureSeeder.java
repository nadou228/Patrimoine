package com.patris.config;

import com.patris.model.NomenclatureCompte;
import com.patris.repository.NomenclatureCompteRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

import java.io.BufferedReader;
import java.io.FileReader;
import java.io.IOException;
import java.util.ArrayList;
import java.util.List;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

@Component
public class NomenclatureSeeder implements CommandLineRunner {

    @Autowired
    private NomenclatureCompteRepository repository;

    @Override
    public void run(String... args) throws Exception {
        if (repository.count() > 0) {
            System.out.println("Nomenclature already seeded. Skipping.");
            return;
        }

        System.out.println("🌱 Starting Nomenclature Seeding...");

        List<NomenclatureCompte> allItems = new ArrayList<>();
        allItems.addAll(parseFile("partie_a_immobilisations.ts", "A", "immobilisation"));
        allItems.addAll(parseFile("partie_b_stock.ts", "B", null)); // type_bien is in the file for B

        repository.saveAll(allItems);
        System.out.println("✅ Seeded " + allItems.size() + " nomenclature entries.");
    }

    private List<NomenclatureCompte> parseFile(String filename, String partie, String defaultTypeBien) throws IOException {
        List<NomenclatureCompte> items = new ArrayList<>();
        
        try (BufferedReader reader = new BufferedReader(new FileReader(filename))) {
            String line;
            String currentCompte = null;
            String currentLibelle = null;
            String currentCategorie = null;
            String currentFamille = null;
            String currentTypeBien = defaultTypeBien;
            String currentUnite = null;

            Pattern groupPattern = Pattern.compile("compte:\\s*\"([^\"]+)\"");
            Pattern libellePattern = Pattern.compile("libelle:\\s*\"([^\"]+)\"");
            Pattern categoriePattern = Pattern.compile("categorie:\\s*\"([^\"]+)\"");
            Pattern famillePattern = Pattern.compile("famille:\\s*\"([^\"]+)\"");
            Pattern typePattern = Pattern.compile("type_bien:\\s*\"([^\"]+)\"");
            Pattern unitePattern = Pattern.compile("unite_defaut:\\s*\"([^\"]+)\"");
            Pattern itemPattern = Pattern.compile("code:\\s*\"([^\"]+)\",\\s*intitule:\\s*\"([^\"]+)\"");

            while ((line = reader.readLine()) != null) {
                line = line.trim();
                
                Matcher m;
                
                m = groupPattern.matcher(line);
                if (m.find()) currentCompte = m.group(1);
                
                m = libellePattern.matcher(line);
                if (m.find()) currentLibelle = m.group(1);
                
                m = categoriePattern.matcher(line);
                if (m.find()) currentCategorie = m.group(1);
                
                m = famillePattern.matcher(line);
                if (m.find()) currentFamille = m.group(1);
                
                m = typePattern.matcher(line);
                if (m.find()) currentTypeBien = m.group(1);
                
                m = unitePattern.matcher(line);
                if (m.find()) currentUnite = m.group(1);
                
                m = itemPattern.matcher(line);
                if (m.find()) {
                    NomenclatureCompte nc = new NomenclatureCompte();
                    nc.setCode(m.group(1));
                    nc.setIntitule(m.group(2));
                    nc.setPartie(partie);
                    nc.setComptePrincipal(currentCompte);
                    nc.setLibelleCompte(currentLibelle);
                    nc.setCategorie(currentCategorie);
                    nc.setFamille(currentFamille);
                    nc.setTypeBien(currentTypeBien);
                    nc.setUniteDefaut(currentUnite);
                    nc.setActif(true);
                    items.add(nc);
                }
            }
        }
        return items;
    }
}
