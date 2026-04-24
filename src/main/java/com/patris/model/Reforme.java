package com.patris.model;

import java.time.LocalDate;

import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.JoinColumn;

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

    public String getDecision() { return decision; }
    public void setDecision(String decision) { this.decision = decision; }

    public LocalDate getDateReforme() { return dateReforme; }
    public void setDateReforme(LocalDate dateReforme) { this.dateReforme = dateReforme; }

    public String getStatut() { return statut; }
    public void setStatut(String statut) { this.statut = statut; }
}
