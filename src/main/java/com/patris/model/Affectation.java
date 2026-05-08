package com.patris.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import com.patris.enums.statutValidation;
import java.time.LocalDateTime;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "affectation")
@Getter
@Setter
@NoArgsConstructor
public class Affectation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    
    @ManyToOne
    @JoinColumn(name = "beneficiaire_id")
    private Beneficiaire beneficiaire;

    private String fonction; // Motif ou fonction spécifique à l'affectation
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
    
    @ElementCollection(fetch = FetchType.EAGER)
    @CollectionTable(name = "affectation_documents", joinColumns = @JoinColumn(name = "affectation_id"))
    @Column(name = "document_url")
    private java.util.List<String> documentsUrls = new java.util.ArrayList<>();

    public Affectation(Beneficiaire beneficiaire, String fonction, LocalDateTime dateAffectation, Bien bien, Services services) {
        this.beneficiaire = beneficiaire;
        this.fonction = fonction;
        this.dateAffectation = dateAffectation;
        this.bien = bien;
        this.services = services;
        this.statutValidation = com.patris.enums.statutValidation.EN_ATTENTE;
    }

    @JsonProperty("detenteur")
    public String getDetenteur() {
        return beneficiaire != null ? (beneficiaire.getNom() + " " + beneficiaire.getPrenom()) : "N/A";
    }

    @JsonProperty("service")
    public String getServiceName() {
        return (services != null) ? services.getNomService() : "N/A";
    }

    @JsonProperty("bienName")
    public String getBienName() {
        return (bien != null) ? bien.getDesignation() : "N/A";
    }

    @JsonProperty("etat")
    public String getEtat() {
        return (dateFin == null || dateFin.isAfter(LocalDateTime.now())) ? "ACTIF" : "CLÔTURÉ";
    }
}
