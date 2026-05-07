package com.patris.model;


import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Enumerated;
import jakarta.persistence.EnumType;
import lombok.*;

@Entity
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Table(name = "sinistre")
public class Sinistre {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String dateSinistre;
    private String type;
    private Double montantEstime;
    private Double montantRembourse;
    private String description;
    
    private String referenceAssurance;
    private String numeroDossierAssureur;
    private Double montantIndemnise;
    private String datePaiement;
    private String piecesJointes;
    
    @JsonProperty("piecesJointes")
    public void setPiecesJointes(Object pieces) {
        if (pieces instanceof java.util.List) {
            this.piecesJointes = String.join(",", (java.util.List<String>) pieces);
        } else if (pieces != null) {
            this.piecesJointes = pieces.toString();
        }
    }
    
    public String getPiecesJointes() {
        return piecesJointes;
    }
    private String lieuSinistre;
    private java.time.LocalDate dateCloture;
    private String gravite;
    
    @Enumerated(EnumType.STRING)
    private com.patris.enums.statutSinistre statut;

    @ManyToOne
    @JoinColumn(name = "bien_id")
    private Bien bien;

    @JsonProperty("referencePolice")
    public String getReferencePolice() {
        return referenceAssurance;
    }

    @JsonProperty("referencePolice")
    public void setReferencePolice(String referencePolice) {
        this.referenceAssurance = referencePolice;
    }

    @JsonProperty("montantRembourse")
    public Double getMontantRembourseAlias() {
        return montantIndemnise != null ? montantIndemnise : montantRembourse;
    }

    @JsonProperty("montantRembourse")
    public void setMontantRembourseAlias(Double montant) {
        this.montantRembourse = montant;
        this.montantIndemnise = montant;
    }
}
