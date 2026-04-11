package com.patris.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.patris.enums.categorie;
import com.patris.enums.inventaireStatut;
import com.patris.enums.statutValidation;
import com.patris.model.Bien;
import com.patris.model.InventaireCampagne;
import com.patris.model.InventaireFiche;
import com.patris.repository.BienRepository;
import com.patris.repository.InventaireCampagneRepository;
import com.patris.repository.InventaireFicheRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class InventaireCampagneService {

    private final InventaireCampagneRepository repository;
    private final BienRepository bienRepository;
    private final InventaireFicheRepository ficheRepository;

    public List<InventaireCampagne> findAll() {
        return repository.findAll();
    }

    public InventaireCampagne findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Campagne introuvable"));
    }

    public InventaireCampagne create(InventaireCampagne campagne) {
        if (campagne.getStatut() == null) {
            campagne.setStatut(inventaireStatut.EN_COURS);
        }
        if (campagne.getDateCreation() == null) {
            campagne.setDateCreation(LocalDateTime.now());
        }
        if (campagne.getCreePar() == null || campagne.getCreePar().isBlank()) {
            campagne.setCreePar(SecurityContextHolder.getContext().getAuthentication().getName());
        }
        
        InventaireCampagne saved = repository.save(campagne);

        // EXTRACTION THÉORIQUE DES BIENS
        List<Bien> biens;
        
        if (campagne.getSites() != null && !campagne.getSites().isBlank()) {
            biens = bienRepository.findByLocalisationContainingAndArchivedFalse(campagne.getSites());
        } else if (campagne.getEquipes() != null && campagne.getEquipes().startsWith("CAT:")) {
            String catStr = campagne.getEquipes().substring(4);
            biens = bienRepository.findByCategorieAndArchivedFalse(categorie.valueOf(catStr));
        } else {
            biens = bienRepository.findAllByArchivedFalse();
        }

        // Création des fiches d'inventaire
        for (Bien bien : biens) {
            InventaireFiche fiche = new InventaireFiche();
            fiche.setCampagne(saved);
            fiche.setBien(bien);
            fiche.setCodeIup(bien.getIup());
            fiche.setEtatConstate("NON_VERIFIÉ");
            fiche.setValidationAgent(statutValidation.EN_ATTENTE);
            fiche.setValidationSuperviseur(statutValidation.EN_ATTENTE);
            ficheRepository.save(fiche);
        }

        return saved;
    }

    public InventaireCampagne update(Long id, InventaireCampagne data) {
        InventaireCampagne campagne = findById(id);
        campagne.setNom(data.getNom());
        campagne.setSites(data.getSites());
        campagne.setEquipes(data.getEquipes());
        campagne.setDateDebut(data.getDateDebut());
        campagne.setDateFin(data.getDateFin());
        campagne.setStatut(data.getStatut());
        return repository.save(campagne);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }
}
