package com.patris.service;

import java.util.List;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.patris.model.Bail;
import com.patris.model.Bien;
import com.patris.repository.BailRepository;
import com.patris.repository.BienRepository;

@Service
public class BailService {
    
    @Autowired
    private final BailRepository repository;
    private final BienRepository bienRepository;

    public BailService(BailRepository repository, BienRepository bienRepository){
        this.repository = repository;
        this.bienRepository = bienRepository;
    }

    public List<Bail> findAll(){
        return repository.findAll();
    }

    public Bail findById(Long id){
        return repository.findById(id).orElseThrow(()-> new RuntimeException("Bail introuvable"));
    }

    public Bail save(Bail bail){
        Long bienId = bail.getBien().getId();
        Bien bien = bienRepository.findById(bienId).orElseThrow(()-> new RuntimeException("Bien introuvable"));
        bail.setBien(bien);
        
        return repository.save(bail);
    }

    public Bail update(Long id, Bail b){
        Bail bail = findById(id);
        bail.setLocataire(b.getLocataire());
        bail.setMontantLoyer(b.getMontantLoyer());
        bail.setDateDebut(b.getDateDebut());
        bail.setDateFin(b.getDateFin());
        bail.setStatut(b.getStatut());

        return repository.save(bail);
    }

    public void delete(Long id){
        repository.deleteById(id);
    }

}
