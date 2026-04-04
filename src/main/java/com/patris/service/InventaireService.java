package com.patris.service;

import com.patris.model.Inventaire;
import com.patris.repository.InventaireRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class InventaireService {
    
    private final InventaireRepository repository;

    public List<Inventaire> findAll() {
        return repository.findAll();
    }

    public Inventaire save(Inventaire entity) {
        return repository.save(entity);
    }
    
    // Ajoutez d'autres mÃ©thodes mÃ©tier ici
}
