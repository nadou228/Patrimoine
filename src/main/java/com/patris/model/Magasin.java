package com.patris.model;

import jakarta.persistence.*;

@Entity
@Table(name = "magasins")
public class Magasin {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    private String nom;
    private String code;
    private String localisation;
    private String responsable;

    // Constructors
    public Magasin() {}

    public Magasin(Long id, String nom, String code, String localisation, String responsable) {
        this.id = id;
        this.nom = nom;
        this.code = code;
        this.localisation = localisation;
        this.responsable = responsable;
    }

    // Getters and Setters
    public Long getId() { return id; }
    public void setId(Long id) { this.id = id; }

    public String getNom() { return nom; }
    public void setNom(String nom) { this.nom = nom; }

    public String getCode() { return code; }
    public void setCode(String code) { this.code = code; }

    public String getLocalisation() { return localisation; }
    public void setLocalisation(String localisation) { this.localisation = localisation; }

    public String getResponsable() { return responsable; }
    public void setResponsable(String responsable) { this.responsable = responsable; }
}
