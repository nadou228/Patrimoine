package com.patris.service;

import com.patris.model.Region;
import com.patris.model.Services;
import com.patris.repository.RegionRepository;
import com.patris.repository.ServicesRepository;
import org.springframework.stereotype.Service;
import java.util.List;

@Service
public class ServicesService {

    private final ServicesRepository repository;
    private final RegionRepository regionRepository;

    public ServicesService(ServicesRepository repository,
                           RegionRepository regionRepository) {
        this.repository = repository;
        this.regionRepository = regionRepository;
    }

    public List<Services> findAll() {
        return repository.findAll();
    }

    public Services findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Service introuvable"));
    }

    public Services save(Services service) {
        // RÃ©solution de la rÃ©gion depuis la base
        if (service.getRegion() != null && service.getRegion().getId() != null) {
            Region region = regionRepository.findById(service.getRegion().getId())
                    .orElseThrow(() -> new RuntimeException("RÃ©gion introuvable"));
            service.setRegion(region);
        }
        return repository.save(service);
    }

    public Services update(Long id, Services s) {
        Services service = findById(id);
        service.setNomService(s.getNomService());

        // Mise Ã  jour de la rÃ©gion si elle est fournie
        if (s.getRegion() != null && s.getRegion().getId() != null) {
            Region region = regionRepository.findById(s.getRegion().getId())
                    .orElseThrow(() -> new RuntimeException("RÃ©gion introuvable"));
            service.setRegion(region);
        }

        return repository.save(service);
    }

    public void delete(Long id) {
        repository.deleteById(id);
    }
}
