package com.patris.service;

import java.util.List;

import org.springframework.stereotype.Service;

import com.patris.model.Reforme;
import com.patris.repository.ReformeRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ReformeService {

    private final ReformeRepository repository;

    public List<Reforme> findAll() {
        return repository.findAll();
    }

    public Reforme findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Reforme introuvable"));
    }

    public Reforme create(Reforme reforme) {
        return repository.save(reforme);
    }

    public Reforme update(Long id, Reforme data) {
        Reforme reforme = findById(id);
        reforme.setBien(data.getBien());
        reforme.setTypeReforme(data.getTypeReforme());
        reforme.setMotif(data.getMotif());
        reforme.setRapportTechniqueUrl(data.getRapportTechniqueUrl());
        reforme.setValeurResiduelle(data.getValeurResiduelle());
        reforme.setDecision(data.getDecision());
        reforme.setDateReforme(data.getDateReforme());
        reforme.setStatut(data.getStatut());
        return repository.save(reforme);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }
}
