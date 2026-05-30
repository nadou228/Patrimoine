package com.patris.model;

import jakarta.persistence.*;

@Entity
@Table(name = "permissions")
public class Permission {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(unique = true, nullable = false)
    private String code;

    private String libelle;

    public Permission() {}

    public Permission(String code, String libelle) {
        this.code = code;
        this.libelle = libelle;
    }

    // --- Getters ---
    public Long getId() { return id; }
    public String getCode() { return code; }
    public String getLibelle() { return libelle; }

    // --- Setters ---
    public void setId(Long id) { this.id = id; }
    public void setCode(String code) { this.code = code; }
    public void setLibelle(String libelle) { this.libelle = libelle; }
}
