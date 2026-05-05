package com.patris.service;

import com.patris.dto.*;
import com.patris.model.*;
import com.patris.enums.statutValidation;
import com.patris.enums.statutOperationnel;
import com.patris.enums.type_mouvement;
import com.patris.event.BienCreatedFromStockEvent;
import com.patris.repository.*;
import com.patris.audit.AuditLog;
import com.patris.audit.AuditLogRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.context.ApplicationEventPublisher;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class BienService {

    private final BienRepository bienRepository;
    private final IupService iupService;
    private final CategoriePatrimoineRepository categoriePatrimoineRepository;
    private final ApplicationEventPublisher eventPublisher;

    private final MouvementStockRepository mouvementStockRepository;
    private final AffectationRepository affectationRepository;
    private final EntretienRepository entretienRepository;
    private final SinistreRepository sinistreRepository;
    private final AuditLogRepository auditLogRepository;
    private final StockRepository stockRepository;
    private final BeneficiaireRepository beneficiaireRepository;
    private final NomenclatureCompteRepository nomenclatureCompteRepository;

    public List<Bien> findAll() {
        List<Bien> list = bienRepository.findAllByArchivedFalse();
        // Forcer le chargement des collections ElementCollection pour éviter le LazyLoading inopiné
        list.forEach(b -> {
            if (b.getDocumentsUrls() != null) {
                b.getDocumentsUrls().size(); 
            }
        });
        return list;
    }

    public Bien findById(Long id) {
        return bienRepository.findByIdAndArchivedFalse(id)
                .orElseThrow(() -> new RuntimeException("Bien introuvable"));
    }

    public Bien findByIup(String iup) {
        return bienRepository.findByIupAndArchivedFalse(iup)
                .orElseThrow(() -> new RuntimeException("Bien introuvable"));
    }

    public void validateIupUnicity(String iup) {
        if (bienRepository.existsByIup(iup)) {
            throw new RuntimeException("L'IUP " + iup + " existe déjà dans le système.");
        }
    }

    public boolean isIupUnique(String iup) {
        return iup != null && !iup.isBlank() && !bienRepository.existsByIup(iup);
    }

    public boolean isImmatriculationUnique(String immatriculation, Long excludeId) {
        if (immatriculation == null || immatriculation.isBlank()) {
            return false;
        }
        return !bienRepository.existsActiveImmatriculation(immatriculation.trim(), excludeId);
    }

    public double calculValeurNette(Bien bien){
        if (bien.getValeur() <= 0) {
            return 0;
        }

        if (bien.getDureeAmortissement() == null || bien.getDureeAmortissement() <= 0) {
            bien.setTauxAmortissement(0.0);
            bien.setAmortissementCumule(0.0);
            bien.setValeurNetteComptable(bien.getValeur());
            bien.setValeurComptable(bien.getValeur());
            return bien.getValeur();
        }
        
        double taux = 100.0 / bien.getDureeAmortissement();
        
        LocalDate dateDepart = bien.getDateAcquisition() != null ? bien.getDateAcquisition() : LocalDate.now();
        LocalDate now = LocalDate.now();
        
        long joursEcoules = java.time.temporal.ChronoUnit.DAYS.between(dateDepart, now);
        double anneesEcoulees = joursEcoules / 365.25;
        
        anneesEcoulees = Math.max(0, Math.min(anneesEcoulees, (double) bien.getDureeAmortissement()));
        
        double amortissementAnnuel = bien.getValeur() / bien.getDureeAmortissement();
        double amortissementCumule = amortissementAnnuel * anneesEcoulees;
        
        bien.setTauxAmortissement(taux);
        bien.setAmortissementCumule(amortissementCumule);
        bien.setValeurComptable(bien.getValeur());
        
        double vnc = bien.getValeur() - amortissementCumule;
        bien.setValeurNetteComptable(Math.max(0, vnc));
        
        return bien.getValeurNetteComptable();
    }

    @Transactional
    public Bien saveBien(Bien bien) {
        return saveBien(bien, null, null, null);
    }

    @Transactional
    public Bien saveBien(Bien bien, Long sourceStockId, Integer quantite) {
        return saveBien(bien, sourceStockId, quantite, null);
    }

    @Transactional
    public Bien saveBien(Bien bien, Long sourceStockId, Integer quantite, Long sourceBeneficiaireId) {
        if (bien.getIup() == null || bien.getIup().isBlank()) {
            String nomCode = bien.getNomenclature() != null ? bien.getNomenclature().getCode() : null;
            if (nomCode == null) nomCode = bien.getCodeSousCategorie() != null ? bien.getCodeSousCategorie() : bien.getCodeCategorie();
            int annee = bien.getDateAcquisition() != null ? bien.getDateAcquisition().getYear() : LocalDate.now().getYear();
            String iup = iupService.generateIup(nomCode, annee);
            bien.setIup(iup);
            if (bien.getCodeBien() == null || bien.getCodeBien().isBlank()) {
                bien.setCodeBien(iup);
            }
        } else {
            // Si l'IUP est fourni manuellement, on vérifie qu'il n'existe pas déjà
            validateIupUnicity(bien.getIup());
        }

        if (bien.getStatutValidation() == null) {
            bien.setStatutValidation(statutValidation.EN_ATTENTE);
        }

        if (bien.getDateAcquisition() == null) {
            bien.setDateAcquisition(LocalDate.now());
        }

        if (bien.getValeur() <= 0) {
            bien.setValeur(0);
        }

        bien.setValeurNetteComptable(calculValeurNette(bien));

        Bien saved = bienRepository.save(bien);

        if (sourceStockId != null && quantite != null && quantite > 0) {
            if (sourceBeneficiaireId == null) {
                throw new IllegalArgumentException(
                    "sourceBeneficiaireId est obligatoire lorsque sourceStockId et sourceStockQuantite sont renseignés.");
            }
            eventPublisher.publishEvent(new BienCreatedFromStockEvent(
                    this, saved.getId(), sourceStockId, quantite, sourceBeneficiaireId));
        }

        return saved;
    }

    public Bien fromDto(BienDto dto) {
        if (dto == null) {
            throw new IllegalArgumentException("Donnée Bien invalide");
        }

        Bien bien;
        if (dto instanceof BienImmobilierDto) {
            bien = new BienImmobilier();
            mapImmobilier((BienImmobilierDto) dto, (BienImmobilier) bien);
        } else if (dto instanceof BienMobilierDto) {
            bien = new BienMobilier();
            mapMobilier((BienMobilierDto) dto, (BienMobilier) bien);
        } else if (dto instanceof BienMaterielRoulantDto) {
            bien = new BienMaterielRoulant();
            mapRoulant((BienMaterielRoulantDto) dto, (BienMaterielRoulant) bien);
        } else {
            // Par défaut, fallback sur Mobilier si non spécifié
            bien = new BienMobilier();
        }

        // Champs communs
        bien.setId(dto.getId());
        bien.setCodeBien(dto.getCodeBien() != null ? dto.getCodeBien() : "");
        bien.setIup(dto.getIup() != null ? dto.getIup() : "");
        bien.setDesignation(dto.getDesignation() != null ? dto.getDesignation() : "");
        
        bien.setCodeCategorie(dto.getCodeCategorie());
        bien.setCodeFamille(dto.getCodeFamille());
        bien.setCodeSousCategorie(dto.getCodeSousCategorie());
        bien.setCodeArticle(dto.getCodeArticle());
        
        bien.setDateAcquisition(parseDate(dto.getDateAcquisition()));
        bien.setValeur(dto.getValeur() != null ? dto.getValeur() : 0);
        bien.setEtat(dto.getEtat() != null ? dto.getEtat() : "NEUF");
        bien.setLocalisation(dto.getLocalisation() != null ? dto.getLocalisation() : "");
        bien.setService(dto.getService() != null ? dto.getService() : "");
        bien.setPhotoUrl(dto.getPhotoUrl());
        if (dto.getDocumentsUrls() != null) {
            bien.setDocumentsUrls(new java.util.ArrayList<>(dto.getDocumentsUrls()));
        }
        bien.setObservation(dto.getObservation());
        bien.setModeAcquisition(dto.getModeAcquisition() != null ? dto.getModeAcquisition() : "");

        bien.setDureeAmortissement(dto.getDureeAmortissement() != null ? dto.getDureeAmortissement() : 0);
        bien.setTauxAmortissement(dto.getTauxAmortissement() != null ? dto.getTauxAmortissement() : 0.0);
        bien.setValeurNetteComptable(dto.getValeurNetteComptable() != null ? dto.getValeurNetteComptable() : 0.0);
        bien.setValeurComptable(dto.getValeurComptable() != null ? dto.getValeurComptable() : 0.0);
        bien.setAmortissementCumule(dto.getAmortissementCumule() != null ? dto.getAmortissementCumule() : 0.0);

        bien.setValiderPar(dto.getValiderPar() != null ? dto.getValiderPar() : "");
        bien.setDateValidation(parseDateTime(dto.getDateValidation()));
        bien.setStatutValidation(parseStatut(dto.getStatutValidation()));

        if (dto.getStatutOperationnel() != null) {
            try {
                bien.setStatutOperationnel(statutOperationnel.valueOf(dto.getStatutOperationnel()));
            } catch (Exception e) {
                bien.setStatutOperationnel(statutOperationnel.ACTIF);
            }
        }
        
        if (dto.getNomenclature() != null && dto.getNomenclature().getCode() != null) {
            nomenclatureCompteRepository.findById(dto.getNomenclature().getCode())
                    .ifPresent(bien::setNomenclature);
        }

        bien.setArchived(dto.getArchived() != null ? dto.getArchived() : false);

        return bien;
    }

    private void mapImmobilier(BienImmobilierDto dto, BienImmobilier bien) {
        bien.setTitreFoncier(dto.getTitreFoncier());
        bien.setSuperficie(dto.getSuperficie());
        bien.setCoordonneesGps(dto.getCoordonneesGps());
        bien.setUsageImmobilier(dto.getUsageImmobilier());
        bien.setPermisOccuper(dto.getPermisOccuper() != null ? dto.getPermisOccuper() : false);
        bien.setStatutJuridique(dto.getStatutJuridique());
    }

    private void mapMobilier(BienMobilierDto dto, BienMobilier bien) {
        bien.setNumSerie(dto.getNumSerie());
        bien.setFabricant(dto.getFabricant());
        bien.setSpecificationsTechniques(dto.getSpecificationsTechniques());
        bien.setFinGarantie(parseOptionalDate(dto.getFinGarantie()));
        bien.setDateDernierEntretien(parseOptionalDate(dto.getDateDernierEntretien()));
        bien.setDateProchaineMaintenance(parseOptionalDate(dto.getDateProchaineMaintenance()));
    }

    private void mapRoulant(BienMaterielRoulantDto dto, BienMaterielRoulant bien) {
        bien.setImmatriculation(dto.getImmatriculation());
        bien.setNumChassis(dto.getNumChassis());
        bien.setMarque(dto.getMarque());
        bien.setModele(dto.getModele());
        bien.setPuissanceFiscale(dto.getPuissanceFiscale());
        bien.setTypeCarburant(dto.getTypeCarburant());
        bien.setTypeBoite(dto.getTypeBoite());
        bien.setChargeUtile(dto.getChargeUtile());
        bien.setDateProchaineVisiteTechnique(parseOptionalDate(dto.getDateProchaineVisiteTechnique()));
    }

    @Transactional
    public Bien update(Long id, Bien b){
        // Simplification pour l'instant : on supprime et on recrée si le type change (rare).
        // En général on met à jour les champs sans changer le type.
        Bien existing = findById(id);
        
        String ancienneVal = "{\"valeur\":" + existing.getValeur() + ", \"localisation\":\"" + existing.getLocalisation() + "\", \"service\":\"" + existing.getService() + "\"}";

        // Copie des champs communs
        existing.setCodeBien(b.getCodeBien());
        if (b.getIup() != null && !b.getIup().isBlank()) {
            existing.setIup(b.getIup());
        }
        existing.setDesignation(b.getDesignation());
        existing.setCodeCategorie(b.getCodeCategorie());
        existing.setCodeFamille(b.getCodeFamille());
        existing.setCodeSousCategorie(b.getCodeSousCategorie());
        existing.setCodeArticle(b.getCodeArticle());
        existing.setDateAcquisition(b.getDateAcquisition());
        existing.setValeur(b.getValeur());
        existing.setEtat(b.getEtat());
        existing.setLocalisation(b.getLocalisation());
        existing.setService(b.getService());
        existing.setPhotoUrl(b.getPhotoUrl());
        if (b.getDocumentsUrls() != null) {
            existing.getDocumentsUrls().clear();
            existing.getDocumentsUrls().addAll(b.getDocumentsUrls());
        }
        existing.setObservation(b.getObservation());
        existing.setDureeAmortissement(b.getDureeAmortissement());
        existing.setStatutValidation(b.getStatutValidation());
        existing.setDateValidation(b.getDateValidation());
        existing.setModeAcquisition(b.getModeAcquisition());
        existing.setStatutOperationnel(b.getStatutOperationnel());

        // Copie polymorphique
        if (existing instanceof BienImmobilier && b instanceof BienImmobilier) {
            BienImmobilier ei = (BienImmobilier) existing;
            BienImmobilier bi = (BienImmobilier) b;
            ei.setTitreFoncier(bi.getTitreFoncier());
            ei.setSuperficie(bi.getSuperficie());
            ei.setCoordonneesGps(bi.getCoordonneesGps());
            ei.setUsageImmobilier(bi.getUsageImmobilier());
            ei.setPermisOccuper(bi.getPermisOccuper());
            ei.setStatutJuridique(bi.getStatutJuridique());
        } else if (existing instanceof BienMobilier && b instanceof BienMobilier) {
            BienMobilier em = (BienMobilier) existing;
            BienMobilier bm = (BienMobilier) b;
            em.setNumSerie(bm.getNumSerie());
            em.setFabricant(bm.getFabricant());
            em.setSpecificationsTechniques(bm.getSpecificationsTechniques());
            em.setFinGarantie(bm.getFinGarantie());
            em.setDateDernierEntretien(bm.getDateDernierEntretien());
            em.setDateProchaineMaintenance(bm.getDateProchaineMaintenance());
        } else if (existing instanceof BienMaterielRoulant && b instanceof BienMaterielRoulant) {
            BienMaterielRoulant er = (BienMaterielRoulant) existing;
            BienMaterielRoulant br = (BienMaterielRoulant) b;
            er.setImmatriculation(br.getImmatriculation());
            er.setNumChassis(br.getNumChassis());
            er.setMarque(br.getMarque());
            er.setModele(br.getModele());
            er.setPuissanceFiscale(br.getPuissanceFiscale());
            er.setTypeCarburant(br.getTypeCarburant());
            er.setTypeBoite(br.getTypeBoite());
            er.setChargeUtile(br.getChargeUtile());
            er.setDateProchaineVisiteTechnique(br.getDateProchaineVisiteTechnique());
        }

        existing.setValeurNetteComptable(calculValeurNette(existing));
        Bien updated = bienRepository.save(existing);

        String nouvelleVal = "{\"valeur\":" + updated.getValeur() + ", \"localisation\":\"" + updated.getLocalisation() + "\", \"service\":\"" + updated.getService() + "\"}";

        AuditLog logEntry = new AuditLog();
        logEntry.setAction("BIEN_MODIFIE");
        logEntry.setEntite("Bien");
        logEntry.setEntiteId(updated.getId());
        logEntry.setDateAction(LocalDateTime.now());
        logEntry.setDetail("Modification des informations du bien");
        logEntry.setAncienneValeur(ancienneVal);
        logEntry.setNouvelleValeur(nouvelleVal);
        String username = "system";
        try {
            if (org.springframework.security.core.context.SecurityContextHolder.getContext() != null && 
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication() != null) {
                username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
            }
        } catch (Exception e) {}
        logEntry.setUsername(username);
        auditLogRepository.save(logEntry);

        return updated;
    }

    public Bien validate(Long id, statutValidation statut, String user) {
        Bien bien = findById(id);
        bien.setStatutValidation(statut);
        bien.setValiderPar(user);
        bien.setDateValidation(LocalDateTime.now());
        return bienRepository.save(bien);
    }

    @Transactional
    public void deleteBien(Long id) {
        log.info("Archivage du bien id: {}", id);
        Bien bien = findById(id);
        bien.setArchived(true);
        bienRepository.save(bien);
        log.info("Bien id: {} archivé avec succès", id);

        AuditLog logEntry = new AuditLog();
        logEntry.setAction("BIEN_ARCHIVE");
        logEntry.setEntite("Bien");
        logEntry.setEntiteId(id);
        logEntry.setDateAction(LocalDateTime.now());
        logEntry.setDetail("Archivage du bien");
        String username = "system";
        try {
            if (org.springframework.security.core.context.SecurityContextHolder.getContext() != null && 
                org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication() != null) {
                username = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication().getName();
            }
        } catch (Exception e) {}
        logEntry.setUsername(username);
        auditLogRepository.save(logEntry);
    }

    @Transactional
    public Bien changerStatut(Long bienId, String nouveauStatut, String nouveauService, String acteur) {
        Bien bien = findById(bienId);

        statutOperationnel statut;
        try {
            statut = statutOperationnel.valueOf((nouveauStatut == null ? "ACTIF" : nouveauStatut).trim().toUpperCase());
        } catch (Exception exception) {
            throw new IllegalArgumentException("Statut operationnel invalide: " + nouveauStatut);
        }

        bien.setStatutOperationnel(statut);
        if (nouveauService != null) {
            bien.setService(nouveauService);
        }

        Bien updated = bienRepository.save(bien);

        AuditLog logEntry = new AuditLog();
        logEntry.setAction("CHANGEMENT_STATUT_BIEN");
        logEntry.setEntite("Bien");
        logEntry.setEntiteId(updated.getId());
        logEntry.setUsername(acteur != null && !acteur.isBlank() ? acteur : "systeme");
        logEntry.setDateAction(LocalDateTime.now());
        logEntry.setDetail("{\"statutOperationnel\":\"" + statut.name() + "\",\"service\":\"" + (updated.getService() == null ? "" : updated.getService()) + "\"}");
        auditLogRepository.save(logEntry);

        return updated;
    }

    public List<HistoriqueBienDto> getHistorique(Long id) {
        Bien bien = findById(id);
        List<HistoriqueBienDto> historique = new ArrayList<>();

        // 1. Mouvements de Stock (Entrée/Sortie/Transformation)
        mouvementStockRepository.findByBienCreeIdOrderByDateMouvementDesc(id).forEach(mvt -> {
            historique.add(HistoriqueBienDto.builder()
                .date(mvt.getDateMouvement())
                .typeEvenement("MOUVEMENT_STOCK")
                .description("Mouvement de type " + mvt.getTypeMouvement())
                .utilisateur("Système")
                .details("Quantité: " + mvt.getQuantite() + ", Réf: " + mvt.getReferencePiece())
                .build());
        });

        // 2. Affectations
        affectationRepository.findByBienIdOrderByDateAffectationDesc(id).forEach(aff -> {
            historique.add(HistoriqueBienDto.builder()
                .date(aff.getDateAffectation())
                .typeEvenement("AFFECTATION")
                .description("Affectation à " + (aff.getBeneficiaire() != null ? aff.getBeneficiaire().getNom() : "N/A"))
                .utilisateur(aff.getValidePar())
                .details("Service: " + (aff.getServices() != null ? aff.getServices().getNomService() : "N/A"))
                .build());
        });

        // 3. Entretiens
        entretienRepository.findByBienId(id).forEach(ent -> {
            LocalDate d = ent.getDateRealisee() != null ? ent.getDateRealisee() : ent.getDatePrevue();
            historique.add(HistoriqueBienDto.builder()
                .date(d != null ? d.atStartOfDay() : null)
                .typeEvenement("ENTRETIEN")
                .description("Entretien : " + (ent.getObservation() != null ? ent.getObservation() : "Maintenance"))
                .utilisateur("N/A")
                .details("Coût: " + ent.getCout() + ", Prestataire: " + ent.getPrestataire())
                .build());
        });

        // 4. Sinistres
        sinistreRepository.findByBienId(id).forEach(sin -> {
            LocalDateTime dateS = null;
            if (sin.getDateSinistre() != null) {
                try {
                    dateS = LocalDateTime.parse(sin.getDateSinistre());
                } catch (Exception e) {
                    try {
                        dateS = LocalDate.parse(sin.getDateSinistre()).atStartOfDay();
                    } catch (Exception e2) {
                        // Ignore
                    }
                }
            }
            historique.add(HistoriqueBienDto.builder()
                .date(dateS)
                .typeEvenement("SINISTRE")
                .description("Sinistre : " + sin.getType())
                .utilisateur("N/A")
                .details("Gravité: " + sin.getStatut() + ", Description: " + sin.getDescription())
                .build());
        });

        // 5. Audit Logs
        auditLogRepository.findByEntiteAndEntiteIdOrderByDateActionDesc("Bien", id).forEach(audit -> {
            historique.add(HistoriqueBienDto.builder()
                .date(audit.getDateAction())
                .typeEvenement("AUDIT")
                .description(audit.getAction())
                .utilisateur(audit.getUsername())
                .details("Action effectuée sur l'entité Bien")
                .build());
        });
        return historique.stream()
            .sorted(Comparator.comparing(HistoriqueBienDto::getDate, Comparator.nullsLast(Comparator.reverseOrder())))
            .collect(Collectors.toList());
    }

    public IdentificationDto getIdentificationData(String iup) {
        Bien bien = findByIup(iup);
        return IdentificationDto.builder()
            .iup(bien.getIup())
            .designation(bien.getDesignation())
            .service(bien.getService())
            .localisation(bien.getLocalisation())
            .dateIdentification(LocalDateTime.now().toString())
            .qrCodeUrl("/api/identification/qr/" + bien.getIup())
            .build();
    }

    /**
     * Crée un Bien immobilisé à partir d'un article en stock (consommable).
     * Réalise la décrémentation du stock et la création du mouvement de sortie.
     */
    @Transactional
    public Bien createFromConsommable(Long consommableId, int quantite, BienDto bienDto, Long magasinId) {
        // 1. Vérifier stock disponible
        Stock stock = stockRepository.findByConsommableIdAndMagasinId(consommableId, magasinId)
                .orElseThrow(() -> new RuntimeException("Stock introuvable pour ce consommable dans ce magasin"));

        if (stock.getQuantite() < quantite) {
            throw new RuntimeException("Stock insuffisant (disponible: " + stock.getQuantite() + ")");
        }

        // 2. Préparer et Créer le Bien
        Bien bien = fromDto(bienDto);
        
        // Auto-génération de l'IUP si non fourni
        if (bien.getIup() == null || bien.getIup().isBlank()) {
            String nomCode = bien.getNomenclature() != null ? bien.getNomenclature().getCode() : null;
            if (nomCode == null) nomCode = bien.getCodeSousCategorie() != null ? bien.getCodeSousCategorie() : bien.getCodeCategorie();
            int annee = bien.getDateAcquisition() != null ? bien.getDateAcquisition().getYear() : LocalDate.now().getYear();
            bien.setIup(iupService.generateIup(nomCode, annee));
        }

        Bien savedBien = bienRepository.save(bien);

        // 3. Créer MouvementStock SORTIE
        MouvementStock mvt = new MouvementStock();
        mvt.setStock(stock);
        mvt.setMagasin(stock.getMagasin());
        mvt.setTypeMouvement(type_mouvement.SORTIE);
        mvt.setQuantite(quantite);
        mvt.setDateMouvement(LocalDateTime.now());
        mvt.setReferencePiece("IMMOBILISATION_" + savedBien.getIup());
        mvt.setBienCree(savedBien);
        mvt.setEstValide(true);
        
        if (bienDto.getSourceBeneficiaireId() != null) {
            beneficiaireRepository.findById(bienDto.getSourceBeneficiaireId())
                    .ifPresent(mvt::setBeneficiaire);
        }
        
        mouvementStockRepository.save(mvt);

        // 4. Décrémenter Stock
        stock.setQuantite(stock.getQuantite() - quantite);
        stockRepository.save(stock);

        // 5. Audit Log
        AuditLog logEntry = new AuditLog();
        logEntry.setAction("IMMOBILISATION_DEPUIS_STOCK");
        logEntry.setEntite("Bien");
        logEntry.setEntiteId(savedBien.getId());
        logEntry.setDateAction(LocalDateTime.now());
        logEntry.setDetail("Création depuis stock consommable ID: " + consommableId);
        auditLogRepository.save(logEntry);

        return savedBien;
    }

    private LocalDate parseDate(String date) {
        if (date == null || date.isBlank()) return LocalDate.now();
        try {
            String cleanDate = date.replace("/", "-");
            if (cleanDate.matches("\\d{4}-\\d{2}-\\d{2}")) return LocalDate.parse(cleanDate);
            return LocalDate.parse(cleanDate, java.time.format.DateTimeFormatter.ofPattern("d-M-yyyy"));
        } catch (Exception e) {
            return LocalDate.now();
        }
    }

    private LocalDate parseOptionalDate(String date) {
        if (date == null || date.isBlank()) return null;
        return parseDate(date);
    }

    private statutValidation parseStatut(String statut) {
        if (statut == null || statut.isBlank()) return statutValidation.EN_ATTENTE;
        return statutValidation.from(statut);
    }

    private LocalDateTime parseDateTime(String dateTime) {
        if (dateTime == null || dateTime.isBlank()) return null;
        try {
            if (dateTime.length() == 10) return LocalDate.parse(dateTime).atStartOfDay();
            if (dateTime.contains("/")) return LocalDate.parse(dateTime.replace("/", "-"), java.time.format.DateTimeFormatter.ofPattern("d-M-yyyy")).atStartOfDay();
            return LocalDateTime.parse(dateTime);
        } catch (Exception e) {
            try { return LocalDate.parse(dateTime).atStartOfDay(); } catch (Exception ex) { return null; }
        }
    }
}
