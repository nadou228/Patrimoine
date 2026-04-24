package com.patris.service;


import com.patris.model.Commune;
import com.patris.model.Consommable;
import com.patris.model.Stock;
import com.patris.repository.CommuneRepository;
import com.patris.repository.ConsommableRepository;
import com.patris.repository.StockRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ConsommableService {

    private final ConsommableRepository consommableRepository;
    private final CommuneRepository communeRepository;
    private final StockRepository stockRepository;

    public List<Consommable> findAll() {
        return consommableRepository.findAll();
    }

    public Consommable findById(Long id) {
        return consommableRepository.findById(id).orElseThrow(()-> new RuntimeException("Consommable introuvable"));
    }

    public Consommable createConsommable(Consommable consommable) {
        if (consommable.getCommune() != null && consommable.getCommune().getId() != null) {
            Long communeId = consommable.getCommune().getId();
            Commune commune = communeRepository.findById(communeId).orElseThrow(() -> new RuntimeException("Commune introuvable"));
            consommable.setCommune(commune);
        } else {
            consommable.setCommune(null);
        }

        if (consommable.getPrixMoyenPondere() == null) {
            consommable.setPrixMoyenPondere(0.0);
        }

        Consommable saved = consommableRepository.save(consommable);

        if (stockRepository.findAll().stream().noneMatch(s -> s.getConsommable() != null && s.getConsommable().getId().equals(saved.getId()))) {
            Stock stock = new Stock();
            stock.setConsommable(saved);
            stock.setQuantite(0);
            stock.setSeuilAlerte(saved.getSeuilAlerte());
            stock.setUnite(saved.getUnite());
            stock.setPrixUnitaireMoyen(saved.getPrixMoyenPondere());
            stockRepository.save(stock);
        }

        return saved;

    }

    public Consommable updateConsommable(Long id, Consommable cDetails) {
        Consommable c = consommableRepository.findById(id).orElseThrow();

        c.setNomProduit(cDetails.getNomProduit());
        c.setSeuilAlerte(cDetails.getSeuilAlerte());
        c.setUnite(cDetails.getUnite());
        c.setServiceAffiche(cDetails.getServiceAffiche());
        c.setCommune(cDetails.getCommune());

        return consommableRepository.save(c);
    }

    public void deleteConsommable(Long id) {
        consommableRepository.deleteById(id);
    }
}
