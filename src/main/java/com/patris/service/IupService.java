package com.patris.service;

import java.time.LocalDate;

import org.springframework.stereotype.Service;

import com.patris.model.CategoriePatrimoine;
import com.patris.model.SystemConfiguration;
import com.patris.repository.BienRepository;
import com.patris.repository.SystemConfigurationRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class IupService {

    private final BienRepository bienRepository;
    private final SystemConfigurationRepository configRepository;

    private static final String DEFAULT_PREFIX = "CT-LME";
    private static final String CONFIG_KEY_PREFIX = "IUP_PREFIX";

    /**
     * Génère un Identifiant Unique de Patrimoine (IUP).
     * Format : [PREFIXE_MINISTERE]-[CODE_CAT]-[ANNEE]-[000001]
     */
    public String generateIup(String codeCategorie) {
        if (codeCategorie == null || codeCategorie.isBlank()) {
            throw new IllegalArgumentException("Le code catégorie est obligatoire pour générer un IUP");
        }

        // Validation : Seuls les types racines autorisés portent un IUP
        if (!isRootImmobilisation(codeCategorie)) {
            throw new com.patris.exception.BusinessException("Seuls les biens de type IMMOBILIER, MOBILIER ou MATERIEL_ROULANT peuvent porter un IUP.");
        }

        int annee = LocalDate.now().getYear();
        
        String prefixMinistere = configRepository.findByConfigKey(CONFIG_KEY_PREFIX)
                .map(SystemConfiguration::getConfigValue)
                .orElse(DEFAULT_PREFIX);

        String prefixCat = mapToIupCategory(codeCategorie);

        // Récupération de l'incrément depuis la séquence DB
        Long nextVal = bienRepository.getNextIupSequenceValue();
        
        return String.format("%s-%s-%d-%06d", prefixMinistere, prefixCat, annee, nextVal);
    }

    private boolean isRootImmobilisation(String code) {
        return code.startsWith("IMMOBILIER") || 
               code.startsWith("MOBILIER") || 
               code.startsWith("MATERIEL_ROULANT") ||
               code.startsWith("IMM") || 
               code.startsWith("MOB") || 
               code.startsWith("VEH");
    }

    private String mapToIupCategory(String code) {
        if (code.startsWith("IMM")) return "IMM";
        if (code.startsWith("MOB")) return "MOB";
        if (code.startsWith("MAT") || code.startsWith("VEH")) return "VEH";
        return "GEN";
    }
}
