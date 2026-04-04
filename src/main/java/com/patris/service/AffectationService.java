package com.patris.service;

import com.patris.dto.AffectationDto;
import com.patris.model.Affectation;
import com.patris.model.Bien;
import com.patris.model.Services;
import com.patris.repository.AffectationRepository;
import com.patris.repository.BienRepository;
import com.patris.repository.ServicesRepository;

import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
public class AffectationService {

    private final AffectationRepository repository;
    private final BienRepository bienRepository;
    private final ServicesRepository servicesRepository;

    public AffectationService(AffectationRepository repository, BienRepository bienRepository, ServicesRepository servicesRepository){
        this.repository = repository;
        this.bienRepository = bienRepository;
        this.servicesRepository = servicesRepository;
    }

    public List<Affectation> findAll() {
        return repository.findAll();
    }

    public Affectation findById(Long id){
        return repository.findById(id).orElseThrow(()-> new RuntimeException("Affectation introuvable"));
    }

    public Affectation saveFromDto(AffectationDto dto) {
        Affectation affectation = new Affectation();
        affectation.setBeneficaire(dto.getDetenteur());
        affectation.setFonction(dto.getFonction() != null ? dto.getFonction() : dto.getMotif());
        
        if (dto.getDateAffectation() != null && !dto.getDateAffectation().isBlank()) {
            try {
                affectation.setDateAffectation(LocalDate.parse(dto.getDateAffectation()).atStartOfDay());
            } catch (Exception e) {
                affectation.setDateAffectation(LocalDateTime.now());
            }
        } else {
            affectation.setDateAffectation(LocalDateTime.now());
        }

        // Recherche du bien
        if (dto.getBien() != null && !dto.getBien().isBlank()) {
            try {
                Long bienId = Long.parseLong(dto.getBien());
                bienRepository.findById(bienId).ifPresent(affectation::setBien);
            } catch (NumberFormatException e) {
                bienRepository.findByDesignation(dto.getBien()).ifPresent(affectation::setBien);
            }
        }

        // Recherche du service
        if (dto.getService() != null && !dto.getService().isBlank()) {
            try {
                Long serviceId = Long.parseLong(dto.getService());
                servicesRepository.findById(serviceId).ifPresent(affectation::setServices);
            } catch (NumberFormatException e) {
                servicesRepository.findByNomService(dto.getService()).ifPresent(affectation::setServices);
            }
        }

        return repository.save(affectation);
    }

    public Affectation updateFromDto(Long id, AffectationDto dto) {
        Affectation affectation = findById(id);
        if (dto.getDetenteur() != null) affectation.setBeneficaire(dto.getDetenteur());
        if (dto.getFonction() != null) affectation.setFonction(dto.getFonction());
        
        if (dto.getDateAffectation() != null && !dto.getDateAffectation().isBlank()) {
            try {
                affectation.setDateAffectation(LocalDate.parse(dto.getDateAffectation()).atStartOfDay());
            } catch (Exception ignored) {}
        }

        return repository.save(affectation);
    }

    public void delete(Long id){
        repository.deleteById(id);
    }

}
