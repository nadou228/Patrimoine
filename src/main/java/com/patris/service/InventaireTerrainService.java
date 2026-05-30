package com.patris.service;

import java.time.LocalDateTime;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.patris.dto.inventaire.InventaireCampagneStatsDTO;
import com.patris.dto.inventaire.TerrainRecensementRequest;
import com.patris.dto.inventaire.TerrainRecensementResponse;
import com.patris.dto.inventaire.TerrainScanResponse;
import com.patris.enums.statutValidation;
import com.patris.model.Bien;
import com.patris.model.InventaireCampagne;
import com.patris.model.InventaireFiche;
import com.patris.repository.BienRepository;
import com.patris.repository.InventaireCampagneRepository;
import com.patris.repository.InventaireEcartRepository;
import com.patris.repository.InventaireFicheRepository;

import lombok.RequiredArgsConstructor;

@Service
@RequiredArgsConstructor
public class InventaireTerrainService {

    private static final String NON_VERIFIE = "NON_VERIFIÉ";
    private static final Pattern IUP_IN_URL = Pattern.compile("/(?:scan|iup|qr)/([^/?#]+)", Pattern.CASE_INSENSITIVE);

    private final InventaireCampagneRepository campagneRepository;
    private final InventaireFicheRepository ficheRepository;
    private final InventaireEcartRepository ecartRepository;
    private final BienRepository bienRepository;
    private final InventaireEcartDetectionService ecartDetectionService;
    private final ObjectMapper objectMapper;

    public String extractIup(String rawPayload) {
        if (rawPayload == null || rawPayload.isBlank()) {
            throw new IllegalArgumentException("Code scan vide");
        }
        String cleaned = rawPayload.trim();
        try {
            if (cleaned.startsWith("{")) {
                JsonNode node = objectMapper.readTree(cleaned);
                if (node.hasNonNull("iup")) {
                    return node.get("iup").asText().trim();
                }
            }
        } catch (Exception ignored) {
            // not JSON
        }
        Matcher urlMatch = IUP_IN_URL.matcher(cleaned);
        if (urlMatch.find()) {
            return urlMatch.group(1).trim();
        }
        if (cleaned.contains("/")) {
            String[] parts = cleaned.split("/");
            return parts[parts.length - 1].trim();
        }
        return cleaned;
    }

    @Transactional(readOnly = true)
    public TerrainScanResponse scan(Long campagneId, String rawPayload) {
        String iup = extractIup(rawPayload);
        Bien bien = bienRepository.findByIupAndArchivedFalse(iup)
                .orElseThrow(() -> new RuntimeException("Aucun bien trouvé pour l'IUP : " + iup));

        InventaireCampagne campagne = campagneRepository.findById(campagneId)
                .orElseThrow(() -> new RuntimeException("Campagne introuvable"));

        TerrainScanResponse response = new TerrainScanResponse();
        response.setIup(iup);
        response.setBien(bien);

        var ficheOpt = ficheRepository.findByCampagneIdAndBienId(campagneId, bien.getId())
                .or(() -> ficheRepository.findByCampagneIdAndCodeIupIgnoreCase(campagneId, iup));

        if (ficheOpt.isPresent()) {
            InventaireFiche fiche = ficheOpt.get();
            response.setFiche(fiche);
            response.setInCampaignScope(true);
            response.setDejaRecense(fiche.getDateScan() != null
                    && !NON_VERIFIE.equalsIgnoreCase(fiche.getEtatConstate()));
            if (Boolean.TRUE.equals(fiche.getAnomalie())) {
                response.addAlerte("Anomalie déjà signalée sur cette fiche");
            }
            if (fiche.getValidationAgent() == statutValidation.VALIDE) {
                response.addAlerte("Recensement agent déjà validé — toute modification réinitialisera la validation superviseur");
            }
        } else {
            response.setInCampaignScope(false);
            response.addAlerte("Ce bien n'est pas dans le périmètre théorique de la campagne « " + campagne.getNom() + " »");
            response.addAlerte("Un écart « Bien non enregistré » sera créé si vous confirmez le recensement");
        }

        return response;
    }

    @Transactional
    public TerrainRecensementResponse recenser(TerrainRecensementRequest request) {
        if (request.getCampagneId() == null) {
            throw new IllegalArgumentException("campagneId obligatoire");
        }
        String iup = extractIup(request.getIup());
        Bien bien = bienRepository.findByIupAndArchivedFalse(iup)
                .orElseThrow(() -> new RuntimeException("Aucun bien trouvé pour l'IUP : " + iup));

        InventaireCampagne campagne = campagneRepository.findById(request.getCampagneId())
                .orElseThrow(() -> new RuntimeException("Campagne introuvable"));

        TerrainRecensementResponse response = new TerrainRecensementResponse();
        var ficheOpt = ficheRepository.findByCampagneIdAndBienId(campagne.getId(), bien.getId())
                .or(() -> ficheRepository.findByCampagneIdAndCodeIupIgnoreCase(campagne.getId(), iup));

        boolean horsPerimetre = ficheOpt.isEmpty();
        InventaireFiche fiche = ficheOpt.orElseGet(() -> {
            InventaireFiche created = new InventaireFiche();
            created.setCampagne(campagne);
            created.setBien(bien);
            created.setCodeIup(bien.getIup());
            created.setEtatConstate(NON_VERIFIE);
            created.setAnomalie(false);
            created.setValidationAgent(statutValidation.EN_ATTENTE);
            created.setValidationSuperviseur(statutValidation.EN_ATTENTE);
            return created;
        });

        if (horsPerimetre) {
            response.addEcart(ecartDetectionService.signalHorsPerimetre(campagne, bien, request.getObservation()));
            response.addAlerte("Écart créé : bien scanné hors périmètre théorique");
        }

        fiche.setCodeIup(bien.getIup());
        fiche.setEtatConstate(normalizeEtat(request.getEtatConstate()));
        fiche.setLocalisationReelle(request.getLocalisationReelle());
        fiche.setPhotoUrl(request.getPhotoUrl());
        fiche.setCoordonneeGps(request.getCoordonneeGps());
        fiche.setObservation(request.getObservation());
        fiche.setAnomalie(Boolean.TRUE.equals(request.getAnomalie()));
        fiche.setDateScan(LocalDateTime.now());
        fiche.setAgentUsername(SecurityContextHolder.getContext().getAuthentication().getName());

        if (fiche.getValidationSuperviseur() == statutValidation.VALIDE) {
            fiche.setValidationSuperviseur(statutValidation.EN_ATTENTE);
            response.addAlerte("Validation superviseur réinitialisée suite à modification terrain");
        }

        InventaireFiche saved = ficheRepository.save(fiche);

        if (request.getPhotoUrl() == null || request.getPhotoUrl().isBlank()) {
            response.addAlerte("Photo non fournie — recommandée pour certification (CDC §4.2.1)");
        }
        if (request.getCoordonneeGps() == null || request.getCoordonneeGps().isBlank()) {
            response.addAlerte("Géolocalisation non capturée — obligatoire pour inventaire certifié");
        }

        boolean shouldValidate = request.getValiderAgent() == null || Boolean.TRUE.equals(request.getValiderAgent());
        if (shouldValidate) {
            saved.setValidationAgent(statutValidation.VALIDE);
            saved = ficheRepository.save(saved);
        }

        response.setFiche(saved);
        ecartDetectionService.syncFromFiche(saved).forEach(response::addEcart);
        return response;
    }

    @Transactional(readOnly = true)
    public InventaireCampagneStatsDTO stats(Long campagneId) {
        campagneRepository.findById(campagneId)
                .orElseThrow(() -> new RuntimeException("Campagne introuvable"));

        long total = ficheRepository.countByCampagneId(campagneId);
        long recensees = ficheRepository.countByCampagneIdAndEtatConstateNot(campagneId, NON_VERIFIE);
        long valAgent = ficheRepository.countByCampagneIdAndValidationAgent(campagneId, statutValidation.VALIDE);
        long valSup = ficheRepository.countByCampagneIdAndValidationSuperviseur(campagneId, statutValidation.VALIDE);
        long anomalies = ficheRepository.countByCampagneIdAndAnomalieTrue(campagneId);
        long ecartsTotal = ecartRepository.countByCampagneId(campagneId);
        long ecartsAttente = ecartRepository.countByCampagneIdAndStatutValidation(campagneId, statutValidation.EN_ATTENTE);

        int couverture = total == 0 ? 0 : (int) Math.round(recensees * 100.0 / total);
        int conformite = recensees == 0 ? 0 : (int) Math.round((recensees - anomalies) * 100.0 / recensees);
        int validationSup = total == 0 ? 0 : (int) Math.round(valSup * 100.0 / total);

        return new InventaireCampagneStatsDTO(
                campagneId, total, recensees, valAgent, valSup, anomalies,
                ecartsAttente, ecartsTotal, couverture, conformite, validationSup);
    }

    @Transactional
    public int lancerRapprochement(Long campagneId) {
        return ecartDetectionService.detectMissingBiens(campagneId).size();
    }

    private String normalizeEtat(String etat) {
        if (etat == null || etat.isBlank()) {
            return "BON";
        }
        return switch (etat.trim().toUpperCase()) {
            case "MAUVAIS", "DEGRADE", "DÉGRADÉ" -> "DEGRADE";
            case "HS" -> "HORS_SERVICE";
            default -> etat.trim().toUpperCase();
        };
    }
}
