package com.patris.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.time.LocalDate;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Transient;

@Entity
@Table(name = "reforme")
public class Reforme {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne
    @JoinColumn(name = "bien_id")
    private Bien bien;

    private String typeReforme; // REBUT, VENTE, DON, CESSION
    private String motif;
    private String rapportTechniqueUrl;
    private Double valeurResiduelle;
    private Double prixCession;
    private String acheteur;
    private String referenceActe;
    private String ministereDestinataire;
    private String ordreTransfert;
    private String decision;
    private LocalDate dateReforme;
    private String statut; // EN_COURS, VALIDE, REJETE

    // Constructors
    public Reforme() {}

    public Reforme(Long id, Bien bien, String typeReforme, String motif, String rapportTechniqueUrl, Double valeurResiduelle, String decision, LocalDate dateReforme, String statut) {
        this.id = id;
        this.bien = bien;
        this.typeReforme = typeReforme;
        this.motif = motif;
        this.rapportTechniqueUrl = rapportTechniqueUrl;
        this.valeurResiduelle = valeurResiduelle;
        this.decision = decision;
        this.dateReforme = dateReforme;
        this.statut = statut;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public Bien getBien() { return bien; }
    public void setBien(Bien bien) { this.bien = bien; }

    public String getTypeReforme() { return typeReforme; }
    public void setTypeReforme(String typeReforme) { this.typeReforme = typeReforme; }

    public String getMotif() { return motif; }
    public void setMotif(String motif) { this.motif = motif; }

    public String getRapportTechniqueUrl() { return rapportTechniqueUrl; }
    public void setRapportTechniqueUrl(String rapportTechniqueUrl) { this.rapportTechniqueUrl = rapportTechniqueUrl; }

    public Double getValeurResiduelle() { return valeurResiduelle; }
    public void setValeurResiduelle(Double valeurResiduelle) { this.valeurResiduelle = valeurResiduelle; }

    public Double getPrixCession() { return prixCession; }
    public void setPrixCession(Double prixCession) { this.prixCession = prixCession; }

    public String getAcheteur() { return acheteur; }
    public void setAcheteur(String acheteur) { this.acheteur = acheteur; }

    public String getReferenceActe() { return referenceActe; }
    public void setReferenceActe(String referenceActe) { this.referenceActe = referenceActe; }

    public String getMinistereDestinataire() { return ministereDestinataire; }
    public void setMinistereDestinataire(String ministereDestinataire) { this.ministereDestinataire = ministereDestinataire; }

    public String getOrdreTransfert() { return ordreTransfert; }
    public void setOrdreTransfert(String ordreTransfert) { this.ordreTransfert = ordreTransfert; }

    public String getDecision() { return decision; }
    public void setDecision(String decision) { this.decision = decision; }

    public LocalDate getDateReforme() { return dateReforme; }
    public void setDateReforme(LocalDate dateReforme) { this.dateReforme = dateReforme; }

    public String getStatut() { return statut; }
    public void setStatut(String statut) { this.statut = statut; }

    @Transient
    @JsonProperty("dateSortie")
    public LocalDate getDateSortie() {
        return dateReforme;
    }

    @JsonProperty("dateSortie")
    public void setDateSortie(LocalDate dateSortie) {
        this.dateReforme = dateSortie;
    }

    @Transient
    @JsonProperty("statutValidation")
    public String getStatutValidation() {
        return statut;
    }

    @JsonProperty("statutValidation")
    public void setStatutValidation(String statutValidation) {
        this.statut = statutValidation;
    }
}
