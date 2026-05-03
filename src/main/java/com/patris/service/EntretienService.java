package com.patris.service;

import com.patris.model.Bien;
import com.patris.model.Entretien;
import com.patris.repository.BienRepository;
import com.patris.repository.EntretienRepository;
import com.patris.audit.AuditService;

import lombok.RequiredArgsConstructor;

import org.springframework.stereotype.Service;

import java.util.List;
import java.time.LocalDate;

@Service
@RequiredArgsConstructor
public class EntretienService {
    
    private final BienRepository bienRepository;
    private final EntretienRepository repository;
    private final AuditService auditService;

    public List<Entretien> findAll() {
        return repository.findAll();
    }

    public Entretien findById(Long id) {
        return repository.findById(id).orElseThrow(()-> new RuntimeException("Entretien introuvable"));
    }

    public Entretien save(Entretien entretien) {
        Long bienId = entretien.getBien().getId();
        Bien bien = bienRepository.findById(bienId).orElseThrow(()-> new RuntimeException("Bien introuvable"));
        entretien.setBien(bien);
        if (entretien.getStatut() == null || entretien.getStatut().isBlank()) {
            if (entretien.getDateRealisee() != null) {
                entretien.setStatut("TERMINEE");
            } else if (entretien.getDatePrevue() != null && entretien.getDatePrevue().isEqual(LocalDate.now())) {
                entretien.setStatut("EN_COURS");
            } else {
                entretien.setStatut("PLANIFIEE");
            }
        }
        return repository.save(entretien);
    }

    public Entretien update(Long id, Entretien e){
        Entretien entretien = findById(id);
        String existingStatut = entretien.getStatut();
        
        entretien.setDatePrevue(e.getDatePrevue());
        entretien.setDateRealisee(e.getDateRealisee());
        entretien.setCout(e.getCout());
        entretien.setPrestataire(e.getPrestataire());
        entretien.setType(e.getType());
        entretien.setObservation(e.getObservation());
        entretien.setDescription(e.getDescription());
        entretien.setRapportUrl(e.getRapportUrl());
        entretien.setStatut(e.getStatut());

        String ancienneVal = "{\"statut\":\"" + existingStatut + "\"}";
        String nouvelleVal = "{\"statut\":\"" + e.getStatut() + "\"}";
        auditService.save("ENTRETIEN_MODIFIE", "Entretien", id, "Modification d'entretien", ancienneVal, nouvelleVal);

        return repository.save(entretien);
    }

    public Entretien cloturer(Long id){
        Entretien entretien = findById(id);
        String ancienneVal = "{\"statut\":\"" + entretien.getStatut() + "\"}";
        entretien.setDateRealisee(LocalDate.now());
        entretien.setStatut("TERMINEE");
        
        auditService.save("ENTRETIEN_CLOTURE", "Entretien", id, "Clôture d'entretien", ancienneVal, "{\"statut\":\"TERMINEE\"}");
        return repository.save(entretien);
    }

    public void delete(Long id) {
        auditService.save("ENTRETIEN_SUPPRIME", "Entretien", id, "Suppression d'entretien");
        repository.deleteById(id);
    }

    public Double calculerCoutTotalEntretiens(Long bienId) {
        return repository.findByBienId(bienId).stream()
                       .mapToDouble(Entretien::getCout)
                       .sum();
    }
}
