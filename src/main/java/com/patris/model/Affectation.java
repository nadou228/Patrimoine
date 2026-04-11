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
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
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
    private statutValidation statutValidation = statutValidation.EN_ATTENTE;

    private String validePar;
    private LocalDateTime dateValidation;
    private String signatureUrl;
    private String ministere;
    private String posteComptable;
    private String detenteurA;

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
    
    // Alias pour le frontend qui utilise item.bien comme texte
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
