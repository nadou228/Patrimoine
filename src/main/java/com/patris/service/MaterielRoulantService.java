package com.patris.service;

import com.patris.model.Bien;
import com.patris.model.MaterielRoulant;
import com.patris.repository.BienRepository;
import com.patris.repository.MaterielRoulantRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MaterielRoulantService {

    private final BienRepository bienRepository;
    private final MaterielRoulantRepository repository;

    public List<MaterielRoulant> findAll() {
        return repository.findAll();
    }

    public MaterielRoulant findById(Long id) {
        return repository.findById(id).orElseThrow(()-> new RuntimeException("Materiel roulante introuvable"));
    }

    public MaterielRoulant save(MaterielRoulant materiel) {
        Long bienId = materiel.getBien().getId();
        Bien bien = bienRepository.findById(bienId).orElseThrow(()-> new RuntimeException("Bien introuvable"));
        materiel.setBien(bien);
        
        return repository.save(materiel);
    }

    public MaterielRoulant update(Long id, MaterielRoulant m){
        MaterielRoulant materiel = findById(id);
        materiel.setImmatriculation(m.getImmatriculation());
        materiel.setMarque(m.getMarque());
        materiel.setModele(m.getModele());
        materiel.setCarburant(m.getCarburant());
        materiel.setKilometrage(m.getKilometrage());
        materiel.setDateVisiteTechnique(m.getDateVisiteTechnique());
        materiel.setDateAssurance(m.getDateAssurance());
        materiel.setDateFinAssurance(m.getDateFinAssurance());
        materiel.setNumeroAssurance(m.getNumeroAssurance());

        return repository.save(materiel);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }
}
