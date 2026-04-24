package com.patris.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.patris.enums.statutValidation;
import java.time.LocalDateTime;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "affectation")
public class Affectation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    private String beneficaire;
    private String fonction;
    private LocalDateTime dateAffectation;
    private LocalDateTime dateFin;

    @ManyToOne
    @JoinColumn(name = "bien_id")
    private Bien bien;

    @ManyToOne
    @JoinColumn(name = "service_id")
    private Services services;

    @Enumerated(EnumType.STRING)
    private statutValidation statutValidation;

    private String validePar;
    private LocalDateTime dateValidation;
    private String signatureUrl;
    private String ministere;
    private String posteComptable;
    private String detenteurA;

    public Affectation() {
        this.statutValidation = com.patris.enums.statutValidation.EN_ATTENTE;
    }

    public Affectation(Long id, String beneficaire, String fonction, LocalDateTime dateAffectation, LocalDateTime dateFin, Bien bien, Services services, com.patris.enums.statutValidation statutValidation, String validePar, LocalDateTime dateValidation, String signatureUrl, String ministere, String posteComptable, String detenteurA) {
        this.id = id;
        this.beneficaire = beneficaire;
        this.fonction = fonction;
        this.dateAffectation = dateAffectation;
        this.dateFin = dateFin;
        this.bien = bien;
        this.services = services;
        this.statutValidation = statutValidation;
        this.validePar = validePar;
        this.dateValidation = dateValidation;
        this.signatureUrl = signatureUrl;
        this.ministere = ministere;
        this.posteComptable = posteComptable;
        this.detenteurA = detenteurA;
    }

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getBeneficaire() { return beneficaire; }
    public void setBeneficaire(String beneficaire) { this.beneficaire = beneficaire; }
    public String getFonction() { return fonction; }
    public void setFonction(String fonction) { this.fonction = fonction; }
    public LocalDateTime getDateAffectation() { return dateAffectation; }
    public void setDateAffectation(LocalDateTime dateAffectation) { this.dateAffectation = dateAffectation; }
    public LocalDateTime getDateFin() { return dateFin; }
    public void setDateFin(LocalDateTime dateFin) { this.dateFin = dateFin; }
    public Bien getBien() { return bien; }
    public void setBien(Bien bien) { this.bien = bien; }
    public Services getServices() { return services; }
    public void setServices(Services services) { this.services = services; }
    public statutValidation getStatutValidation() { return statutValidation; }
    public void setStatutValidation(statutValidation statutValidation) { this.statutValidation = statutValidation; }
    public String getValidePar() { return validePar; }
    public void setValidePar(String validePar) { this.validePar = validePar; }
    public LocalDateTime getDateValidation() { return dateValidation; }
    public void setDateValidation(LocalDateTime dateValidation) { this.dateValidation = dateValidation; }
    public String getSignatureUrl() { return signatureUrl; }
    public void setSignatureUrl(String signatureUrl) { this.signatureUrl = signatureUrl; }
    public String getMinistere() { return ministere; }
    public void setMinistere(String ministere) { this.ministere = ministere; }
    public String getPosteComptable() { return posteComptable; }
    public void setPosteComptable(String posteComptable) { this.posteComptable = posteComptable; }
    public String getDetenteurA() { return detenteurA; }
    public void setDetenteurA(String detenteurA) { this.detenteurA = detenteurA; }

    @JsonProperty("detenteur")
    public String getDetenteur() {
        return beneficaire;
    }

    @JsonProperty("service")
    public String getServiceName() {
        return (services != null) ? services.getNomService() : "N/A";
    }

    @JsonProperty("bienName")
    public String getBienName() {
        return (bien != null) ? bien.getDesignation() : "N/A";
    }
    
    @JsonProperty("bienLabel")
    public String getBienLabel() {
        return (bien != null) ? bien.getDesignation() : "N/A";
    }

    @JsonProperty("motif")
    public String getMotif() {
        return fonction;
    }

    @JsonProperty("etat")
    public String getEtat() {
        return (dateFin == null || dateFin.isAfter(LocalDateTime.now())) ? "ACTIF" : "CLÔTURÉ";
    }

    @JsonProperty("ministere")
    public String getMinistereVal() { return ministere; }

    @JsonProperty("posteComptable")
    public String getPosteComptableVal() { return posteComptable; }

    @JsonProperty("detenteurA")
    public String getDetenteurAVal() { return detenteurA; }
}
