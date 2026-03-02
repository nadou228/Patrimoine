package com.patris.service;

import com.patris.model.Bien;
import com.patris.model.Mobilier;
import com.patris.repository.BienRepository;
import com.patris.repository.MobilierRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class MobilierService {
    
    private final BienRepository bienRepository;
    private final MobilierRepository mobilierRepository;

    public List<Mobilier> findAll() {
        return mobilierRepository.findAll();
    }

    public Mobilier findById(Long id) {
        return mobilierRepository.findById(id).orElseThrow(()-> new RuntimeException("Mobilier introuvale"));
    }

    public Mobilier save(Mobilier mobilier) {
        Long bienId = mobilier.getBien().getId();
        Bien bien = bienRepository.findById(bienId).orElseThrow(()-> new RuntimeException("Bien introuvable"));
        mobilier.setBien(bien);
        return mobilierRepository.save(mobilier);
    }

    public Mobilier update(Long id, Mobilier m){
        Mobilier mobilier = findById(id);
        mobilier.setNumeroSerie(m.getNumeroSerie());
        mobilier.setCodeQr(m.getCodeQr());
        mobilier.setServiceAffectation(m.getServiceAffectation());

        return mobilierRepository.save(mobilier);
    }

    public void delete(Long id) {
        mobilierRepository.deleteById(id);
    }
}
