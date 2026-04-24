package com.patris.service;

import com.patris.dto.BienDto;
import com.patris.model.Bien;
import com.patris.enums.categorie;
import com.patris.enums.statutValidation;
import com.patris.repository.BienRepository;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;

import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.Period;
import java.util.List;

@Service
@RequiredArgsConstructor
@Slf4j
public class BienService {

    private final BienRepository bienRepository;
    private final IupService iupService;

    public List<Bien> findAll() {
        return bienRepository.findAllByArchivedFalse();
    }

    public Bien findById(Long id) {
        return bienRepository.findByIdAndArchivedFalse(id)
                .orElseThrow(() -> new RuntimeException("Bien introuvable"));
    }

    public Bien findByIup(String iup) {
        return bienRepository.findByIupAndArchivedFalse(iup)
                .orElseThrow(() -> new RuntimeException("Bien introuvable"));
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
        
        // Calculer la différence en jours pour plus de précision
        long joursEcoules = java.time.temporal.ChronoUnit.DAYS.between(dateDepart, now);
        double anneesEcoulees = joursEcoules / 365.25;
        
        // Plafonner les années écoulées à la durée d'amortissement
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

    public Double valeurTotalePatrimoine(){
        return bienRepository.findAll().stream().mapToDouble(Bien::getValeur).sum();
    }

    public Bien saveBien(Bien bien) {
        if (bien.getIup() == null || bien.getIup().isBlank()) {
            String iup = iupService.generateIup(bien.getCategorie());
            bien.setIup(iup);
            if (bien.getCodeBien() == null || bien.getCodeBien().isBlank()) {
                bien.setCodeBien(iup);
            }
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

        if (bien.getQuantite() == null || bien.getQuantite() <= 0) {
            bien.setQuantite(1);
        }

        // Automatisation des calculs comptables
        bien.setValeurNetteComptable(calculValeurNette(bien));

        return bienRepository.save(bien);
    }

    public Bien fromDto(BienDto dto) {
        if (dto == null) {
            throw new IllegalArgumentException("Donnée Bien invalide");
        }

        try {
            Bien bien = new Bien();
            bien.setId(dto.getId());
            bien.setCodeBien(dto.getCodeBien() != null ? dto.getCodeBien() : "");
            bien.setIup(dto.getIup() != null ? dto.getIup() : "");
            bien.setDesignation(dto.getDesignation() != null ? dto.getDesignation() : "");
            bien.setCategorie(parseCategorie(dto.getCategorie()));
            bien.setCategoriePrincipale(dto.getCategoriePrincipale());
            bien.setCodeFamille(dto.getCodeFamille());
            bien.setFamilleCatalogue(dto.getFamilleCatalogue());
            bien.setCodeSousCategorie(dto.getCodeSousCategorie());
            bien.setSousCategorie(dto.getSousCategorie());
            bien.setSectionCatalogue(dto.getSectionCatalogue());
            bien.setProfilFormulaire(dto.getProfilFormulaire());
            bien.setDateAcquisition(parseDate(dto.getDateAcquisition()));

            // Numeric fields
            bien.setValeur(dto.getValeur() != null ? dto.getValeur() : 0);
            bien.setEtat(dto.getEtat() != null ? dto.getEtat() : "NEUF");
            bien.setLocalisation(dto.getLocalisation() != null ? dto.getLocalisation() : "");

            String gps = (dto.getCoordonneesGps() != null && !dto.getCoordonneesGps().isBlank()) 
                         ? dto.getCoordonneesGps() 
                         : dto.getCoordonneeGps();
            bien.setCoordonneeGps(gps != null ? gps : "");
            bien.setCoordonneesGps(gps != null ? gps : "");

            bien.setPhotoUrl(dto.getPhotoUrl());
            bien.setObservation(dto.getObservation());

            bien.setNumInventaire(dto.getNumInventaire() != null ? dto.getNumInventaire() : "");
            bien.setTitreFoncier(dto.getTitreFoncier() != null ? dto.getTitreFoncier() : "");
            bien.setSuperficie(dto.getSuperficie() != null ? dto.getSuperficie() : "");
            bien.setModeAcquisition(dto.getModeAcquisition() != null ? dto.getModeAcquisition() : "");
            bien.setImmatriculation(dto.getImmatriculation() != null ? dto.getImmatriculation() : "");
            bien.setNumChassis(dto.getNumChassis() != null ? dto.getNumChassis() : "");
            bien.setMarque(dto.getMarque() != null ? dto.getMarque() : "");
            bien.setModele(dto.getModele() != null ? dto.getModele() : "");
            bien.setNumSerie(dto.getNumSerie() != null ? dto.getNumSerie() : "");
            bien.setFabricant(dto.getFabricant() != null ? dto.getFabricant() : "");
            bien.setDureeAmortissement(dto.getDureeAmortissement() != null ? dto.getDureeAmortissement() : 0);
            bien.setDureeVie(dto.getDureeVie() != null ? dto.getDureeVie() : 0);
            bien.setTauxAmortissement(dto.getTauxAmortissement() != null ? dto.getTauxAmortissement() : 0.0);
            bien.setValeurNetteComptable(dto.getValeurNetteComptable() != null ? dto.getValeurNetteComptable() : 0.0);
            bien.setValeurComptable(dto.getValeurComptable() != null ? dto.getValeurComptable() : 0.0);
            bien.setAmortissementCumule(dto.getAmortissementCumule() != null ? dto.getAmortissementCumule() : 0.0);
            bien.setValiderPar(dto.getValiderPar() != null ? dto.getValiderPar() : "");
            bien.setDateValidation(parseDateTime(dto.getDateValidation()));
            bien.setStatutValidation(parseStatut(dto.getStatutValidation()));
            
            // Nouveau statut opÃ©rationnel
            if (dto.getStatutOperationnel() != null) {
                try {
                    bien.setStatutOperationnel(com.patris.enums.statutOperationnel.valueOf(dto.getStatutOperationnel()));
                } catch (Exception e) {
                    bien.setStatutOperationnel(com.patris.enums.statutOperationnel.ACTIF);
                }
            }
            
            // Nouveaux champs innovants
            bien.setStatutJuridique(dto.getStatutJuridique());
            bien.setChargeUtile(dto.getChargeUtile());
            bien.setTypeBoite(dto.getTypeBoite());
            bien.setFinGarantie(parseOptionalDate(dto.getFinGarantie()));
            bien.setDateMaintenance(parseOptionalDate(dto.getDateMaintenance()));
            bien.setDateDernierEntretien(parseOptionalDate(dto.getDateDernierEntretien()));
            bien.setDateProchaineMaintenance(parseOptionalDate(dto.getDateProchaineMaintenance()));
            bien.setDateProchaineVisiteTechnique(parseOptionalDate(dto.getDateProchaineVisiteTechnique()));
            bien.setQuantite(dto.getQuantite() != null && dto.getQuantite() > 0 ? dto.getQuantite() : 1);
            bien.setPermisOccuper(dto.isPermisOccuper());

            bien.setArchived(dto.getArchived() != null ? dto.getArchived() : false);

            return bien;
        } catch (Exception e) {
            log.error("Erreur lors de la conversion DTO -> Bien : {}", e.getMessage());
            throw e;
        }
    }

    private categorie parseCategorie(String categorieStr) {
        if (categorieStr == null || categorieStr.isBlank()) {
            return categorie.MOBILIER;
        }
        try {
            return categorie.valueOf(categorieStr.trim().toUpperCase());
        } catch (Exception e) {
            return categorie.MOBILIER;
        }
    }

    private LocalDate parseDate(String date) {
        if (date == null || date.isBlank()) {
            return LocalDate.now();
        }
        try {
            // Gère les formats AAAA-MM-JJ, JJ-MM-AAAA et JJ/MM/AAAA
            String cleanDate = date.replace("/", "-");
            if (cleanDate.matches("\\d{4}-\\d{2}-\\d{2}")) {
                return LocalDate.parse(cleanDate);
            }
            // Essaye le format d-M-yyyy (1-1-2024)
            return LocalDate.parse(cleanDate, java.time.format.DateTimeFormatter.ofPattern("d-M-yyyy"));
        } catch (Exception e) {
            return LocalDate.now();
        }
    }

    private LocalDate parseOptionalDate(String date) {
        if (date == null || date.isBlank()) {
            return null;
        }
        return parseDate(date);
    }

    private statutValidation parseStatut(String statut) {
        if (statut == null || statut.isBlank()) {
            return statutValidation.EN_ATTENTE;
        }
        return statutValidation.from(statut);
    }

    private LocalDateTime parseDateTime(String dateTime) {
        if (dateTime == null || dateTime.isBlank()) {
            return null;
        }
        try {
            if (dateTime.length() == 10) {
                return LocalDate.parse(dateTime).atStartOfDay();
            }
            if (dateTime.contains("/")) {
                LocalDate d = LocalDate.parse(dateTime.replace("/", "-"), java.time.format.DateTimeFormatter.ofPattern("d-M-yyyy"));
                return d.atStartOfDay();
            }
            return LocalDateTime.parse(dateTime);
        } catch (Exception e) {
            try {
                return LocalDate.parse(dateTime).atStartOfDay();
            } catch (Exception ex) {
                return null;
            }
        }
    }




    public Bien update(Long id, Bien b){
        Bien bien = findById(id);
        bien.setCodeBien(b.getCodeBien());
        if (b.getIup() != null && !b.getIup().isBlank()) {
            bien.setIup(b.getIup());
        }
        bien.setDesignation(b.getDesignation());
        bien.setCategoriePrincipale(b.getCategoriePrincipale());
        bien.setCodeFamille(b.getCodeFamille());
        bien.setFamilleCatalogue(b.getFamilleCatalogue());
        bien.setCodeSousCategorie(b.getCodeSousCategorie());
        bien.setSousCategorie(b.getSousCategorie());
        bien.setSectionCatalogue(b.getSectionCatalogue());
        bien.setProfilFormulaire(b.getProfilFormulaire());
        bien.setCategorie(b.getCategorie());
        bien.setDateAcquisition(b.getDateAcquisition());
        bien.setValeur(b.getValeur());
        bien.setEtat(b.getEtat());
        bien.setLocalisation(b.getLocalisation());
        bien.setCoordonneesGps(b.getCoordonneesGps());
        bien.setPhotoUrl(b.getPhotoUrl());
        bien.setObservation(b.getObservation());
        bien.setDureeAmortissement(b.getDureeAmortissement());
        bien.setDureeVie(b.getDureeVie());
        bien.setTauxAmortissement(b.getTauxAmortissement());
        bien.setValeurNetteComptable(b.getValeurNetteComptable());
        bien.setValeurComptable(b.getValeurComptable());
        bien.setAmortissementCumule(b.getAmortissementCumule());
        bien.setStatutValidation(b.getStatutValidation());
        bien.setDateValidation(b.getDateValidation());
        bien.setNumInventaire(b.getNumInventaire());
        bien.setTitreFoncier(b.getTitreFoncier());
        bien.setSuperficie(b.getSuperficie());
        bien.setModeAcquisition(b.getModeAcquisition());
        bien.setImmatriculation(b.getImmatriculation());
        bien.setNumChassis(b.getNumChassis());
        bien.setMarque(b.getMarque());
        bien.setModele(b.getModele());
        bien.setNumSerie(b.getNumSerie());
        bien.setFabricant(b.getFabricant());
        
        // Nouveaux champs
        bien.setStatutOperationnel(b.getStatutOperationnel());
        bien.setStatutJuridique(b.getStatutJuridique());
        bien.setChargeUtile(b.getChargeUtile());
        bien.setTypeBoite(b.getTypeBoite());
        bien.setFinGarantie(b.getFinGarantie());
        bien.setDateMaintenance(b.getDateMaintenance());
        bien.setDateDernierEntretien(b.getDateDernierEntretien());
        bien.setDateProchaineMaintenance(b.getDateProchaineMaintenance());
        bien.setDateProchaineVisiteTechnique(b.getDateProchaineVisiteTechnique());
        bien.setQuantite(b.getQuantite());
        bien.setPermisOccuper(b.isPermisOccuper());

        // Automatisation des calculs comptables
        bien.setValeurNetteComptable(calculValeurNette(bien));

        // Enregistrement sans bloquer les catégories non-MOBILIER
        return bienRepository.save(bien);
        }

    public Bien validate(Long id, com.patris.enums.statutValidation statut, String user) {
        Bien bien = findById(id);
        bien.setStatutValidation(statut);
        bien.setValiderPar(user);
        bien.setDateValidation(LocalDateTime.now());
        return bienRepository.save(bien);
    }

    public void deleteBien(Long id) {
        Bien bien = findById(id);
        bien.setArchived(true);
        bienRepository.save(bien);
    }

}

