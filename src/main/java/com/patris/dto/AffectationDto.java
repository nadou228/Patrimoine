package com.patris.dto;

public class AffectationDto {
    private Long id;
    private String bien;
    private Long beneficiaireId;
    private String detenteur;
    private String service;
    private String dateAffectation;
    private String motif;
    private String fonction;
    private String dateFin;
    private String etat;
    private String ministere;
    private String posteComptable;
    private String detenteurA;
    private String signatureUrl;
    private java.util.List<String> documentsUrls;

    public AffectationDto() {}

    public AffectationDto(Long id, String bien, String detenteur, String service, String dateAffectation, String motif, String fonction, String dateFin, String etat, String ministere, String posteComptable, String detenteurA) {
        this.id = id;
        this.bien = bien;
        this.detenteur = detenteur;
        this.service = service;
        this.dateAffectation = dateAffectation;
        this.motif = motif;
        this.fonction = fonction;
        this.dateFin = dateFin;
        this.etat = etat;
        this.ministere = ministere;
        this.posteComptable = posteComptable;
        this.detenteurA = detenteurA;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getBien() { return bien; }
    public void setBien(String bien) { this.bien = bien; }
    public Long getBeneficiaireId() { return beneficiaireId; }
    public void setBeneficiaireId(Long beneficiaireId) { this.beneficiaireId = beneficiaireId; }
    public String getDetenteur() { return detenteur; }
    public void setDetenteur(String detenteur) { this.detenteur = detenteur; }
    public String getService() { return service; }
    public void setService(String service) { this.service = service; }
    public String getDateAffectation() { return dateAffectation; }
    public void setDateAffectation(String dateAffectation) { this.dateAffectation = dateAffectation; }
    public String getMotif() { return motif; }
    public void setMotif(String motif) { this.motif = motif; }
    public String getFonction() { return fonction; }
    public void setFonction(String fonction) { this.fonction = fonction; }
    public String getDateFin() { return dateFin; }
    public void setDateFin(String dateFin) { this.dateFin = dateFin; }
    public String getEtat() { return etat; }
    public void setEtat(String etat) { this.etat = etat; }
    public String getMinistere() { return ministere; }
    public void setMinistere(String ministere) { this.ministere = ministere; }
    public String getPosteComptable() { return posteComptable; }
    public void setPosteComptable(String posteComptable) { this.posteComptable = posteComptable; }
    public String getDetenteurA() { return detenteurA; }
    public void setDetenteurA(String detenteurA) { this.detenteurA = detenteurA; }
    
    public String getSignatureUrl() { return signatureUrl; }
    public void setSignatureUrl(String signatureUrl) { this.signatureUrl = signatureUrl; }
    
    public java.util.List<String> getDocumentsUrls() { return documentsUrls; }
    public void setDocumentsUrls(java.util.List<String> documentsUrls) { this.documentsUrls = documentsUrls; }
}
