package com.patris.service;

import java.util.List;
import org.springframework.stereotype.Service;
import com.patris.model.Bien;
import com.patris.model.Sinistre;
import com.patris.repository.BienRepository;
import com.patris.repository.SinistreRepository;

@Service
public class SinistreService {

    private final SinistreRepository sinistreRepository;
    private final BienRepository bienRepository;

    public SinistreService(SinistreRepository sinistreRepository,
                           BienRepository bienRepository) {
        this.sinistreRepository = sinistreRepository;
        this.bienRepository = bienRepository;
    }

    public List<Sinistre> findAll() {
        return sinistreRepository.findAll();
    }

    public Sinistre findById(Long id) {
        return sinistreRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Sinistre introuvable"));
    }

    public Sinistre save(Sinistre sinistre) {
        // RÃ©solution du bien depuis la base
        if (sinistre.getBien() != null && sinistre.getBien().getId() != null) {
            Bien bien = bienRepository.findById(sinistre.getBien().getId())
                    .orElseThrow(() -> new RuntimeException("Bien introuvable"));
            sinistre.setBien(bien);
        }
        if (sinistre.getStatut() == null) {
            sinistre.setStatut(com.patris.enums.statutSinistre.from("DECLARE"));
        }
        return sinistreRepository.save(sinistre);
    }

    public Sinistre update(Long id, Sinistre s) {
        Sinistre sinistre = findById(id);
        sinistre.setDateSinistre(s.getDateSinistre());
        sinistre.setType(s.getType());
        sinistre.setDescription(s.getDescription());
        sinistre.setMontantEstime(s.getMontantEstime());
        sinistre.setStatut(s.getStatut());
        sinistre.setReferenceAssurance(s.getReferenceAssurance());
        sinistre.setNumeroDossierAssureur(s.getNumeroDossierAssureur());
        sinistre.setMontantIndemnise(s.getMontantIndemnise());
        sinistre.setMontantRembourse(s.getMontantRembourse());
        sinistre.setDatePaiement(s.getDatePaiement());
        sinistre.setPiecesJointes(s.getPiecesJointes());
        sinistre.setLieuSinistre(s.getLieuSinistre());
        sinistre.setDateCloture(s.getDateCloture());

        // Mise Ã  jour du bien si fourni
        if (s.getBien() != null && s.getBien().getId() != null) {
            Bien bien = bienRepository.findById(s.getBien().getId())
                    .orElseThrow(() -> new RuntimeException("Bien introuvable"));
            sinistre.setBien(bien);
        }

        return sinistreRepository.save(sinistre);
    }

    public void delete(Long id) {
        sinistreRepository.deleteById(id);
    }
}
