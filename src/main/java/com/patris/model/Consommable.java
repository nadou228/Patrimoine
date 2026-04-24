package com.patris.model;

import jakarta.persistence.*;

@Entity
public class Consommable {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String codeArticle;
    private String nomProduit;
    private int seuilAlerte;
    private String unite;
    private Double prixMoyenPondere = 0.0;
    private String serviceAffiche;

    @ManyToOne
    @JoinColumn(name = "commune_id")
    private Commune commune;

    // Constructors
    public Consommable() {}

    public Consommable(Long id, String codeArticle, String nomProduit, int seuilAlerte, String unite, Double prixMoyenPondere, String serviceAffiche, Commune commune) {
        this.id = id;
        this.codeArticle = codeArticle;
        this.nomProduit = nomProduit;
        this.seuilAlerte = seuilAlerte;
        this.unite = unite;
        this.prixMoyenPondere = prixMoyenPondere;
        this.serviceAffiche = serviceAffiche;
        this.commune = commune;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getCodeArticle() { return codeArticle; }
    public void setCodeArticle(String codeArticle) { this.codeArticle = codeArticle; }

    public String getNomProduit() { return nomProduit; }
    public void setNomProduit(String nomProduit) { this.nomProduit = nomProduit; }

    public int getSeuilAlerte() { return seuilAlerte; }
    public void setSeuilAlerte(int seuilAlerte) { this.seuilAlerte = seuilAlerte; }

    public String getUnite() { return unite; }
    public void setUnite(String unite) { this.unite = unite; }

    public Double getPrixMoyenPondere() { return prixMoyenPondere; }
    public void setPrixMoyenPondere(Double prixMoyenPondere) { this.prixMoyenPondere = prixMoyenPondere; }

    public String getServiceAffiche() { return serviceAffiche; }
    public void setServiceAffiche(String serviceAffiche) { this.serviceAffiche = serviceAffiche; }

    public Commune getCommune() { return commune; }
    public void setCommune(Commune commune) { this.commune = commune; }
}
