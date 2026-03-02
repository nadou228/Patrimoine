package com.patris.service;

import com.patris.model.Affectation;
import com.patris.model.Bien;
import com.patris.model.Services;
import com.patris.repository.AffectationRepository;
import com.patris.repository.BienRepository;
import com.patris.repository.ServicesRepository;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
public class AffectationService {

    private final AffectationRepository repository;
    private final BienRepository bienRepository;
    private final ServicesRepository servicesRepository;

    public AffectationService(AffectationRepository repository, BienRepository bienRepository, ServicesRepository servicesRepository){
        this.repository = repository;
        this.bienRepository = bienRepository;
        this.servicesRepository = servicesRepository;
    }

    public List<Affectation> findAll() {
        return repository.findAll();
    }

    public Affectation findById(Long id){
        return repository.findById(id).orElseThrow(()-> new RuntimeException("Affectation introuvable"));
    }

    public Affectation save(Affectation affectation) {
        Long bienId = affectation.getBien().getId();
        Long servicesId = affectation.getServices().getId();
        Bien bien = bienRepository.findById(bienId).orElseThrow(()-> new RuntimeException("Bien introuvable"));
        Services services = servicesRepository.findById(servicesId).orElseThrow(()-> new RuntimeException("Services introuvable"));
        affectation.setBien(bien);
        affectation.setServices(services);
        
        return repository.save(affectation);
    }

    public Affectation update(Long id, Affectation a){
        Affectation affectation = findById(id);
        affectation.setDateAffectation(a.getDateAffectation());
        affectation.setDateFin(a.getDateFin());
        
        return repository.save(affectation);
    }  

    public void delete(Long id){
        repository.deleteById(id);
    }

}