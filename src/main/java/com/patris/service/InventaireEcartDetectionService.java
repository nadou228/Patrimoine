package com.patris.service;

import java.util.ArrayList;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.patris.enums.statutValidation;
import com.patris.enums.typeEcartInventaire;
import com.patris.model.Bien;
import com.patris.model.InventaireCampagne;
import com.patris.model.InventaireEcart;
import com.patris.model.InventaireFiche;
import com.patris.repository.InventaireEcartRepository;
import com.patris.repository.InventaireFicheRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class InventaireEcartDetectionService {

    private static final String NON_VERIFIE = "NON_VERIFIÉ";

    private final InventaireEcartRepository ecartRepository;
    private final InventaireFicheRepository ficheRepository;

    @Transactional
    public List<InventaireEcart> syncFromFiche(InventaireFiche fiche) {
        List<InventaireEcart> generated = new ArrayList<>();
        if (fiche.getCampagne() == null || fiche.getBien() == null) {
            return generated;
        }

        Bien bien = fiche.getBien();
        InventaireCampagne campagne = fiche.getCampagne();
        Long campagneId = campagne.getId();
        Long bienId = bien.getId();

        String locReelle = fiche.getLocalisationReelle();
        String locTheorique = bien.getLocalisation();
        if (locReelle != null && !locReelle.isBlank()
                && locTheorique != null && !locTheorique.isBlank()
                && !locReelle.trim().equalsIgnoreCase(locTheorique.trim())) {
            generated.add(upsertEcart(campagne, bien, typeEcartInventaire.MAUVAISE_AFFECTATION,
                    "Localisation constatée : " + locReelle.trim() + " | Attendue : " + locTheorique.trim(),
                    "Régulariser l'affectation ou mettre à jour la fiche patrimoniale"));
        }

        if (fiche.getEtatConstate() != null
                && ("HORS_SERVICE".equalsIgnoreCase(fiche.getEtatConstate())
                        || "HS".equalsIgnoreCase(fiche.getEtatConstate()))
                && (bien.getStatutOperationnel() == com.patris.enums.statutOperationnel.ACTIF
                        || bien.getStatutOperationnel() == com.patris.enums.statutOperationnel.AFFECTE)) {
            generated.add(upsertEcart(campagne, bien, typeEcartInventaire.DIFFERENCE_VALEUR,
                    "État constaté hors service alors que le registre indique : " + bien.getStatutOperationnel(),
                    "Mettre à jour le statut opérationnel ou procéder à une réforme"));
        }

        resolveEcartIfApplicable(campagneId, bienId, typeEcartInventaire.BIEN_MANQUANT,
                !NON_VERIFIE.equalsIgnoreCase(fiche.getEtatConstate()) && !Boolean.TRUE.equals(fiche.getAnomalie()));

        return generated.stream().distinct().toList();
    }

    @Transactional
    public List<InventaireEcart> detectMissingBiens(Long campagneId) {
        List<InventaireEcart> generated = new ArrayList<>();
        List<InventaireFiche> fiches = ficheRepository.findByCampagneId(campagneId);
        for (InventaireFiche fiche : fiches) {
            if (NON_VERIFIE.equalsIgnoreCase(fiche.getEtatConstate()) && fiche.getDateScan() == null) {
                generated.add(upsertEcart(fiche.getCampagne(), fiche.getBien(), typeEcartInventaire.BIEN_MANQUANT,
                        "Bien non recensé dans le périmètre de la campagne",
                        "Rechercher le bien ou régulariser comptablement"));
            }
        }
        return generated;
    }

    @Transactional
    public InventaireEcart signalHorsPerimetre(InventaireCampagne campagne, Bien bien, String observation) {
        return upsertEcart(campagne, bien, typeEcartInventaire.BIEN_NON_ENREGISTRE,
                observation != null ? observation : "Bien scanné hors périmètre théorique de la campagne",
                "Enregistrement tardif ou ajustement du périmètre d'inventaire");
    }

    private InventaireEcart upsertEcart(InventaireCampagne campagne, Bien bien,
            typeEcartInventaire type, String justification, String action) {
        return ecartRepository.findByCampagneIdAndBienIdAndTypeEcart(campagne.getId(), bien.getId(), type)
                .map(existing -> {
                    existing.setJustification(justification);
                    if (existing.getActionCorrective() == null || existing.getActionCorrective().isBlank()) {
                        existing.setActionCorrective(action);
                    }
                    if (existing.getStatutValidation() == statutValidation.VALIDE) {
                        existing.setStatutValidation(statutValidation.EN_ATTENTE);
                    }
                    return ecartRepository.save(existing);
                })
                .orElseGet(() -> {
                    InventaireEcart ecart = new InventaireEcart();
                    ecart.setCampagne(campagne);
                    ecart.setBien(bien);
                    ecart.setTypeEcart(type);
                    ecart.setJustification(justification);
                    ecart.setActionCorrective(action);
                    ecart.setStatutValidation(statutValidation.EN_ATTENTE);
                    return ecartRepository.save(ecart);
                });
    }

    private void resolveEcartIfApplicable(Long campagneId, Long bienId, typeEcartInventaire type, boolean resolved) {
        if (!resolved) {
            return;
        }
        ecartRepository.findByCampagneIdAndBienIdAndTypeEcart(campagneId, bienId, type)
                .filter(e -> e.getStatutValidation() == statutValidation.EN_ATTENTE)
                .ifPresent(e -> {
                    e.setStatutValidation(statutValidation.VALIDE);
                    ecartRepository.save(e);
                });
    }
}
