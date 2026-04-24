package com.patris.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;

@JsonIgnoreProperties(ignoreUnknown = true)
public class BienDto {
    private Long id;
    private String codeBien;
    private String iup;
    private String designation;
    private String categorie;
    private String categoriePrincipale;
    private String codeFamille;
    private String familleCatalogue;
    private String codeSousCategorie;
    private String sousCategorie;
    private String sectionCatalogue;
    private String profilFormulaire;
    private String dateAcquisition;
    private Double valeur;
    private String etat;
    private String localisation;
    private String coordonneesGps;
    private String coordonneeGps;
    private String photoUrl;
    private String observation;

    private String numInventaire;
    private String titreFoncier;
    private String superficie;
    private String modeAcquisition;
    private String immatriculation;
    private String numChassis;
    private String marque;
    private String modele;
    private String numSerie;
    private String fabricant;
    private Integer dureeAmortissement;
    private Integer dureeVie;
    private Double tauxAmortissement;
    private Double valeurNetteComptable;
    private Double valeurComptable;
    private Double amortissementCumule;
    private String validerPar;
    private String dateValidation;
    private String statutValidation;
    private String statutOperationnel;

    private String statutJuridique;
    private String chargeUtile;
    private String typeBoite;
    private String finGarantie;
    private String dateMaintenance;
    private String dateDernierEntretien;
    private String dateProchaineMaintenance;
    private String dateProchaineVisiteTechnique;
    private Integer quantite;
    private boolean permisOccuper;

    private Boolean archived;

    public BienDto() {}

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCodeBien() { return codeBien; }
    public void setCodeBien(String codeBien) { this.codeBien = codeBien; }
    public String getIup() { return iup; }
    public void setIup(String iup) { this.iup = iup; }
    public String getDesignation() { return designation; }
    public void setDesignation(String designation) { this.designation = designation; }
    public String getCategorie() { return categorie; }
    public void setCategorie(String categorie) { this.categorie = categorie; }
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
    public String getDateAcquisition() { return dateAcquisition; }
    public void setDateAcquisition(String dateAcquisition) { this.dateAcquisition = dateAcquisition; }
    public Double getValeur() { return valeur; }
    public void setValeur(Double valeur) { this.valeur = valeur; }
    public String getEtat() { return etat; }
    public void setEtat(String etat) { this.etat = etat; }
    public String getLocalisation() { return localisation; }
    public void setLocalisation(String localisation) { this.localisation = localisation; }
    public String getCoordonneesGps() { return coordonneesGps; }
    public void setCoordonneesGps(String coordonneesGps) { this.coordonneesGps = coordonneesGps; }
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
    public String getDateValidation() { return dateValidation; }
    public void setDateValidation(String dateValidation) { this.dateValidation = dateValidation; }
    public String getStatutValidation() { return statutValidation; }
    public void setStatutValidation(String statutValidation) { this.statutValidation = statutValidation; }
    public String getStatutOperationnel() { return statutOperationnel; }
    public void setStatutOperationnel(String statutOperationnel) { this.statutOperationnel = statutOperationnel; }
    public String getStatutJuridique() { return statutJuridique; }
    public void setStatutJuridique(String statutJuridique) { this.statutJuridique = statutJuridique; }
    public String getChargeUtile() { return chargeUtile; }
    public void setChargeUtile(String chargeUtile) { this.chargeUtile = chargeUtile; }
    public String getTypeBoite() { return typeBoite; }
    public void setTypeBoite(String typeBoite) { this.typeBoite = typeBoite; }
    public String getFinGarantie() { return finGarantie; }
    public void setFinGarantie(String finGarantie) { this.finGarantie = finGarantie; }
    public String getDateMaintenance() { return dateMaintenance; }
    public void setDateMaintenance(String dateMaintenance) { this.dateMaintenance = dateMaintenance; }
    public String getDateDernierEntretien() { return dateDernierEntretien; }
    public void setDateDernierEntretien(String dateDernierEntretien) { this.dateDernierEntretien = dateDernierEntretien; }
    public String getDateProchaineMaintenance() { return dateProchaineMaintenance; }
    public void setDateProchaineMaintenance(String dateProchaineMaintenance) { this.dateProchaineMaintenance = dateProchaineMaintenance; }
    public String getDateProchaineVisiteTechnique() { return dateProchaineVisiteTechnique; }
    public void setDateProchaineVisiteTechnique(String dateProchaineVisiteTechnique) { this.dateProchaineVisiteTechnique = dateProchaineVisiteTechnique; }
    public Integer getQuantite() { return quantite; }
    public void setQuantite(Integer quantite) { this.quantite = quantite; }
    public boolean isPermisOccuper() { return permisOccuper; }
    public void setPermisOccuper(boolean permisOccuper) { this.permisOccuper = permisOccuper; }
    public Boolean getArchived() { return archived; }
    public void setArchived(Boolean archived) { this.archived = archived; }
}
