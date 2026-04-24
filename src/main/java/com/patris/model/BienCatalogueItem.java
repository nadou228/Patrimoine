package com.patris.model;

import jakarta.persistence.*;

@Entity
@Table(name = "bien_catalogue_item")
public class BienCatalogueItem {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String code;

    @Column(nullable = false, length = 1200)
    private String libelle;

    private String niveau;
    private String codeParent;
    private String codeFamille;

    @Column(length = 600)
    private String libelleFamille;

    private String section;
    private String categoriePrincipale;
    private String categorieMetier;
    private String profilFormulaire;
    private Integer ordreAffichage;
    private boolean actif = true;

    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }
    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }
    public String getLibelle() { return libelle; }
    public void setLibelle(String libelle) { this.libelle = libelle; }
    public String getNiveau() { return niveau; }
    public void setNiveau(String niveau) { this.niveau = niveau; }
    public String getCodeParent() { return codeParent; }
    public void setCodeParent(String codeParent) { this.codeParent = codeParent; }
    public String getCodeFamille() { return codeFamille; }
    public void setCodeFamille(String codeFamille) { this.codeFamille = codeFamille; }
    public String getLibelleFamille() { return libelleFamille; }
    public void setLibelleFamille(String libelleFamille) { this.libelleFamille = libelleFamille; }
    public String getSection() { return section; }
    public void setSection(String section) { this.section = section; }
    public String getCategoriePrincipale() { return categoriePrincipale; }
    public void setCategoriePrincipale(String categoriePrincipale) { this.categoriePrincipale = categoriePrincipale; }
    public String getCategorieMetier() { return categorieMetier; }
    public void setCategorieMetier(String categorieMetier) { this.categorieMetier = categorieMetier; }
    public String getProfilFormulaire() { return profilFormulaire; }
    public void setProfilFormulaire(String profilFormulaire) { this.profilFormulaire = profilFormulaire; }
    public Integer getOrdreAffichage() { return ordreAffichage; }
    public void setOrdreAffichage(Integer ordreAffichage) { this.ordreAffichage = ordreAffichage; }
    public boolean isActif() { return actif; }
    public void setActif(boolean actif) { this.actif = actif; }
}
