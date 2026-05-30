package com.patris.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.patris.enums.statutValidation;
import com.patris.model.InventaireFiche;
import com.patris.repository.InventaireFicheRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class InventaireFicheService {

    private final InventaireFicheRepository repository;
    private final InventaireEcartDetectionService ecartDetectionService;

    public List<InventaireFiche> findAll() {
        return repository.findAll();
    }

    public List<InventaireFiche> findByCampagne(Long campagneId) {
        return repository.findByCampagneId(campagneId);
    }

    public InventaireFiche findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Fiche introuvable"));
    }

    public InventaireFiche create(InventaireFiche fiche) {
        if (fiche.getDateScan() == null) {
            fiche.setDateScan(LocalDateTime.now());
        }
        if (fiche.getAgentUsername() == null || fiche.getAgentUsername().isBlank()) {
            fiche.setAgentUsername(SecurityContextHolder.getContext().getAuthentication().getName());
        }
        if (fiche.getValidationAgent() == null) {
            fiche.setValidationAgent(statutValidation.EN_ATTENTE);
        }
        if (fiche.getValidationSuperviseur() == null) {
            fiche.setValidationSuperviseur(statutValidation.EN_ATTENTE);
        }
        return repository.save(fiche);
    }

    public InventaireFiche update(Long id, InventaireFiche data) {
        InventaireFiche fiche = findById(id);
        fiche.setCampagne(data.getCampagne());
        fiche.setBien(data.getBien());
        fiche.setCodeIup(data.getCodeIup());
        fiche.setEtatConstate(data.getEtatConstate());
        fiche.setLocalisationReelle(data.getLocalisationReelle());
        fiche.setPhotoUrl(data.getPhotoUrl());
        fiche.setCoordonneeGps(data.getCoordonneeGps());
        fiche.setObservation(data.getObservation());
        fiche.setAnomalie(data.getAnomalie());
        if (fiche.getValidationSuperviseur() == statutValidation.VALIDE) {
            fiche.setValidationSuperviseur(statutValidation.EN_ATTENTE);
        }
        InventaireFiche saved = repository.save(fiche);
        ecartDetectionService.syncFromFiche(saved);
        return saved;
    }

    public InventaireFiche validerAgent(Long id, statutValidation statut) {
        InventaireFiche fiche = findById(id);
        fiche.setValidationAgent(statut);
        fiche.setAgentUsername(SecurityContextHolder.getContext().getAuthentication().getName());
        return repository.save(fiche);
    }

    public InventaireFiche validerSuperviseur(Long id, statutValidation statut) {
        InventaireFiche fiche = findById(id);
        if (statut == statutValidation.VALIDE
                && fiche.getValidationAgent() != statutValidation.VALIDE) {
            throw new RuntimeException("Validation superviseur impossible : la validation agent est requise au préalable.");
        }
        fiche.setValidationSuperviseur(statut);
        fiche.setSuperviseurUsername(SecurityContextHolder.getContext().getAuthentication().getName());
        return repository.save(fiche);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }
}
