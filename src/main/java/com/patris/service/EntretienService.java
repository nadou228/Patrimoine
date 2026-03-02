package com.patris.service;

import com.patris.model.Bien;
import com.patris.model.Entretien;
import com.patris.repository.BienRepository;
import com.patris.repository.EntretienRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class EntretienService {
    
    private final BienRepository bienRepository;
    private final EntretienRepository repository;

    public List<Entretien> findAll() {
        return repository.findAll();
    }

    public Entretien findById(Long id) {
        return repository.findById(id).orElseThrow(()-> new RuntimeException("Entretien introuvable"));
    }

    public Entretien save(Entretien entretien) {
        Long bienId = entretien.getBien().getId();
        Bien bien = bienRepository.findById(bienId).orElseThrow(()-> new RuntimeException("Bien introuvable"));
        entretien.setBien(bien);
        return repository.save(entretien);
    }

    public Entretien update(Long id, Entretien e){
        Entretien entretien = findById(id);
        entretien.setDatePrevue(e.getDatePrevue());
        entretien.setDateRealisee(e.getDateRealisee());
        entretien.setCout(e.getCout());
        entretien.setPrestataire(e.getPrestataire());
        entretien.setObservation(e.getObservation());

        return repository.save(entretien);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }
}

