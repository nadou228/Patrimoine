package com.patris.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.patris.enums.inventaireStatut;
import com.patris.enums.statutValidation;
import com.patris.model.Bien;
import com.patris.model.CategoriePatrimoine;
import com.patris.model.InventaireCampagne;
import com.patris.model.InventaireFiche;
import com.patris.repository.BienRepository;
import com.patris.repository.InventaireCampagneRepository;
import com.patris.repository.InventaireEcartRepository;
import com.patris.repository.InventaireFicheRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class InventaireCampagneService {

    private final InventaireCampagneRepository repository;
    private final InventaireFicheRepository ficheRepository;
    private final InventaireEcartRepository ecartRepository;
    private final MouvementService mouvementService;
    private final BienRepository bienRepository;
    private final InventaireEcartDetectionService ecartDetectionService;

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

        List<Bien> biens;
        if (campagne.getSites() != null && !campagne.getSites().isBlank()) {
            biens = bienRepository.findByLocalisationContainingAndArchivedFalse(campagne.getSites());
        } else if (campagne.getEquipes() != null && campagne.getEquipes().startsWith("CAT:")) {
            String catCode = campagne.getEquipes().substring(4);
            biens = bienRepository.findByCodeCategorieAndArchivedFalse(catCode);
        } else {
            biens = bienRepository.findAllByArchivedFalse();
        }

        for (Bien bien : biens) {
            InventaireFiche fiche = new InventaireFiche();
            fiche.setCampagne(saved);
            fiche.setBien(bien);
            fiche.setCodeIup(bien.getIup());
            fiche.setEtatConstate("NON_VERIFIÉ");
            fiche.setAnomalie(false);
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
        List<InventaireFiche> fiches = ficheRepository.findByCampagneId(campagneId);
        long sansAgent = fiches.stream()
                .filter(f -> f.getValidationAgent() != statutValidation.VALIDE)
                .filter(f -> f.getAnomalie() == null || !f.getAnomalie())
                .count();
        if (sansAgent > 0) {
            throw new RuntimeException("Clôture de zone impossible : " + sansAgent + " fiche(s) sans validation agent.");
        }
        ficheRepository.validerZoneConfort(campagneId, statutValidation.VALIDE, supervisor);
    }

    @org.springframework.transaction.annotation.Transactional
    public InventaireCampagne certifier(Long id) {
        InventaireCampagne campagne = findById(id);
        String supervisor = SecurityContextHolder.getContext().getAuthentication().getName();

        List<InventaireFiche> fiches = ficheRepository.findByCampagneId(id);
        List<InventaireFiche> sansAgent = fiches.stream()
                .filter(f -> f.getValidationAgent() == com.patris.enums.statutValidation.EN_ATTENTE)
                .filter(f -> !"NON_VERIFIÉ".equalsIgnoreCase(f.getEtatConstate()))
                .toList();
        if (!sansAgent.isEmpty()) {
            throw new RuntimeException("Certification impossible : " + sansAgent.size()
                    + " fiche(s) recensées sans validation agent (double contrôle requis).");
        }

        ecartDetectionService.detectMissingBiens(id);

        List<InventaireFiche> nonTraiteesList = fiches.stream()
                .filter(f -> f.getValidationSuperviseur() == com.patris.enums.statutValidation.EN_ATTENTE)
                .filter(f -> !"NON_VERIFIÉ".equalsIgnoreCase(f.getEtatConstate()))
                .toList();
        
        if (!nonTraiteesList.isEmpty()) {
            System.out.println("BLOCKING FICHES FOR CERTIFICATION (Campagne " + id + "):");
            for (InventaireFiche f : nonTraiteesList) {
                System.out.println(" - ID: " + f.getId() + " | IUP: " + f.getCodeIup() + " | Anomalie: " + f.getAnomalie());
            }
            throw new RuntimeException("Certification impossible : " + nonTraiteesList.size() + " fiches n'ont pas encore été validées par le superviseur.");
        }

        long ecartsNonValides = ecartRepository.countByCampagneIdAndStatutValidation(id, statutValidation.EN_ATTENTE);
        if (ecartsNonValides > 0) {
            throw new RuntimeException("Certification impossible : " + ecartsNonValides + " écarts de rapprochement non résolus.");
        }

        List<InventaireFiche> sansPreuve = fiches.stream()
                .filter(f -> !"NON_VERIFIÉ".equalsIgnoreCase(f.getEtatConstate()))
                .filter(f -> f.getValidationAgent() == statutValidation.VALIDE)
                .filter(f -> (f.getPhotoUrl() == null || f.getPhotoUrl().isBlank())
                        || (f.getCoordonneeGps() == null || f.getCoordonneeGps().isBlank()))
                .toList();
        if (!sansPreuve.isEmpty()) {
            throw new RuntimeException("Certification impossible : " + sansPreuve.size()
                    + " fiche(s) sans photo ou géolocalisation (preuve obligatoire CDC §4.2.1).");
        }

        for (InventaireFiche f : fiches) {
            Bien bien = f.getBien();
            String locReelle = f.getLocalisationReelle();
            
            if (locReelle != null && !locReelle.isBlank() && !locReelle.trim().equalsIgnoreCase(bien.getLocalisation())) {
                com.patris.model.Mouvement m = new com.patris.model.Mouvement();
                m.setType(com.patris.enums.type_mouvement.TRANSFERT);
                m.setBien(bien);
                m.setObservation("Régularisation par Inventaire [" + campagne.getNom() + "]");
                m.setDateCreation(LocalDateTime.now());
                m.setStatutValidation(statutValidation.VALIDE);
                m.setValidePar(supervisor);
                m.setDateValidation(LocalDateTime.now());
                
                bien.setLocalisation(locReelle);
                bienRepository.save(bien);
                mouvementService.save(m);
            }
        }

        campagne.setStatut(inventaireStatut.CERTIFIE);
        campagne.setValidePar(supervisor); 
        return repository.save(campagne);
    }

    @org.springframework.transaction.annotation.Transactional
    public void delete(Long id) {
        ecartRepository.deleteAll(ecartRepository.findByCampagneId(id));
        ficheRepository.deleteAll(ficheRepository.findByCampagneId(id));
        repository.deleteById(id);
    }
}
