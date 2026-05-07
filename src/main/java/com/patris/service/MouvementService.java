package com.patris.service;

import java.util.List;
import org.springframework.stereotype.Service;
import com.patris.model.Bien;
import com.patris.model.Mouvement;
import com.patris.model.Services;
import com.patris.repository.BienRepository;
import com.patris.repository.MouvementRepository;
import com.patris.repository.ServicesRepository;
import com.patris.enums.statutValidation;
import java.time.LocalDateTime;
import org.springframework.security.core.context.SecurityContextHolder;

@Service
public class MouvementService {

    private final MouvementRepository repository;
    private final ServicesRepository servicesRepository;
    private final BienRepository bienRepository;

    public MouvementService(MouvementRepository repository,
                            ServicesRepository servicesRepository,
                            BienRepository bienRepository) {
        this.repository = repository;
        this.servicesRepository = servicesRepository;
        this.bienRepository = bienRepository;
    }

    public List<Mouvement> findAll() {
        return repository.findAll();
    }

    public Mouvement findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Mouvement introuvable"));
    }

    public Mouvement save(Mouvement mouvement) {
        // RÃ©solution du bien
        Long bienId = mouvement.getBien().getId();
        Bien bien = bienRepository.findById(bienId)
                .orElseThrow(() -> new RuntimeException("Bien introuvable"));
        mouvement.setBien(bien);

        // Résolution du service source
        if (mouvement.getServiceSource() != null && mouvement.getServiceSource().getId() != null) {
            Long sourceId = mouvement.getServiceSource().getId();
            Services serviceSource = servicesRepository.findById(sourceId)
                    .orElseThrow(() -> new RuntimeException("Service source introuvable"));
            mouvement.setServiceSource(serviceSource);
        }

        // Résolution du service destination
        if (mouvement.getServiceDestination() != null && mouvement.getServiceDestination().getId() != null) {
            Long destinationId = mouvement.getServiceDestination().getId();
            Services serviceDestination = servicesRepository.findById(destinationId)
                    .orElseThrow(() -> new RuntimeException("Service destination introuvable"));
            mouvement.setServiceDestination(serviceDestination);
        }

        if (mouvement.getDateCreation() == null) {
            mouvement.setDateCreation(LocalDateTime.now());
        }
        if (mouvement.getStatutValidation() == null) {
            mouvement.setStatutValidation(statutValidation.EN_ATTENTE);
        }

        return repository.save(mouvement);
    }

    public Mouvement update(Long id, Mouvement m) {
        Mouvement mouvement = findById(id);
        mouvement.setType(m.getType());
        mouvement.setDateCreation(m.getDateCreation());
        mouvement.setObservation(m.getObservation());
        if (m.getStatutValidation() != null) {
            mouvement.setStatutValidation(m.getStatutValidation());
        }
        if (m.getDateValidation() != null) {
            mouvement.setDateValidation(m.getDateValidation());
        }
        if (m.getValidePar() != null) {
            mouvement.setValidePar(m.getValidePar());
        }

        // RÃ©solution du service source
        if (m.getServiceSource() != null && m.getServiceSource().getId() != null) {
            Services serviceSource = servicesRepository.findById(m.getServiceSource().getId())
                    .orElseThrow(() -> new RuntimeException("Service source introuvable"));
            mouvement.setServiceSource(serviceSource);
        }

        // RÃ©solution du service destination
        if (m.getServiceDestination() != null && m.getServiceDestination().getId() != null) {
            Services serviceDestination = servicesRepository.findById(m.getServiceDestination().getId())
                    .orElseThrow(() -> new RuntimeException("Service destination introuvable"));
            mouvement.setServiceDestination(serviceDestination);
        }

        return repository.save(mouvement);
    }

    public Mouvement valider(Long id, statutValidation statut) {
        Mouvement mouvement = findById(id);
        mouvement.setStatutValidation(statut);
        mouvement.setValidePar(SecurityContextHolder.getContext().getAuthentication().getName());
        mouvement.setDateValidation(LocalDateTime.now());
        return repository.save(mouvement);
    }

    public List<Mouvement> findByBienId(Long bienId) {
        return repository.findByBienIdOrderByDateCreationDesc(bienId);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }
}
