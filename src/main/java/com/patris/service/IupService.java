package com.patris.service;

import java.time.LocalDate;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import com.patris.enums.categorie;
import com.patris.repository.BienRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class IupService {

    private final BienRepository bienRepository;

    @Value("${iup.prefix:CT-LME}")
    private String prefixCollectivite;

    public String generateIup(categorie categorie) {
        String codeCategorie = mapCategorie(categorie);
        int annee = LocalDate.now().getYear();
        String prefix = prefixCollectivite + "-" + codeCategorie + "-" + annee + "-";

        String last = bienRepository.findMaxIupByPrefix(prefix);
        int nextSeq = 1;
        if (last != null && last.startsWith(prefix)) {
            String seqStr = last.substring(prefix.length());
            try {
                nextSeq = Integer.parseInt(seqStr) + 1;
            } catch (NumberFormatException ignored) {
                nextSeq = 1;
            }
        }
        return prefix + String.format("%06d", nextSeq);
    }

    private String mapCategorie(categorie categorie) {
        if (categorie == null) {
            return "GEN";
        }
        return switch (categorie) {
            case IMMOBILIER -> "IMM";
            case MOBILIER -> "MOB";
            case MATERIEL_ROULANT -> "VEH";
            case STOCKS -> "STK";
        };
    }
}
