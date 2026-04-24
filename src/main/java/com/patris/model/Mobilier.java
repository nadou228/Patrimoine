package com.patris.model;

import jakarta.persistence.*;

@Entity
@Table(name = "mobilier")
public class Mobilier {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String numeroSerie;
    private String codeQr;
    private String serviceAffectation;

    @OneToOne
    @JoinColumn(name = "bien_id")
    private Bien bien;

    // Constructors
    public Mobilier() {}

    public Mobilier(Long id, String numeroSerie, String codeQr, String serviceAffectation, Bien bien) {
        this.id = id;
        this.numeroSerie = numeroSerie;
        this.codeQr = codeQr;
        this.serviceAffectation = serviceAffectation;
        this.bien = bien;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNumeroSerie() { return numeroSerie; }
    public void setNumeroSerie(String numeroSerie) { this.numeroSerie = numeroSerie; }

    public String getCodeQr() { return codeQr; }
    public void setCodeQr(String codeQr) { this.codeQr = codeQr; }

    public String getServiceAffectation() { return serviceAffectation; }
    public void setServiceAffectation(String serviceAffectation) { this.serviceAffectation = serviceAffectation; }

    public Bien getBien() { return bien; }
    public void setBien(Bien bien) { this.bien = bien; }
}
