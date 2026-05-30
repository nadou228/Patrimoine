package com.patris.service;

import com.patris.audit.AuditService;
import com.patris.dto.AffectationDto;
import com.patris.enums.statutOperationnel;
import com.patris.enums.statutValidation;
import com.patris.enums.type_mouvement;
import com.patris.model.Affectation;
import com.patris.model.Beneficiaire;
import com.patris.model.Mouvement;
import com.patris.model.Services;
import com.patris.repository.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Service
@RequiredArgsConstructor
public class AffectationService {

    private final AffectationRepository repository;
    private final BienRepository bienRepository;
    private final ServicesRepository servicesRepository;
    private final MouvementRepository mouvementRepository;
    private final BeneficiaireRepository beneficiaireRepository;
    private final AuditService auditService;
    private final BienService bienService;

    public List<Affectation> findAll() {
        return repository.findAll();
    }

    public Affectation findById(Long id){
        return repository.findById(id).orElseThrow(()-> new RuntimeException("Affectation introuvable"));
    }

    @Transactional
    public Affectation saveFromDto(AffectationDto dto) {
        Affectation affectation = new Affectation();
        
        if (dto.getBeneficiaireId() != null) {
            Beneficiaire b = beneficiaireRepository.findById(dto.getBeneficiaireId())
                    .orElseThrow(() -> new RuntimeException("Bénéficiaire introuvable"));
            affectation.setBeneficiaire(b);
        }
        
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
        affectation.setSignatureUrl(dto.getSignatureUrl());
        if (dto.getDocumentsUrls() != null) {
            affectation.getDocumentsUrls().clear();
            affectation.getDocumentsUrls().addAll(dto.getDocumentsUrls());
        }

        return repository.save(affectation);
    }

    @Transactional
    public Affectation validerAffectation(Long id, String validator) {
        Affectation aff = findById(id);
        aff.setStatutValidation(statutValidation.VALIDE);
        aff.setValidePar(validator);
        aff.setDateValidation(LocalDateTime.now());
        
        // Création automatique du mouvement de transfert
        Mouvement m = new Mouvement();
        m.setType(type_mouvement.TRANSFERT);
        m.setBien(aff.getBien());
        m.setServiceDestination(aff.getServices());
        String nomBeneficiaire = aff.getBeneficiaire() != null ? 
            (aff.getBeneficiaire().getNom() + " " + aff.getBeneficiaire().getPrenom()) : "N/A";
        m.setObservation("Affectation validée pour : " + nomBeneficiaire);
        m.setDateCreation(LocalDateTime.now());
        m.setStatutValidation(statutValidation.VALIDE);
        m.setValidePar(validator);
        m.setDateValidation(LocalDateTime.now());
        mouvementRepository.save(m);

        if (aff.getBien() != null) {
            bienService.changerStatut(
                aff.getBien().getId(),
                statutOperationnel.AFFECTE.name(),
                aff.getServices() != null ? aff.getServices().getNomService() : aff.getBien().getService(),
                validator
            );
        }
        
        String ancienneVal = "{\"statutValidation\":\"EN_ATTENTE\"}";
        String nouvelleVal = "{\"statutValidation\":\"VALIDE\"}";
        // Audit log
        auditService.save("VALIDATION_AFFECTATION", "Affectation", aff.getId(), "Validation affectation", ancienneVal, nouvelleVal);
        
        return repository.save(aff);
    }

    @Transactional
    public Affectation rejeterAffectation(Long id, String validator) {
        Affectation aff = findById(id);
        aff.setStatutValidation(statutValidation.REJETE);
        aff.setValidePar(validator);
        aff.setDateValidation(LocalDateTime.now());
        
        String ancienneVal = "{\"statutValidation\":\"EN_ATTENTE\"}";
        String nouvelleVal = "{\"statutValidation\":\"REJETE\"}";
        // Audit log
        auditService.save("REJET_AFFECTATION", "Affectation", aff.getId(), "Rejet affectation", ancienneVal, nouvelleVal);
        
        return repository.save(aff);
    }

    @Transactional
    public Affectation updateFromDto(Long id, AffectationDto dto) {
        Affectation affectation = findById(id);
        String ancienneVal = "{\"fonction\":\"" + affectation.getFonction() + "\", \"ministere\":\"" + affectation.getMinistere() + "\"}";
        
        
        if (dto.getBeneficiaireId() != null) {
            Beneficiaire b = beneficiaireRepository.findById(dto.getBeneficiaireId())
                    .orElseThrow(() -> new RuntimeException("Bénéficiaire introuvable"));
            affectation.setBeneficiaire(b);
        }
        
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
        if (dto.getDocumentsUrls() != null) {
            affectation.getDocumentsUrls().clear();
            affectation.getDocumentsUrls().addAll(dto.getDocumentsUrls());
        }

        String nouvelleVal = "{\"fonction\":\"" + affectation.getFonction() + "\", \"ministere\":\"" + affectation.getMinistere() + "\"}";
        auditService.save("AFFECTATION_MODIFIEE", "Affectation", id, "Mise à jour de l'affectation", ancienneVal, nouvelleVal);

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
                .map(aff -> aff.getBeneficiaire() != null ? (aff.getBeneficiaire().getNom() + " " + aff.getBeneficiaire().getPrenom()) : "N/A")
                .orElse("MAGASIN CENTRAL");
    }

    public void delete(Long id){
        auditService.save("AFFECTATION_SUPPRIMEE", "Affectation", id, "Suppression de l'affectation", null, null);
        repository.deleteById(id);
    }

    @Transactional
    public Affectation addDocumentUrl(Long id, String url) {
        Affectation aff = findById(id);
        aff.getDocumentsUrls().add(url);
        return repository.save(aff);
    }

    @Transactional
    public Affectation retournerAffectation(Long id, String motif, String dateRetour, String acteur) {
        Affectation affectation = findById(id);
        String ancienneVal = "{\"dateFin\":\"" + affectation.getDateFin() + "\", \"fonction\":\"" + affectation.getFonction() + "\"}";
        affectation.setDateFin(LocalDateTime.now());
        affectation.setFonction(motif != null && !motif.isBlank() ? motif : affectation.getFonction());
        affectation.setValidePar(acteur);

        if (affectation.getBien() != null) {
            bienService.changerStatut(affectation.getBien().getId(), statutOperationnel.ACTIF.name(), "", acteur);
        }

        String nouvelleVal = "{\"dateFin\":\"" + affectation.getDateFin() + "\", \"fonction\":\"" + affectation.getFonction() + "\"}";
        auditService.save("RETOUR_AFFECTATION", "Affectation", affectation.getId(), motif, ancienneVal, nouvelleVal);
        return repository.save(affectation);
    }

}
