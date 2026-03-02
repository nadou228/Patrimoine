package com.patris.service;

import java.util.List;
import org.springframework.stereotype.Service;
import com.patris.model.Bien;
import com.patris.model.Mouvement;
import com.patris.model.Services;
import com.patris.repository.BienRepository;
import com.patris.repository.MouvementRepository;
import com.patris.repository.ServicesRepository;

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
        // Résolution du bien
        Long bienId = mouvement.getBien().getId();
        Bien bien = bienRepository.findById(bienId)
                .orElseThrow(() -> new RuntimeException("Bien introuvable"));
        mouvement.setBien(bien);

        // Résolution du service source
        Long sourceId = mouvement.getServiceSource().getId();
        Services serviceSource = servicesRepository.findById(sourceId)
                .orElseThrow(() -> new RuntimeException("Service source introuvable"));
        mouvement.setServiceSource(serviceSource);

        // Résolution du service destination
        Long destinationId = mouvement.getServiceDestination().getId();
        Services serviceDestination = servicesRepository.findById(destinationId)
                .orElseThrow(() -> new RuntimeException("Service destination introuvable"));
        mouvement.setServiceDestination(serviceDestination);

        return repository.save(mouvement);
    }

    public Mouvement update(Long id, Mouvement m) {
        Mouvement mouvement = findById(id);
        mouvement.setType(m.getType());
        mouvement.setDateCreation(m.getDateCreation());
        mouvement.setObservation(m.getObservation());

        // Résolution du service source
        if (m.getServiceSource() != null && m.getServiceSource().getId() != null) {
            Services serviceSource = servicesRepository.findById(m.getServiceSource().getId())
                    .orElseThrow(() -> new RuntimeException("Service source introuvable"));
            mouvement.setServiceSource(serviceSource);
        }

        // Résolution du service destination
        if (m.getServiceDestination() != null && m.getServiceDestination().getId() != null) {
            Services serviceDestination = servicesRepository.findById(m.getServiceDestination().getId())
                    .orElseThrow(() -> new RuntimeException("Service destination introuvable"));
            mouvement.setServiceDestination(serviceDestination);
        }

        return repository.save(mouvement);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }
}