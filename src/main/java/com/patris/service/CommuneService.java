package com.patris.service;

import com.patris.model.Commune;
import com.patris.model.Prefecture;
import com.patris.repository.CommuneRepository;
import com.patris.repository.PrefectureRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.util.List;

@Service
@RequiredArgsConstructor
public class CommuneService {
    
    private final CommuneRepository communeRepository;
    private final PrefectureRepository prefectureRepository;

    public List<Commune> findAll() {
        return communeRepository.findAll();
    }

    public Commune findById(Long id){
        return communeRepository.findById(id).orElseThrow(()-> new RuntimeException("Prefecture intouvable"));
    }

    public Commune save(Commune commune) {
        Long prefectureId = commune.getPrefecture().getId();
        Prefecture prefecture = prefectureRepository.findById(prefectureId).orElseThrow(()-> new RuntimeException("Prefecture introuvable"));
        commune.setPrefecture(prefecture);
        
        return communeRepository.save(commune);
    }

    public Commune updateCommune(Long id, Commune communeDetails) {
        Commune commune = communeRepository.findById(id).orElseThrow();
        commune.setNomCommune(communeDetails.getNomCommune());
        return communeRepository.save(commune);
    }

    public void deleteCommune(Long id) {
        communeRepository.deleteById(id);
    }

}
