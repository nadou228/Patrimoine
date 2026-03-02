package com.patris.service;


import com.patris.model.Commune;
import com.patris.model.Consommable;
import com.patris.repository.CommuneRepository;
import com.patris.repository.ConsommableRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ConsommableService {

    private final ConsommableRepository consommableRepository;
    private final CommuneRepository communeRepository;

    public List<Consommable> findAll() {
        return consommableRepository.findAll();
    }

    public Consommable findById(Long id) {
        return consommableRepository.findById(id).orElseThrow(()-> new RuntimeException("Consommable introuvable"));
    }

    public Consommable createConsommable(Consommable consommable) {
        Long communeId = consommable.getCommune().getId();
        Commune commune = communeRepository.findById(communeId).orElseThrow(()-> new RuntimeException("Commune introuvable"));
        consommable.setCommune(commune);
        
        return consommableRepository.save(consommable);

    }

    public Consommable updateConsommable(Long id, Consommable cDetails) {
        Consommable c = consommableRepository.findById(id).orElseThrow();

        c.setNomProduit(cDetails.getNomProduit());
        c.setSeuilAlerte(cDetails.getSeuilAlerte());
        c.setUnite(cDetails.getUnite());
        c.setDateEntree(cDetails.getDateEntree());
        c.setDateSortie(cDetails.getDateSortie());
        c.setServiceAffiche(cDetails.getServiceAffiche());
        c.setCommune(cDetails.getCommune());

        return consommableRepository.save(c);
    }

    public void deleteConsommable(Long id) {
        consommableRepository.deleteById(id);
    }
}
