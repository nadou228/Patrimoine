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

    private final InventaireFicheRepository ficheRepository;
    private final InventaireEcartRepository ecartRepository;
    private final MouvementService mouvementService;
    private final BienRepository bienRepository;

    public InventaireCampagneService(InventaireCampagneRepository repository, BienRepository bienRepository, 
                                     InventaireFicheRepository ficheRepository, InventaireEcartRepository ecartRepository,
                                     MouvementService mouvementService){
        this.repository = repository;
        this.bienRepository = bienRepository;
        this.ficheRepository = ficheRepository;
        this.ecartRepository = ecartRepository;
        this.mouvementService = mouvementService;
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

    @org.springframework.transaction.annotation.Transactional
    public void validerZoneConfort(Long campagneId) {
        String supervisor = SecurityContextHolder.getContext().getAuthentication().getName();
        ficheRepository.validerZoneConfort(campagneId, statutValidation.VALIDE, supervisor);
    }

    @org.springframework.transaction.annotation.Transactional
    public InventaireCampagne certifier(Long id) {
        InventaireCampagne campagne = findById(id);
        String supervisor = SecurityContextHolder.getContext().getAuthentication().getName();

        // 1. VÃ©rifier que TOUTES les fiches de la campagne ont Ã©tÃ© traitÃ©es et validÃ©es par le superviseur
        List<InventaireFiche> fiches = ficheRepository.findByCampagneId(id);
        long nonTraitees = fiches.stream()
                .filter(f -> f.getValidationSuperviseur() == com.patris.enums.statutValidation.EN_ATTENTE)
                .count();
        
        if (nonTraitees > 0) {
            throw new RuntimeException("Certification impossible : " + nonTraitees + " fiches n'ont pas encore été validées par le superviseur.");
        }

        // 2. VÃ©rifier que tous les Ã©carts sont traitÃ©s
        long ecartsNonValides = ecartRepository.countByCampagneIdAndStatutValidation(id, statutValidation.EN_ATTENTE);
        if (ecartsNonValides > 0) {
            throw new RuntimeException("Certification impossible : " + ecartsNonValides + " Ã©carts de rapprochement non rÃ©solus.");
        }

        // 3. Traitement des fiches pour mise Ã  jour localisation
        for (InventaireFiche f : fiches) {
            Bien bien = f.getBien();
            String locReelle = f.getLocalisationReelle();
            
            if (locReelle != null && !locReelle.isBlank() && !locReelle.trim().equalsIgnoreCase(bien.getLocalisation())) {
                // GÃ©nÃ©ration automatique du mouvement de transfert
                com.patris.model.Mouvement m = new com.patris.model.Mouvement();
                m.setType(com.patris.enums.type_mouvement.TRANSFERT);
                m.setBien(bien);
                m.setObservation("Régularisation par Inventaire [" + campagne.getNom() + "]");
                m.setDateCreation(LocalDateTime.now());
                m.setStatutValidation(statutValidation.VALIDE);
                m.setValidePar(supervisor);
                m.setDateValidation(LocalDateTime.now());
                
                // On pourrait chercher l'objet Services de destination ici, mais pour faire simple on met Ã  jour la string localisation du bien
                bien.setLocalisation(locReelle);
                bienRepository.save(bien);
                mouvementService.save(m);
            }
        }

        campagne.setStatut(inventaireStatut.CERTIFIE);
        campagne.setValidePar(supervisor); // Assurez-vous que ce champ existe ou changez pour un autre
        return repository.save(campagne);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }
}
