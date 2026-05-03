package com.patris.service;

import java.util.List;
import com.patris.enums.statutOperationnel;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;
import com.patris.model.Reforme;
import com.patris.repository.ReformeRepository;
import com.patris.audit.AuditService;

@Service
public class ReformeService {

    private final ReformeRepository repository;
    private final BienService bienService;
    private final AuditService auditService;

    public ReformeService(ReformeRepository repository, BienService bienService, AuditService auditService) {
        this.repository = repository;
        this.bienService = bienService;
        this.auditService = auditService;
    }

    public List<Reforme> findAll() {
        return repository.findAll();
    }

    public Reforme findById(Long id) {
        return repository.findById(id)
                .orElseThrow(() -> new RuntimeException("Reforme introuvable"));
    }

    public Reforme create(Reforme reforme) {
        if (reforme.getDateReforme() == null) {
            reforme.setDateReforme(java.time.LocalDate.now());
        }
        if (reforme.getStatut() == null || reforme.getStatut().isBlank()) {
            reforme.setStatut("EN_ATTENTE_VALIDATION");
        }
        if (reforme.getTypeReforme() != null && "MISE_AU_REBUT".equals(reforme.getTypeReforme()) && reforme.getValeurResiduelle() == null) {
            reforme.setValeurResiduelle(0.0);
        }
        return repository.save(reforme);
    }

    public Reforme update(Long id, Reforme data) {
        Reforme reforme = findById(id);
        String ancienneVal = "{\"statut\":\"" + reforme.getStatut() + "\"}";
        
        reforme.setBien(data.getBien());
        reforme.setTypeReforme(data.getTypeReforme());
        reforme.setMotif(data.getMotif());
        reforme.setRapportTechniqueUrl(data.getRapportTechniqueUrl());
        reforme.setValeurResiduelle(data.getValeurResiduelle());
        reforme.setPrixCession(data.getPrixCession());
        reforme.setAcheteur(data.getAcheteur());
        reforme.setReferenceActe(data.getReferenceActe());
        reforme.setMinistereDestinataire(data.getMinistereDestinataire());
        reforme.setOrdreTransfert(data.getOrdreTransfert());
        reforme.setDecision(data.getDecision());
        reforme.setDateReforme(data.getDateReforme());
        
        reforme.setStatut(data.getStatut());
        
        String nouvelleVal = "{\"statut\":\"" + data.getStatut() + "\"}";
        auditService.save("REFORME_MODIFIEE", "Reforme", id, "Mise à jour de la reforme", ancienneVal, nouvelleVal);
        
        return repository.save(reforme);
    }

    public void delete(Long id) {
        auditService.save("REFORME_SUPPRIMEE", "Reforme", id, "Suppression de la reforme", null, null);
        repository.deleteById(id);
    }

    @Transactional
    public Reforme valider(Long id, String acteur) {
        Reforme reforme = findById(id);
        String ancienneVal = "{\"statut\":\"" + reforme.getStatut() + "\"}";
        reforme.setStatut("VALIDE");
        reforme.setDecision("Validation responsable patrimoine");
        if (reforme.getBien() != null) {
            bienService.changerStatut(reforme.getBien().getId(), statutOperationnel.REFORME.name(), reforme.getBien().getService(), acteur);
            reforme.getBien().setArchived(true);
        }
        auditService.save("VALIDATION_REFORME", "Reforme", reforme.getId(), "Validation de la reforme", ancienneVal, "{\"statut\":\"VALIDE\"}");
        return repository.save(reforme);
    }

    @Transactional
    public Reforme annuler(Long id, String acteur) {
        Reforme reforme = findById(id);
        String ancienneVal = "{\"statut\":\"" + reforme.getStatut() + "\"}";
        reforme.setStatut("ANNULEE");
        reforme.setDecision("Reforme annulee");
        if (reforme.getBien() != null) {
            reforme.getBien().setArchived(false);
            bienService.changerStatut(reforme.getBien().getId(), statutOperationnel.ACTIF.name(), reforme.getBien().getService(), acteur);
        }
        auditService.save("ANNULATION_REFORME", "Reforme", reforme.getId(), "Annulation de la reforme", ancienneVal, "{\"statut\":\"ANNULEE\"}");
        return repository.save(reforme);
    }
}
