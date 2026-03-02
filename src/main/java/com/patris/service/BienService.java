package com.patris.service;

import com.patris.model.Bien;
import com.patris.repository.BienRepository;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.Period;
import java.util.List;

@Service
@RequiredArgsConstructor
public class BienService {

    private final BienRepository bienRepository;

    public List<Bien> findAll() {
        return bienRepository.findAll();
    }

    public Bien findById(Long id) {
        return bienRepository.findById(id).orElseThrow(()-> new RuntimeException("Bien introuvable"));
    }

    public double calculValeurNette(Bien bien){
        double amortissementAnnuel = bien.getValeur() / bien.getDureeAmortissement();
        int annee = Period.between(bien.getDateAcquisition().toLocalDate(), LocalDate.now()).getYears();

        return bien.getValeur() - (amortissementAnnuel * annee);
    }

    public Double valeurTotalePatrimoine(){
        return bienRepository.findAll().stream().mapToDouble(Bien::getValeur).sum();
    }

    public Bien saveBien(Bien bien) {
        return bienRepository.save(bien);
    }


    public Bien update(Long id, Bien b){
        Bien bien = findById(id);
        bien.setCodeBien(b.getCodeBien());
        bien.setDesignation(b.getDesignation());
        bien.setCategorie(b.getCategorie());
        bien.setDateAcquisition(b.getDateAcquisition());
        bien.setValeur(b.getValeur());
        bien.setEtat(b.getEtat());
        bien.setLocalisation(b.getLocalisation());
        bien.setObservation(b.getObservation());
        bien.setDureeAmortissement(b.getDureeAmortissement());
        bien.setTauxAmortissement(b.getTauxAmortissement());
        bien.setValeurNetteComptable(b.getValeurNetteComptable());
        bien.setAmortissementCumule(b.getAmortissementCumule());
        bien.setStatutValidation(b.getStatutValidation());
        bien.setValiderPar(b.getValiderPar());
        bien.setDateValidation(b.getDateValidation());
        
        return bienRepository.save(bien);
    }

    public void deleteBien(Long id) {
        bienRepository.deleteById(id);
    }

}

