import java.util.List;
import com.patris.enums.statutOperationnel;

import org.springframework.stereotype.Service;

import com.patris.model.Reforme;
import com.patris.repository.ReformeRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class ReformeService {

    private final ReformeRepository repository;

    public List<Reforme> findAll() {
        return repository.findAll();
    }

    public Reforme findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Reforme introuvable"));
    }

    public Reforme create(Reforme reforme) {
        if (reforme.getBien() != null && reforme.getBien().getId() != null) {
            // Optionnel: On pourrait marquer le bien comme EN_TRANSFERT/EN_REFORME ici
        }
        return repository.save(reforme);
    }

    public Reforme update(Long id, Reforme data) {
        Reforme reforme = findById(id);
        reforme.setBien(data.getBien());
        reforme.setTypeReforme(data.getTypeReforme());
        reforme.setMotif(data.getMotif());
        reforme.setRapportTechniqueUrl(data.getRapportTechniqueUrl());
        reforme.setValeurResiduelle(data.getValeurResiduelle());
        reforme.setDecision(data.getDecision());
        reforme.setDateReforme(data.getDateReforme());
        
        // Si le statut passe Ã  VALIDE, on met le bien en statut REFORME
        if ("VALIDE".equals(data.getStatut()) && !"VALIDE".equals(reforme.getStatut())) {
            if (reforme.getBien() != null) {
                reforme.getBien().setStatutOperationnel(statutOperationnel.REFORME);
            }
        }
        
        reforme.setStatut(data.getStatut());
        return repository.save(reforme);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }
}
