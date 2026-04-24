package com.patris.model;

import jakarta.persistence.*;
import com.fasterxml.jackson.annotation.JsonFormat;
import java.time.LocalDate;
import java.time.LocalDateTime;

import com.patris.enums.categorie;
import com.patris.enums.statutValidation;
import com.patris.enums.statutOperationnel;

@Entity
@Table(name = "bien")
public class Bien {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String codeBien;
    @Column(unique = true)
    private String iup;
    private String designation;
    private String categoriePrincipale;
    private String codeFamille;
    private String familleCatalogue;
    private String codeSousCategorie;
    private String sousCategorie;
    private String sectionCatalogue;
    private String profilFormulaire;

    @Enumerated(EnumType.STRING)
    private categorie categorie;

    @JsonFormat(pattern = "yyyy-MM-dd")
    private LocalDate dateAcquisition;
    private double valeur;
    private String etat;
    private String localisation;
    private String coordonneeGps;
    private String photoUrl;
    private String observation;
    
    private String numInventaire;
    private String titreFoncier;
    private String superficie;
    private String coordonneesGps;
    private String modeAcquisition;
    private String immatriculation;
    private String numChassis;
    private String marque;
    private String modele;
    private String numSerie;
    private String fabricant;
    
    private String puissanceFiscale;
    private String typeCarburant;
    private String usageImmobilier;
    private String specificationsTechniques;
    
    private String statutJuridique; // PUBLIC / PRIVE / BAIL
    private String chargeUtile; // Pour Roulant (ex: 3.5 Tonnes)
    private String typeBoite; // MANUELLE / AUTO
    private LocalDate finGarantie;
    private LocalDate dateMaintenance;
    private LocalDate dateDernierEntretien;
    private LocalDate dateProchaineMaintenance;
    private LocalDate dateProchaineVisiteTechnique;
    private Integer quantite;
    private boolean permisOccuper;

    private Integer dureeAmortissement;
    private Integer dureeVie;
    private Double tauxAmortissement;
    private Double valeurNetteComptable;
    private Double valeurComptable;
    private Double amortissementCumule;
    private String validerPar;
    private String service; // Service ou département détenteur

    @JsonFormat(pattern = "yyyy-MM-dd'T'HH:mm:ss")
    private LocalDateTime dateValidation; 

    @Enumerated(EnumType.STRING)
    private statutValidation statutValidation;

    @Enumerated(EnumType.STRING)
    private statutOperationnel statutOperationnel;

    private boolean archived;

    // Constructors
    public Bien() {
        this.permisOccuper = false;
        this.archived = false;
        this.statutOperationnel = com.patris.enums.statutOperationnel.ACTIF;
    }

    public Bien(Long id, String codeBien, String iup, String designation, com.patris.enums.categorie categorie, LocalDate dateAcquisition, double valeur, String etat, String localisation, String coordonneeGps, String photoUrl, String observation, String numInventaire, String titreFoncier, String superficie, String coordonneesGps, String modeAcquisition, String immatriculation, String numChassis, String marque, String modele, String numSerie, String fabricant, String puissanceFiscale, String typeCarburant, String usageImmobilier, String specificationsTechniques, String statutJuridique, String chargeUtile, String typeBoite, LocalDate finGarantie, LocalDate dateDernierEntretien, boolean permisOccuper, Integer dureeAmortissement, Integer dureeVie, Double tauxAmortissement, Double valeurNetteComptable, Double valeurComptable, Double amortissementCumule, String validerPar, String service, LocalDateTime dateValidation, com.patris.enums.statutValidation statutValidation, com.patris.enums.statutOperationnel statutOperationnel, boolean archived) {
        this.id = id;
        this.codeBien = codeBien;
        this.iup = iup;
        this.designation = designation;
        this.categorie = categorie;
        this.dateAcquisition = dateAcquisition;
        this.valeur = valeur;
        this.etat = etat;
        this.localisation = localisation;
        this.coordonneeGps = coordonneeGps;
        this.photoUrl = photoUrl;
        this.observation = observation;
        this.numInventaire = numInventaire;
        this.titreFoncier = titreFoncier;
        this.superficie = superficie;
        this.coordonneesGps = coordonneesGps;
        this.modeAcquisition = modeAcquisition;
        this.immatriculation = immatriculation;
        this.numChassis = numChassis;
        this.marque = marque;
        this.modele = modele;
        this.numSerie = numSerie;
        this.fabricant = fabricant;
        this.puissanceFiscale = puissanceFiscale;
        this.typeCarburant = typeCarburant;
        this.usageImmobilier = usageImmobilier;
        this.specificationsTechniques = specificationsTechniques;
        this.statutJuridique = statutJuridique;
        this.chargeUtile = chargeUtile;
        this.typeBoite = typeBoite;
        this.finGarantie = finGarantie;
        this.dateDernierEntretien = dateDernierEntretien;
        this.permisOccuper = permisOccuper;
        this.dureeAmortissement = dureeAmortissement;
        this.dureeVie = dureeVie;
        this.tauxAmortissement = tauxAmortissement;
        this.valeurNetteComptable = valeurNetteComptable;
        this.valeurComptable = valeurComptable;
        this.amortissementCumule = amortissementCumule;
        this.validerPar = validerPar;
        this.service = service;
        this.dateValidation = dateValidation;
        this.statutValidation = statutValidation;
        this.statutOperationnel = statutOperationnel;
        this.archived = archived;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCodeBien() { return codeBien; }
    public void setCodeBien(String codeBien) { this.codeBien = codeBien; }
    public String getIup() { return iup; }
    public void setIup(String iup) { this.iup = iup; }
    public String getDesignation() { return designation; }
    public void setDesignation(String designation) { this.designation = designation; }
    public String getCategoriePrincipale() { return categoriePrincipale; }
    public void setCategoriePrincipale(String categoriePrincipale) { this.categoriePrincipale = categoriePrincipale; }
    public String getCodeFamille() { return codeFamille; }
    public void setCodeFamille(String codeFamille) { this.codeFamille = codeFamille; }
    public String getFamilleCatalogue() { return familleCatalogue; }
    public void setFamilleCatalogue(String familleCatalogue) { this.familleCatalogue = familleCatalogue; }
    public String getCodeSousCategorie() { return codeSousCategorie; }
    public void setCodeSousCategorie(String codeSousCategorie) { this.codeSousCategorie = codeSousCategorie; }
    public String getSousCategorie() { return sousCategorie; }
    public void setSousCategorie(String sousCategorie) { this.sousCategorie = sousCategorie; }
    public String getSectionCatalogue() { return sectionCatalogue; }
    public void setSectionCatalogue(String sectionCatalogue) { this.sectionCatalogue = sectionCatalogue; }
    public String getProfilFormulaire() { return profilFormulaire; }
    public void setProfilFormulaire(String profilFormulaire) { this.profilFormulaire = profilFormulaire; }
    public categorie getCategorie() { return categorie; }
    public void setCategorie(categorie categorie) { this.categorie = categorie; }
    public LocalDate getDateAcquisition() { return dateAcquisition; }
    public void setDateAcquisition(LocalDate dateAcquisition) { this.dateAcquisition = dateAcquisition; }
    public double getValeur() { return valeur; }
    public void setValeur(double valeur) { this.valeur = valeur; }
    public String getEtat() { return etat; }
    public void setEtat(String etat) { this.etat = etat; }
    public String getLocalisation() { return localisation; }
    public void setLocalisation(String localisation) { this.localisation = localisation; }
    public String getCoordonneeGps() { return coordonneeGps; }
    public void setCoordonneeGps(String coordonneeGps) { this.coordonneeGps = coordonneeGps; }
    public String getPhotoUrl() { return photoUrl; }
    public void setPhotoUrl(String photoUrl) { this.photoUrl = photoUrl; }
    public String getObservation() { return observation; }
    public void setObservation(String observation) { this.observation = observation; }
    public String getNumInventaire() { return numInventaire; }
    public void setNumInventaire(String numInventaire) { this.numInventaire = numInventaire; }
    public String getTitreFoncier() { return titreFoncier; }
    public void setTitreFoncier(String titreFoncier) { this.titreFoncier = titreFoncier; }
    public String getSuperficie() { return superficie; }
    public void setSuperficie(String superficie) { this.superficie = superficie; }
    public String getCoordonneesGps() { return coordonneesGps; }
    public void setCoordonneesGps(String coordonneesGps) { this.coordonneesGps = coordonneesGps; }
    public String getModeAcquisition() { return modeAcquisition; }
    public void setModeAcquisition(String modeAcquisition) { this.modeAcquisition = modeAcquisition; }
    public String getImmatriculation() { return immatriculation; }
    public void setImmatriculation(String immatriculation) { this.immatriculation = immatriculation; }
    public String getNumChassis() { return numChassis; }
    public void setNumChassis(String numChassis) { this.numChassis = numChassis; }
    public String getMarque() { return marque; }
    public void setMarque(String marque) { this.marque = marque; }
    public String getModele() { return modele; }
    public void setModele(String modele) { this.modele = modele; }
    public String getNumSerie() { return numSerie; }
    public void setNumSerie(String numSerie) { this.numSerie = numSerie; }
    public String getFabricant() { return fabricant; }
    public void setFabricant(String fabricant) { this.fabricant = fabricant; }
    public String getPuissanceFiscale() { return puissanceFiscale; }
    public void setPuissanceFiscale(String puissanceFiscale) { this.puissanceFiscale = puissanceFiscale; }
    public String getTypeCarburant() { return typeCarburant; }
    public void setTypeCarburant(String typeCarburant) { this.typeCarburant = typeCarburant; }
    public String getUsageImmobilier() { return usageImmobilier; }
    public void setUsageImmobilier(String usageImmobilier) { this.usageImmobilier = usageImmobilier; }
    public String getSpecificationsTechniques() { return specificationsTechniques; }
    public void setSpecificationsTechniques(String specificationsTechniques) { this.specificationsTechniques = specificationsTechniques; }
    public String getStatutJuridique() { return statutJuridique; }
    public void setStatutJuridique(String statutJuridique) { this.statutJuridique = statutJuridique; }
    public String getChargeUtile() { return chargeUtile; }
    public void setChargeUtile(String chargeUtile) { this.chargeUtile = chargeUtile; }
    public String getTypeBoite() { return typeBoite; }
    public void setTypeBoite(String typeBoite) { this.typeBoite = typeBoite; }
    public LocalDate getFinGarantie() { return finGarantie; }
    public void setFinGarantie(LocalDate finGarantie) { this.finGarantie = finGarantie; }
    public LocalDate getDateMaintenance() { return dateMaintenance; }
    public void setDateMaintenance(LocalDate dateMaintenance) { this.dateMaintenance = dateMaintenance; }
    public LocalDate getDateDernierEntretien() { return dateDernierEntretien; }
    public void setDateDernierEntretien(LocalDate dateDernierEntretien) { this.dateDernierEntretien = dateDernierEntretien; }
    public LocalDate getDateProchaineMaintenance() { return dateProchaineMaintenance; }
    public void setDateProchaineMaintenance(LocalDate dateProchaineMaintenance) { this.dateProchaineMaintenance = dateProchaineMaintenance; }
    public LocalDate getDateProchaineVisiteTechnique() { return dateProchaineVisiteTechnique; }
    public void setDateProchaineVisiteTechnique(LocalDate dateProchaineVisiteTechnique) { this.dateProchaineVisiteTechnique = dateProchaineVisiteTechnique; }
    public Integer getQuantite() { return quantite; }
    public void setQuantite(Integer quantite) { this.quantite = quantite; }
    public boolean isPermisOccuper() { return permisOccuper; }
    public void setPermisOccuper(boolean permisOccuper) { this.permisOccuper = permisOccuper; }
    public Integer getDureeAmortissement() { return dureeAmortissement; }
    public void setDureeAmortissement(Integer dureeAmortissement) { this.dureeAmortissement = dureeAmortissement; }
    public Integer getDureeVie() { return dureeVie; }
    public void setDureeVie(Integer dureeVie) { this.dureeVie = dureeVie; }
    public Double getTauxAmortissement() { return tauxAmortissement; }
    public void setTauxAmortissement(Double tauxAmortissement) { this.tauxAmortissement = tauxAmortissement; }
    public Double getValeurNetteComptable() { return valeurNetteComptable; }
    public void setValeurNetteComptable(Double valeurNetteComptable) { this.valeurNetteComptable = valeurNetteComptable; }
    public Double getValeurComptable() { return valeurComptable; }
    public void setValeurComptable(Double valeurComptable) { this.valeurComptable = valeurComptable; }
    public Double getAmortissementCumule() { return amortissementCumule; }
    public void setAmortissementCumule(Double amortissementCumule) { this.amortissementCumule = amortissementCumule; }
    public String getValiderPar() { return validerPar; }
    public void setValiderPar(String validerPar) { this.validerPar = validerPar; }
    public String getService() { return service; }
    public void setService(String service) { this.service = service; }
    public LocalDateTime getDateValidation() { return dateValidation; }
    public void setDateValidation(LocalDateTime dateValidation) { this.dateValidation = dateValidation; }
    public statutValidation getStatutValidation() { return statutValidation; }
    public void setStatutValidation(statutValidation statutValidation) { this.statutValidation = statutValidation; }
    public statutOperationnel getStatutOperationnel() { return statutOperationnel; }
    public void setStatutOperationnel(statutOperationnel statutOperationnel) { this.statutOperationnel = statutOperationnel; }
    public boolean isArchived() { return archived; }
    public void setArchived(boolean archived) { this.archived = archived; }
}
