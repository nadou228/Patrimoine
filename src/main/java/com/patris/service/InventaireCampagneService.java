package com.patris.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;

import com.patris.enums.inventaireStatut;
import com.patris.model.InventaireCampagne;
import com.patris.repository.InventaireCampagneRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class InventaireCampagneService {

    private final InventaireCampagneRepository repository;

    public List<InventaireCampagne> findAll() {
        return repository.findAll();
    }

    public InventaireCampagne findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Campagne introuvable"));
    }

    public InventaireCampagne create(InventaireCampagne campagne) {
        if (campagne.getStatut() == null) {
            campagne.setStatut(inventaireStatut.BROUILLON);
        }
        if (campagne.getDateCreation() == null) {
            campagne.setDateCreation(LocalDateTime.now());
        }
        if (campagne.getCreePar() == null || campagne.getCreePar().isBlank()) {
            campagne.setCreePar(SecurityContextHolder.getContext().getAuthentication().getName());
        }
        return repository.save(campagne);
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
