package com.patris.service;


import com.patris.model.Bien;
import com.patris.model.Immobilier;
import com.patris.repository.BienRepository;
import com.patris.repository.ImmobilierRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;
import java.util.List;

@Service
@RequiredArgsConstructor
public class ImmobilierService {
    
    private final BienRepository bienRepository;
    private final ImmobilierRepository immobilierRepository;


    public List<Immobilier> findAll() {
        return immobilierRepository.findAll();
    }

    public Immobilier findById(Long id) {
        return immobilierRepository.findById(id).orElseThrow(()-> new RuntimeException("Immobilier intouvable"));
    }

    public Immobilier save(Immobilier immobilier) {
        Long bienId = immobilier.getBien().getId();
        Bien bien = bienRepository.findById(bienId).orElseThrow(()-> new RuntimeException("Bien introuvable"));
        immobilier.setBien(bien);
        return immobilierRepository.save(immobilier);
    }

    public Immobilier update(Long id, Immobilier i){
        Immobilier immobilier = findById(id);
        immobilier.setSuperficie(i.getSuperficie());
        immobilier.setStatutFoncier(i.getStatutFoncier());
        immobilier.setUsage(i.getUsage());
        immobilier.setAdresse(i.getAdresse());
        immobilier.setCoordonneeGps(i.getCoordonneeGps());
        
        return immobilierRepository.save(immobilier);
    }

    public void delete(Long id) {
        immobilierRepository.deleteById(id);
    }
}
