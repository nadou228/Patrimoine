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
import com.patris.enums.statutValidation;
import com.patris.enums.type_mouvement;
import com.patris.model.Mouvement;
import com.patris.repository.MouvementRepository;
import org.springframework.transaction.annotation.Transactional;

@Service
public class AffectationService {

    private final AffectationRepository repository;
    private final BienRepository bienRepository;
    private final ServicesRepository servicesRepository;
    private final MouvementRepository mouvementRepository;

    public AffectationService(AffectationRepository repository, BienRepository bienRepository, ServicesRepository servicesRepository, MouvementRepository mouvementRepository){
        this.repository = repository;
        this.bienRepository = bienRepository;
        this.servicesRepository = servicesRepository;
        this.mouvementRepository = mouvementRepository;
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

        applyBienAndService(affectation, dto);
        affectation.setStatutValidation(statutValidation.EN_ATTENTE);
        affectation.setMinistere(dto.getMinistere());
        affectation.setPosteComptable(dto.getPosteComptable());
        affectation.setDetenteurA(dto.getDetenteurA());

        return repository.save(affectation);
    }

    @Transactional
    public Affectation validerAffectation(Long id, String validator) {
        Affectation aff = findById(id);
        aff.setStatutValidation(statutValidation.VALIDE);
        aff.setValidePar(validator);
        aff.setDateValidation(LocalDateTime.now());
        
        // CrÃ©ation automatique du mouvement de transfert
        Mouvement m = new Mouvement();
        m.setType(type_mouvement.TRANSFERT);
        m.setBien(aff.getBien());
        m.setServiceDestination(aff.getServices());
        m.setObservation("Affectation validée pour : " + aff.getBeneficaire());
        m.setDateCreation(LocalDateTime.now());
        m.setStatutValidation(statutValidation.VALIDE);
        m.setValidePar(validator);
        m.setDateValidation(LocalDateTime.now());
        mouvementRepository.save(m);
        
        return repository.save(aff);
    }

    @Transactional
    public Affectation rejeterAffectation(Long id, String validator) {
        Affectation aff = findById(id);
        aff.setStatutValidation(statutValidation.REJETE);
        aff.setValidePar(validator);
        aff.setDateValidation(LocalDateTime.now());
        return repository.save(aff);
    }

    public Affectation updateFromDto(Long id, AffectationDto dto) {
        Affectation affectation = findById(id);
        if (dto.getDetenteur() != null) affectation.setBeneficaire(dto.getDetenteur());
        if (dto.getFonction() != null) affectation.setFonction(dto.getFonction());
        if (dto.getMotif() != null && dto.getFonction() == null) affectation.setFonction(dto.getMotif());
        
        if (dto.getDateAffectation() != null && !dto.getDateAffectation().isBlank()) {
            try {
                affectation.setDateAffectation(LocalDate.parse(dto.getDateAffectation()).atStartOfDay());
            } catch (Exception ignored) {}
        }

        applyBienAndService(affectation, dto);
        if (dto.getMinistere() != null) affectation.setMinistere(dto.getMinistere());
        if (dto.getPosteComptable() != null) affectation.setPosteComptable(dto.getPosteComptable());
        if (dto.getDetenteurA() != null) affectation.setDetenteurA(dto.getDetenteurA());

        return repository.save(affectation);
    }

    private void applyBienAndService(Affectation affectation, AffectationDto dto) {
        if (dto.getBien() != null && !dto.getBien().isBlank()) {
            try {
                Long bienId = Long.parseLong(dto.getBien());
                bienRepository.findById(bienId).ifPresent(affectation::setBien);
            } catch (NumberFormatException e) {
                bienRepository.findByDesignation(dto.getBien()).ifPresent(affectation::setBien);
            }
        }

        if (dto.getService() != null && !dto.getService().isBlank()) {
            try {
                Long serviceId = Long.parseLong(dto.getService());
                servicesRepository.findById(serviceId).ifPresent(affectation::setServices);
            } catch (NumberFormatException e) {
                servicesRepository.findByNomService(dto.getService()).ifPresentOrElse(
                    affectation::setServices,
                    () -> {
                        // Crée le service dynamiquement s'il n'existe pas en BDD
                        Services newService = new Services();
                        newService.setNomService(dto.getService());
                        newService = servicesRepository.save(newService);
                        affectation.setServices(newService);
                    }
                );
            }
        }
    }

    public String findPreviousHolder(Long bienId) {
        return repository.findTopByBienIdAndStatutValidationOrderByDateValidationDesc(bienId, statutValidation.VALIDE)
                .map(Affectation::getBeneficaire)
                .orElse("MAGASIN CENTRAL");
    }

    public void delete(Long id){
        repository.deleteById(id);
    }

}
